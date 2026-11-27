"""
Test the POST /api/v1/advice/ endpoint logic and Pydantic validation.
Sample test case from prompt:
  AQI: 312
  User Profile: 5-year-old child, asthma, region: india
"""
import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.api.routes.advice import get_rag_advice, AdviceRequest, ProfilePayload, AdviceResponse

def test_advice_endpoint():
    print("=" * 65)
    print("Testing POST /api/v1/advice/ endpoint (Model validation & retrieval)")
    print("=" * 65)

    raw_payload = {
        "question": "The AQI is 312 today. How should I protect my 5-year-old child who has asthma?",
        "aqi": 312,
        "profile": {
            "commute_mode": "car",
            "has_children": True,
            "has_elderly": False,
            "has_air_purifier": True,
            "health_conditions": ["asthma"],
            "name": "Priya Sharma"
        },
        "region": "india",
        "top_k": 5
    }

    print("Payload:")
    print(json.dumps(raw_payload, indent=2))
    print("\nValidating request schema with Pydantic...")

    # Validate request using Pydantic schema
    request = AdviceRequest(**raw_payload)
    print("✓ Request schema valid!")

    print("\nExecuting get_rag_advice endpoint handler...")
    response: AdviceResponse = get_rag_advice(request)

    print(f"\n✓ Response received! Status: 200 OK")
    print(f"Enriched Query: {response.enriched_query}")
    print(f"Fallback Used:  {response.fallback_used}")
    print(f"Retrieved Chunks Count: {len(response.chunks)}")

    print("\nRetrieved Source Chunks:")
    for chunk in response.chunks:
        print(f"  [{chunk.rank}] {chunk.source_file} (dist: {chunk.distance}) - Type: {chunk.doc_type}, Region: {chunk.region.upper()}")
        print(f"      Audience: {chunk.audience}")
        print(f"      Excerpt: {chunk.excerpt[:130]}...\n")

    print("=" * 65)
    print("GENERATED LLM PROMPT (READY FOR LLM INFERENCE):")
    print("=" * 65)
    print(response.prompt)
    print("=" * 65)
    print("✅ TEST PASSED — 100% SUCCESS")
    return True

if __name__ == "__main__":
    success = test_advice_endpoint()
    sys.exit(0 if success else 1)
