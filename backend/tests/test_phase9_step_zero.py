"""
CardioCoreEdge Phase 9 Step Zero Gate Validation Tests
Validates:
1. Protocol v1 header size (28 bytes), max payload limit (65,508 bytes), and frame ceiling (65,536 bytes).
2. Rejection of unsupported message types and reserved flags.
3. Decompression bomb expansion ceiling.
4. Deterministic sequence-number rollover (modulo 2^32), duplicate detection, and gap tracking.
5. Batch-upload idempotency, identical retry deduplication, conflict rejection, and size ceiling.
"""

import pytest
import pytest_asyncio
import zlib
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update

from app.main import app
from app.db.session import async_session_factory
from app.db.seed import init_tables, seed_synthetic_fixtures
from app.models.user import User
from app.models.consent import ConsentGrant
from app.models.telemetry import TelemetryChunk
from app.telemetry.protocol import (
    pack_frame,
    unpack_frame,
    ProtocolParseError,
    HEADER_SIZE,
    MAX_FRAME_SIZE,
    MAX_PAYLOAD_SIZE,
    MAGIC_BYTE,
    PROTOCOL_VERSION_V1,
    MSG_TYPE_ECG_DATA,
    FLAG_DELTA_ZLIB,
)
from app.telemetry.chunk import (
    decode_delta_samples,
    encode_delta_samples,
    encode_raw_samples,
    MAX_DECOMPRESSED_BYTES,
)
from app.telemetry.stream_manager import stream_manager


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    await init_tables()
    async with async_session_factory() as session:
        await seed_synthetic_fixtures(session)
        await session.execute(update(User).values(last_totp_timestep=None))
        await session.execute(
            update(ConsentGrant)
            .where(ConsentGrant.id == "cg_aarav_meridian_active")
            .values(status="active", revoked_at=None)
        )
        await session.commit()


@pytest.fixture
def anyio_backend():
    return "asyncio"


# -----------------------------------------------------------------------------
# 1. Protocol Exact Size Boundaries & Limits
# -----------------------------------------------------------------------------

def test_protocol_exact_dimensions():
    assert HEADER_SIZE == 28
    assert MAX_FRAME_SIZE == 65536
    assert MAX_PAYLOAD_SIZE == 65508  # 65,536 - 28


def test_payload_at_exact_limit_accepted():
    max_payload = b"\x00" * MAX_PAYLOAD_SIZE
    frame = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1000,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=100,
        flags=0,
        payload=max_payload,
    )
    assert len(frame) == MAX_FRAME_SIZE
    hdr, payload = unpack_frame(frame)
    assert len(payload) == MAX_PAYLOAD_SIZE


def test_payload_one_byte_over_limit_rejected():
    over_payload = b"\x00" * (MAX_PAYLOAD_SIZE + 1)
    with pytest.raises(ProtocolParseError) as exc_info:
        pack_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=1,
            base_timestamp_ms=1000,
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=100,
            flags=0,
            payload=over_payload,
        )
    assert exc_info.value.code == 4001


def test_unsupported_msg_type_rejected():
    with pytest.raises(ProtocolParseError) as exc_info:
        pack_frame(
            msg_type=0x99,  # Unknown message type
            sequence_number=1,
            base_timestamp_ms=1000,
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=0,
            flags=0,
            payload=b"",
        )
    assert exc_info.value.code == 4008
    assert "Unsupported message type" in str(exc_info.value)


def test_reserved_flags_rejected():
    with pytest.raises(ProtocolParseError) as exc_info:
        pack_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=1,
            base_timestamp_ms=1000,
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=2,
            flags=0x80,  # Reserved bit 7 set
            payload=b"\x00\x00\x00\x00",
        )
    assert exc_info.value.code == 4009
    assert "Reserved flag bits" in str(exc_info.value)


# -----------------------------------------------------------------------------
# 2. Decompression Bomb Protection
# -----------------------------------------------------------------------------

def test_decompression_bomb_prevention():
    # Construct a compression bomb (highly compressed zeroes that expand beyond safe limit)
    huge_data = b"\x00" * 200000  # 200 KiB uncompressed
    compressed_bomb = zlib.compress(huge_data, level=9)
    assert len(compressed_bomb) < 1000  # Highly compressed

    # decode_delta_samples must raise ValueError rather than expanding indefinitely
    with pytest.raises(ValueError) as exc_info:
        decode_delta_samples(compressed_bomb, max_uncompressed_bytes=MAX_DECOMPRESSED_BYTES)
    assert "Decompression exceeded safe limit" in str(exc_info.value)


# -----------------------------------------------------------------------------
# 3. Sequence Number Rollover Handling (Modulo 2^32)
# -----------------------------------------------------------------------------

def test_sequence_rollover_determinism():
    stream_id = "test_stream_rollover"
    ok, _, state = stream_manager.register_stream(stream_id, "usr_roll", "pat_roll")
    assert ok is True

    # Initialize near rollover boundary: 4,294,967,294
    near_max_seq = 0xFFFFFFFE
    h_near = unpack_frame(
        pack_frame(MSG_TYPE_ECG_DATA, near_max_seq, 1000, 250, 1, 10, 0, b"\x00" * 20)
    )[0]
    is_dup, is_gap, _ = state.record_frame(h_near)
    assert state.last_sequence == near_max_seq

    # Exact next sequence: 4,294,967,295
    h_max = unpack_frame(
        pack_frame(MSG_TYPE_ECG_DATA, 0xFFFFFFFF, 2000, 250, 1, 10, 0, b"\x00" * 20)
    )[0]
    is_dup, is_gap, _ = state.record_frame(h_max)
    assert is_dup is False
    assert is_gap is False
    assert state.last_sequence == 0xFFFFFFFF

    # Sequence rolls over to 0 (normal wrap-around)
    h_zero = unpack_frame(
        pack_frame(MSG_TYPE_ECG_DATA, 0, 3000, 250, 1, 10, 0, b"\x00" * 20)
    )[0]
    is_dup, is_gap, _ = state.record_frame(h_zero)
    assert is_dup is False
    assert is_gap is False
    assert state.last_sequence == 0

    # Old sequence (e.g. 0xFFFFFFFF replayed after rollover) -> rejected as duplicate/replayed!
    is_dup, is_gap, err_msg = state.record_frame(h_max)
    assert is_dup is True
    assert "Replayed or out-of-order" in err_msg

    stream_manager.unregister_stream(stream_id)


# -----------------------------------------------------------------------------
# 4. Batch Upload Idempotency & Conflict Rejection
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_batch_upload_idempotency_identical_retries():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Patient login
        login_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        assert login_resp.status_code == 200

        # Construct batch of 2 frames with distinct dynamic timestamps
        import time
        now_ts = int(time.time() * 1000)
        samples = [100, 200, 300]
        payload = encode_raw_samples(samples)
        ts1 = now_ts + 500000
        ts2 = now_ts + 505000
        f1 = pack_frame(MSG_TYPE_ECG_DATA, 1, ts1, 250, 1, 3, 0, payload)
        f2 = pack_frame(MSG_TYPE_ECG_DATA, 2, ts2, 250, 1, 3, 0, payload)
        batch = [f1.hex(), f2.hex()]

        # 1. First upload -> 2 processed, 0 duplicates
        resp1 = await ac.post("/api/v1/telemetry/batch", json=batch)
        assert resp1.status_code == 200
        d1 = resp1.json()
        assert d1["processedChunks"] == 2
        assert d1["duplicateChunks"] == 0

        # 2. Repeated IDENTICAL upload (retry) -> 0 processed, 2 duplicates, 0 conflicts!
        resp2 = await ac.post("/api/v1/telemetry/batch", json=batch)
        assert resp2.status_code == 200
        d2 = resp2.json()
        assert d2["processedChunks"] == 0
        assert d2["duplicateChunks"] == 2
        assert d2["conflictChunks"] == 0

        # Verify database has exactly 1 record per timestamp, not 2
        async with async_session_factory() as session:
            stmt = select(TelemetryChunk).where(
                TelemetryChunk.start_timestamp.in_([
                    datetime.utcfromtimestamp(ts1 / 1000.0),
                    datetime.utcfromtimestamp(ts2 / 1000.0),
                ])
            )
            records = (await session.execute(stmt)).scalars().all()
            assert len(records) == 2


@pytest.mark.asyncio
async def test_batch_upload_conflict_rejection():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )

        import time
        ts_conflict = int(time.time() * 1000) + 600000
        # Original frame
        orig_payload = encode_raw_samples([10, 20, 30])
        f_orig = pack_frame(MSG_TYPE_ECG_DATA, 1, ts_conflict, 250, 1, 3, 0, orig_payload)
        await ac.post("/api/v1/telemetry/batch", json=[f_orig.hex()])

        # Conflicting frame: same timestamp, different payload
        conflict_payload = encode_raw_samples([999, 888, 777])
        f_conflict = pack_frame(MSG_TYPE_ECG_DATA, 1, ts_conflict, 250, 1, 3, 0, conflict_payload)
        resp_conflict = await ac.post("/api/v1/telemetry/batch", json=[f_conflict.hex()])
        assert resp_conflict.status_code == 200
        data = resp_conflict.json()
        assert data["conflictChunks"] == 1
        assert data["processedChunks"] == 0


@pytest.mark.asyncio
async def test_batch_upload_size_limit_enforced():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )

        # Batch of 51 frames (exceeds MAX_BATCH_FRAMES = 50)
        f = pack_frame(MSG_TYPE_ECG_DATA, 1, 1000, 250, 1, 1, 0, b"\x00\x00")
        oversized_batch = [f.hex()] * 51

        resp = await ac.post("/api/v1/telemetry/batch", json=oversized_batch)
        assert resp.status_code == 400
        assert "exceeds maximum allowed limit" in resp.json()["detail"]
