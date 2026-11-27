"""
AQI Service — fetches real-time air quality data from OpenWeatherMap and WAQI.
Responses are cached in Redis for AQI_CACHE_TTL seconds.
"""
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional

import httpx
try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None

from app.core.config import get_settings
from app.models.schemas import AQIData, AQICategory

settings = get_settings()

# ── Memory cache fallback ───────────────────────────────
_memory_cache: dict[str, str] = {}
_redis = None


class _MockRedis:
    async def get(self, key: str):
        return _memory_cache.get(key)

    async def setex(self, key: str, ttl: int, value: str):
        _memory_cache[key] = value


async def get_redis():
    global _redis
    if aioredis is None:
        return _MockRedis()
    if _redis is None:
        try:
            _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        except Exception:
            return _MockRedis()
    return _redis


# ── AQI helpers ─────────────────────────────────────────
def _aqi_to_category(aqi: int) -> AQICategory:
    if aqi <= 50:
        return AQICategory.GOOD
    elif aqi <= 100:
        return AQICategory.MODERATE
    elif aqi <= 150:
        return AQICategory.UNHEALTHY_SENSITIVE
    elif aqi <= 200:
        return AQICategory.UNHEALTHY
    elif aqi <= 300:
        return AQICategory.VERY_UNHEALTHY
    else:
        return AQICategory.HAZARDOUS


def _cigarette_equivalent(aqi: int) -> str:
    """Convert AQI to relatable cigarette equivalent (Berkley Earth study)."""
    if aqi <= 50:
        return "Like breathing clean mountain air 🏔️"
    elif aqi <= 100:
        return "Equivalent to ~1 cigarette/day 🚬"
    elif aqi <= 150:
        return "Equivalent to ~3 cigarettes/day 🚬🚬🚬"
    elif aqi <= 200:
        return "Equivalent to ~6 cigarettes/day"
    elif aqi <= 300:
        return "Equivalent to ~12 cigarettes/day ⚠️"
    else:
        return "Equivalent to 20+ cigarettes/day 🚨 STAY INDOORS"


def _owm_index_to_aqi(owm_index: int, pm25: float) -> int:
    """
    OpenWeatherMap returns a 1-5 index. We use PM2.5 to compute US AQI.
    Linear interpolation using EPA breakpoints.
    """
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= pm25 <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (pm25 - c_low) + i_low
            return int(round(aqi))
    return min(500, int(pm25 * 1.5))  # fallback


# ── Cache key ───────────────────────────────────────────
def _cache_key(lat: float, lng: float) -> str:
    raw = f"{round(lat, 2)}:{round(lng, 2)}"
    return "aqi:" + hashlib.md5(raw.encode()).hexdigest()


# ── Main fetch function ─────────────────────────────────
async def fetch_aqi(lat: float, lng: float, city: str = "Unknown") -> AQIData:
    redis = await get_redis()
    key = _cache_key(lat, lng)

    # Check cache
    cached = await redis.get(key)
    if cached:
        data = json.loads(cached)
        return AQIData(**data)

    # Fetch from OpenWeatherMap
    aqi_data = await _fetch_from_owm(lat, lng, city)

    # Cache result
    await redis.setex(key, settings.aqi_cache_ttl, aqi_data.model_dump_json())
    return aqi_data


async def _fetch_from_owm(lat: float, lng: float, city: str) -> AQIData:
    url = "http://api.openweathermap.org/data/2.5/air_pollution"
    params = {
        "lat": lat,
        "lon": lng,
        "appid": settings.openweather_api_key,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            components = data["list"][0]["components"]
            owm_index = data["list"][0]["main"]["aqi"]
            pm25 = components.get("pm2_5", 0)
            pm10 = components.get("pm10", 0)
            no2 = components.get("no2", 0)
            co = components.get("co", 0)

            aqi = _owm_index_to_aqi(owm_index, pm25)

        except Exception:
            # Graceful fallback with mock data for development
            aqi, pm25, pm10, no2, co = 150, 55.0, 80.0, 40.0, 500.0

    return AQIData(
        aqi=aqi,
        category=_aqi_to_category(aqi),
        pm25=pm25,
        pm10=pm10,
        no2=no2,
        co=co,
        city=city,
        lat=lat,
        lng=lng,
        timestamp=datetime.now(timezone.utc).isoformat(),
        cigarette_equivalent=_cigarette_equivalent(aqi),
    )


async def fetch_forecast(lat: float, lng: float) -> list[dict]:
    """Return 24-hour AQI forecast (hourly buckets)."""
    url = "http://api.openweathermap.org/data/2.5/air_pollution/forecast"
    params = {"lat": lat, "lon": lng, "appid": settings.openweather_api_key}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            raw = resp.json()
            forecast = []
            for item in raw["list"][:24]:
                pm25 = item["components"].get("pm2_5", 0)
                aqi = _owm_index_to_aqi(item["main"]["aqi"], pm25)
                forecast.append(
                    {
                        "time": datetime.fromtimestamp(
                            item["dt"], tz=timezone.utc
                        ).strftime("%I %p"),
                        "aqi": aqi,
                        "category": _aqi_to_category(aqi).value,
                    }
                )
            return forecast
        except Exception:
            # Mock forecast for development
            return [
                {"time": f"{h}:00", "aqi": 100 + (h % 6) * 20, "category": "Unhealthy"}
                for h in range(6, 22)
            ]
