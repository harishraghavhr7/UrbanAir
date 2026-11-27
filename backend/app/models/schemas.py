from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── AQI ────────────────────────────────────────────────
class AQICategory(str, Enum):
    GOOD = "Good"
    MODERATE = "Moderate"
    UNHEALTHY_SENSITIVE = "Unhealthy for Sensitive Groups"
    UNHEALTHY = "Unhealthy"
    VERY_UNHEALTHY = "Very Unhealthy"
    HAZARDOUS = "Hazardous"


class AQIData(BaseModel):
    aqi: int
    category: AQICategory
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    co: Optional[float] = None
    city: str
    lat: float
    lng: float
    timestamp: str
    cigarette_equivalent: str  # human-readable impact


# ── User Profile ────────────────────────────────────────
class CommuteMode(str, Enum):
    CAR = "car"
    METRO = "metro"
    WALK = "walk"
    CYCLE = "cycle"
    WFH = "wfh"


class HealthCondition(str, Enum):
    NONE = "none"
    ASTHMA = "asthma"
    HEART_DISEASE = "heart_disease"
    DIABETES = "diabetes"
    COPD = "copd"


class UserScheduleHabits(BaseModel):
    wake_time: str = "06:30 AM"
    exercise_type: str = "morning_walk"  # "morning_walk" | "outdoor_run" | "gym" | "indoor_yoga" | "none"
    exercise_time: str = "07:00 AM"
    commute_departure: str = "08:30 AM"
    commute_return: str = "06:00 PM"
    has_school_run: bool = False
    school_run_time: str = "07:45 AM"
    cooking_time: str = "08:00 PM"
    sleep_time: str = "10:30 PM"


class UserProfile(BaseModel):
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    city: str = "Delhi"
    lat: float = 28.6139
    lng: float = 77.2090
    commute_mode: CommuteMode = CommuteMode.CAR
    has_children: bool = False
    has_elderly: bool = False
    has_air_purifier: bool = False
    health_conditions: list[HealthCondition] = [HealthCondition.NONE]
    language: str = "en"
    schedule_habits: Optional[UserScheduleHabits] = Field(default_factory=UserScheduleHabits)


class UserProfileCreate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    city: str = "Delhi"
    lat: float = 28.6139
    lng: float = 77.2090
    commute_mode: CommuteMode = CommuteMode.CAR
    has_children: bool = False
    has_elderly: bool = False
    has_air_purifier: bool = False
    health_conditions: list[HealthCondition] = [HealthCondition.NONE]
    language: str = "en"
    schedule_habits: Optional[UserScheduleHabits] = Field(default_factory=UserScheduleHabits)


# ── Authentication ──────────────────────────────────────
class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: str = "Air Safe User"
    city: str = "New Delhi"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    message: str = "Authenticated successfully"


# ── Suggestions ─────────────────────────────────────────
class SuggestionCategory(str, Enum):
    ROUTINE = "Low-Emission Routine"
    INDOOR = "Indoor Air Quality"
    ALTERNATIVE = "Sustainable Alternative"
    HEALTH = "Health Impact"
    ALERT = "Alert"


class Suggestion(BaseModel):
    category: SuggestionCategory
    icon: str  # emoji
    title: str
    description: str
    impact: Optional[str] = None  # e.g. "Reduces PM2.5 exposure by 40%"


class SuggestionsResponse(BaseModel):
    aqi_data: AQIData
    suggestions: list[Suggestion]
    daily_summary: str
    safe_outdoor_window: Optional[str] = None  # e.g. "2 PM – 4 PM"


# ── Schedule & Routine Personalization ──────────────────
class ScheduleItem(BaseModel):
    id: str
    time: str
    activity: str
    detail: str
    icon: str
    risk_level: str  # "clean" | "moderate" | "unhealthy" | "hazardous"
    is_shifted: bool = False
    original_time: Optional[str] = None
    shift_benefit: Optional[str] = None
    completed: bool = False


class PersonalizedRoutineResponse(BaseModel):
    date: str
    city: str
    current_aqi: int
    aqi_category: str
    cigarette_equivalent: str
    cleanest_window: str
    peak_smog_window: str
    toxin_budget_score: int       # % of safe daily threshold consumed (e.g. 65)
    toxin_budget_status: str      # "Low Risk" | "Moderate" | "Approaching Limit" | "Exceeded"
    habits_summary: str
    schedule: list[ScheduleItem]            # User's current day anchors
    optimized_schedule: list[ScheduleItem]  # AI time-shifted schedule (clean air re-balance)
    forecast: list[dict]


# ── RAG & Citations ────────────────────────────────────
class CitationSource(BaseModel):
    id: int
    title: str
    doc_type: str
    region: str
    excerpt: str


# ── Chat ────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    user_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    language: Optional[str] = "en"  # "en" | "hi" | "hinglish"


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[Suggestion] = []
    citations: list[CitationSource] = []


# ── Commute Route Exposure Planner ──────────────────────
class CommuteRouteOption(BaseModel):
    mode: str
    name: str
    icon: str
    duration_mins: int
    estimated_pm25: float
    inhaled_dose_score: int  # 0 to 100 relative index (lower is cleaner)
    reduction_pct: int       # % reduction vs baseline open car / two-wheeler
    co2_grams: int           # estimated carbon footprint
    health_tips: list[str]


class CommutePlannerRequest(BaseModel):
    origin: str = "Home"
    destination: str = "Office"
    distance_km: float = 12.0
    lat: float = 28.6139
    lng: float = 77.2090
    city: str = "Delhi"


class CommutePlannerResponse(BaseModel):
    origin: str
    destination: str
    distance_km: float
    ambient_aqi: int
    ambient_pm25: float
    best_mode: str
    recommendation_summary: str
    routes: list[CommuteRouteOption]


# ── Doctor Health Summary Export ────────────────────────
class DoctorReportRequest(BaseModel):
    user_id: Optional[str] = None
    patient_name: str = "Patient"
    city: str = "Delhi"
    lat: float = 28.6139
    lng: float = 77.2090
    days_period: int = 14
    symptoms: list[str] = []
    medications: list[str] = []
    notes: Optional[str] = ""


class DoctorReportResponse(BaseModel):
    patient_name: str
    report_date: str
    period_days: int
    location: str
    average_aqi: int
    peak_aqi: int
    estimated_cigarette_total: int
    vulnerability_profile: list[str]
    symptoms_logged: list[str]
    medications_listed: list[str]
    clinical_evidence_findings: list[str]
    doctor_discussion_points: list[str]
    citations: list[CitationSource] = []
