from fastapi import APIRouter, HTTPException
from app.models.schemas import UserProfile, UserProfileCreate
from app.services.profile_service import (
    create_profile,
    get_profile,
    update_profile,
    delete_profile,
)

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/", response_model=UserProfile, status_code=201)
async def create_user_profile(data: UserProfileCreate):
    """Create a new user profile."""
    return await create_profile(data)


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """Get user profile by ID."""
    profile = await get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/{user_id}", response_model=UserProfile)
async def update_user_profile(user_id: str, data: UserProfileCreate):
    """Update user profile."""
    profile = await update_profile(user_id, data)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.delete("/{user_id}")
async def delete_user_profile(user_id: str):
    """Delete user profile."""
    success = await delete_profile(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted successfully"}
