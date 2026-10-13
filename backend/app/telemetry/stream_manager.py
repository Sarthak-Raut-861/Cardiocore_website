"""
CardioCoreEdge Telemetry Ingestion Stream Manager
Handles sequence validation, gap and duplicate detection, connection concurrency limits,
reconnect state preservation, and backpressure flow control.
"""

import time
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass, field
from app.telemetry.protocol import (
    BinaryFrameHeader,
    make_ack_frame,
    make_backpressure_frame,
    make_error_frame,
)

MAX_CONCURRENT_STREAMS_PER_USER = 2
BUFFER_HIGH_WATERMARK = 10  # Pending frames trigger backpressure
SESSION_GRACE_PERIOD_SEC = 300  # 5 minutes for reconnection state


@dataclass
class StreamSessionState:
    user_id: str
    patient_id: str
    stream_id: str
    last_sequence: int = -1
    total_frames_received: int = 0
    total_duplicates_detected: int = 0
    total_missing_gaps_detected: int = 0
    last_frame_timestamp_ms: int = 0
    connected_at: float = field(default_factory=time.time)
    last_active_at: float = field(default_factory=time.time)
    pending_buffer_count: int = 0
    is_active: bool = True

    def record_frame(self, header: BinaryFrameHeader) -> Tuple[bool, bool, Optional[str]]:
        """
        Validate incoming frame against sequence history.
        Returns: (is_duplicate, is_gap, error_message_if_any)
        """
        self.last_active_at = time.time()
        self.total_frames_received += 1

        seq = header.sequence_number

        # First frame initializes sequence
        if self.last_sequence == -1:
            self.last_sequence = seq
            self.last_frame_timestamp_ms = header.base_timestamp_ms
            return False, False, None

        # Sequence distance modulo 2^32 (RFC 1982 serial number arithmetic)
        diff = (seq - self.last_sequence) & 0xFFFFFFFF
        if diff == 0:
            self.total_duplicates_detected += 1
            return True, False, f"Duplicate or replayed frame sequence {seq}"

        # If diff is in the backward / replayed window (>= 2^31)
        if diff >= 0x80000000:
            self.total_duplicates_detected += 1
            return True, False, f"Replayed or out-of-order sequence {seq} behind {self.last_sequence}"

        # Forward sequence progression (diff in range 1 .. 2^31 - 1)
        is_gap = False
        if diff > 1:
            missing_count = diff - 1
            self.total_missing_gaps_detected += missing_count
            is_gap = True

        self.last_sequence = seq
        self.last_frame_timestamp_ms = header.base_timestamp_ms
        return False, is_gap, None

    def should_apply_backpressure(self) -> bool:
        """Determines if ingestion buffer has reached high watermark."""
        return self.pending_buffer_count >= BUFFER_HIGH_WATERMARK


class TelemetryStreamManager:
    """Manages active streaming connections and edge telemetry states."""

    def __init__(self):
        # key: stream_id (or device_session_id) -> StreamSessionState
        self._streams: Dict[str, StreamSessionState] = {}
        # key: user_id -> set of active stream_ids
        self._user_streams: Dict[str, set] = {}

    def register_stream(
        self, stream_id: str, user_id: str, patient_id: str
    ) -> Tuple[bool, Optional[str], StreamSessionState]:
        """
        Register a new streaming connection or reconnect to an existing grace session.
        Enforces connection concurrency limits.
        """
        active_set = self._user_streams.setdefault(user_id, set())

        # Check existing state for reconnect
        if stream_id in self._streams:
            state = self._streams[stream_id]
            state.is_active = True
            state.last_active_at = time.time()
            active_set.add(stream_id)
            return True, None, state

        # Check concurrency ceiling
        if len(active_set) >= MAX_CONCURRENT_STREAMS_PER_USER:
            return (
                False,
                f"Concurrent stream limit exceeded (max {MAX_CONCURRENT_STREAMS_PER_USER} per patient)",
                None,
            )

        state = StreamSessionState(
            user_id=user_id,
            patient_id=patient_id,
            stream_id=stream_id,
        )
        self._streams[stream_id] = state
        active_set.add(stream_id)
        return True, None, state

    def get_stream(self, stream_id: str) -> Optional[StreamSessionState]:
        return self._streams.get(stream_id)

    def unregister_stream(self, stream_id: str):
        """Mark stream as disconnected but retain sequence state during grace period."""
        if stream_id in self._streams:
            state = self._streams[stream_id]
            state.is_active = False
            state.last_active_at = time.time()
            user_id = state.user_id
            if user_id in self._user_streams:
                self._user_streams[user_id].discard(stream_id)

    def purge_expired_sessions(self):
        """Remove streams inactive past the grace period."""
        now = time.time()
        expired = [
            sid
            for sid, s in self._streams.items()
            if not s.is_active and (now - s.last_active_at > SESSION_GRACE_PERIOD_SEC)
        ]
        for sid in expired:
            del self._streams[sid]


stream_manager = TelemetryStreamManager()
