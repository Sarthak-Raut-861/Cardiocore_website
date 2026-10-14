"""
repository.py — Telemetry Data Access & Storage Layer (Phase 6B.1)
=================================================================
Provides patient-isolated, bounded querying of raw telemetry batches
from the underlying SQLite database.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Callable, List, Optional, Union

from .models import SignalQuality, TelemetryObservation

ConnectionProvider = Union[sqlite3.Connection, Path, str, Callable[[], sqlite3.Connection]]


class TelemetryRepository:
    """
    Patient-isolated data repository for stored telemetry batches.
    Guarantees that all queries are scoped strictly to the authenticated user_id.
    """

    def __init__(self, db_target: Optional[ConnectionProvider] = None) -> None:
        self._target = db_target

    def _get_connection(self) -> sqlite3.Connection:
        if self._target is None:
            # Default fallback to server app.db
            from web.server import db
            return db()

        if isinstance(self._target, sqlite3.Connection):
            return self._target

        if callable(self._target):
            return self._target()

        if isinstance(self._target, (str, Path)):
            conn = sqlite3.connect(self._target)
            conn.row_factory = sqlite3.Row
            return conn

        raise TypeError(f"Unsupported db_target type: {type(self._target)}")

    def _row_to_observation(self, r: sqlite3.Row) -> TelemetryObservation:
        ecg_raw = r["ecg_samples"]
        ecg_list: List[float] = []
        if ecg_raw:
            try:
                ecg_list = json.loads(ecg_raw)
            except Exception:
                ecg_list = []

        return TelemetryObservation(
            batch_id=r["batch_id"],
            user_id=r["user_id"],
            device_id=r["device_id"],
            session_id=r["session_id"],
            sequence_number=r["sequence_number"],
            start_timestamp=float(r["start_timestamp"]),
            end_timestamp=float(r["end_timestamp"]),
            device_timestamp=float(r["device_timestamp"]) if r["device_timestamp"] is not None else None,
            mobile_received_timestamp=float(r["mobile_received_timestamp"]) if r["mobile_received_timestamp"] is not None else None,
            server_received_timestamp=float(r["server_received_timestamp"]),
            signal_quality=SignalQuality.from_str(r["signal_quality"]),
            heart_rate=float(r["heart_rate"]) if r["heart_rate"] is not None else None,
            hrv=float(r["hrv"]) if r["hrv"] is not None else None,
            spo2=float(r["spo2"]) if r["spo2"] is not None else None,
            temperature=float(r["temperature"]) if r["temperature"] is not None else None,
            battery=float(r["battery"]) if r["battery"] is not None else None,
            motion_activity=r["motion_activity"],
            motion_index=float(r["motion_index"]) if r["motion_index"] is not None else None,
            sample_count=int(r["sample_count"] or 0),
            packet_count=int(r["packet_count"] or 0),
            is_urgent=bool(r["is_urgent"]),
            ecg_samples=ecg_list,
            ecg_sample_rate=250.0,
        )

    def get_recent_batches(
        self,
        user_id: int,
        limit: int = 30,
        chronological: bool = True,
    ) -> List[TelemetryObservation]:
        """
        Retrieves the most recent telemetry batches for an authenticated patient.
        If chronological is True, orders ascending by start_timestamp.
        """
        if not isinstance(user_id, int):
            raise ValueError(f"user_id must be an integer, got {type(user_id)}")

        safe_limit = min(max(int(limit), 1), 1000)
        conn = self._get_connection()
        try:
            # Query recent rows descending, then reverse if chronological order is required
            rows = conn.execute(
                """
                SELECT * FROM telemetry_batches
                WHERE user_id = ?
                ORDER BY start_timestamp DESC
                LIMIT ?
                """,
                (user_id, safe_limit),
            ).fetchall()

            obs = [self._row_to_observation(r) for r in rows]
            if chronological:
                obs.reverse()
            return obs
        finally:
            if not isinstance(self._target, sqlite3.Connection):
                conn.close()

    def get_batches_between(
        self,
        user_id: int,
        start_timestamp: float,
        end_timestamp: float,
        limit: int = 1000,
    ) -> List[TelemetryObservation]:
        """
        Retrieves all telemetry batches for a patient within a closed timestamp interval [start, end].
        Results are returned chronologically (start_timestamp ASC).
        """
        if not isinstance(user_id, int):
            raise ValueError(f"user_id must be an integer, got {type(user_id)}")

        safe_limit = min(max(int(limit), 1), 5000)
        conn = self._get_connection()
        try:
            rows = conn.execute(
                """
                SELECT * FROM telemetry_batches
                WHERE user_id = ?
                  AND start_timestamp >= ?
                  AND start_timestamp <= ?
                ORDER BY start_timestamp ASC
                LIMIT ?
                """,
                (user_id, float(start_timestamp), float(end_timestamp), safe_limit),
            ).fetchall()

            return [self._row_to_observation(r) for r in rows]
        finally:
            if not isinstance(self._target, sqlite3.Connection):
                conn.close()

    def get_session_batches(
        self,
        user_id: int,
        session_id: str,
        limit: int = 1000,
    ) -> List[TelemetryObservation]:
        """
        Retrieves all batches belonging to a specific recording session for a patient.
        Results are returned chronologically by sequence_number ASC.
        """
        if not isinstance(user_id, int):
            raise ValueError(f"user_id must be an integer, got {type(user_id)}")

        safe_limit = min(max(int(limit), 1), 5000)
        conn = self._get_connection()
        try:
            rows = conn.execute(
                """
                SELECT * FROM telemetry_batches
                WHERE user_id = ? AND session_id = ?
                ORDER BY sequence_number ASC
                LIMIT ?
                """,
                (user_id, str(session_id), safe_limit),
            ).fetchall()

            return [self._row_to_observation(r) for r in rows]
        finally:
            if not isinstance(self._target, sqlite3.Connection):
                conn.close()
