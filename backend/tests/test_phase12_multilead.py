"""
CardioCoreEdge Phase 12 Automated Test Suite: Backend Multi-Lead ECG Implementation
- Protocol v2 32-byte header parsing, active leads bitmask validation, popcount alignment.
- Full-frame CRC-32 integrity validation (covering header fields 0..27 + payload).
- Planar multi-channel raw and delta-zlib codecs with decompression bomb safety.
- Single-lead Protocol v1 backward compatibility preservation.
- Recording-based data model: creation, lifecycle transitions, patient authorization, doctor consent.
- Multi-channel chunk ingestion: atomic uniqueness, idempotent retries, conflict rejection.
- Isolated timestamps across distinct recordings.
- Cross-patient access protection and tamper-evident audit logging.
"""

import pytest
import time
import struct
import zlib
import hashlib
from datetime import datetime, timedelta
from starlette.testclient import TestClient
from sqlalchemy import select, and_, update

from app.main import app
from app.db.session import async_session_factory
from app.models.user import User
from app.models.telemetry import TelemetryRecording, TelemetryMultiChannelChunk
from app.models.audit import AuditEvent
from app.telemetry.protocol import (
    pack_frame,
    unpack_frame,
    pack_multichannel_frame,
    unpack_multichannel_frame,
    BinaryFrameHeader,
    MultiChannelFrameHeader,
    ProtocolParseError,
    MAGIC_BYTE,
    PROTOCOL_VERSION_V1,
    PROTOCOL_VERSION_V2,
    HEADER_SIZE,
    HEADER_SIZE_V2,
    MSG_TYPE_ECG_DATA,
    FLAG_DELTA_ZLIB,
    FLAG_LEAD_OFF,
    FLAG_CLIPPED,
    ALL_12_LEADS_MASK,
    ALL_6_LIMB_LEADS_MASK,
    ALL_3_LEADS_MASK,
    SINGLE_LEAD_II_MASK,
    LEAD_I_MASK,
    LEAD_II_MASK,
    LEAD_NAMES_ORDER,
)
from app.telemetry.chunk import (
    encode_raw_samples,
    decode_raw_samples,
    encode_multichannel_raw,
    decode_multichannel_raw,
    encode_multichannel_delta,
    decode_multichannel_delta,
    compute_multichannel_signal_quality,
)
from app.telemetry.stream_manager import StreamSessionState


# ==============================================================================
# Helper Functions for Test Frames
# ==============================================================================

def generate_synthetic_channel_samples(lead_count: int, sample_count: int) -> list:
    """Generate deterministic synthetic integer samples for testing."""
    channels = []
    for lead_idx in range(lead_count):
        # Vary frequency/amplitude deterministically by lead
        samples = [int(100 * (lead_idx + 1) + 50 * (i % 20)) for i in range(sample_count)]
        channels.append(samples)
    return channels


def csrf_headers(client: TestClient) -> dict:
    """Extract CSRF token from TestClient cookies and construct double-submit header."""
    token = client.cookies.get("cc_csrf")
    return {"X-CSRF-Token": token} if token else {}



# ==============================================================================
# 1. Protocol v2 Codec & Header Tests
# ==============================================================================

def test_v1_single_lead_frame_backward_compatibility():
    """Verify legacy 28-byte v1 frame is unpacked without regression."""
    raw_samples = [100, 200, -150, 400]
    payload = encode_raw_samples(raw_samples)
    v1_frame = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=len(raw_samples),
        flags=0,
        payload=payload,
    )
    assert len(v1_frame) == HEADER_SIZE + len(payload)
    hdr, unpacked_payload = unpack_frame(v1_frame)
    assert isinstance(hdr, BinaryFrameHeader)
    assert hdr.version == PROTOCOL_VERSION_V1
    assert hdr.channel_id == 1
    assert hdr.sample_count == len(raw_samples)
    assert decode_raw_samples(unpacked_payload) == raw_samples


def test_v2_multichannel_pack_unpack_raw():
    """Verify v2 32-byte header serialization and unpacking for uncompressed 12-lead frame."""
    channels = generate_synthetic_channel_samples(12, 50)
    payload = encode_multichannel_raw(channels)
    assert len(payload) == 12 * 50 * 2  # 1,200 bytes

    frame_bytes = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=42,
        base_timestamp_ms=1700000005000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_12_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=payload,
    )
    assert len(frame_bytes) == HEADER_SIZE_V2 + 1200  # 1,232 bytes

    hdr, unpacked_payload = unpack_multichannel_frame(frame_bytes)
    assert isinstance(hdr, MultiChannelFrameHeader)
    assert hdr.version == PROTOCOL_VERSION_V2
    assert hdr.active_leads_mask == ALL_12_LEADS_MASK
    assert hdr.active_channel_count == 12
    assert hdr.active_lead_names == LEAD_NAMES_ORDER
    assert hdr.sample_count == 50
    assert hdr.payload_length == 1200
    assert not hdr.is_compressed

    # Verify through generic unpack_frame dispatcher
    hdr_gen, payload_gen = unpack_frame(frame_bytes)
    assert isinstance(hdr_gen, MultiChannelFrameHeader)
    assert hdr_gen.sequence_number == 42
    decoded_channels = decode_multichannel_raw(payload_gen, hdr_gen.active_channel_count, hdr_gen.sample_count)
    assert decoded_channels == channels


def test_v2_multichannel_pack_unpack_planar_compressed():
    """Verify v2 multi-channel planar delta-zlib compression round-trip."""
    channels = generate_synthetic_channel_samples(12, 50)
    compressed_payload = encode_multichannel_delta(channels)
    assert len(compressed_payload) < len(encode_multichannel_raw(channels))

    frame_bytes = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=101,
        base_timestamp_ms=1700000010000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_12_LEADS_MASK,
        sample_count=50,
        flags=FLAG_DELTA_ZLIB,
        payload=compressed_payload,
    )
    hdr, payload = unpack_frame(frame_bytes)
    assert hdr.is_compressed
    assert hdr.payload_length == len(compressed_payload)

    reconstructed_channels = decode_multichannel_delta(
        payload, hdr.active_channel_count, hdr.sample_count
    )
    assert reconstructed_channels == channels


def test_sentinel_aware_delta_reconstruction():
    """Verify sentinel-aware delta encoding and decoding across all required cases (F-02)."""
    from app.telemetry.chunk import (
        SENTINEL_MISSING_SAMPLE,
        encode_delta_samples,
        decode_delta_samples,
    )

    # 1. Ordinary delta-encoded sequence
    s1 = [100, 150, 200, 180, 210]
    assert decode_delta_samples(encode_delta_samples(s1)) == s1

    # 2. Missing sentinel at the beginning of a channel
    s2 = [SENTINEL_MISSING_SAMPLE, 150, 200, 250]
    assert decode_delta_samples(encode_delta_samples(s2)) == s2

    # 3. Sentinel between valid samples
    s3 = [100, 200, SENTINEL_MISSING_SAMPLE, 350, 400]
    assert decode_delta_samples(encode_delta_samples(s3)) == s3

    # 4. Multiple consecutive sentinels
    s4 = [100, SENTINEL_MISSING_SAMPLE, SENTINEL_MISSING_SAMPLE, SENTINEL_MISSING_SAMPLE, 500]
    assert decode_delta_samples(encode_delta_samples(s4)) == s4

    # 5. Valid samples immediately following a sentinel
    s5 = [SENTINEL_MISSING_SAMPLE, 1234, 1250, SENTINEL_MISSING_SAMPLE, -500, -450]
    assert decode_delta_samples(encode_delta_samples(s5)) == s5

    # 6. Sentinel handling across separate channels
    chans = [
        [SENTINEL_MISSING_SAMPLE, 100, 200],
        [50, SENTINEL_MISSING_SAMPLE, 80],
        [10, 20, SENTINEL_MISSING_SAMPLE],
    ]
    enc_multi = encode_multichannel_delta(chans)
    assert decode_multichannel_delta(enc_multi, channel_count=3, sample_count=3) == chans

    # 7. Signed boundary values that are not the missing-sample sentinel (-32767 and 32767)
    s7 = [-32767, -32000, 0, 32000, 32767]
    assert decode_delta_samples(encode_delta_samples(s7)) == s7

    # 8. Round-trip encoding and decoding with multiple sentinels and rail boundaries
    s8 = [
        [32767, SENTINEL_MISSING_SAMPLE, -32767, -32000, 0],
        [0, 16000, SENTINEL_MISSING_SAMPLE, 32767, 32000],
        [-32767, -32700, SENTINEL_MISSING_SAMPLE, SENTINEL_MISSING_SAMPLE, 100],
    ]
    enc8 = encode_multichannel_delta(s8)
    assert decode_multichannel_delta(enc8, channel_count=3, sample_count=5) == s8


def test_v2_header_crc_protects_header_and_payload():
    """Verify v2 CRC covers all header bytes before CRC (0..27) as well as the payload."""
    channels = generate_synthetic_channel_samples(3, 50)
    payload = encode_multichannel_raw(channels)
    frame = bytearray(
        pack_multichannel_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=10,
            base_timestamp_ms=1700000000000,
            sampling_rate_hz=250,
            active_leads_mask=ALL_3_LEADS_MASK,
            sample_count=50,
            flags=0,
            payload=payload,
        )
    )

    # 1. Corrupt byte in header (sequence number at offset 5)
    corrupted_hdr_frame = bytearray(frame)
    corrupted_hdr_frame[5] ^= 0xFF
    with pytest.raises(ProtocolParseError) as exc_info:
        unpack_frame(bytes(corrupted_hdr_frame))
    assert exc_info.value.code == 4006  # Checksum mismatch

    # 2. Corrupt byte in payload (offset 35)
    corrupted_payload_frame = bytearray(frame)
    corrupted_payload_frame[35] ^= 0xFF
    with pytest.raises(ProtocolParseError) as exc_info:
        unpack_frame(bytes(corrupted_payload_frame))
    assert exc_info.value.code == 4006


def test_v2_invalid_version_rejected():
    """Verify frame with invalid version is rejected with code 4004."""
    data = bytearray(b"\xCC\x03\x01\x00" + b"\x00" * 28)
    with pytest.raises(ProtocolParseError) as exc:
        unpack_frame(bytes(data))
    assert exc.value.code == 4004


def test_v2_frame_underflow_and_overflow():
    """Verify frames under 32 bytes or over 64 KiB are rejected."""
    # Underflow
    with pytest.raises(ProtocolParseError) as exc_under:
        unpack_multichannel_frame(b"\xCC\x02\x01\x00" + b"\x00" * 20)  # 24 bytes
    assert exc_under.value.code == 4002

    # Overflow
    oversized = b"\xCC\x02\x01\x00" + b"\x00" * 65540
    with pytest.raises(ProtocolParseError) as exc_over:
        unpack_multichannel_frame(oversized)
    assert exc_over.value.code == 4001


def test_v2_uncompressed_popcount_length_mismatch():
    """Verify uncompressed frame length must match active_channels * sample_count * 2."""
    channels_3 = generate_synthetic_channel_samples(3, 50)
    payload_3 = encode_multichannel_raw(channels_3)  # 300 bytes

    # Lie in header: claim 12-lead mask (0x0FFF) but provide only 3-lead payload (300 bytes)
    hdr_pre = struct.pack(
        "!BBBB I Q H H H H H H",
        MAGIC_BYTE,
        PROTOCOL_VERSION_V2,
        MSG_TYPE_ECG_DATA,
        0,  # uncompressed
        1,
        1700000000000,
        250,
        ALL_12_LEADS_MASK,  # 12 channels expected -> 1200 bytes
        50,
        300,  # declared 300 bytes
        0,
        0,
    )
    crc = zlib.crc32(hdr_pre + payload_3) & 0xFFFFFFFF
    corrupt_frame = hdr_pre + struct.pack("!I", crc) + payload_3

    with pytest.raises(ProtocolParseError) as exc:
        unpack_multichannel_frame(corrupt_frame)
    assert exc.value.code == 4005  # Popcount length mismatch


def test_v2_invalid_active_leads_mask():
    """Verify active_leads_mask must be non-zero and within 0x0FFF."""
    # Zero mask
    with pytest.raises(ProtocolParseError) as exc_zero:
        pack_multichannel_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=1,
            base_timestamp_ms=1000,
            sampling_rate_hz=250,
            active_leads_mask=0,
            sample_count=10,
            flags=0,
            payload=b"\x00" * 20,
        )
    assert exc_zero.value.code == 4010

    # Reserved bits set (> 0x0FFF)
    with pytest.raises(ProtocolParseError) as exc_res:
        pack_multichannel_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=1,
            base_timestamp_ms=1000,
            sampling_rate_hz=250,
            active_leads_mask=0x1000,
            sample_count=10,
            flags=0,
            payload=b"\x00" * 20,
        )
    assert exc_res.value.code == 4010


def test_v2_decompression_bomb_protection():
    """Verify decompressing planar delta payload exceeding 64 KiB ceiling is blocked."""
    # Construct synthetic delta payload that expands to 70 KiB
    huge_deltas = [1] * 35000  # 35,000 int16 samples = 70,000 bytes
    huge_bytes = encode_raw_samples(huge_deltas)
    compressed_huge = zlib.compress(huge_bytes, level=1)

    with pytest.raises(ValueError) as exc:
        decode_multichannel_delta(
            compressed_huge,
            channel_count=1,
            sample_count=35000,
            max_uncompressed_bytes=65536,
        )
    assert "decompression bomb protection" in str(exc.value)


def test_v2_sequence_tracking_wraparound_gaps_duplicates():
    """Verify StreamSessionState sequence arithmetic modulo 2^32 works with v2 sequences."""
    state = StreamSessionState(user_id="u1", patient_id="p1", stream_id="s1")

    class MockHdr:
        def __init__(self, seq, ts=1000):
            self.sequence_number = seq
            self.base_timestamp_ms = ts

    # Init
    dup, gap, _ = state.record_frame(MockHdr(1))
    assert not dup and not gap

    # Consecutive
    dup, gap, _ = state.record_frame(MockHdr(2))
    assert not dup and not gap

    # Duplicate
    dup, gap, _ = state.record_frame(MockHdr(2))
    assert dup

    # Gap of 3 frames (jump to 6)
    dup, gap, _ = state.record_frame(MockHdr(6))
    assert not dup and gap
    assert state.total_missing_gaps_detected == 3

    # Wraparound from near 2^32 - 1 to 5
    state.last_sequence = 0xFFFFFFFD
    dup, gap, _ = state.record_frame(MockHdr(0xFFFFFFFE))
    assert not dup and not gap
    dup, gap, _ = state.record_frame(MockHdr(2))  # forward wraparound
    assert not dup and gap  # diff = (2 - 0xFFFFFFFE) & 0xFFFFFFFF = 4 -> gap of 3


# ==============================================================================
# 2. Persistence, Idempotency & API Integration Tests
# ==============================================================================

def test_create_recording_valid_12lead():
    """Verify patient can create an active 12-lead recording session."""
    client = TestClient(app)
    # Login patient Aarav
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200

    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={
            "patient_id": "prof_patient_aarav_44821",
            "device_id": "edge_ecg_pro_01",
            "lead_config": "12-lead",
            "active_leads_mask": ALL_12_LEADS_MASK,
            "sampling_rate_hz": 250,
            "notes": "Resting 12-lead ECG baseline",
        },
        headers=csrf_headers(client),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["patientId"] == "prof_patient_aarav_44821"
    assert data["leadConfig"] == "12-lead"
    assert data["activeLeadsMask"] == ALL_12_LEADS_MASK
    assert data["status"] == "active"
    assert "id" in data


def test_create_recording_invalid_mask_and_rate_rejected():
    """Verify invalid mask or sampling rate returns 422 Unprocessable Entity."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    # Invalid mask
    resp_bad_mask = client.post(
        "/api/v1/telemetry/recordings",
        json={
            "patient_id": "prof_patient_aarav_44821",
            "lead_config": "12-lead",
            "active_leads_mask": 0,
        },
        headers=csrf_headers(client),
    )
    assert resp_bad_mask.status_code == 422

    # Unsupported sampling rate
    resp_bad_rate = client.post(
        "/api/v1/telemetry/recordings",
        json={
            "patient_id": "prof_patient_aarav_44821",
            "sampling_rate_hz": 999,
        },
        headers=csrf_headers(client),
    )
    assert resp_bad_rate.status_code == 422


def test_create_recording_unauthenticated_and_cross_patient_denied():
    """Verify unauthenticated requests return 401 and cross-patient access returns 403."""
    client = TestClient(app)

    # 1. Unauthenticated
    resp_unauth = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821"},
    )
    assert resp_unauth.status_code == 401

    # 2. Login Aarav and attempt to create recording for Rohit
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    resp_cross = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_rohit_11204"},
        headers=csrf_headers(client),
    )
    assert resp_cross.status_code == 403
    assert "Access denied" in resp_cross.json()["detail"]


def test_recording_lifecycle_transitions():
    """Verify recording transitions from active to completed, and rejects further changes."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    # Create recording
    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "6-lead", "active_leads_mask": ALL_6_LIMB_LEADS_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    # Transition to completed
    patch_resp = client.patch(
        f"/api/v1/telemetry/recordings/{rec_id}/status",
        json={"status": "completed"},
        headers=csrf_headers(client),
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "completed"
    assert patch_resp.json()["endedAt"] is not None

    # Attempt second transition -> 400 Bad Request
    patch_resp_again = client.patch(
        f"/api/v1/telemetry/recordings/{rec_id}/status",
        json={"status": "interrupted"},
        headers=csrf_headers(client),
    )
    assert patch_resp_again.status_code == 400


def test_ingest_multichannel_chunks_valid():
    """Verify batch ingestion of valid synchronized Protocol v2 chunks into active recording."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    # Generate 2 v2 frames
    frames = []
    base_ts = 1700001000000
    for seq in [1, 2]:
        channels = generate_synthetic_channel_samples(12, 50)
        payload = encode_multichannel_delta(channels)
        frame_bytes = pack_multichannel_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=seq,
            base_timestamp_ms=base_ts + (seq - 1) * 200,
            sampling_rate_hz=250,
            active_leads_mask=ALL_12_LEADS_MASK,
            sample_count=50,
            flags=FLAG_DELTA_ZLIB,
            payload=payload,
        )
        frames.append(frame_bytes.hex())

    ingest_resp = client.post(
        f"/api/v1/telemetry/recordings/{rec_id}/chunks",
        json={"frames": frames},
        headers=csrf_headers(client),
    )
    assert ingest_resp.status_code == 200
    data = ingest_resp.json()
    assert data["processedChunks"] == 2
    assert data["duplicateChunks"] == 0
    assert data["conflictChunks"] == 0
    assert data["errorCount"] == 0

    # Verify retrieval
    get_resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks")
    assert get_resp.status_code == 200
    chunks = get_resp.json()["chunks"]
    assert len(chunks) == 2
    assert chunks[0]["sequenceNumber"] == 1
    assert chunks[1]["sequenceNumber"] == 2
    assert chunks[0]["channelCount"] == 12


def test_ingest_multichannel_chunks_idempotent_duplicate():
    """Verify resubmitting identical frames is recognized as idempotent duplicates."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    channels = generate_synthetic_channel_samples(3, 50)
    payload = encode_multichannel_raw(channels)
    frame_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700002000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=payload,
    ).hex()

    # First upload
    res1 = client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [frame_hex]}, headers=csrf_headers(client))
    assert res1.json()["processedChunks"] == 1

    # Second upload (identical retry)
    res2 = client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [frame_hex]}, headers=csrf_headers(client))
    assert res2.json()["processedChunks"] == 0
    assert res2.json()["duplicateChunks"] == 1
    assert res2.json()["conflictChunks"] == 0


@pytest.mark.asyncio
async def test_ingest_multichannel_chunks_conflict_rejected():
    """Verify resubmitting same sequence with conflicting payload is flagged as conflict and audited."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    # Frame 1
    ch1 = generate_synthetic_channel_samples(3, 50)
    f1_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700003000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=encode_multichannel_raw(ch1),
    ).hex()
    client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [f1_hex]}, headers=csrf_headers(client))

    # Frame 1 with conflicting samples
    ch2 = [[val + 500 for val in samples] for samples in ch1]
    f2_conflict_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700003000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=encode_multichannel_raw(ch2),
    ).hex()

    res_conflict = client.post(
        f"/api/v1/telemetry/recordings/{rec_id}/chunks",
        json={"frames": [f2_conflict_hex]},
        headers=csrf_headers(client),
    )
    assert res_conflict.json()["conflictChunks"] == 1
    assert res_conflict.json()["processedChunks"] == 0

    # Verify audit event recorded
    async with async_session_factory() as db:
        stmt = select(AuditEvent).where(AuditEvent.action == "MULTICHANNEL_CHUNK_CONFLICT")
        events = (await db.execute(stmt)).scalars().all()
        assert len(events) >= 1
        assert any(e.resource_id for e in events)


def test_ingest_into_completed_recording_rejected():
    """Verify ingesting chunks into a completed recording returns 409 Conflict."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "single-lead", "active_leads_mask": SINGLE_LEAD_II_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    # Terminate recording
    client.patch(f"/api/v1/telemetry/recordings/{rec_id}/status", json={"status": "completed"}, headers=csrf_headers(client))

    # Attempt ingestion
    payload = encode_multichannel_raw([[100, 200, 300]])
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700004000000,
        sampling_rate_hz=250,
        active_leads_mask=SINGLE_LEAD_II_MASK,
        sample_count=3,
        flags=0,
        payload=payload,
    ).hex()

    ingest_resp = client.post(
        f"/api/v1/telemetry/recordings/{rec_id}/chunks",
        json={"frames": [f_hex]},
        headers=csrf_headers(client),
    )
    assert ingest_resp.status_code == 409


def test_ingest_channel_mask_mismatch_rejected():
    """Verify frames with a channel mask not matching the recording mask are rejected."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    create_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers=csrf_headers(client),
    )
    rec_id = create_resp.json()["id"]

    # Send 3-lead frame to 12-lead recording
    payload_3 = encode_multichannel_raw(generate_synthetic_channel_samples(3, 50))
    f_3lead_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700005000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=payload_3,
    ).hex()

    ingest_resp = client.post(
        f"/api/v1/telemetry/recordings/{rec_id}/chunks",
        json={"frames": [f_3lead_hex]},
        headers=csrf_headers(client),
    )
    assert ingest_resp.json()["errorCount"] == 1
    assert ingest_resp.json()["processedChunks"] == 0


def test_identical_timestamps_different_recordings():
    """Verify two distinct recordings can store frames with identical timestamps without collision."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    # Recording A
    rec_a = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    # Recording B
    rec_b = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    identical_ts = 1700006000000
    ch = generate_synthetic_channel_samples(3, 50)
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=identical_ts,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=encode_multichannel_raw(ch),
    ).hex()

    res_a = client.post(f"/api/v1/telemetry/recordings/{rec_a}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))
    res_b = client.post(f"/api/v1/telemetry/recordings/{rec_b}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))

    assert res_a.json()["processedChunks"] == 1
    assert res_b.json()["processedChunks"] == 1


@pytest.mark.asyncio
async def test_doctor_with_consent_can_access_patient_recording():
    """Verify clinician with active consent can access patient's multi-lead recording."""
    client = TestClient(app)

    # 1. Patient Aarav creates recording
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    # 2. Login Doctor Neha (with active consent fixture cg_aarav_meridian_active)
    import pyotp
    totp = pyotp.TOTP("JBSWY3DPEHPK3PXP").now()
    doc_login = client.post(
        "/api/v1/auth/login/doctor",
        json={
            "email": "neha.raghavan@meridianheart.in",
            "password": "clinician123",
            "medicalCouncil": "Maharashtra Medical Council",
            "registrationNumber": "MMC-2010-44821",
            "institution": "Meridian Heart Institute",
            "totpCode": totp,
            "consentAgreement": True,
        },
    )
    assert doc_login.status_code == 200

    # Doctor views Aarav's recording
    doc_view = client.get(f"/api/v1/telemetry/recordings/{rec_id}")
    assert doc_view.status_code == 200
    assert doc_view.json()["id"] == rec_id


@pytest.mark.asyncio
async def test_doctor_without_consent_denied_access():
    """Verify clinician without consent is denied access to patient recording."""
    client = TestClient(app)

    # 1. Patient Rohit creates recording (no active consent to Meridian Heart)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "rohit.sharma@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_rohit_11204", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    # 2. Doctor Neha attempts access
    import pyotp
    totp = pyotp.TOTP("JBSWY3DPEHPK3PXP").now()
    doc_login = client.post(
        "/api/v1/auth/login/doctor",
        json={
            "email": "neha.raghavan@meridianheart.in",
            "password": "clinician123",
            "medicalCouncil": "Maharashtra Medical Council",
            "registrationNumber": "MMC-2010-44821",
            "institution": "Meridian Heart Institute",
            "totpCode": totp,
            "consentAgreement": True,
        },
    )
    assert doc_login.status_code == 200

    doc_view = client.get(f"/api/v1/telemetry/recordings/{rec_id}")
    assert doc_view.status_code == 403
    assert "no ECG consent" in doc_view.json()["detail"]


# ==============================================================================
# 5. Dedicated CSRF Protection Tests on Recording Mutation Routes
# ==============================================================================

def test_recording_csrf_missing_token_rejected():
    """Verify authenticated request without double-submit CSRF token header returns 403."""
    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    assert "cc_csrf" in client.cookies

    # Attempt mutation without X-CSRF-Token header
    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
    )
    assert resp.status_code == 403
    assert "CSRF validation failed" in resp.json()["detail"]


def test_recording_csrf_invalid_token_rejected():
    """Verify authenticated request with mismatched/invalid CSRF token header returns 403."""
    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200

    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers={"X-CSRF-Token": "bogus_tampered_csrf_token_12345"},
    )
    assert resp.status_code == 403
    assert "CSRF validation failed" in resp.json()["detail"]


def test_recording_csrf_valid_token_accepted():
    """Verify authenticated request with matching double-submit CSRF token succeeds."""
    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    csrf_token = client.cookies.get("cc_csrf")
    assert csrf_token is not None

    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert resp.status_code == 201
    assert "id" in resp.json()


def test_recording_csrf_unauthenticated_rejected():
    """Verify unauthenticated request without session cookie returns 401 Unauthorized."""
    client = TestClient(app)
    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "12-lead", "active_leads_mask": ALL_12_LEADS_MASK},
        headers={"X-CSRF-Token": "some_arbitrary_token"},
    )
    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_recording_csrf_patient_isolation_not_bypassed():
    """Verify valid CSRF token cannot bypass patient ownership boundaries."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    # Aarav provides valid CSRF token, but tries to create recording for Rohit
    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_rohit_11204", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_recording_csrf_clinician_consent_not_bypassed():
    """Verify valid CSRF token cannot bypass clinician patient consent verification."""
    client = TestClient(app)
    import pyotp
    totp = pyotp.TOTP("JBSWY3DPEHPK3PXP").now()
    client.post(
        "/api/v1/auth/login/doctor",
        json={
            "email": "neha.raghavan@meridianheart.in",
            "password": "clinician123",
            "medicalCouncil": "Maharashtra Medical Council",
            "registrationNumber": "MMC-2010-44821",
            "institution": "Meridian Heart Institute",
            "totpCode": totp,
            "consentAgreement": True,
        },
    )
    # Doctor provides valid CSRF token, but targets patient Rohit (no active consent)
    resp = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_rohit_11204", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 403
    assert "consent" in resp.json()["detail"].lower()

