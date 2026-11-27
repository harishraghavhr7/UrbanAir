from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.aqi_service import fetch_aqi
from app.services.profile_service import get_profile
from app.ai.suggestion_engine import chat_with_assistant

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    RAG-grounded conversational AI endpoint.
    Retrieves evidence-backed chunks, cites sources [1], [2],
    and supports multilingual responses (en, hi, hinglish).
    """
    aqi_context = None
    if request.lat and request.lng:
        aqi_context = await fetch_aqi(request.lat, request.lng)

    profile = await get_profile(request.user_id) if request.user_id else None

    reply, citations = await chat_with_assistant(
        message=request.message,
        history=request.history,
        aqi_context=aqi_context,
        user_profile=profile,
        language=request.language or "en",
    )

    return ChatResponse(reply=reply, citations=citations)
