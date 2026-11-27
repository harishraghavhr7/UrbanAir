from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Always point to backend/.env regardless of current working directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # AI
    gemini_api_key: str = ""

    # Weather / AQI
    openweather_api_key: str = ""
    waqi_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # App
    app_env: str = "development"
    secret_key: str = "change_me"
    aqi_cache_ttl: int = 1800  # 30 min

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
