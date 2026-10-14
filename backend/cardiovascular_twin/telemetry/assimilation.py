"""
assimilation.py
===============
Digital Twin Assimilation Bridge.

Bridges ProcessedTelemetryWindow observations from the telemetry processing layer
to the personal baseline (Welford) and the existing Biomarker Digital Twin.

Strict constraints:
- Reuses existing Welford PersonalBaselineTracker (adaptive_engine.py).
- Reuses existing BiomarkerTwin and 11-step update cycle (biomarker_twin.py).
- Enforces window-level idempotency via StatePersistenceRepository.
- Preserves separation between WEARABLE observations and CLINICAL LAB data.
- Never fabricates laboratory lipid/biomarker measurements.
- Enforces strict patient isolation.
"""

from __future__ import annotations

import logging
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple

from src.adaptive_engine import PersonalBaselineTracker
from src.biomarker_twin import BiomarkerTwin, TwinState
from .baseline_adapter import BaselineLifecycleState, BaselineUpdateResult, TelemetryBaselineAdapter
from .models import ProcessedTelemetryWindow, SignalQuality
from .state_persistence import StatePersistenceRepository

logger = logging.getLogger("cardiocore.assimilation")


@dataclass
class AssimilationResult:
    """Complete result of a telemetry window assimilation step."""
    user_id: int
    window_start: float
    window_end: float
    window_hash: str
    already_assimilated: bool
    assimilated: bool
    baseline_update: Optional[BaselineUpdateResult]
    twin_state: Optional[Dict[str, Any]]
    source_batch_ids: List[str]
    device_ids: List[str]
    session_ids: List[str]
    processing_timestamp: float
    message: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "window_hash": self.window_hash,
            "already_assimilated": self.already_assimilated,
            "assimilated": self.assimilated,
            "baseline_update": self.baseline_update.to_dict() if self.baseline_update else None,
            "twin_state": self.twin_state,
            "source_batch_ids": self.source_batch_ids,
            "device_ids": self.device_ids,
            "session_ids": self.session_ids,
            "processing_timestamp": self.processing_timestamp,
            "message": self.message,
        }


class DigitalTwinAssimilationService:
    """Orchestrates telemetry assimilation into personal baseline and Digital Twin.
    
    Parameters
    ----------
    persistence : StatePersistenceRepository
        Repository for baseline and twin state persistence and idempotency tracking.
    warmup_samples : int
        Number of valid window updates required for baseline to reach READY.
    """

    def __init__(
        self,
        persistence: StatePersistenceRepository,
        warmup_samples: int = 14,
    ) -> None:
        self.persistence = persistence
        self.warmup_samples = warmup_samples

    # ------------------------------------------------------------------ #
    # Twin instantiation / restoration helper
    # ------------------------------------------------------------------ #
    def _restore_or_create_twin(
        self, user_id: int, profile: Mapping[str, Any]
    ) -> Tuple[BiomarkerTwin, Optional[Dict[str, Any]]]:
        """Instantiate BiomarkerTwin and restore snapshot if persisted."""
        clean_profile = dict(profile)
        defaults = {
            "baseline_total_cholesterol": 190.0,
            "baseline_hdl": 50.0,
            "baseline_triglycerides": 130.0,
            "baseline_resting_hr": 65.0,
            "baseline_hrv_rmssd": 40.0,
            "baseline_systolic": 120.0,
            "baseline_diastolic": 80.0,
        }
        for k, v in defaults.items():
            if clean_profile.get(k) is None:
                clean_profile[k] = v

        twin = BiomarkerTwin(clean_profile)
        persisted = self.persistence.load_twin_state(user_id)
        if persisted and "snapshot" in persisted:
            snap = persisted["snapshot"]
            twin.days_seen = int(snap.get("days_seen", 0))
            twin.trend = snap.get("trend")
            twin.risk_history = deque(snap.get("risk_history", []), maxlen=twin.history_len)
            twin.biomarker_history = deque(snap.get("biomarker_history", []), maxlen=twin.history_len)
            twin.alerts_raised = snap.get("alerts_raised", [])
            if "baselines" in snap:
                twin.baselines = PersonalBaselineTracker.from_dict(snap["baselines"])
            if "state" in snap:
                st = snap["state"]
                twin.state = TwinState(**{k: v for k, v in st.items() if k in TwinState.__dataclass_fields__})
        return twin, persisted

    # ------------------------------------------------------------------ #
    # Main assimilation entry point
    # ------------------------------------------------------------------ #
    def assimilate_window(
        self,
        user_id: int,
        window: ProcessedTelemetryWindow,
        profile: Mapping[str, Any],
    ) -> AssimilationResult:
        """Assimilate one ProcessedTelemetryWindow for a user.
        
        Steps:
        1. Compute deterministic window hash and verify idempotency.
        2. Load user's personal baseline adapter.
        3. Extract eligible features and update baseline through Welford algorithm.
        4. Translate eligible wearable features into BiomarkerTwin observation format.
        5. Invoke BiomarkerTwin update cycle (preserving separation of wearable vs lab data).
        6. Persist updated baseline adapter and twin state.
        7. Record window hash to prevent duplicate assimilation.
        """
        now = time.time()
        win_hash = self.persistence.compute_window_hash(user_id, window)

        # 1. Idempotency Check
        if self.persistence.is_window_assimilated(user_id, win_hash):
            logger.info("Window %s already assimilated for user %s. Skipping.", win_hash[:8], user_id)
            current_twin = self.persistence.load_twin_state(user_id)
            return AssimilationResult(
                user_id=user_id,
                window_start=window.window_start,
                window_end=window.window_end,
                window_hash=win_hash,
                already_assimilated=True,
                assimilated=False,
                baseline_update=None,
                twin_state=current_twin.get("snapshot", {}).get("state") if current_twin else None,
                source_batch_ids=window.source_batch_ids,
                device_ids=window.device_ids,
                session_ids=window.session_ids,
                processing_timestamp=now,
                message="Window was previously assimilated. Idempotency enforced.",
            )

        # 2. Baseline update
        baseline_adapter = self.persistence.load_baseline_adapter(
            user_id, warmup_samples=self.warmup_samples
        )
        baseline_res = baseline_adapter.process_window(window)

        # 3. Translate usable wearable observations to Digital Twin input format
        obs: Dict[str, Any] = {}
        if "resting_heart_rate" in baseline_res.updated_features:
            obs["resting_heart_rate"] = window.heart_rate.mean
        if "hrv_rmssd" in baseline_res.updated_features:
            obs["hrv_rmssd"] = window.hrv.mean
        if "spo2" in baseline_res.updated_features:
            obs["nocturnal_spo2_pct"] = window.spo2.mean

        # Preserve separation: Lab biomarkers (TC, HDL, LDL, TG, CRP, DD)
        # come strictly from user profile / lab records, NEVER wearable observations.
        twin, _ = self._restore_or_create_twin(user_id, profile)

        # 4. Invoke BiomarkerTwin update if at least one wearable observation is usable
        twin_state_dict: Optional[Dict[str, Any]] = None
        if obs:
            day_idx = twin.days_seen
            twin.update(obs, day_index=day_idx)
            twin_state_dict = twin.state.to_dict()

            # Save updated twin snapshot
            snap = twin.snapshot()
            self.persistence.save_twin_state(user_id, {"snapshot": snap}, last_window_end=window.window_end)
        else:
            current_persisted = self.persistence.load_twin_state(user_id)
            if current_persisted and "snapshot" in current_persisted:
                twin_state_dict = current_persisted["snapshot"].get("state")

        # 5. Persist updated baseline adapter
        self.persistence.save_baseline_adapter(user_id, baseline_adapter)

        # 6. Record window hash to ensure idempotency
        self.persistence.record_assimilated_window(
            user_id=user_id,
            window_hash=win_hash,
            window_start=window.window_start,
            window_end=window.window_end,
        )

        return AssimilationResult(
            user_id=user_id,
            window_start=window.window_start,
            window_end=window.window_end,
            window_hash=win_hash,
            already_assimilated=False,
            assimilated=bool(obs),
            baseline_update=baseline_res,
            twin_state=twin_state_dict,
            source_batch_ids=window.source_batch_ids,
            device_ids=window.device_ids,
            session_ids=window.session_ids,
            processing_timestamp=now,
            message="Window successfully assimilated." if obs else "Baseline evaluated; no usable twin observations in window.",
        )
