"""
ingest.py — Build the ChromaDB vector store from docs/ folder.

Usage:
    python rag/ingest.py                    # full rebuild
    python rag/ingest.py --folder docs/who  # single folder
    python rag/ingest.py --reset            # wipe store first

The script:
  1. Walks docs/ recursively for .txt and .pdf files
  2. Splits each file into ~CHUNK_WORDS word chunks with OVERLAP_WORDS overlap
  3. Skips fragments < MIN_WORDS
  4. Extracts metadata from file header (SOURCE, DOC_TYPE, REGION, AUDIENCE)
  5. Embeds chunks with sentence-transformers
  6. Upserts into ChromaDB (persistent on disk)
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Optional

# ── Make project root importable ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from rag.config import (
    DOCS_DIR, CHROMA_DIR, EMBED_MODEL, COLLECTION_NAME,
    CHUNK_WORDS, OVERLAP_WORDS, MIN_WORDS, AUDIENCE_TAGS, REGION_TAGS, DOC_TYPES,
)

# ── Lazy imports (only load heavy libs when actually running) ─────────
def _get_chroma():
    import chromadb
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client


def _get_embed_fn():
    try:
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        return DefaultEmbeddingFunction()
    except Exception:
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
        return SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)


# ── Header metadata parser ────────────────────────────────────────────
def _parse_header(text: str) -> dict:
    """
    Extract metadata from the structured header lines at the top of each .txt doc.
    Expected format: KEY: value  (e.g. REGION: india)
    """
    meta: dict = {
        "source": "unknown",
        "doc_type": "guideline",
        "region": "global",
        "audience": "general",
    }
    for line in text.splitlines()[:20]:           # only scan first 20 lines
        for key in ("TITLE", "SOURCE", "DOC_TYPE", "REGION", "AUDIENCE", "URL", "YEAR"):
            if line.upper().startswith(f"{key}:"):
                val = line.split(":", 1)[1].strip()
                meta[key.lower()] = val
                break

    # Validate / normalise
    if meta.get("doc_type", "").lower() not in DOC_TYPES:
        meta["doc_type"] = "guideline"
    if meta.get("region", "").lower() not in REGION_TAGS:
        meta["region"] = "global"

    # Audience is a comma-separated list in the header; store as JSON string for Chroma
    raw_audience = meta.get("audience", "general")
    tags = [t.strip().lower() for t in raw_audience.split(",") if t.strip().lower() in AUDIENCE_TAGS]
    meta["audience"] = json.dumps(tags if tags else ["general"])

    return meta


# ── Text chunker ──────────────────────────────────────────────────────
def _chunk_text(text: str, source_meta: dict) -> list[dict]:
    """
    Split plain text into word-based chunks with overlap.
    Returns list of dicts: {text, metadata}
    Tables (lines starting with |) are kept as single chunks.
    """
    chunks: list[dict] = []
    words = text.split()

    # Detect and extract table blocks first (preserve as single chunk)
    table_pattern = re.compile(r"(\|.+\|[\s\S]*?)(?=\n\n|\Z)", re.MULTILINE)
    table_positions: list[tuple[int, int, str]] = []
    for m in table_pattern.finditer(text):
        table_positions.append((m.start(), m.end(), m.group()))

    # Remove table text from main word stream — tables handled separately
    cleaned_text = table_pattern.sub("\n", text)
    words = cleaned_text.split()

    # Sliding window chunking
    step = CHUNK_WORDS - OVERLAP_WORDS
    for i in range(0, max(1, len(words) - MIN_WORDS + 1), step):
        window = words[i: i + CHUNK_WORDS]
        if len(window) < MIN_WORDS:
            break
        chunk_text = " ".join(window)
        chunk_id = hashlib.md5(
            (source_meta.get("source", "") + chunk_text[:80]).encode()
        ).hexdigest()

        chunks.append({
            "id": chunk_id,
            "text": chunk_text,
            "metadata": {
                **source_meta,
                "chunk_index": len(chunks),
                "is_table": False,
            },
        })

    # Add table chunks
    for _, _, table_text in table_positions:
        table_words = table_text.split()
        if len(table_words) < MIN_WORDS:
            continue
        chunk_id = hashlib.md5(
            (source_meta.get("source", "") + table_text[:80]).encode()
        ).hexdigest()
        chunks.append({
            "id": chunk_id,
            "text": table_text.strip(),
            "metadata": {
                **source_meta,
                "chunk_index": len(chunks),
                "is_table": True,
            },
        })

    return chunks


# ── PDF loader (with OCR fallback) ───────────────────────────────────
def _load_pdf(path: Path) -> Optional[str]:
    """
    Try pypdf first; fall back to pytesseract OCR if no extractable text.
    Returns None and logs if both fail.
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(str(path))
        pages_text = []
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_text.append(f"[Page {page_num + 1}]\n{page_text}")
        full_text = "\n\n".join(pages_text)
        if full_text.strip():
            return full_text
        # No extractable text — attempt OCR
        raise ValueError("No extractable text in PDF")
    except Exception as e:
        print(f"  pypdf failed for {path.name}: {e} — attempting OCR...")
        try:
            import pytesseract
            from pdf2image import convert_from_path
            images = convert_from_path(str(path), dpi=150)
            ocr_pages = [pytesseract.image_to_string(img) for img in images]
            full_text = "\n\n".join(ocr_pages)
            if full_text.strip():
                print(f"  OCR succeeded: {len(full_text.split())} words extracted")
                return full_text
        except Exception as ocr_err:
            print(f"  OCR also failed for {path.name}: {ocr_err} — SKIPPED")
        return None


# ── Main ingestion ────────────────────────────────────────────────────
def ingest(folder: Optional[Path] = None, reset: bool = False) -> dict[str, int]:
    """
    Walk docs/ (or a specific folder), chunk files, embed, and upsert into ChromaDB.
    Returns chunk counts per source folder.
    """
    root = folder or DOCS_DIR
    client = _get_chroma()

    if reset:
        print("⚠  Resetting ChromaDB collection...")
        try:
            client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass

    embed_fn = _get_embed_fn()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )

    counts: dict[str, int] = {}
    skipped: list[str] = []

    files = list(root.rglob("*.txt")) + list(root.rglob("*.pdf"))
    if not files:
        print(f"No .txt or .pdf files found in {root}")
        return counts

    for filepath in sorted(files):
        folder_name = filepath.parent.name
        print(f"\n📄 Processing: {filepath.relative_to(DOCS_DIR)}")

        # Load content
        if filepath.suffix == ".pdf":
            text = _load_pdf(filepath)
            if text is None:
                skipped.append(str(filepath))
                continue
        else:
            text = filepath.read_text(encoding="utf-8", errors="replace")

        # Parse metadata from header
        meta = _parse_header(text)
        meta["source_file"] = str(filepath.relative_to(DOCS_DIR))
        meta["folder"] = folder_name

        # Chunk
        chunks = _chunk_text(text, meta)
        if not chunks:
            print(f"  ⚠ No chunks produced (too short?) — skipped")
            skipped.append(str(filepath))
            continue

        print(f"  → {len(chunks)} chunks | doc_type={meta['doc_type']} | region={meta['region']}")

        # Upsert into ChromaDB (batch of 100)
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i: i + batch_size]
            collection.upsert(
                ids=[c["id"] for c in batch],
                documents=[c["text"] for c in batch],
                metadatas=[{k: str(v) for k, v in c["metadata"].items()} for c in batch],
            )

        counts[folder_name] = counts.get(folder_name, 0) + len(chunks)

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("✅ INGEST COMPLETE")
    print("=" * 55)
    total = 0
    for folder_name, count in sorted(counts.items()):
        print(f"  {folder_name:<20} {count:>5} chunks")
        total += count
    print(f"  {'TOTAL':<20} {total:>5} chunks")
    if skipped:
        print(f"\n⚠  Skipped {len(skipped)} file(s):")
        for s in skipped:
            print(f"  - {s}")
    print(f"\nChromaDB collection '{COLLECTION_NAME}' stored at: {CHROMA_DIR}")
    return counts


# ── CLI ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest docs into ChromaDB")
    parser.add_argument("--folder", type=Path, default=None, help="Specific sub-folder to ingest")
    parser.add_argument("--reset", action="store_true", help="Wipe collection before ingesting")
    args = parser.parse_args()

    ingest(folder=args.folder, reset=args.reset)
