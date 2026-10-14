"""
processor.py — Telemetry Processing Pipeline Coordinator (Phase 6B.1)
====================================================================
Coordinates quality filtering, window slicing, descriptive feature extraction,
and full data lineage tracking across multi-channel wearable streams.
"""

from __future__ import annotations

import time
from typing import List, Optional, Sequence

from .features import ECGFeatureExtractor, VitalFeatureExtractor
from .models import (
    ProcessedTelemetryWindow,
    SignalQuality,
    TelemetryObservation,
    TelemetryWindow,
)
from .quality import SignalQualityFilter
from .repository import TelemetryRepository
from .windowing import TelemetryWindowBuilder


class TelemetryProcessor:
    """
    Main processing engine for Phase 6B.1.
    Translates raw stored telemetry streams into normalized, quality-aware,
    windowed descriptive observations ready for future Digital Twin consumption.
    """

    def __init__(self, repository: Optional[TelemetryRepository] = None) -> None:
        self.repository = repository or TelemetryRepository()

    def process_window(
        self,
        window: TelemetryWindow,
        user_id: int,
    ) -> ProcessedTelemetryWindow:
        """
        Processes a single TelemetryWindow:
        1. Evaluates overall signal quality.
        2. Partitions valid vs rejected observations.
        3. Extracts descriptive scalar vital moments (HR, HRV, SpO2, Temperature).
        4. Extracts aggregated motion metrics.
        5. Combines and analyzes raw ECG sample batches.
        6. Seals complete provenance metadata.
        """
        obs_list = window.observations
        total_count = len(obs_list)

        # 1. Overall Signal Quality Assessment
        qualities = [obs.signal_quality for obs in obs_list]
        overall_sq = SignalQualityFilter.determine_overall_quality(qualities)

        # 2. Partition valid vs rejected observations for scalar vitals
        valid_obs, rejected_obs = SignalQualityFilter.partition_observations(
            obs_list, allow_fair=True
        )

        # 3. Vital Feature Moments
        hr_summary = VitalFeatureExtractor.extract_heart_rate(obs_list, allow_fair=True)
        hrv_summary = VitalFeatureExtractor.extract_hrv(obs_list, allow_fair=True)
        spo2_summary = VitalFeatureExtractor.extract_spo2(obs_list, allow_fair=True)
        temp_summary = VitalFeatureExtractor.extract_temperature(obs_list, allow_fair=True)

        # 4. Motion / Activity
        motion_summary = VitalFeatureExtractor.extract_motion(obs_list)

        # 5. ECG Descriptive Features
        # Accumulate ECG samples only from observations with eligible quality
        ecg_samples: List[float] = []
        ecg_qualities: List[SignalQuality] = []
        for obs in obs_list:
            if obs.ecg_samples and SignalQualityFilter.is_eligible_for_ecg(obs.signal_quality):
                ecg_samples.extend(obs.ecg_samples)
                ecg_qualities.append(obs.signal_quality)

        ecg_sq = SignalQualityFilter.determine_overall_quality(ecg_qualities) if ecg_qualities else SignalQuality.UNKNOWN
        ecg_summary = ECGFeatureExtractor.extract(
            samples=ecg_samples,
            sample_rate_hz=250.0,
            signal_quality=ecg_sq,
        )

        # 6. Provenance metadata
        source_batch_ids = list(dict.fromkeys(obs.batch_id for obs in obs_list))
        device_ids = list(dict.fromkeys(obs.device_id for obs in obs_list))
        session_ids = list(dict.fromkeys(obs.session_id for obs in obs_list))

        return ProcessedTelemetryWindow(
            user_id=user_id,
            window_start=window.window_start,
            window_end=window.window_end,
            window_duration_seconds=window.duration_seconds,
            overall_signal_quality=overall_sq,
            heart_rate=hr_summary,
            hrv=hrv_summary,
            spo2=spo2_summary,
            temperature=temp_summary,
            motion=motion_summary,
            ecg=ecg_summary,
            source_batch_ids=source_batch_ids,
            device_ids=device_ids,
            session_ids=session_ids,
            total_observation_count=total_count,
            valid_observation_count=len(valid_obs),
            rejected_observation_count=len(rejected_obs),
            processed_at=time.time(),
        )

    def process_observations(
        self,
        user_id: int,
        observations: Sequence[TelemetryObservation],
        window_size_seconds: float = TelemetryWindowBuilder.DEFAULT_5MIN,
    ) -> List[ProcessedTelemetryWindow]:
        """
        Slices a sequence of in-memory observations into time windows and processes each.
        """
        windows = TelemetryWindowBuilder.build_windows(
            observations, window_size_seconds=window_size_seconds
        )
        return [self.process_window(w, user_id=user_id) for w in windows]

    def process_range(
        self,
        user_id: int,
        start_timestamp: float,
        end_timestamp: float,
        window_size_seconds: float = TelemetryWindowBuilder.DEFAULT_5MIN,
        limit: int = 1000,
    ) -> List[ProcessedTelemetryWindow]:
        """
        Retrieves stored telemetry for an authenticated patient from the database,
        partitions into windows, and calculates normalized feature summaries.
        """
        observations = self.repository.get_batches_between(
            user_id=user_id,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            limit=limit,
        )
        return self.process_observations(
            user_id=user_id,
            observations=observations,
            window_size_seconds=window_size_seconds,
        )
