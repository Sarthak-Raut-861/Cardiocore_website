#!/usr/bin/env python3
import pathlib
import re
import shutil
import subprocess

EDI_WEB_ROOT = pathlib.Path(r"C:\Users\Sarthak Raut\Desktop\EDI Website")
EDGE_TWIN_ROOT = pathlib.Path(r"C:\Users\Sarthak Raut\Desktop\CardioCoreEdge-EDI1\cardiovascular_twin")
NEXT_DIR = EDI_WEB_ROOT / "cardiocore-next"
BACKEND_DIR = EDI_WEB_ROOT / "backend"


def step_1_restore_and_fix_ui() -> None:
    print("[1/3] Restoring original TypeScript files from commit 88548f6~1...")
    subprocess.run(["git", "checkout", "88548f6~1", "--", "src"], cwd=str(NEXT_DIR), check=False)

    src_dir = NEXT_DIR / "src"
    print("[2/3] Applying TypeScript-safe UI, icon, contrast, and button fixes...")
    for path in src_dir.rglob("*.ts*"):
        text = path.read_text(encoding="utf-8")
        updated = (
            text.replace("&starf;", "\u2605")
            .replace("[\U0001f5d9]", "\u2715")
            .replace("\U0001f5d9", "\u2715")
        )
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print(f"  [FIXED ICONS] {path.relative_to(NEXT_DIR)}")

    globals_css = src_dir / "app" / "globals.css"
    if globals_css.exists():
        css = globals_css.read_text(encoding="utf-8")
        patch = """
/* === CardioCore UI Polish, Alignment & Contrast Fixes === */
:root {
  --teal-ink: #053B3C;
  --teal-700: #065E60;
  --green: #0A7B50;
}
section[id], div[id] {
  scroll-margin-top: 6.5rem;
}
header {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
"""
        if "CardioCore UI Polish" not in css:
            globals_css.write_text(css + "\n" + patch, encoding="utf-8")
            print("  [UPDATED] src/app/globals.css")

    spec_file = src_dir / "features" / "landing" / "components" / "specialists-section.tsx"
    if spec_file.exists():
        st = spec_file.read_text(encoding="utf-8")
        st_new = st.replace("&starf;", "\u2605")
        st_new = st_new.replace('variant="teal"', 'variant="stable"')
        st_new = st_new.replace('variant="hover"', 'variant="interactive"')
        st_new = st_new.replace(
            'variant={doc.mode === "Video" ? "purple" : doc.mode === "In-person" ? "teal" : "cyan"}',
            'variant={doc.mode === "Video" ? "twin" : doc.mode === "In-person" ? "stable" : "data"}',
        )
        st_new = re.sub(
            r'<Button(?![^>]*onClick)([^>]*?)>\s*Book\s*</Button>',
            r'<Button\1 onClick={() => window.location.assign("/patient")}>Book</Button>',
            st_new,
        )
        st_new = re.sub(
            r'<button(?![^>]*onClick)([^>]*?)>\s*Book\s*</button>',
            r'<button\1 onClick={() => window.location.assign("/patient")}>Book</button>',
            st_new,
        )
        if st_new != st:
            spec_file.write_text(st_new, encoding="utf-8")
            print("  [UPDATED] src/features/landing/components/specialists-section.tsx")

    modal_file = src_dir / "features" / "doctor" / "components" / "doctor-patient-modal.tsx"
    if modal_file.exists():
        mt = modal_file.read_text(encoding="utf-8")
        mt_new = mt.replace(
            "patient: any;\n  onClose: () => void;",
            "patient?: any;\n  onClose?: () => void;",
        )
        if mt_new != mt:
            modal_file.write_text(mt_new, encoding="utf-8")

    for p_file in (src_dir / "features" / "patient").rglob("*.tsx"):
        pt = p_file.read_text(encoding="utf-8")
        pt_new = pt.replace('{formatUnit("hr", 68)}', '{formatUnit("hr", 68).display}')
        pt_new = re.sub(
            r'(<button(?![^>]*title=)[^>]*?)>\s*SI\s*</button>',
            r'\1 title="International System of Units (mmol/L)">SI</button>',
            pt_new,
        )
        pt_new = re.sub(
            r'(<button(?![^>]*title=)[^>]*?)>\s*Conv\s*</button>',
            r'\1 title="Conventional Units (mg/dL)">Conv</button>',
            pt_new,
        )
        if pt_new != pt:
            p_file.write_text(pt_new, encoding="utf-8")


def step_2_connect_cardiovascular_twin() -> None:
    print("[3/3] Connecting CardioCoreEdge-EDI1/cardiovascular_twin into EDI Website/backend...")
    if not EDGE_TWIN_ROOT.exists():
        print(f"  ! Could not find {EDGE_TWIN_ROOT}")
        return

    dest_twin = BACKEND_DIR / "cardiovascular_twin"
    dest_twin.mkdir(parents=True, exist_ok=True)
    for folder in ("src", "telemetry", "models"):
        src_folder = EDGE_TWIN_ROOT / folder
        if src_folder.exists():
            shutil.copytree(src_folder, dest_twin / folder, dirs_exist_ok=True)
            print(f"  [SYNCED] cardiovascular_twin/{folder} -> backend/cardiovascular_twin/{folder}")

    twin_router_path = BACKEND_DIR / "app" / "routers" / "twin.py"
    twin_router_code = '''"""
CardioCore Digital Twin & 72-Factor Engine APIRouter
Bridges CardioCoreEdge-EDI1/cardiovascular_twin into EDI Website/backend (/api/v1/twin/*)
while preserving synthetic Demo Mode fallback.
"""

import sys
from pathlib import Path
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException

TWIN_ROOT = Path(__file__).resolve().parents[2] / "cardiovascular_twin"
if str(TWIN_ROOT) not in sys.path:
    sys.path.insert(0, str(TWIN_ROOT))

from src.biomarker_twin import BiomarkerTwin, BiomarkerClusterer, generate_cohort
from src.data_simulator import PRESET_PROFILES, SimulatedWearableSource, UserProfile
from src.factors72 import FACTORS, FACTOR_IDS

router = APIRouter(prefix="/twin", tags=["Cardiovascular Digital Twin"])


@router.get("/factors")
async def list_72_factors():
    """Return all 72 physiological & clinical factors from CardioCoreEdge-EDI1."""
    return {
        "count": len(FACTOR_IDS),
        "factors": [
            {
                "id": fid,
                "name": FACTORS[fid].name,
                "category": FACTORS[fid].category,
                "direction": FACTORS[fid].direction,
            }
            for fid in FACTOR_IDS
        ],
    }


@router.post("/simulate")
async def simulate_digital_twin(payload: Optional[Dict[str, Any]] = None):
    """Run the real 72-factor -> BiomarkerTwin -> CVD Risk & Cohort Cluster pipeline."""
    body = payload or {}
    preset_name = str(body.get("preset", "typical"))
    scenario = str(body.get("scenario", "stable"))
    days = min(max(int(body.get("days", 60)), 14), 180)
    seed = int(body.get("seed", 42))

    if scenario not in ("stable", "improving", "declining"):
        raise HTTPException(status_code=422, detail="scenario must be stable, improving, or declining")

    base_user: UserProfile = PRESET_PROFILES.get(preset_name, PRESET_PROFILES["typical"])
    user_dict = base_user.to_dict()
    if "profile" in body and isinstance(body["profile"], dict):
        user_dict.update(body["profile"])

    twin = BiomarkerTwin(user_dict)
    source = SimulatedWearableSource(base_user, scenario=scenario, seed=seed, lab_interval_days=None)
    for idx, obs in enumerate(source.next_days(days)):
        twin.update(obs, day_index=idx)

    s = twin.state
    cohort_X, cohort_cvd = generate_cohort(160, seed=7)
    clusterer = BiomarkerClusterer().fit(cohort_X, cohort_cvd)
    pts = clusterer.cohort_points_2d(cohort_X)
    step = max(1, len(pts) // 90)
    scatter = [
        {
            "x": round(float(pts.iloc[i]["pc1"]), 2),
            "y": round(float(pts.iloc[i]["pc2"]), 2),
            "cluster": pts.iloc[i]["cluster"],
        }
        for i in range(0, len(pts), step)
    ]

    trajectory = [
        {
            "day": i,
            "cvd": round(float(cvd), 4),
            **{b: round(float(row[b]), 2) for b in ("TC", "HDL", "LDL", "TG", "CRP", "DD")},
        }
        for i, (_, cvd), row in zip(range(len(twin.risk_history)), twin.risk_history, twin.biomarker_history)
    ]

    return {
        "mode": "live_twin_engine",
        "scenario": scenario,
        "days": days,
        "biomarkers": s.biomarkers,
        "derived": s.derived,
        "categories": s.categories,
        "adjusted": s.adjusted,
        "cvd_score": s.cvd_score,
        "cvd_category": s.cvd_category,
        "ctr": s.ctr,
        "ctr_category": s.ctr_category,
        "pathways": s.pathway_risk,
        "cluster": {
            "label": s.cluster["label"],
            "confidence": s.cluster["confidence"],
            "pc1": s.cluster.get("pc1"),
            "pc2": s.cluster.get("pc2"),
            "scatter": scatter,
        },
        "trend": twin.trend,
        "baselines": twin.baseline_table(),
        "top_contributions": s.top_contributions,
        "alerts": twin.alerts_raised[-12:],
        "trajectory": trajectory,
    }
'''
    twin_router_path.write_text(twin_router_code, encoding="utf-8")
    print("  [CREATED] backend/app/routers/twin.py")

    main_py = BACKEND_DIR / "app" / "main.py"
    if main_py.exists():
        m_text = main_py.read_text(encoding="utf-8")
        if "twin" not in m_text:
            m_text = m_text.replace(
                "from app.routers import auth, patients, doctors, telemetry",
                "from app.routers import auth, patients, doctors, telemetry, twin",
            )
            m_text = m_text.replace(
                "app.include_router(telemetry.router, prefix=settings.API_V1_STR)",
                "app.include_router(telemetry.router, prefix=settings.API_V1_STR)\napp.include_router(twin.router, prefix=settings.API_V1_STR)",
            )
            main_py.write_text(m_text, encoding="utf-8")
            print("  [UPDATED] backend/app/main.py (Mounted /api/v1/twin router)")


if __name__ == "__main__":
    step_1_restore_and_fix_ui()
    step_2_connect_cardiovascular_twin()
    print("\nAll UI fixes and Cardiovascular Twin backend integration complete!")
