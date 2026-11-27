from fastapi import APIRouter, Query, HTTPException
from app.models.schemas import AQIData, SuggestionsResponse
from app.services.aqi_service import fetch_aqi, fetch_forecast
from app.services.profile_service import get_profile
from app.ai.suggestion_engine import generate_suggestions

router = APIRouter(prefix="/aqi", tags=["AQI"])


@router.get("/current", response_model=AQIData)
async def get_current_aqi(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    city: str = Query("Unknown", description="City name"),
):
    """Get current real-time AQI for a location."""
    return await fetch_aqi(lat, lng, city)


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(...),
    lng: float = Query(...),
):
    """Get 24-hour AQI forecast (hourly)."""
    return await fetch_forecast(lat, lng)


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    lat: float = Query(...),
    lng: float = Query(...),
    city: str = Query("Unknown"),
    user_id: str = Query(None, description="Optional user ID for personalization"),
):
    """Get personalized AQI-based suggestions for a location."""
    aqi_data = await fetch_aqi(lat, lng, city)
    profile = await get_profile(user_id) if user_id else None
    return await generate_suggestions(aqi_data, profile)
