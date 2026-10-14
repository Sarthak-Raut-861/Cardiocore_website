"""
quality.py — Signal Quality Filtering & Categorization (Phase 6B.1)
==================================================================
Classifies and filters incoming telemetry observations according to the
Signal Quality Index (SQI) without discarding raw records or fabricating
unsubstantiated medical assumptions.
"""

from __future__ import annotations

from typing import List, Sequence, Tuple
from .models import SignalQuality, TelemetryObservation


class SignalQualityFilter:
    """
    Quality-aware observation filter.
    Enforces that corrupt or unrated sensor readings are not factored into
    downstream physiological estimations.
    """

    @staticmethod
    def is_eligible_for_vitals(quality: SignalQuality | str, allow_fair: bool = True) -> bool:
        """
        Determines whether an observation's signal quality is acceptable for
        numerical vital statistics (HR, HRV, SpO2, Temperature).
        """
        sq = quality if isinstance(quality, SignalQuality) else SignalQuality.from_str(quality)
        if sq == SignalQuality.GOOD:
            return True
        if sq == SignalQuality.FAIR and allow_fair:
            return True
        return False

    @staticmethod
    def is_eligible_for_ecg(quality: SignalQuality | str) -> bool:
        """
        Only GOOD or FAIR ECG blocks are evaluated for descriptive waveform statistics.
        """
        sq = quality if isinstance(quality, SignalQuality) else SignalQuality.from_str(quality)
        return sq in (SignalQuality.GOOD, SignalQuality.FAIR)

    @classmethod
    def partition_observations(
        cls,
        observations: Sequence[TelemetryObservation],
        allow_fair: bool = True,
    ) -> Tuple[List[TelemetryObservation], List[TelemetryObservation]]:
        """
        Splits a collection of observations into eligible (valid) and ineligible (rejected) sets.
        Preserves original ordering.
        """
        valid: List[TelemetryObservation] = []
        rejected: List[TelemetryObservation] = []

        for obs in observations:
            if cls.is_eligible_for_vitals(obs.signal_quality, allow_fair=allow_fair):
                valid.append(obs)
            else:
                rejected.append(obs)

        return valid, rejected

    @staticmethod
    def determine_overall_quality(
        qualities: Sequence[SignalQuality | str],
    ) -> SignalQuality:
        """
        Computes composite signal quality across an ensemble of observations.
        Does not claim clinical validity; represents technical data suitability.
        """
        if not qualities:
            return SignalQuality.UNKNOWN

        parsed = [
            q if isinstance(q, SignalQuality) else SignalQuality.from_str(q)
            for q in qualities
        ]

        total = len(parsed)
        good_count = sum(1 for q in parsed if q == SignalQuality.GOOD)
        fair_count = sum(1 for q in parsed if q == SignalQuality.FAIR)
        poor_count = sum(1 for q in parsed if q == SignalQuality.POOR)
        unknown_count = sum(1 for q in parsed if q == SignalQuality.UNKNOWN)

        if poor_count / total >= 0.5:
            return SignalQuality.POOR
        if unknown_count / total > 0.6:
            return SignalQuality.UNKNOWN
        if good_count / total >= 0.7 and poor_count == 0:
            return SignalQuality.GOOD
        if (good_count + fair_count) / total >= 0.5:
            return SignalQuality.FAIR

        return SignalQuality.POOR if poor_count > 0 else SignalQuality.UNKNOWN
