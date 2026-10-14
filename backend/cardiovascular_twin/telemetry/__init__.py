"""
CardioCore Telemetry Processing Package (Phase 6B.1)
====================================================
Quality-aware filtering, time-window aggregation, descriptive feature extraction,
and provenance tracking for wearable telemetry streams.
"""

from .models import (
    SignalQuality,
    TelemetryObservation,
    VitalFeatureSummary,
    ECGFeatureSummary,
    MotionFeatureSummary,
    TelemetryWindow,
    ProcessedTelemetryWindow,
)
from .quality import SignalQualityFilter
from .features import VitalFeatureExtractor, ECGFeatureExtractor
from .windowing import TelemetryWindowBuilder
from .repository import TelemetryRepository
from .processor import TelemetryProcessor

from .baseline_adapter import (
    BaselineLifecycleState,
    BaselineDeviation,
    BaselineUpdateResult,
    TelemetryBaselineAdapter,
)
from .state_persistence import StatePersistenceRepository
from .assimilation import AssimilationResult, DigitalTwinAssimilationService

__all__ = [
    "SignalQuality",
    "TelemetryObservation",
    "VitalFeatureSummary",
    "ECGFeatureSummary",
    "MotionFeatureSummary",
    "TelemetryWindow",
    "ProcessedTelemetryWindow",
    "SignalQualityFilter",
    "VitalFeatureExtractor",
    "ECGFeatureExtractor",
    "TelemetryWindowBuilder",
    "TelemetryRepository",
    "TelemetryProcessor",
    "BaselineLifecycleState",
    "BaselineDeviation",
    "BaselineUpdateResult",
    "TelemetryBaselineAdapter",
    "StatePersistenceRepository",
    "AssimilationResult",
    "DigitalTwinAssimilationService",
]
