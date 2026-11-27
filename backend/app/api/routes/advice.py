"""
FastAPI endpoint: POST /advice
Returns retrieved source chunks + built LLM prompt (no LLM call).

Add this router to backend/app/main.py:
    from app.api.routes.advice import router as advice_router
    app.include_router(advice_router, prefix="/api/v1")
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import sys
from pathlib import Path

# Make rag module importable from routes
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from rag.retrieve import get_advice, UserProfile

router = APIRouter(prefix="/advice", tags=["RAG Advice"])


# ── Request / Response schemas ─────────────────────────────────────────
class ProfilePayload(BaseModel):
    commute_mode: str = Field("car", description="car | metro | walk | cycle | wfh")
    has_children: bool = False
    has_elderly: bool = False
    has_air_purifier: bool = False
    health_conditions: list[str] = Field(default_factory=lambda: ["none"])
    name: Optional[str] = None


class AdviceRequest(BaseModel):
    question: str = Field(..., min_length=3, description="User's natural language question")
    aqi: int = Field(..., ge=0, le=500, description="Current AQI value")
    profile: ProfilePayload = Field(default_factory=ProfilePayload)
    region: str = Field("india", description="User's region: india | us | global")
    top_k: int = Field(5, ge=1, le=10, description="Number of source chunks to retrieve")


class ChunkOut(BaseModel):
    rank: int
    source_file: str
    doc_type: str
    region: str
    audience: list[str]
    is_table: bool
    distance: float
    excerpt: str


class AdviceResponse(BaseModel):
    enriched_query: str
    fallback_used: bool
    chunks: list[ChunkOut]
    prompt: str                # ready-to-send LLM prompt; call your LLM externally


# ── Endpoint ───────────────────────────────────────────────────────────
@router.post("/", response_model=AdviceResponse)
def get_rag_advice(request: AdviceRequest) -> AdviceResponse:
    """
    Retrieve source-grounded context chunks and build a personalized LLM prompt.

    Flow:
      1. Enrich query with AQI band + household audience
      2. Filter ChromaDB by region (india + global, or us + global)
      3. Fall back to unfiltered if < 2 results
      4. Build a cited prompt ready for any LLM

    **Does not call an LLM** — the caller feeds `prompt` to their LLM of choice.
    """
    try:
        profile = UserProfile(
            commute_mode=request.profile.commute_mode,
            has_children=request.profile.has_children,
            has_elderly=request.profile.has_elderly,
            has_air_purifier=request.profile.has_air_purifier,
            health_conditions=request.profile.health_conditions,
            name=request.profile.name,
        )

        result = get_advice(
            question=request.question,
            aqi=request.aqi,
            profile=profile,
            region=request.region,
            top_k=request.top_k,
        )

        return AdviceResponse(**result)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Health check for RAG subsystem ─────────────────────────────────────
@router.get("/health", tags=["RAG Advice"])
async def rag_health():
    """Check if the ChromaDB collection is populated."""
    try:
        import chromadb
        from rag.config import CHROMA_DIR, COLLECTION_NAME
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        embed_fn = DefaultEmbeddingFunction()
        col = client.get_or_create_collection(
            name=COLLECTION_NAME, embedding_function=embed_fn
        )
        count = col.count()
        return {
            "status": "ok" if count > 0 else "empty",
            "chunk_count": count,
            "collection": COLLECTION_NAME,
        }
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
