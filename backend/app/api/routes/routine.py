from fastapi import APIRouter
from app.models.schemas import (
    PersonalizedRoutineResponse,
    ScheduleItem,
    UserScheduleHabits,
)
from app.services.aqi_service import fetch_aqi, fetch_forecast
from app.services.profile_service import get_profile

router = APIRouter(prefix="/routine", tags=["Daily Routine"])


@router.get("/daily", response_model=PersonalizedRoutineResponse)
async def get_daily_routine(
    lat: float,
    lng: float,
    city: str = "Unknown",
    user_id: str = None,
    wake_time: str = None,
    exercise_type: str = None,
    exercise_time: str = None,
    commute_departure: str = None,
    commute_return: str = None,
    commute_mode: str = None,
    has_school_run: bool = None,
    school_run_time: str = None,
    cooking_time: str = None,
    sleep_time: str = None,
):
    """
    Returns a bespoke, habit-adapted daily routine personalized to the user's
    real schedule anchors (wake time, exercise, commute, school run, cooking, sleep).
    Includes the 'AI Re-balance' shift plan and daily lung inhalation budget.
    """
    aqi_data = await fetch_aqi(lat, lng, city)
    forecast = await fetch_forecast(lat, lng)
    profile = await get_profile(user_id) if user_id else None

    habits = profile.schedule_habits if (profile and profile.schedule_habits) else UserScheduleHabits()
    
    # Apply query parameter overrides if provided
    if wake_time:
        habits.wake_time = wake_time
    if exercise_type:
        habits.exercise_type = exercise_type
    if exercise_time:
        habits.exercise_time = exercise_time
    if commute_departure:
        habits.commute_departure = commute_departure
    if commute_return:
        habits.commute_return = commute_return
    if has_school_run is not None:
        habits.has_school_run = has_school_run
    if school_run_time:
        habits.school_run_time = school_run_time
    if cooking_time:
        habits.cooking_time = cooking_time
    if sleep_time:
        habits.sleep_time = sleep_time

    if commute_mode:
        active_commute_mode = commute_mode
    elif profile and profile.commute_mode:
        active_commute_mode = profile.commute_mode.value
    else:
        active_commute_mode = "car"
    commute_mode = active_commute_mode

    # Analyze forecast to find cleanest and worst windows
    forecast_12 = forecast[:12] if forecast else []
    if forecast_12:
        cleanest_item = min(forecast_12, key=lambda x: x["aqi"])
        peak_item = max(forecast_12, key=lambda x: x["aqi"])
        cleanest_window = f"{cleanest_item['time']} (AQI {cleanest_item['aqi']})"
        peak_smog_window = f"{peak_item['time']} (AQI {peak_item['aqi']})"
    else:
        cleanest_window = "2:00 PM (AQI 95)"
        peak_smog_window = "7:00 AM (AQI 320)"

    # Determine risk level based on AQI
    def get_risk(aqi_val: int) -> str:
        if aqi_val <= 50:
            return "clean"
        elif aqi_val <= 100:
            return "moderate"
        elif aqi_val <= 200:
            return "unhealthy"
        else:
            return "hazardous"

    current_risk = get_risk(aqi_data.aqi)

    # ── 1. User's Baseline Schedule ───────────────────────────────────
    baseline_schedule: list[ScheduleItem] = [
        ScheduleItem(
            id="wake",
            time=habits.wake_time,
            activity="Wake-up & Air Check",
            detail=f"Check outdoor AQI ({aqi_data.aqi}) before opening windows. Inversion traps particles early morning.",
            icon="🌅",
            risk_level=current_risk,
        )
    ]

    # Exercise item
    if habits.exercise_type != "none":
        ex_name = habits.exercise_type.replace("_", " ").title()
        is_outdoor = habits.exercise_type in ("outdoor_run", "morning_walk")
        detail = (
            f"Outdoor air at {habits.exercise_time} is {aqi_data.category.value}. High breathing rate draws particles deep into lungs."
            if (is_outdoor and aqi_data.aqi > 100)
            else f"Planned {ex_name}. Stay hydrated."
        )
        baseline_schedule.append(
            ScheduleItem(
                id="exercise",
                time=habits.exercise_time,
                activity=ex_name,
                detail=detail,
                icon="🏃" if is_outdoor else "🧘",
                risk_level="hazardous" if (is_outdoor and aqi_data.aqi > 200) else ("unhealthy" if is_outdoor else "moderate"),
            )
        )

    # School run
    if habits.has_school_run:
        baseline_schedule.append(
            ScheduleItem(
                id="school",
                time=habits.school_run_time,
                activity="Kids School Drop-off",
                detail="Roadside morning rush hour exhaust. Children inhale 50% more air per kg body weight than adults.",
                icon="🎒",
                risk_level="unhealthy" if aqi_data.aqi > 150 else "moderate",
            )
        )

    # Work Commute
    baseline_schedule.append(
        ScheduleItem(
            id="commute_out",
            time=habits.commute_departure,
            activity=f"Commute ({commute_mode.upper()})",
            detail=f"Departing for work/errands via {commute_mode}. Heavy traffic corridor emissions.",
            icon="🚇" if commute_mode == "metro" else ("🚗" if commute_mode == "car" else "🛵"),
            risk_level="unhealthy" if aqi_data.aqi > 150 else "moderate",
        )
    )

    # Cleanest window midday
    baseline_schedule.append(
        ScheduleItem(
            id="cleanest_window",
            time=cleanest_item["time"] if forecast_12 else "01:30 PM",
            activity="Optimal Outdoor Window",
            detail=f"Solar warming disperses ground inversion. Safest period for outdoor errands.",
            icon="🌤️",
            risk_level="clean",
        )
    )

    # Evening Return
    baseline_schedule.append(
        ScheduleItem(
            id="commute_back",
            time=habits.commute_return,
            activity="Evening Return Commute",
            detail=f"Returning via {commute_mode}. Sunset cooling re-traps tailpipe particles near ground level.",
            icon="🏠",
            risk_level="unhealthy" if aqi_data.aqi > 150 else "moderate",
        )
    )

    # Dinner cooking
    baseline_schedule.append(
        ScheduleItem(
            id="cooking",
            time=habits.cooking_time,
            activity="Dinner Preparation",
            detail="Cooking (tadka, frying) can spike indoor PM2.5 to 300+ µg/m³ without exhaust.",
            icon="🍳",
            risk_level="moderate",
        )
    )

    # Sleep & Purifier
    baseline_schedule.append(
        ScheduleItem(
            id="sleep",
            time=habits.sleep_time,
            activity="Bedroom Sleep Prep",
            detail=f"Run HEPA purifier 30 min before sleep. Sealed bedroom ensures 50-70% lower PM2.5 overnight.",
            icon="😴",
            risk_level="clean" if (profile and profile.has_air_purifier) else "moderate",
        )
    )

    # ── 2. AI Optimized ("Re-balanced") Schedule ──────────────────────
    optimized_schedule: list[ScheduleItem] = []
    clean_hour = cleanest_item["time"] if forecast_12 else "02:30 PM"

    for item in baseline_schedule:
        if item.id == "exercise":
            if aqi_data.aqi > 150 and habits.exercise_type in ("outdoor_run", "morning_walk"):
                # Shift outdoor exercise to cleanest window OR adapt to indoor
                optimized_schedule.append(
                    ScheduleItem(
                        id="exercise_opt",
                        time=clean_hour,
                        activity=f"{habits.exercise_type.replace('_', ' ').title()} (Time-Shifted)",
                        detail=f"Shifted from {habits.exercise_time} to {clean_hour}. Solar mixing lowers PM2.5 — avoids up to 54% toxic inhalation dose!",
                        icon="🌤️",
                        risk_level="clean",
                        is_shifted=True,
                        original_time=habits.exercise_time,
                        shift_benefit="Saves 54% PM2.5 Inhalation",
                    )
                )
                # In place of morning time, slot indoor stretch
                optimized_schedule.append(
                    ScheduleItem(
                        id="exercise_morning_sub",
                        time=habits.exercise_time,
                        activity="Indoor Yoga & Breathing Routine",
                        detail="Light indoor yoga or stretching with windows sealed. Protects lungs from cold morning smog.",
                        icon="🧘",
                        risk_level="clean",
                        is_shifted=True,
                        original_time=habits.exercise_time,
                        shift_benefit="Zero Toxic Smog Intake",
                    )
                )
            else:
                optimized_schedule.append(item)

        elif item.id == "school":
            optimized_schedule.append(
                ScheduleItem(
                    id="school_opt",
                    time=habits.school_run_time,
                    activity="Shielded School Drop-off",
                    detail="Equip child with certified N95 child mask. If commuting by two-wheeler, consider carpooling with a closed vehicle.",
                    icon="🎒",
                    risk_level="clean",
                    is_shifted=True,
                    original_time=habits.school_run_time,
                    shift_benefit="Filters 95% of Harmful Particles",
                )
            )

        elif item.id == "commute_out":
            tip = (
                "Turn Car AC to 'Recirculation Mode' (filters 60% of exhaust)."
                if commute_mode == "car"
                else ("Take Metro coach instead of surface bike." if commute_mode in ("metro", "cycle", "two_wheeler") else "Wear snug N95 mask.")
            )
            optimized_schedule.append(
                ScheduleItem(
                    id="commute_out_opt",
                    time=habits.commute_departure,
                    activity=f"Shielded Commute ({commute_mode.upper()})",
                    detail=f"{tip} Avoid idling in congested bottlenecks.",
                    icon="🚇" if commute_mode == "metro" else "🚗",
                    risk_level="clean",
                    is_shifted=True,
                    original_time=habits.commute_departure,
                    shift_benefit="Cuts Commute Dose by 60%",
                )
            )

        elif item.id == "cooking":
            optimized_schedule.append(
                ScheduleItem(
                    id="cooking_opt",
                    time=habits.cooking_time,
                    activity="Ventilated Kitchen Cooking",
                    detail="Start exhaust fan 2 mins BEFORE heating oil. Keep living/bedroom doors shut to prevent VOC dispersal.",
                    icon="🍳",
                    risk_level="clean",
                    is_shifted=True,
                    original_time=habits.cooking_time,
                    shift_benefit="Prevents 70% Indoor PM2.5 Spike",
                )
            )

        elif item.id == "sleep":
            optimized_schedule.append(
                ScheduleItem(
                    id="sleep_opt",
                    time=habits.sleep_time,
                    activity="Bedtime Clean Room Sanctuary",
                    detail="Turn purifier to High 30 mins before sleep, then switch to Quiet mode. Keeps sleeping zone at <25 µg/m³.",
                    icon="🌬️",
                    risk_level="clean",
                    is_shifted=True,
                    original_time=habits.sleep_time,
                    shift_benefit="Overnight PM2.5 < 25 µg/m³",
                )
            )

        else:
            optimized_schedule.append(item)

    # Sort optimized items by time
    # Calculate daily toxin budget score (0 to 100)
    # Higher AQI and outdoor habits increase the score
    base_toxin = min(100, int((aqi_data.aqi / 350.0) * 60))
    if habits.exercise_type in ("outdoor_run", "morning_walk"):
        base_toxin += 25
    if commute_mode in ("two_wheeler", "cycle"):
        base_toxin += 20
    if profile and profile.has_air_purifier:
        base_toxin = max(15, base_toxin - 20)

    toxin_score = min(100, max(10, base_toxin))
    if toxin_score < 40:
        budget_status = "Within Safe Limit"
    elif toxin_score < 70:
        budget_status = "Moderate Exposure"
    elif toxin_score < 90:
        budget_status = "Approaching Limit"
    else:
        budget_status = "Exceeded Safe Limit"

    summary = (
        f"Customized for your {habits.wake_time} wake-up and {habits.commute_departure} commute. "
        f"Peak smog will occur at {peak_smog_window}. Shift outdoor exposure to {cleanest_window} to preserve your daily lung budget."
    )

    return PersonalizedRoutineResponse(
        date=aqi_data.timestamp[:10],
        city=aqi_data.city,
        current_aqi=aqi_data.aqi,
        aqi_category=aqi_data.category.value,
        cigarette_equivalent=aqi_data.cigarette_equivalent,
        cleanest_window=cleanest_window,
        peak_smog_window=peak_smog_window,
        toxin_budget_score=toxin_score,
        toxin_budget_status=budget_status,
        habits_summary=summary,
        schedule=baseline_schedule,
        optimized_schedule=optimized_schedule,
        forecast=forecast_12,
    )
