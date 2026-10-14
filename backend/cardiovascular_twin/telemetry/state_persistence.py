"""
state_persistence.py
====================
Persistence repository for continuous personal baseline and Digital Twin state.

Strict constraints:
- Operates under authenticated user_id scoping (patient isolation).
- Minimal schema extension (stores serialized state dictionaries from existing engines).
- Enforces window-level idempotency via cryptographic window hashes.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

from .baseline_adapter import TelemetryBaselineAdapter
from .models import ProcessedTelemetryWindow


class StatePersistenceRepository:
    """Manages SQLite storage for personal baseline and continuous Digital Twin state.
    
    Parameters
    ----------
    db_target : Callable[[], sqlite3.Connection]
        Function returning an open SQLite connection with Row factory.
    """

    def __init__(self, db_target: Callable[[], sqlite3.Connection]) -> None:
        self._get_db = db_target

    # ------------------------------------------------------------------ #
    # Window hash & idempotency
    # ------------------------------------------------------------------ #
    @staticmethod
    def compute_window_hash(user_id: int, window: ProcessedTelemetryWindow) -> str:
        """Deterministic SHA256 digest identifying a telemetry window for a patient."""
        sorted_batches = ",".join(sorted(window.source_batch_ids))
        content = f"{user_id}:{window.window_start:.3f}:{window.window_end:.3f}:{sorted_batches}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def is_window_assimilated(self, user_id: int, window_hash: str) -> bool:
        """Check if this window has already been assimilated for this patient."""
        with self._get_db() as conn:
            row = conn.execute(
                "SELECT 1 FROM assimilated_telemetry_windows WHERE user_id = ? AND window_hash = ?",
                (user_id, window_hash),
            ).fetchone()
            return row is not None

    def record_assimilated_window(
        self, user_id: int, window_hash: str, window_start: float, window_end: float
    ) -> bool:
        """Record window hash into assimilated log; returns False if duplicate."""
        now = time.time()
        with self._get_db() as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO assimilated_telemetry_windows(
                        user_id, window_hash, window_start, window_end, created_at
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, window_hash, window_start, window_end, now),
                )
                return True
            except sqlite3.IntegrityError:
                return False

    # ------------------------------------------------------------------ #
    # Personal baseline state
    # ------------------------------------------------------------------ #
    def load_baseline_adapter(
        self, user_id: int, warmup_samples: int = 14
    ) -> TelemetryBaselineAdapter:
        """Load personal baseline adapter for patient, or return clean calibrating instance."""
        with self._get_db() as conn:
            row = conn.execute(
                "SELECT state_json FROM personal_baseline_state WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if not row:
                return TelemetryBaselineAdapter(warmup_samples=warmup_samples)
            data = json.loads(row["state_json"])
            return TelemetryBaselineAdapter.from_dict(data)

    def save_baseline_adapter(self, user_id: int, adapter: TelemetryBaselineAdapter) -> None:
        """Persist personal baseline adapter for patient."""
        now = time.time()
        serialized = json.dumps(adapter.to_dict())
        with self._get_db() as conn:
            conn.execute(
                """
                INSERT INTO personal_baseline_state(user_id, state_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    state_json = excluded.state_json,
                    updated_at = excluded.updated_at
                """,
                (user_id, serialized, now),
            )

    # ------------------------------------------------------------------ #
    # Continuous twin state
    # ------------------------------------------------------------------ #
    def load_twin_state(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Load the latest continuous Digital Twin state snapshot for patient."""
        with self._get_db() as conn:
            row = conn.execute(
                "SELECT state_json, last_window_end, updated_at FROM continuous_twin_state WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if not row:
                return None
            state = json.loads(row["state_json"])
            state["last_window_end"] = row["last_window_end"]
            state["updated_at"] = row["updated_at"]
            return state

    def save_twin_state(
        self, user_id: int, state_snapshot: Dict[str, Any], last_window_end: float
    ) -> None:
        """Persist continuous Digital Twin snapshot for patient."""
        now = time.time()
        serialized = json.dumps(state_snapshot)
        with self._get_db() as conn:
            conn.execute(
                """
                INSERT INTO continuous_twin_state(user_id, state_json, last_window_end, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    state_json = excluded.state_json,
                    last_window_end = excluded.last_window_end,
                    updated_at = excluded.updated_at
                """,
                (user_id, serialized, last_window_end, now),
            )
