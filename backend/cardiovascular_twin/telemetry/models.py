"""
models.py — Telemetry Data Models & Processing Contracts (Phase 6B.1)
====================================================================
Normalized representations of raw telemetry observations, feature summaries,
window aggregates, and provenance tracking metadata.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class SignalQuality(str, Enum):
    """Signal Quality Index (SQI) classification."""
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    UNKNOWN = "UNKNOWN"

    @classmethod
    def from_str(cls, val: str | None) -> SignalQuality:
        if not val:
            return cls.UNKNOWN
        clean = str(val).strip().upper()
        try:
            return cls(clean)
        except ValueError:
            return cls.UNKNOWN


@dataclass
class TelemetryObservation:
    """A single normalized observation parsed from raw database storage."""
    batch_id: str
    user_id: int
    device_id: str
    session_id: str
    sequence_number: int
    start_timestamp: float
    end_timestamp: float
    server_received_timestamp: float
    signal_quality: SignalQuality

    device_timestamp: Optional[float] = None
    mobile_received_timestamp: Optional[float] = None

    heart_rate: Optional[float] = None
    hrv: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    battery: Optional[float] = None

    motion_activity: Optional[str] = None
    motion_index: Optional[float] = None

    sample_count: int = 0
    packet_count: int = 0
    is_urgent: bool = False

    ecg_samples: List[float] = field(default_factory=list)
    ecg_sample_rate: float = 250.0

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["signal_quality"] = self.signal_quality.value
        return d


@dataclass
class VitalFeatureSummary:
    """Safe descriptive statistics for a single vital channel over a time window."""
    mean: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    std: Optional[float] = None
    valid_count: int = 0
    rejected_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ECGFeatureSummary:
    """Non-diagnostic descriptive statistics for a raw ECG waveform batch."""
    sample_count: int = 0
    duration_seconds: float = 0.0
    sample_rate_hz: float = 250.0
    mean_amplitude_mv: Optional[float] = None
    min_amplitude_mv: Optional[float] = None
    max_amplitude_mv: Optional[float] = None
    std_amplitude_mv: Optional[float] = None
    amplitude_range_mv: Optional[float] = None
    signal_quality: SignalQuality = SignalQuality.UNKNOWN

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["signal_quality"] = self.signal_quality.value
        return d


@dataclass
class MotionFeatureSummary:
    """Aggregated motion and activity indicators over a time window."""
    dominant_activity: Optional[str] = None
    mean_motion_index: Optional[float] = None
    observation_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TelemetryWindow:
    """Chronologically grouped collection of raw observations for a time slice."""
    window_start: float
    window_end: float
    source_batch_ids: List[str]
    observations: List[TelemetryObservation]

    @property
    def observation_count(self) -> int:
        return len(self.observations)

    @property
    def duration_seconds(self) -> float:
        return max(0.0, self.window_end - self.window_start)


@dataclass
class ProcessedTelemetryWindow:
    """
    Final normalized output for a time window.
    Contains quality-filtered descriptive features and full provenance lineage.
    """
    user_id: int
    window_start: float
    window_end: float
    window_duration_seconds: float

    overall_signal_quality: SignalQuality

    heart_rate: Optional[VitalFeatureSummary] = None
    hrv: Optional[VitalFeatureSummary] = None
    spo2: Optional[VitalFeatureSummary] = None
    temperature: Optional[VitalFeatureSummary] = None
    motion: Optional[MotionFeatureSummary] = None
    ecg: Optional[ECGFeatureSummary] = None

    # Full provenance tracking
    source_batch_ids: List[str] = field(default_factory=list)
    device_ids: List[str] = field(default_factory=list)
    session_ids: List[str] = field(default_factory=list)

    total_observation_count: int = 0
    valid_observation_count: int = 0
    rejected_observation_count: int = 0

    processed_at: float = 0.0

    @property
    def signal_quality(self) -> SignalQuality:
        return self.overall_signal_quality

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "window_duration_seconds": self.window_duration_seconds,
            "overall_signal_quality": self.overall_signal_quality.value,
            "heart_rate": self.heart_rate.to_dict() if self.heart_rate else None,
            "hrv": self.hrv.to_dict() if self.hrv else None,
            "spo2": self.spo2.to_dict() if self.spo2 else None,
            "temperature": self.temperature.to_dict() if self.temperature else None,
            "motion": self.motion.to_dict() if self.motion else None,
            "ecg": self.ecg.to_dict() if self.ecg else None,
            "source_batch_ids": list(self.source_batch_ids),
            "device_ids": list(self.device_ids),
            "session_ids": list(self.session_ids),
            "total_observation_count": self.total_observation_count,
            "valid_observation_count": self.valid_observation_count,
            "rejected_observation_count": self.rejected_observation_count,
            "processed_at": self.processed_at,
        }
