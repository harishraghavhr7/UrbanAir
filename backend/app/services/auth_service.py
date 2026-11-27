"""
Auth Service — User registration, authentication, and session management.
Persisted in backend/app/data/users.json and linked to profiles.
"""
import hashlib
import json
import secrets
import uuid
from pathlib import Path
from typing import Optional

from app.models.schemas import (
    AuthResponse,
    UserLoginRequest,
    UserProfile,
    UserProfileCreate,
    UserRegisterRequest,
    UserScheduleHabits,
)
from app.services.profile_service import create_profile, get_profile, update_profile

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def _load_users_from_disk() -> dict[str, dict]:
    if not USERS_FILE.exists():
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load users: {e}")
        return {}


def _save_users_to_disk():
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(_users, f, indent=2)
    except Exception as e:
        print(f"Failed to save users: {e}")


# In-memory users store
_users: dict[str, dict] = _load_users_from_disk()


async def init_default_demo_user():
    """Ensure a ready-to-test Demo account exists on startup."""
    demo_email = "demo@urbsafe.ai"
    if demo_email not in _users:
        salt = secrets.token_hex(8)
        hashed = _hash_password("password123", salt)
        user_id = "user_demo_001"

        demo_profile = UserProfile(
            user_id=user_id,
            email=demo_email,
            name="Aryan Sharma",
            city="New Delhi",
            has_air_purifier=True,
            has_children=False,
            schedule_habits=UserScheduleHabits(
                wake_time="06:00 AM",
                exercise_type="morning_walk",
                exercise_time="06:30 AM",
                commute_departure="08:30 AM",
                commute_return="06:00 PM",
                cooking_time="08:00 PM",
                sleep_time="10:30 PM",
            ),
        )
        await update_profile(user_id, UserProfileCreate(**demo_profile.model_dump()))

        _users[demo_email] = {
            "user_id": user_id,
            "email": demo_email,
            "password_hash": hashed,
            "salt": salt,
            "name": "Aryan Sharma",
        }
        _save_users_to_disk()


async def register_user(data: UserRegisterRequest) -> AuthResponse:
    email_clean = data.email.strip().lower()
    if email_clean in _users:
        raise ValueError("An account with this email already exists.")

    salt = secrets.token_hex(8)
    password_hash = _hash_password(data.password, salt)
    user_id = str(uuid.uuid4())

    # Create linked profile
    profile_data = UserProfileCreate(
        name=data.name,
        email=email_clean,
        city=data.city,
    )
    profile = await update_profile(user_id, profile_data)

    _users[email_clean] = {
        "user_id": user_id,
        "email": email_clean,
        "password_hash": password_hash,
        "salt": salt,
        "name": data.name,
    }
    _save_users_to_disk()

    token = secrets.token_hex(16)
    return AuthResponse(
        access_token=token,
        user=profile,
        message="Account registered successfully!",
    )


async def login_user(data: UserLoginRequest) -> AuthResponse:
    await init_default_demo_user()
    email_clean = data.email.strip().lower()
    user_record = _users.get(email_clean)

    if not user_record:
        raise ValueError("Invalid email or password.")

    hashed = _hash_password(data.password, user_record["salt"])
    if hashed != user_record["password_hash"]:
        raise ValueError("Invalid email or password.")

    user_id = user_record["user_id"]
    profile = await get_profile(user_id)
    if not profile:
        profile = UserProfile(
            user_id=user_id,
            email=email_clean,
            name=user_record.get("name", "User"),
        )
        await update_profile(user_id, UserProfileCreate(**profile.model_dump()))

    token = secrets.token_hex(16)
    return AuthResponse(
        access_token=token,
        user=profile,
        message="Signed in successfully!",
    )


async def create_guest_user() -> AuthResponse:
    user_id = f"guest_{secrets.token_hex(4)}"
    guest_profile = UserProfile(
        user_id=user_id,
        name="Guest User",
        city="New Delhi",
        has_air_purifier=False,
    )
    profile = await update_profile(user_id, UserProfileCreate(**guest_profile.model_dump()))
    token = secrets.token_hex(16)
    return AuthResponse(
        access_token=token,
        user=profile,
        message="Guest session started",
    )
