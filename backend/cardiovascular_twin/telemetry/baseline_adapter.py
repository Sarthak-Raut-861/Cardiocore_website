"""
baseline_adapter.py
===================
Telemetry to Personal Baseline Adapter.

Bridges ProcessedTelemetryWindow observations from the telemetry processing layer
to the existing Welford personal baseline implementation (PersonalBaselineTracker
and RunningStats in src.adaptive_engine).

Strict constraints:
- Reuses existing Welford implementation (no duplicate algorithm).
- Evaluates signal quality before updating baseline.
- Defines clear lifecycle states (INSUFFICIENT_DATA, CALIBRATING, READY).
- Computes safe baseline deviations without dividing by zero.
- Rejects poor/unknown quality data from corrupting the baseline.
- Never converts statistical deviations into medical diagnoses.
"""

from __future__ import annotations

import enum
import math
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

from src.adaptive_engine import PersonalBaselineTracker, RunningStats
from .models import ProcessedTelemetryWindow, SignalQuality


class BaselineLifecycleState(str, enum.Enum):
    """Lifecycle states of an individual channel or composite baseline."""
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"  # n == 0 observations
    CALIBRATING = "CALIBRATING"              # 1 <= n < warmup_samples
    READY = "READY"                          # n >= warmup_samples


@dataclass
class BaselineDeviation:
    """Structured baseline comparison result for a single physiological feature."""
    feature: str
    current_value: Optional[float]
    baseline_mean: Optional[float]
    baseline_std: Optional[float]
    sample_count: int
    deviation: Optional[float]              # current_value - baseline_mean
    z_score: Optional[float]                # (current_value - baseline_mean) / baseline_std
    status: BaselineLifecycleState
    confidence: float                       # 0.0 to 1.0 confidence score
    source_window_start: float
    source_window_end: float

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


@dataclass
class BaselineUpdateResult:
    """Result of attempting to update the personal baseline with a window."""
    updated_features: List[str]
    skipped_features: Dict[str, str]        # feature -> reason skipped
    deviations: Dict[str, BaselineDeviation]
    lifecycle_states: Dict[str, BaselineLifecycleState]
    overall_status: BaselineLifecycleState

    def to_dict(self) -> Dict[str, Any]:
        return {
            "updated_features": self.updated_features,
            "skipped_features": self.skipped_features,
            "deviations": {k: v.to_dict() for k, v in self.deviations.items()},
            "lifecycle_states": {k: v.value for k, v in self.lifecycle_states.items()},
            "overall_status": self.overall_status.value,
        }


class TelemetryBaselineAdapter:
    """Adapter bridging ProcessedTelemetryWindow to PersonalBaselineTracker.
    
    Parameters
    ----------
    tracker : Optional[PersonalBaselineTracker]
        Existing Welford tracker instance, or new instance initialized if None.
    warmup_samples : int
        Number of valid window updates required for a feature to be considered READY (default: 14).
    """

    DEFAULT_WARMUP_SAMPLES = 14

    def __init__(
        self,
        tracker: Optional[PersonalBaselineTracker] = None,
        warmup_samples: int = DEFAULT_WARMUP_SAMPLES,
    ) -> None:
        self.tracker = tracker or PersonalBaselineTracker(window=90, min_cv=0.01)
        self.warmup_samples = max(1, warmup_samples)

    # ------------------------------------------------------------------ #
    # Lifecycle evaluation
    # ------------------------------------------------------------------ #
    def get_feature_status(self, feature: str) -> BaselineLifecycleState:
        """Evaluate lifecycle state of a specific baseline channel."""
        st = self.tracker.stats.get(feature)
        if not st or st.n == 0:
            return BaselineLifecycleState.INSUFFICIENT_DATA
        if st.n < self.warmup_samples:
            return BaselineLifecycleState.CALIBRATING
        return BaselineLifecycleState.READY

    def get_overall_status(self, primary_features: Sequence[str] = ("resting_heart_rate", "hrv_rmssd")) -> BaselineLifecycleState:
        """Overall baseline lifecycle state across primary channels."""
        statuses = [self.get_feature_status(f) for f in primary_features]
        if not statuses or all(s == BaselineLifecycleState.INSUFFICIENT_DATA for s in statuses):
            return BaselineLifecycleState.INSUFFICIENT_DATA
        if all(s == BaselineLifecycleState.READY for s in statuses):
            return BaselineLifecycleState.READY
        return BaselineLifecycleState.CALIBRATING

    # ------------------------------------------------------------------ #
    # Feature eligibility and extraction
    # ------------------------------------------------------------------ #
    def extract_eligible_features(
        self, window: ProcessedTelemetryWindow
    ) -> Tuple[Dict[str, float], Dict[str, str]]:
        """Extract eligible feature updates and list reasons for skipped features.
        
        Quality rules:
        - GOOD: Eligible for all physiological channels.
        - FAIR: Eligible for HR, SpO2, Temp, Motion with moderate confidence; excludes HRV/ECG if strict.
        - POOR / UNKNOWN: Excluded from baseline updates.
        """
        eligible: Dict[str, float] = {}
        skipped: Dict[str, str] = {}

        overall_q = window.overall_signal_quality

        # 1. Heart Rate
        if window.heart_rate and window.heart_rate.mean is not None:
            if overall_q in (SignalQuality.GOOD, SignalQuality.FAIR):
                if window.heart_rate.valid_count >= 1:
                    eligible["resting_heart_rate"] = float(window.heart_rate.mean)
                else:
                    skipped["resting_heart_rate"] = "Insufficient valid observation count"
            else:
                skipped["resting_heart_rate"] = f"Signal quality {overall_q.value} rejected for baseline"
        else:
            skipped["resting_heart_rate"] = "No heart rate measurement in window"

        # 2. HRV (RMSSD) - strict quality check
        if window.hrv and window.hrv.mean is not None:
            if overall_q == SignalQuality.GOOD:
                if window.hrv.valid_count >= 1:
                    eligible["hrv_rmssd"] = float(window.hrv.mean)
                else:
                    skipped["hrv_rmssd"] = "Insufficient valid observation count"
            else:
                skipped["hrv_rmssd"] = f"Signal quality {overall_q.value} insufficient for sensitive HRV baseline"
        else:
            skipped["hrv_rmssd"] = "No HRV measurement in window"

        # 3. SpO2
        if window.spo2 and window.spo2.mean is not None:
            if overall_q in (SignalQuality.GOOD, SignalQuality.FAIR):
                val = float(window.spo2.mean)
                if 70.0 <= val <= 100.0:
                    eligible["spo2"] = val
                else:
                    skipped["spo2"] = f"SpO2 value {val}% out of physiological range"
            else:
                skipped["spo2"] = f"Signal quality {overall_q.value} rejected for baseline"
        else:
            skipped["spo2"] = "No SpO2 measurement in window"

        # 4. Skin Temperature
        if window.temperature and window.temperature.mean is not None:
            if overall_q in (SignalQuality.GOOD, SignalQuality.FAIR):
                val = float(window.temperature.mean)
                if 28.0 <= val <= 43.0:
                    eligible["skin_temperature"] = val
                else:
                    skipped["skin_temperature"] = f"Temperature {val}°C out of physiological range"
            else:
                skipped["temperature"] = f"Signal quality {overall_q.value} rejected for baseline"
        else:
            skipped["skin_temperature"] = "No temperature measurement in window"

        # 5. Motion Index
        motion_val = None
        if window.motion:
            motion_val = getattr(window.motion, "mean_motion_index", None)
            if motion_val is None:
                motion_val = getattr(window.motion, "motion_index_mean", None)

        if motion_val is not None:
            if overall_q in (SignalQuality.GOOD, SignalQuality.FAIR):
                eligible["motion_index"] = float(motion_val)
            else:
                skipped["motion_index"] = f"Motion signal quality {overall_q.value} rejected"
        else:
            skipped["motion_index"] = "No motion measurement in window"

        # 6. ECG descriptive amplitude range
        ecg_range = None
        if window.ecg:
            ecg_range = getattr(window.ecg, "amplitude_range_mv", None)
            if ecg_range is None:
                ecg_range = getattr(window.ecg, "amplitude_range", None)

        if ecg_range is not None:
            ecg_q = getattr(window.ecg, "signal_quality", overall_q)
            if ecg_q in (SignalQuality.GOOD, SignalQuality.FAIR) and window.ecg.sample_count > 0:
                eligible["ecg_amplitude_range"] = float(ecg_range)
            else:
                skipped["ecg_amplitude_range"] = f"ECG quality {ecg_q.value} rejected"
        else:
            skipped["ecg_amplitude_range"] = "No ECG measurement in window"

        return eligible, skipped

    # ------------------------------------------------------------------ #
    # Update and deviation calculation
    # ------------------------------------------------------------------ #
    def calculate_deviation(
        self,
        feature: str,
        current_value: Optional[float],
        window_start: float,
        window_end: float,
        quality: SignalQuality = SignalQuality.GOOD,
    ) -> BaselineDeviation:
        """Calculate deviation from personal baseline safely without divide-by-zero."""
        status = self.get_feature_status(feature)
        st = self.tracker.stats.get(feature)

        if not st or st.n == 0:
            return BaselineDeviation(
                feature=feature,
                current_value=current_value,
                baseline_mean=None,
                baseline_std=None,
                sample_count=0,
                deviation=None,
                z_score=None,
                status=BaselineLifecycleState.INSUFFICIENT_DATA,
                confidence=0.0,
                source_window_start=window_start,
                source_window_end=window_end,
            )

        mean_val = round(float(st.mean), 3)
        std_val = round(float(st.std), 3) if st.n >= 2 else None
        n_count = st.n

        dev = round(float(current_value - mean_val), 3) if current_value is not None else None

        # Safe z-score computation
        z = None
        if current_value is not None and std_val is not None and std_val > 1e-4 and n_count >= 2:
            z = round(float((current_value - mean_val) / std_val), 3)

        # Confidence: scales with data volume up to warmup threshold and quality
        qual_factor = 1.0 if quality == SignalQuality.GOOD else (0.75 if quality == SignalQuality.FAIR else 0.2)
        vol_factor = min(1.0, n_count / float(self.warmup_samples))
        confidence = round(vol_factor * qual_factor, 3)

        return BaselineDeviation(
            feature=feature,
            current_value=current_value,
            baseline_mean=mean_val,
            baseline_std=std_val,
            sample_count=n_count,
            deviation=dev,
            z_score=z,
            status=status,
            confidence=confidence,
            source_window_start=window_start,
            source_window_end=window_end,
        )

    def process_window(self, window: ProcessedTelemetryWindow) -> BaselineUpdateResult:
        """Process a telemetry window: calculate deviations and update Welford baseline.
        
        Note: Idempotency is enforced by the caller/persistence service before invocation.
        """
        eligible, skipped = self.extract_eligible_features(window)
        deviations: Dict[str, BaselineDeviation] = {}
        lifecycle_states: Dict[str, BaselineLifecycleState] = {}

        # 1. Compute deviations against current baseline before updating
        # (Preserves leave-one-out comparison integrity)
        all_features = set(eligible.keys()).union(self.tracker.stats.keys())
        for feat in all_features:
            val = eligible.get(feat)
            qual = getattr(window, "overall_signal_quality", None) or getattr(window, "signal_quality", SignalQuality.GOOD)
            deviations[feat] = self.calculate_deviation(
                feature=feat,
                current_value=val,
                window_start=window.window_start,
                window_end=window.window_end,
                quality=qual,
            )
            lifecycle_states[feat] = self.get_feature_status(feat)

        # 2. Update the authoritative Welford tracker with eligible observations
        if eligible:
            self.tracker.update(eligible)

        # 3. Update lifecycle states post-update
        updated_features = list(eligible.keys())
        for feat in updated_features:
            lifecycle_states[feat] = self.get_feature_status(feat)

        overall = self.get_overall_status()

        return BaselineUpdateResult(
            updated_features=updated_features,
            skipped_features=skipped,
            deviations=deviations,
            lifecycle_states=lifecycle_states,
            overall_status=overall,
        )

    # ------------------------------------------------------------------ #
    # Serialization
    # ------------------------------------------------------------------ #
    def to_dict(self) -> Dict[str, Any]:
        """Serialize tracker state with adapter configuration."""
        return {
            "warmup_samples": self.warmup_samples,
            "tracker": self.tracker.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "TelemetryBaselineAdapter":
        """Reconstruct adapter from serialized state."""
        tracker = PersonalBaselineTracker.from_dict(d.get("tracker", {}))
        warmup = int(d.get("warmup_samples", cls.DEFAULT_WARMUP_SAMPLES))
        return cls(tracker=tracker, warmup_samples=warmup)
