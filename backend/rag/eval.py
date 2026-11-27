"""
eval.py — Run 20 test questions and report top-5 hit rate.

A "hit" = at least one of the expected source documents appears in the top-5
retrieved chunks (matched by source_file stem).

Usage:
    python rag/eval.py                     # run all 20 questions
    python rag/eval.py --verbose           # print chunk details per question
    python rag/eval.py --top-k 3           # test with top-3 retrieval
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from rag.retrieve import retrieve, UserProfile
from rag.config import TOP_K


def run_eval(top_k: int = TOP_K, verbose: bool = False) -> dict:
    """
    Run all eval questions, compute hit rate, and print a summary table.
    Returns a dict with per-question results and overall metrics.
    """
    questions_path = Path(__file__).parent / "eval_questions.json"
    questions = json.loads(questions_path.read_text())

    results = []
    hits = 0
    misses = []

    print(f"\n{'='*65}")
    print(f"  RAG EVAL — top_k={top_k}")
    print(f"{'='*65}")
    print(f"{'#':<4} {'Topic':<26} {'Hit?':<6} {'Best Match'}")
    print(f"{'-'*65}")

    for q in questions:
        profile_data = q.get("profile", {})
        profile = UserProfile(
            commute_mode=profile_data.get("commute_mode", "car"),
            has_children=profile_data.get("has_children", False),
            has_elderly=profile_data.get("has_elderly", False),
            has_air_purifier=profile_data.get("has_air_purifier", False),
            health_conditions=profile_data.get("health_conditions", ["none"]),
        )

        result = retrieve(
            query=q["question"],
            aqi=q["aqi"],
            profile=profile,
            region=q.get("region", "india"),
            top_k=top_k,
        )

        # Determine hit: does any retrieved chunk match any expected source?
        retrieved_stems = {
            Path(c.source_file).stem for c in result.chunks
        }
        expected_stems = set(q.get("expected_sources", []))
        is_hit = bool(retrieved_stems & expected_stems)

        if is_hit:
            hits += 1
            best_match = (retrieved_stems & expected_stems).pop()
        else:
            best_match = next(iter(retrieved_stems)) if retrieved_stems else "—"
            misses.append(q)

        status = "✅ YES" if is_hit else "❌ NO "
        print(f"{q['id']:<4} {q['topic']:<26} {status}  {best_match}")

        qr = {
            "id": q["id"],
            "topic": q["topic"],
            "question": q["question"],
            "aqi": q["aqi"],
            "expected_sources": q["expected_sources"],
            "retrieved_sources": list(retrieved_stems),
            "hit": is_hit,
            "fallback_used": result.fallback_used,
        }
        if verbose:
            print(f"     Q: {q['question']}")
            print(f"     Enriched: {result.query_enriched}")
            for i, chunk in enumerate(result.chunks, 1):
                print(f"     [{i}] {chunk.source_file} (dist={chunk.distance:.4f})")
            print()
        results.append(qr)

    total = len(questions)
    hit_rate = hits / total * 100

    print(f"{'='*65}")
    print(f"  TOTAL: {hits}/{total} hits  —  Hit Rate: {hit_rate:.1f}%")
    print(f"{'='*65}")

    if misses:
        print(f"\n⚠  Missed questions ({len(misses)}):")
        for m in misses:
            print(f"  [{m['id']}] {m['topic']}: \"{m['question'][:70]}\"")
            print(f"       Expected: {m['expected_sources']}")

    if hit_rate >= 80:
        print(f"\n✅ PASS — Hit rate {hit_rate:.1f}% meets the 80% threshold.")
    else:
        print(f"\n❌ FAIL — Hit rate {hit_rate:.1f}% is below 80%. See suggestions below.")
        print("  Suggestions to improve:")
        print("  1. Reduce CHUNK_WORDS (try 150) for more granular matching")
        print("  2. Add more region-specific documents to docs/cpcb/ or docs/epa/")
        print("  3. Expand OVERLAP_WORDS (try 60) for better boundary coverage")
        print("  4. Switch EMBED_MODEL to 'intfloat/multilingual-e5-small' for India-specific terms")
        print("  5. Check MISSING_SOURCES.md and download any available PDFs")

    return {
        "hit_rate": hit_rate,
        "hits": hits,
        "total": total,
        "results": results,
        "passed": hit_rate >= 80,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate RAG retrieval hit rate")
    parser.add_argument("--top-k", type=int, default=TOP_K)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    summary = run_eval(top_k=args.top_k, verbose=args.verbose)
    sys.exit(0 if summary["passed"] else 1)
