"""
retrieve.py — Query enrichment, filtered retrieval from ChromaDB, and prompt building.

Public API:
    retrieve(query, aqi, profile, region, top_k) -> RetrievalResult
    build_prompt(query, aqi, profile, result)    -> str  (ready to send to LLM)
"""

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from rag.config import (
    CHROMA_DIR, EMBED_MODEL, COLLECTION_NAME, TOP_K, aqi_band,
)


# ── Data models ───────────────────────────────────────────────────────
@dataclass
class Chunk:
    text: str
    source_file: str
    doc_type: str
    region: str
    audience: list[str]
    is_table: bool
    distance: float          # cosine distance (lower = more similar)


@dataclass
class RetrievalResult:
    query_original: str
    query_enriched: str
    chunks: list[Chunk]
    fallback_used: bool = False   # True if region filter returned nothing


@dataclass
class UserProfile:
    commute_mode: str = "car"
    has_children: bool = False
    has_elderly: bool = False
    has_air_purifier: bool = False
    health_conditions: list[str] = field(default_factory=lambda: ["none"])
    name: Optional[str] = None


# ── Lazy Chroma client ────────────────────────────────────────────────
_collection = None

def _get_collection():
    global _collection
    if _collection is None:
        import chromadb
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        embed_fn = DefaultEmbeddingFunction()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=embed_fn,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


# ── Query enrichment ──────────────────────────────────────────────────
def enrich_query(query: str, aqi: int, profile: UserProfile) -> str:
    """
    Append AQI band and audience tags to the query so the embedding captures
    semantically relevant dimensions beyond the literal question.
    """
    band = aqi_band(aqi)

    # Determine audience group from profile
    audience_parts: list[str] = []
    if profile.has_children:
        audience_parts.append("children")
    if profile.has_elderly:
        audience_parts.append("elderly")
    if profile.has_air_purifier:
        audience_parts.append("air purifier")
    if "asthma" in profile.health_conditions:
        audience_parts.append("asthma respiratory")
    if "heart_disease" in profile.health_conditions:
        audience_parts.append("cardiovascular")
    if "copd" in profile.health_conditions:
        audience_parts.append("COPD respiratory")
    if not audience_parts:
        audience_parts.append("general population")

    audience_str = " ".join(audience_parts)
    enriched = (
        f"{query} "
        f"AQI {aqi} air quality {band.replace('_', ' ')} "
        f"pollution advice for {audience_str} "
        f"commute mode {profile.commute_mode}"
    )
    return enriched.strip()


# ── Chroma metadata filter builder ───────────────────────────────────
def _build_where(region: str, profile: UserProfile) -> Optional[dict]:
    """
    Build a ChromaDB 'where' filter that keeps:
    - docs from the user's region OR global
    Region filter is the primary dimension; audience tags are handled
    by query enrichment rather than hard filtering to avoid over-restriction.
    """
    regions_to_include = ["global"]
    if region and region.lower() in ("india", "in"):
        regions_to_include.append("india")
    elif region and region.lower() in ("us", "usa"):
        regions_to_include.append("us")

    if len(regions_to_include) == 1:
        return {"region": {"$eq": "global"}}
    return {"region": {"$in": regions_to_include}}


# ── Core retrieval ────────────────────────────────────────────────────
def retrieve(
    query: str,
    aqi: int,
    profile: Optional[UserProfile] = None,
    region: str = "india",
    top_k: int = TOP_K,
) -> RetrievalResult:
    """
    1. Enrich the query with AQI band + audience context
    2. Run filtered ChromaDB similarity search
    3. Fall back to unfiltered search if filtered returns < 2 results
    4. Return RetrievalResult with sourced chunks
    """
    if profile is None:
        profile = UserProfile()

    enriched = enrich_query(query, aqi, profile)
    collection = _get_collection()
    where = _build_where(region, profile)
    fallback = False

    # ── Filtered search ───────────────────────────────────────────────
    try:
        results = collection.query(
            query_texts=[enriched],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        results = {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    docs = results["documents"][0] if results["documents"] else []
    metas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results["distances"] else []

    # ── Fallback: unfiltered ──────────────────────────────────────────
    if len(docs) < 2:
        fallback = True
        try:
            results = collection.query(
                query_texts=[enriched],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
            docs = results["documents"][0] if results["documents"] else []
            metas = results["metadatas"][0] if results["metadatas"] else []
            distances = results["distances"][0] if results["distances"] else []
        except Exception:
            docs, metas, distances = [], [], []

    # ── Build Chunk objects ───────────────────────────────────────────
    chunks: list[Chunk] = []
    for doc, meta, dist in zip(docs, metas, distances):
        audience_raw = meta.get("audience", '["general"]')
        try:
            audience_list = json.loads(audience_raw)
        except Exception:
            audience_list = ["general"]

        chunks.append(Chunk(
            text=doc,
            source_file=meta.get("source_file", "unknown"),
            doc_type=meta.get("doc_type", "guideline"),
            region=meta.get("region", "global"),
            audience=audience_list,
            is_table=meta.get("is_table", "False") == "True",
            distance=float(dist),
        ))

    return RetrievalResult(
        query_original=query,
        query_enriched=enriched,
        chunks=chunks,
        fallback_used=fallback,
    )


# ── Prompt builder ────────────────────────────────────────────────────
def build_prompt(
    query: str,
    aqi: int,
    profile: UserProfile,
    result: RetrievalResult,
) -> str:
    """
    Assemble the final LLM prompt:
    - System instructions (source-grounded, citation-required)
    - AQI context block
    - User household profile
    - Numbered source excerpts
    - User question
    """
    band = aqi_band(aqi).replace("_", " ").title()

    # ── Profile summary ───────────────────────────────────────────────
    household_parts: list[str] = []
    if profile.has_children:
        household_parts.append("children at home")
    if profile.has_elderly:
        household_parts.append("elderly members at home")
    if profile.has_air_purifier:
        household_parts.append("has HEPA air purifier")
    else:
        household_parts.append("no air purifier")
    conditions = [c for c in profile.health_conditions if c != "none"]
    if conditions:
        household_parts.append(f"health conditions: {', '.join(conditions)}")
    household_str = "; ".join(household_parts) if household_parts else "general household"

    # ── Source excerpts ───────────────────────────────────────────────
    excerpts_block = ""
    for idx, chunk in enumerate(result.chunks, start=1):
        source_label = Path(chunk.source_file).stem.replace("_", " ").title()
        table_note = " [TABLE]" if chunk.is_table else ""
        excerpts_block += (
            f"[{idx}]{table_note} SOURCE: {source_label} | Region: {chunk.region.upper()}"
            f" | Type: {chunk.doc_type}\n"
            f"{chunk.text.strip()}\n\n"
        )

    if not excerpts_block:
        excerpts_block = "[No relevant source excerpts found in knowledge base]\n"

    # ── Fallback notice ───────────────────────────────────────────────
    fallback_note = (
        "\n⚠ Note: No region-specific documents matched; excerpts are from global sources.\n"
        if result.fallback_used else ""
    )

    prompt = f"""You are UrbanAir, a compassionate and expert urban air quality assistant grounded in evidence-based health guidelines.

## INSTRUCTIONS
- Use ONLY the numbered source excerpts below to support any health claims or recommendations.
- Cite sources inline as [1], [2], etc. after each claim that relies on them.
- If the excerpts do not cover the question, say so explicitly rather than improvising.
- After each recommendation, explain its direct health impact in one sentence.
- Keep language warm, practical, and accessible to non-specialists.
- Structure the response with clear sections if multiple topics are covered.

## CURRENT AIR QUALITY CONTEXT
- Location: {profile.name or "User's location"}
- AQI: {aqi} ({band})
- AQI Band: {aqi_band(aqi).replace("_", " ")}

## HOUSEHOLD PROFILE
- Commute mode: {profile.commute_mode}
- {household_str}

## SOURCE EXCERPTS (use only these for health claims)
{excerpts_block.strip()}
{fallback_note}
## USER QUESTION
{query}

## YOUR RESPONSE
"""
    return prompt


# ── Convenience: retrieve + build prompt in one call ──────────────────
def get_advice(
    question: str,
    aqi: int,
    profile: Optional[UserProfile] = None,
    region: str = "india",
    top_k: int = TOP_K,
) -> dict:
    """
    Returns a dict with:
      - enriched_query: str
      - chunks: list of chunk dicts (for the API response)
      - prompt: str (ready for LLM)
      - fallback_used: bool
    """
    if profile is None:
        profile = UserProfile()

    result = retrieve(question, aqi, profile, region, top_k)
    prompt = build_prompt(question, aqi, profile, result)

    return {
        "enriched_query": result.query_enriched,
        "fallback_used": result.fallback_used,
        "chunks": [
            {
                "rank": i + 1,
                "source_file": c.source_file,
                "doc_type": c.doc_type,
                "region": c.region,
                "audience": c.audience,
                "is_table": c.is_table,
                "distance": round(c.distance, 4),
                "excerpt": c.text[:400] + ("..." if len(c.text) > 400 else ""),
            }
            for i, c in enumerate(result.chunks)
        ],
        "prompt": prompt,
    }
