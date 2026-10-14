"""
windowing.py — Time-Slice Window Aggregation (Phase 6B.1)
========================================================
Partitions continuous telemetry observation streams into discrete,
chronologically ordered time windows (5m, 15m, 1h, or custom).
"""

from __future__ import annotations

import math
from typing import List, Sequence

from .models import TelemetryObservation, TelemetryWindow


class TelemetryWindowBuilder:
    """
    Constructs discrete time windows from a sequence of raw telemetry observations.
    Preserves exact batch identifiers and temporal provenance.
    """

    DEFAULT_5MIN = 300.0
    DEFAULT_15MIN = 900.0
    DEFAULT_1HOUR = 3600.0

    @classmethod
    def build_windows(
        cls,
        observations: Sequence[TelemetryObservation],
        window_size_seconds: float = 300.0,
        align_to_epoch: bool = False,
    ) -> List[TelemetryWindow]:
        """
        Partitions observations into non-overlapping chronological windows.

        :param observations: List of raw TelemetryObservation objects.
        :param window_size_seconds: Window duration in seconds (must be > 0).
        :param align_to_epoch: If True, boundaries align to integer multiples of window_size;
                               otherwise starts at the first observation's timestamp.
        :return: List of populated TelemetryWindow instances.
        """
        if not observations:
            return []

        if window_size_seconds <= 0:
            raise ValueError(f"window_size_seconds must be positive, got {window_size_seconds}")

        # Ensure chronological ordering by start_timestamp
        sorted_obs = sorted(observations, key=lambda o: o.start_timestamp)

        first_ts = sorted_obs[0].start_timestamp
        if align_to_epoch:
            current_window_start = math.floor(first_ts / window_size_seconds) * window_size_seconds
        else:
            current_window_start = first_ts

        current_window_end = current_window_start + window_size_seconds
        current_obs: List[TelemetryObservation] = []
        windows: List[TelemetryWindow] = []

        for obs in sorted_obs:
            # Advance window boundary if observation belongs to a subsequent window
            while obs.start_timestamp >= current_window_end:
                if current_obs:
                    windows.append(
                        TelemetryWindow(
                            window_start=current_window_start,
                            window_end=current_window_end,
                            source_batch_ids=[o.batch_id for o in current_obs],
                            observations=current_obs,
                        )
                    )
                    current_obs = []

                current_window_start = current_window_end
                current_window_end = current_window_start + window_size_seconds

            current_obs.append(obs)

        # Flush the final non-empty window
        if current_obs:
            windows.append(
                TelemetryWindow(
                    window_start=current_window_start,
                    window_end=current_window_end,
                    source_batch_ids=[o.batch_id for o in current_obs],
                    observations=current_obs,
                )
            )

        return windows
