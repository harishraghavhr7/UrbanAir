"""
RAG Configuration — all tuneable knobs in one place.
Override via environment variables where noted.
"""
from pathlib import Path
import os

# ── Paths ────────────────────────────────────────────────────────────
RAG_DIR       = Path(__file__).parent
DOCS_DIR      = RAG_DIR / "docs"
CHROMA_DIR    = RAG_DIR / "chroma_store"
SOURCES_MD    = RAG_DIR / "SOURCES.md"
MISSING_MD    = RAG_DIR / "MISSING_SOURCES.md"
FACTS_SHEET   = RAG_DIR / "facts_sheet.md"

# ── Embedding model ──────────────────────────────────────────────────
# DefaultEmbeddingFunction uses ONNX all-MiniLM-L6-v2 locally (reliable & self-contained)
EMBED_MODEL: str = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")

# ── Chunking ─────────────────────────────────────────────────────────
CHUNK_WORDS:   int = int(os.getenv("CHUNK_WORDS",   "250"))  # target words per chunk
OVERLAP_WORDS: int = int(os.getenv("OVERLAP_WORDS",  "40"))  # overlap in words
MIN_WORDS:     int = int(os.getenv("MIN_WORDS",       "40"))  # skip fragments below this

# ── Retrieval ────────────────────────────────────────────────────────
TOP_K:         int = int(os.getenv("TOP_K",            "5"))
COLLECTION_NAME: str = "urban_air_quality"

# ── Audience tags ────────────────────────────────────────────────────
AUDIENCE_TAGS = ["child", "elderly", "pregnant", "respiratory", "general"]

# ── Region tags ──────────────────────────────────────────────────────
REGION_TAGS   = ["global", "india", "us"]

# ── Doc types ────────────────────────────────────────────────────────
DOC_TYPES     = ["guideline", "advisory", "research", "intervention"]

# ── AQI bands (for query enrichment) ─────────────────────────────────
def aqi_band(aqi: int) -> str:
    if aqi <= 50:   return "good"
    if aqi <= 100:  return "moderate"
    if aqi <= 150:  return "unhealthy_sensitive"
    if aqi <= 200:  return "unhealthy"
    if aqi <= 300:  return "very_unhealthy"
    return "hazardous"
