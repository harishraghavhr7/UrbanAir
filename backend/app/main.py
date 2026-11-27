"""
Urban Air Quality Assistant — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import aqi, profile, chat, routine, advice, commute, report, auth

app = FastAPI(
    title="Urban Air Quality Assistant API",
    description="GenAI-powered air quality assistant for families and communities.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(aqi.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(routine.router, prefix="/api/v1")
app.include_router(advice.router, prefix="/api/v1")
app.include_router(commute.router, prefix="/api/v1")
app.include_router(report.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "Urban Air Quality Assistant API"}


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "🌿 Urban Air Quality Assistant API",
        "docs": "/docs",
        "version": "1.0.0",
    }
