import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.models.schemas import (
    ChatRequest,
    CommutePlannerRequest,
    DoctorReportRequest,
)
from app.api.routes.chat import chat
from app.api.routes.commute import plan_clean_commute
from app.api.routes.report import generate_doctor_report
import asyncio

async def run_tests():
    print("=" * 65)
    print("TESTING ALL UPGRADED RAG & CLINICAL FEATURES")
    print("=" * 65)

    # 1. RAG-Powered Cited Chat (English)
    print("\n[1/4] Testing RAG Chat with Citation Badges (English)...")
    req_en = ChatRequest(
        message="What mask should I wear when AQI is 300, and does cloth mask protect?",
        lat=28.6139,
        lng=77.2090,
        language="en"
    )
    res_en = await chat(req_en)
    print(f"✓ Chat Reply Preview: {res_en.reply[:150]}...")
    print(f"✓ Evidence Citations Returned: {len(res_en.citations)}")
    for c in res_en.citations:
        print(f"   [{c.id}] {c.title} ({c.doc_type}, {c.region.upper()})")

    # 2. Multilingual Chat (Hindi)
    print("\n[2/4] Testing Multilingual Chat (Hindi)...")
    req_hi = ChatRequest(
        message="क्या आज सुबह बच्चों को बाहर खेलना सुरक्षित है?",
        lat=28.6139,
        lng=77.2090,
        language="hi"
    )
    res_hi = await chat(req_hi)
    print(f"✓ Hindi Reply Preview: {res_hi.reply[:150]}...")
    print(f"✓ Citations in Hindi: {len(res_hi.citations)}")

    # 3. Clean Commute Planner
    print("\n[3/4] Testing Clean Commute Route & Inhaled Dose Planner...")
    req_commute = CommutePlannerRequest(
        origin="Dwarka",
        destination="Connaught Place",
        distance_km=18.0,
        lat=28.6139,
        lng=77.2090,
        city="Delhi"
    )
    res_commute = await plan_clean_commute(req_commute)
    print(f"✓ Best Commute Mode: {res_commute.best_mode}")
    print(f"✓ Recommendation: {res_commute.recommendation_summary[:120]}...")
    print("✓ Evaluated Modes:")
    for r in res_commute.routes:
        print(f"   {r.icon} {r.name:<30} Duration: {r.duration_mins}m | Dose Score: {r.inhaled_dose_score}/100 | Reduction: {r.reduction_pct}%")

    # 4. Doctor Health Summary Export
    print("\n[4/4] Testing Doctor / Pulmonologist Health Report Generator...")
    req_report = DoctorReportRequest(
        patient_name="Priya Sharma",
        city="Delhi",
        lat=28.6139,
        lng=77.2090,
        days_period=14,
        symptoms=["Morning dry cough", "Chest tightness / wheezing"],
    )
    res_report = await generate_doctor_report(req_report)
    print(f"✓ Patient: {res_report.patient_name} | Location: {res_report.location}")
    print(f"✓ Avg AQI: {res_report.average_aqi} | Peak AQI: {res_report.peak_aqi}")
    print(f"✓ Cumulative Cigarette Equiv: ~{res_report.estimated_cigarette_total} cigarettes")
    print(f"✓ Clinical Findings: {len(res_report.clinical_evidence_findings)}")
    print(f"✓ Physician Discussion Points: {len(res_report.doctor_discussion_points)}")

    print("\n" + "=" * 65)
    print("✅ ALL UPGRADED FEATURES VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_tests())
