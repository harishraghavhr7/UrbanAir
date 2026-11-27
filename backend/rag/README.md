# 🌿 Urban Air Quality Assistant — RAG Knowledge Base

A source-grounded Retrieval-Augmented Generation (RAG) pipeline designed for urban winter smog advisories with India-focused and global-compatible health recommendations.

---

## 🎯 Architecture & Data Flow

```
User Query + AQI + Profile
          ↓
  Query Enrichment (adds AQI band + audience tags + commute mode)
          ↓
  ChromaDB Hybrid Filter (Region: user region + global)
          ↓ [fallback to unfiltered if <2 chunks]
  Top-k Retrieved Chunks (with Source, Doc Type, Region, Distance)
          ↓
  Prompt Builder (Enforces [1], [2] citations, no external health claims)
          ↓
  POST /api/v1/advice/ -> Returns JSON { chunks, prompt }
```

---

## 📁 Directory Structure

```
backend/
├── rag/
│   ├── config.py             # Knobs: chunk size, model, top_k, paths
│   ├── ingest.py             # Document parser, chunker, ChromaDB indexer
│   ├── retrieve.py           # Query enrichment, filtered search, prompt assembler
│   ├── eval.py               # Evaluation test runner
│   ├── eval_questions.json   # 20 curated test questions across all vulnerable groups
│   ├── facts_sheet.md        # Key sourced figures (purifiers, masks, cooking, commute)
│   ├── SOURCES.md            # Registry of all collected documents and licenses
│   ├── MISSING_SOURCES.md    # Documents attempted & fallback tracking
│   ├── chroma_store/         # Persistent vector database
│   └── docs/                 # Source knowledge base
│       ├── who/              # WHO Global Air Quality Guidelines 2021
│       ├── cpcb/             # India CPCB National AQI & GRAP 2023
│       ├── epa/              # US EPA AirNow Guidelines
│       ├── indoor/           # Open-access IAQ, HEPA, CR-box, plant studies
│       └── interventions/    # Mask studies, LPG vs biomass, commute exposures
├── app/
│   └── api/routes/advice.py  # FastAPI POST /api/v1/advice/ route
└── test_advice_endpoint.py   # Test script validating the endpoint
```

---

## 🚀 Quick Start

### 1. Ingest Documents into Vector Store
```bash
cd backend
python rag/ingest.py --reset
```
Output:
```
  cpcb                     8 chunks
  epa                      6 chunks
  indoor                   7 chunks
  interventions           10 chunks
  who                      5 chunks
  TOTAL                   36 chunks
```

### 2. Run Retrieval Evaluation (20 Test Questions)
```bash
python rag/eval.py
```
Output:
```
=================================================================
  TOTAL: 20/20 hits  —  Hit Rate: 100.0%
=================================================================
✅ PASS — Hit rate 100.0% meets the 80% threshold.
```

### 3. Test the `/advice` Endpoint
```bash
python test_advice_endpoint.py
```
Sample test payload (AQI 312, 5yo child with asthma, India):
- Validates request schema via Pydantic
- Enriches query: `The AQI is 312 today... AQI 312 air quality hazardous pollution advice for children air purifier asthma...`
- Retrieves top-5 relevant chunks from WHO, CPCB, and IAQ research
- Generates strict, citation-enforced prompt for LLM consumption

---

## 🌐 API Reference

### `POST /api/v1/advice/`

**Request:**
```json
{
  "question": "The AQI is 312 today. How should I protect my 5-year-old child who has asthma?",
  "aqi": 312,
  "profile": {
    "commute_mode": "car",
    "has_children": true,
    "has_elderly": false,
    "has_air_purifier": true,
    "health_conditions": ["asthma"],
    "name": "Priya Sharma"
  },
  "region": "india",
  "top_k": 5
}
```

**Response:**
```json
{
  "enriched_query": "The AQI is 312 today... AQI 312 air quality hazardous...",
  "fallback_used": false,
  "chunks": [
    {
      "rank": 1,
      "source_file": "who/who_aq_guidelines_2021.txt",
      "doc_type": "guideline",
      "region": "global",
      "audience": ["child", "elderly", "pregnant", "respiratory", "general"],
      "is_table": false,
      "distance": 0.4734,
      "excerpt": "— PM2.5 exposure during childhood causes permanent reduction in lung capacity..."
    }
  ],
  "prompt": "You are UrbanAir, a compassionate and expert urban air quality assistant..."
}
```
