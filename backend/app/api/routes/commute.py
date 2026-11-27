from fastapi import APIRouter
from app.models.schemas import (
    CommutePlannerRequest,
    CommutePlannerResponse,
    CommuteRouteOption,
)
from app.services.aqi_service import fetch_aqi

router = APIRouter(prefix="/commute", tags=["Commute Planner"])


@router.post("/routes", response_model=CommutePlannerResponse)
async def plan_clean_commute(request: CommutePlannerRequest):
    """
    Calculate and compare PM2.5 inhaled dose and health exposure
    across different commute options for a given route and ambient AQI.
    """
    aqi_data = await fetch_aqi(request.lat, request.lng, request.city)
    ambient_pm25 = aqi_data.pm25 or 120.0
    distance = max(1.0, request.distance_km)

    # Base modes definition: (mode_id, name, icon, speed_kmh, exposure_factor, ventilation_factor, co2_g_per_km)
    # exposure_factor: fraction of ambient PM2.5 reaching user
    # ventilation_factor: breathing rate relative to resting (1.0 = resting, 3.5 = cycling)
    modes_config = [
        {
            "mode": "metro",
            "name": "Metro Rail / Subway",
            "icon": "🚇",
            "speed": 35.0,
            "exposure_factor": 0.35,  # 65% cleaner air inside sealed stations/trains
            "ventilation": 1.1,
            "co2_per_km": 35,
            "tips": [
                "Air-conditioned coaches filter up to 65% of roadside particulate matter.",
                "Avoid standing on outdoor platforms for prolonged periods during peak smog.",
            ]
        },
        {
            "mode": "car_recirc",
            "name": "Car (AC Recirculation Mode)",
            "icon": "🚗",
            "speed": 25.0,
            "exposure_factor": 0.40,  # cabin filter + recirculation mode
            "ventilation": 1.0,
            "co2_per_km": 175,
            "tips": [
                "Turn AC to 'Recirculation' button to prevent outside exhaust from entering the cabin.",
                "Keeps in-cabin PM2.5 50-60% lower than open window driving.",
            ]
        },
        {
            "mode": "electric_bus",
            "name": "AC Electric / City Bus",
            "icon": "🚌",
            "speed": 18.0,
            "exposure_factor": 0.60,
            "ventilation": 1.1,
            "co2_per_km": 60,
            "tips": [
                "Prefer closed AC buses over non-AC open window buses.",
                "Wear an N95 mask while waiting at road-level bus stops.",
            ]
        },
        {
            "mode": "car_open",
            "name": "Car (Windows Open / Fresh Air)",
            "icon": "🚙",
            "speed": 25.0,
            "exposure_factor": 1.0,
            "ventilation": 1.0,
            "co2_per_km": 175,
            "tips": [
                "Direct exposure to tailpipe emissions of leading trucks and buses.",
                "Roll up windows immediately and switch on AC in heavy traffic.",
            ]
        },
        {
            "mode": "two_wheeler",
            "name": "Motorcycle / Scooter",
            "icon": "🛵",
            "speed": 28.0,
            "exposure_factor": 1.35,  # high direct exhaust stream exposure
            "ventilation": 1.4,
            "co2_per_km": 85,
            "tips": [
                "Highest direct inhalation risk among motorized commutes.",
                "BIS-certified N95 / FFP2 mask is essential; standard helmet visor does not filter PM2.5.",
            ]
        },
        {
            "mode": "cycling",
            "name": "Cycling",
            "icon": "🚴",
            "speed": 14.0,
            "exposure_factor": 1.15,
            "ventilation": 3.2,       # heavy breathing rate draws particles deep into lungs
            "co2_per_km": 0,
            "tips": [
                f"At AQI {aqi_data.aqi}, strenuous cycling is discouraged by WHO guidelines.",
                "High ventilation rate multiplies inhaled particle dose significantly.",
            ]
        },
    ]

    routes: list[CommuteRouteOption] = []
    # Base baseline dose = car_open
    baseline_duration_hr = distance / 25.0
    baseline_raw_dose = (ambient_pm25 * 1.0) * 1.0 * baseline_duration_hr

    for m in modes_config:
        duration_mins = max(5, int((distance / m["speed"]) * 60))
        duration_hr = duration_mins / 60.0

        # Estimated PM2.5 in microgram/m3
        effective_pm25 = round(ambient_pm25 * m["exposure_factor"], 1)

        # Inhaled dose proportional to effective_pm25 * ventilation_factor * time
        raw_dose = effective_pm25 * m["ventilation"] * duration_hr
        reduction_pct = max(0, int(((baseline_raw_dose - raw_dose) / max(0.1, baseline_raw_dose)) * 100))

        # Relative score out of 100 (lower is cleaner)
        dose_score = max(5, min(100, int((raw_dose / max(1.0, baseline_raw_dose * 1.5)) * 100)))

        routes.append(
            CommuteRouteOption(
                mode=m["mode"],
                name=m["name"],
                icon=m["icon"],
                duration_mins=duration_mins,
                estimated_pm25=effective_pm25,
                inhaled_dose_score=dose_score,
                reduction_pct=reduction_pct,
                co2_grams=int(m["co2_per_km"] * distance),
                health_tips=m["tips"],
            )
        )

    # Sort routes by cleanest dose score
    routes.sort(key=lambda x: x.inhaled_dose_score)
    best = routes[0]

    summary = (
        f"For your {distance} km trip from {request.origin} to {request.destination}, "
        f"{best.name} ({best.icon}) offers the lowest PM2.5 inhalation dose ({best.reduction_pct}% lower than open road exposure). "
        f"Ambient air quality is currently {aqi_data.aqi} ({aqi_data.category.value})."
    )

    return CommutePlannerResponse(
        origin=request.origin,
        destination=request.destination,
        distance_km=distance,
        ambient_aqi=aqi_data.aqi,
        ambient_pm25=ambient_pm25,
        best_mode=best.mode,
        recommendation_summary=summary,
        routes=routes,
    )
