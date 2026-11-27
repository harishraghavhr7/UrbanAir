from fastapi import APIRouter, HTTPException, status
from app.models.schemas import AuthResponse, UserLoginRequest, UserRegisterRequest
from app.services.auth_service import (
    create_guest_user,
    init_default_demo_user,
    login_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.on_event("startup")
async def on_startup():
    await init_default_demo_user()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegisterRequest):
    """Register a new account and create an initial profile."""
    try:
        return await register_user(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(data: UserLoginRequest):
    """Authenticate with email and password."""
    try:
        return await login_user(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/guest", response_model=AuthResponse)
async def guest():
    """Create an instant guest profile session."""
    return await create_guest_user()
