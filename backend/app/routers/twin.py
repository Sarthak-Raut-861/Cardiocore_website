"""
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
