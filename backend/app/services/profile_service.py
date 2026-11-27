"""
Profile Service — CRUD for user profiles with JSON file persistence.
Profiles persist across server restarts and page refreshes.
"""
import json
import uuid
from pathlib import Path
from typing import Optional

from app.models.schemas import UserProfile, UserProfileCreate

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROFILES_FILE = DATA_DIR / "profiles.json"


def _load_profiles_from_disk() -> dict[str, UserProfile]:
    if not PROFILES_FILE.exists():
        return {}
    try:
        with open(PROFILES_FILE, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            return {
                user_id: UserProfile(**profile_dict)
                for user_id, profile_dict in raw_data.items()
            }
    except Exception as e:
        print(f"Warning: Failed to load profiles from {PROFILES_FILE}: {e}")
        return {}


def _save_profiles_to_disk():
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        serialized = {
            user_id: profile.model_dump()
            for user_id, profile in _profiles.items()
        }
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump(serialized, f, indent=2, default=str)
    except Exception as e:
        print(f"Warning: Failed to persist profiles to disk: {e}")


# Initialize in-memory cache from disk
_profiles: dict[str, UserProfile] = _load_profiles_from_disk()


async def create_profile(data: UserProfileCreate) -> UserProfile:
    user_id = str(uuid.uuid4())
    profile = UserProfile(user_id=user_id, **data.model_dump())
    _profiles[user_id] = profile
    _save_profiles_to_disk()
    return profile


async def get_profile(user_id: str) -> Optional[UserProfile]:
    if user_id in _profiles:
        return _profiles[user_id]
    # Fallback reload from disk if server restarted
    reloaded = _load_profiles_from_disk()
    if user_id in reloaded:
        _profiles[user_id] = reloaded[user_id]
        return reloaded[user_id]
    return None


async def update_profile(user_id: str, data: UserProfileCreate) -> Optional[UserProfile]:
    # If profile does not exist yet, create with the requested user_id so client state remains consistent
    profile = UserProfile(user_id=user_id, **data.model_dump())
    _profiles[user_id] = profile
    _save_profiles_to_disk()
    return profile


async def delete_profile(user_id: str) -> bool:
    if user_id in _profiles:
        del _profiles[user_id]
        _save_profiles_to_disk()
        return True
    return False
