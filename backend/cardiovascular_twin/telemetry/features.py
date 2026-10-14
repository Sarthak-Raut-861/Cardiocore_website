"""
features.py — Windowed Descriptive Feature Extraction (Phase 6B.1)
=================================================================
Calculates safe, non-diagnostic statistical summaries over windowed
wearable telemetry channels (HR, HRV, SpO2, Temperature, Motion, and ECG).
"""

from __future__ import annotations

import math
from collections import Counter
from typing import List, Optional, Sequence

from .models import (
    ECGFeatureSummary,
    MotionFeatureSummary,
    SignalQuality,
    TelemetryObservation,
    VitalFeatureSummary,
)
from .quality import SignalQualityFilter


class VitalFeatureExtractor:
    """
    Computes statistical moments (mean, min, max, std) over scalar vital series.
    Returns None when data is insufficient or invalid.
    """

    @staticmethod
    def _compute_series_stats(
        values: Sequence[float],
        rejected_count: int = 0,
    ) -> VitalFeatureSummary:
        valid_vals = [float(v) for v in values if v is not None and not math.isnan(v)]
        n = len(valid_vals)

        if n == 0:
            return VitalFeatureSummary(
                mean=None,
                min=None,
                max=None,
                std=None,
                valid_count=0,
                rejected_count=rejected_count,
            )

        mean_val = round(sum(valid_vals) / n, 2)
        min_val = round(min(valid_vals), 2)
        max_val = round(max(valid_vals), 2)

        if n > 1:
            variance = sum((x - mean_val) ** 2 for x in valid_vals) / (n - 1)
            std_val = round(math.sqrt(max(0.0, variance)), 2)
        else:
            std_val = 0.0

        return VitalFeatureSummary(
            mean=mean_val,
            min=min_val,
            max=max_val,
            std=std_val,
            valid_count=n,
            rejected_count=rejected_count,
        )

    @classmethod
    def extract_heart_rate(
        cls,
        observations: Sequence[TelemetryObservation],
        allow_fair: bool = True,
    ) -> VitalFeatureSummary:
        valid_obs, rejected_obs = SignalQualityFilter.partition_observations(
            observations, allow_fair=allow_fair
        )
        vals = [obs.heart_rate for obs in valid_obs if obs.heart_rate is not None]
        rejected_count = len(rejected_obs) + sum(
            1 for obs in valid_obs if obs.heart_rate is None
        )
        return cls._compute_series_stats(vals, rejected_count=rejected_count)

    @classmethod
    def extract_hrv(
        cls,
        observations: Sequence[TelemetryObservation],
        allow_fair: bool = True,
    ) -> VitalFeatureSummary:
        valid_obs, rejected_obs = SignalQualityFilter.partition_observations(
            observations, allow_fair=allow_fair
        )
        vals = [obs.hrv for obs in valid_obs if obs.hrv is not None]
        rejected_count = len(rejected_obs) + sum(
            1 for obs in valid_obs if obs.hrv is None
        )
        return cls._compute_series_stats(vals, rejected_count=rejected_count)

    @classmethod
    def extract_spo2(
        cls,
        observations: Sequence[TelemetryObservation],
        allow_fair: bool = True,
    ) -> VitalFeatureSummary:
        valid_obs, rejected_obs = SignalQualityFilter.partition_observations(
            observations, allow_fair=allow_fair
        )
        vals = [obs.spo2 for obs in valid_obs if obs.spo2 is not None]
        rejected_count = len(rejected_obs) + sum(
            1 for obs in valid_obs if obs.spo2 is None
        )
        return cls._compute_series_stats(vals, rejected_count=rejected_count)

    @classmethod
    def extract_temperature(
        cls,
        observations: Sequence[TelemetryObservation],
        allow_fair: bool = True,
    ) -> VitalFeatureSummary:
        valid_obs, rejected_obs = SignalQualityFilter.partition_observations(
            observations, allow_fair=allow_fair
        )
        vals = [obs.temperature for obs in valid_obs if obs.temperature is not None]
        rejected_count = len(rejected_obs) + sum(
            1 for obs in valid_obs if obs.temperature is None
        )
        return cls._compute_series_stats(vals, rejected_count=rejected_count)

    @classmethod
    def extract_motion(
        cls,
        observations: Sequence[TelemetryObservation],
    ) -> MotionFeatureSummary:
        activities = [
            obs.motion_activity for obs in observations if obs.motion_activity
        ]
        indices = [
            obs.motion_index
            for obs in observations
            if obs.motion_index is not None and not math.isnan(obs.motion_index)
        ]

        dominant = Counter(activities).most_common(1)[0][0] if activities else None
        mean_index = (
            round(sum(indices) / len(indices), 3) if indices else None
        )

        return MotionFeatureSummary(
            dominant_activity=dominant,
            mean_motion_index=mean_index,
            observation_count=len(observations),
        )


class ECGFeatureExtractor:
    """
    Computes purely descriptive, technical waveform properties for an ECG sample stream.
    Does not perform medical or clinical rhythm diagnoses.
    """

    @staticmethod
    def extract(
        samples: Sequence[float],
        sample_rate_hz: float = 250.0,
        signal_quality: SignalQuality = SignalQuality.GOOD,
    ) -> ECGFeatureSummary:
        valid_samples = [float(s) for s in samples if s is not None and not math.isnan(s)]
        n = len(valid_samples)

        if n == 0 or not SignalQualityFilter.is_eligible_for_ecg(signal_quality):
            return ECGFeatureSummary(
                sample_count=n,
                duration_seconds=round(n / sample_rate_hz, 3) if sample_rate_hz > 0 else 0.0,
                sample_rate_hz=sample_rate_hz,
                mean_amplitude_mv=None,
                min_amplitude_mv=None,
                max_amplitude_mv=None,
                std_amplitude_mv=None,
                amplitude_range_mv=None,
                signal_quality=signal_quality,
            )

        mean_val = round(sum(valid_samples) / n, 4)
        min_val = round(min(valid_samples), 4)
        max_val = round(max(valid_samples), 4)
        range_val = round(max_val - min_val, 4)

        if n > 1:
            variance = sum((x - mean_val) ** 2 for x in valid_samples) / (n - 1)
            std_val = round(math.sqrt(max(0.0, variance)), 4)
        else:
            std_val = 0.0

        duration = round(n / sample_rate_hz, 3) if sample_rate_hz > 0 else 0.0

        return ECGFeatureSummary(
            sample_count=n,
            duration_seconds=duration,
            sample_rate_hz=sample_rate_hz,
            mean_amplitude_mv=mean_val,
            min_amplitude_mv=min_val,
            max_amplitude_mv=max_val,
            std_amplitude_mv=std_val,
            amplitude_range_mv=range_val,
            signal_quality=signal_quality,
        )
