"""
CardioCoreEdge Phase 10 Automated Test Suite: Reliability, Security & Sustained-Load Validation
- Mid-stream session invalidation (logout/expiration during active WebSocket streaming).
- Cross-patient stream isolation (patients prohibited from accessing other patients' telemetry).
- Batch recovery idempotency, duplicate suppression, and conflicting payload rejection.
- Batch upload frame limit enforcement (MAX_BATCH_FRAMES = 50).
- Clinician consent enforcement during batch recovery.
- Telemetry binary protocol resilience: CRC-32 corruption, malformed frames, bounds validation.
"""

import pytest
import time
from datetime import datetime
from starlette.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.db.session import async_session_factory
from app.models.session import SessionModel
from app.models.consent import ConsentGrant
from app.telemetry.protocol import (
    pack_frame,
    unpack_frame,
    make_ack_frame,
    make_error_frame,
    ProtocolParseError,
    MSG_TYPE_ECG_DATA,
    MSG_TYPE_ERROR,
)
from app.telemetry.chunk import encode_raw_samples, decode_raw_samples


def test_unauthenticated_ws_handshake_rejected():
    """Verify monitor mode rejects unauthenticated access with code 4401 error frame."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/telemetry/ws/invalid_token_xyz?mode=monitor") as ws:
        err_data = ws.receive_bytes()
        hdr, payload = unpack_frame(err_data)
        assert hdr.msg_type == MSG_TYPE_ERROR


@pytest.mark.asyncio
async def test_mid_stream_session_invalidation():
    """Verify revoking a session mid-stream drops the active WebSocket connection with 4401."""
    client = TestClient(app)
    # 1. Login patient
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # 2. Connect in mode=monitor
    with client.websocket_connect(f"/api/v1/telemetry/ws/{token}?mode=monitor&device_id=mid_sess_01") as ws:
        # Frame 1 received successfully
        d1 = ws.receive_bytes()
        h1, _ = unpack_frame(d1)
        assert h1.msg_type == MSG_TYPE_ECG_DATA
        assert h1.sequence_number == 1

        # Invalidate session in database (simulate logout / timeout)
        from app.services.session_service import revoke_session_by_token
        async with async_session_factory() as db:
            await revoke_session_by_token(db, token)

        # The server checks session validity every 5 frames (~1 sec). Stream should terminate.
        terminated = False
        try:
            for _ in range(12):
                d = ws.receive_bytes()
                h, _ = unpack_frame(d)
                if h.msg_type == MSG_TYPE_ERROR:
                    terminated = True
                    break
        except Exception:
            terminated = True

        assert terminated is True


def test_cross_patient_ws_isolation():
    """Verify a patient cannot request or stream another patient's telemetry."""
    client = TestClient(app)
    # Login patient Aarav
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # Attempt to stream telemetry for a different patient ID
    with client.websocket_connect(f"/api/v1/telemetry/ws/{token}?mode=monitor&patient_id=prof_patient_other_999") as ws:
        err_data = ws.receive_bytes()
        hdr, _ = unpack_frame(err_data)
        assert hdr.msg_type == MSG_TYPE_ERROR


def test_batch_upload_idempotency_and_deduplication():
    """Verify batch upload endpoint is strictly idempotent with 0 duplicate rows on replay."""
    client = TestClient(app)
    # Login patient
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # Create 3 synthetic frames with distinct timestamps
    now_ms = int(time.time() * 1000)
    samples = [int(100 * (i % 10)) for i in range(50)]
    payload = encode_raw_samples(samples)

    frames_hex = []
    for seq in range(1, 4):
        raw = pack_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=seq,
            base_timestamp_ms=now_ms + (seq * 200),
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=len(samples),
            flags=0,
            payload=payload,
        )
        frames_hex.append(raw.hex())

    # First submission: all 3 should be processed
    resp1 = client.post(
        "/api/v1/telemetry/batch",
        json=frames_hex,
        cookies={"cc_session": token},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "completed"
    assert data1["processedChunks"] == 3
    assert data1["duplicateChunks"] == 0
    assert data1["errorCount"] == 0

    # Second submission of the exact same batch: all 3 must be detected as duplicates
    resp2 = client.post(
        "/api/v1/telemetry/batch",
        json=frames_hex,
        cookies={"cc_session": token},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "completed"
    assert data2["processedChunks"] == 0
    assert data2["duplicateChunks"] == 3
    assert data2["conflictChunks"] == 0
    assert data2["errorCount"] == 0


def test_batch_upload_conflicting_payload_rejection():
    """Verify batch frames sharing the same timestamp but differing payload checksum are rejected as conflicts."""
    client = TestClient(app)
    # Login patient
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # Fixed timestamp
    target_ts = int(time.time() * 1000) + 50000

    # Frame A
    payload_a = encode_raw_samples([10, 20, 30] * 10)
    raw_a = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=101,
        base_timestamp_ms=target_ts,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=30,
        flags=0,
        payload=payload_a,
    )

    # Initial upload
    resp1 = client.post(
        "/api/v1/telemetry/batch",
        json=[raw_a.hex()],
        cookies={"cc_session": token},
    )
    assert resp1.status_code == 200
    assert resp1.json()["processedChunks"] == 1

    # Frame B with identical timestamp but different payload
    payload_b = encode_raw_samples([999, -999, 500] * 10)
    raw_b = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=102,
        base_timestamp_ms=target_ts,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=30,
        flags=0,
        payload=payload_b,
    )

    resp2 = client.post(
        "/api/v1/telemetry/batch",
        json=[raw_b.hex()],
        cookies={"cc_session": token},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["processedChunks"] == 0
    assert data2["conflictChunks"] == 1
    assert data2["errorCount"] == 1


def test_batch_upload_size_limit():
    """Verify batch upload enforces configured limit (MAX_BATCH_FRAMES = 50)."""
    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    token = login_resp.cookies.get("cc_session")

    oversized_batch = ["00" * 32] * 51  # 51 frames
    resp = client.post(
        "/api/v1/telemetry/batch",
        json=oversized_batch,
        cookies={"cc_session": token},
    )
    assert resp.status_code == 400
    assert "exceeds maximum allowed limit" in resp.json()["detail"]


def test_batch_upload_cross_patient_forbidden():
    """Verify patient cannot upload telemetry for another patient's ID."""
    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    token = login_resp.cookies.get("cc_session")

    resp = client.post(
        "/api/v1/telemetry/batch?patient_id=prof_patient_other_999",
        json=[],
        cookies={"cc_session": token},
    )
    assert resp.status_code == 403
    assert "cannot upload telemetry for another patient" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_batch_upload_doctor_consent_enforcement():
    """Verify doctor batch recovery requires active ECG consent grant."""
    import pyotp
    from app.db.seed import TEST_TOTP_SECRET
    client = TestClient(app)

    # Login doctor
    totp_now = pyotp.TOTP(TEST_TOTP_SECRET).now()
    doc_resp = client.post(
        "/api/v1/auth/login/doctor",
        json={
            "email": "neha.raghavan@meridianheart.in",
            "password": "clinician123",
            "medicalCouncil": "Maharashtra Medical Council",
            "registrationNumber": "MMC-2010-44821",
            "institution": "Meridian Heart Institute",
            "totpCode": totp_now,
            "consentAgreement": True,
        },
    )
    assert doc_resp.status_code == 200
    doc_token = doc_resp.cookies.get("cc_session")

    # Revoke consent for patient
    async with async_session_factory() as db:
        stmt = select(ConsentGrant).where(ConsentGrant.patient_id == "prof_patient_aarav_44821")
        grants = (await db.execute(stmt)).scalars().all()
        for g in grants:
            g.status = "revoked"
        await db.commit()

    # Attempt batch upload as doctor
    resp = client.post(
        "/api/v1/telemetry/batch?patient_id=prof_patient_aarav_44821",
        json=[],
        cookies={"cc_session": doc_token},
    )
    assert resp.status_code == 403
    assert "Consent revoked" in resp.json()["detail"]

    # Restore consent
    async with async_session_factory() as db:
        stmt = select(ConsentGrant).where(ConsentGrant.patient_id == "prof_patient_aarav_44821")
        grants = (await db.execute(stmt)).scalars().all()
        for g in grants:
            g.status = "active"
        await db.commit()


def test_protocol_corrupted_crc32_and_malformed_frames():
    """Verify binary protocol parser handles corrupted CRC-32 and malformed frames deterministically."""
    # 1. Valid frame
    payload = encode_raw_samples([0, 10, 20, 30])
    valid_raw = bytearray(
        pack_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=1,
            base_timestamp_ms=1000000,
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=4,
            flags=0,
            payload=payload,
        )
    )

    # 2. Corrupt CRC32 (modify payload byte without updating CRC32)
    corrupt_raw = bytearray(valid_raw)
    corrupt_raw[-1] ^= 0xFF
    with pytest.raises(ProtocolParseError) as exc_info:
        unpack_frame(bytes(corrupt_raw))
    assert exc_info.value.code == 4006  # Checksum mismatch

    # 3. Corrupted magic bytes
    bad_magic = bytearray(valid_raw)
    bad_magic[0] = ord("X")
    with pytest.raises(ProtocolParseError) as exc_info:
        unpack_frame(bytes(bad_magic))
    assert exc_info.value.code == 4003  # Magic byte mismatch

    # 4. Truncated frame (< 28 bytes header)
    with pytest.raises(ProtocolParseError):
        unpack_frame(valid_raw[:20])


@pytest.mark.asyncio
async def test_batch_upload_concurrent_identical_retries():
    """Verify concurrent submissions of identical batches maintain database uniqueness and return idempotent duplicate counts."""
    import concurrent.futures
    from app.models.telemetry import TelemetryChunk
    from sqlalchemy import select, and_

    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # Generate 3 frames with distinct timestamps in the far future to avoid collision
    base_ts = int(time.time() * 1000) + 900000
    samples = [int(75 * (i % 8)) for i in range(50)]
    payload = encode_raw_samples(samples)

    frames_hex = []
    start_dts = []
    for seq in range(1, 4):
        frame_ts = base_ts + (seq * 200)
        raw = pack_frame(
            msg_type=MSG_TYPE_ECG_DATA,
            sequence_number=seq,
            base_timestamp_ms=frame_ts,
            sampling_rate_hz=250,
            channel_id=1,
            sample_count=len(samples),
            flags=0,
            payload=payload,
        )
        frames_hex.append(raw.hex())
        start_dts.append(datetime.utcfromtimestamp(frame_ts / 1000.0))

    # Submit concurrently from 3 threads
    def submit():
        c = TestClient(app)
        return c.post(
            "/api/v1/telemetry/batch",
            json=frames_hex,
            cookies={"cc_session": token},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(submit) for _ in range(3)]
        responses = [f.result() for f in futures]

    for resp in responses:
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"

    total_processed = sum(r.json()["processedChunks"] for r in responses)
    total_duplicates = sum(r.json()["duplicateChunks"] for r in responses)
    total_conflicts = sum(r.json()["conflictChunks"] for r in responses)

    # Across all 3 concurrent submissions: exactly 3 rows must be processed once, and 6 treated as duplicates
    assert total_processed == 3
    assert total_duplicates == 6
    assert total_conflicts == 0

    # Verify database contains exactly 3 rows, not 9
    async with async_session_factory() as db:
        stmt = select(TelemetryChunk).where(
            and_(
                TelemetryChunk.patient_id == "prof_patient_aarav_44821",
                TelemetryChunk.lead_name == "Lead-II",
                TelemetryChunk.start_timestamp >= start_dts[0],
                TelemetryChunk.start_timestamp <= start_dts[-1],
            )
        )
        rows = (await db.execute(stmt)).scalars().all()
        assert len(rows) == 3


def test_batch_upload_concurrent_conflicting_payloads():
    """Verify concurrent requests with differing payloads for identical timestamp are handled safely (one succeeds, one conflicts)."""
    import concurrent.futures

    client = TestClient(app)
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    token = login_resp.cookies.get("cc_session")

    shared_ts = int(time.time() * 1000) + 950000

    # Payload 1
    raw1 = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=shared_ts,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=20,
        flags=0,
        payload=encode_raw_samples([10] * 20),
    )

    # Payload 2 (conflicting)
    raw2 = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=2,
        base_timestamp_ms=shared_ts,
        sampling_rate_hz=250,
        channel_id=1,
        sample_count=20,
        flags=0,
        payload=encode_raw_samples([999] * 20),
    )

    def submit_one(hex_str):
        c = TestClient(app)
        return c.post(
            "/api/v1/telemetry/batch",
            json=[hex_str],
            cookies={"cc_session": token},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(submit_one, raw1.hex())
        f2 = executor.submit(submit_one, raw2.hex())
        r1 = f1.result()
        r2 = f2.result()

    assert r1.status_code == 200
    assert r2.status_code == 200

    d1, d2 = r1.json(), r2.json()
    total_processed = d1["processedChunks"] + d2["processedChunks"]
    total_conflicts = d1["conflictChunks"] + d2["conflictChunks"]

    assert total_processed == 1
    assert total_conflicts == 1


@pytest.mark.asyncio
async def test_batch_upload_distinct_patients_identical_timestamp():
    """Verify distinct patients submitting valid single-lead (Lead-II) chunks with identical timestamps are both accepted without conflict."""
    from app.models.telemetry import TelemetryChunk
    from sqlalchemy import select, and_

    client_aarav = TestClient(app)
    login_aarav = client_aarav.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_aarav.status_code == 200
    token_aarav = login_aarav.cookies.get("cc_session")

    client_rohit = TestClient(app)
    login_rohit = client_rohit.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "rohit.sharma@example.com", "password": "patient123"},
    )
    assert login_rohit.status_code == 200
    token_rohit = login_rohit.cookies.get("cc_session")

    shared_ts = int(time.time() * 1000) + 980000
    samples_aarav = [50] * 30
    samples_rohit = [120] * 30

    # Both frames are single-lead Lead-II (channel_id=1) sharing identical timestamp
    raw_aarav = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=shared_ts,
        sampling_rate_hz=250,
        channel_id=1,  # Lead-II
        sample_count=len(samples_aarav),
        flags=0,
        payload=encode_raw_samples(samples_aarav),
    )

    raw_rohit = pack_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=shared_ts,
        sampling_rate_hz=250,
        channel_id=1,  # Lead-II
        sample_count=len(samples_rohit),
        flags=0,
        payload=encode_raw_samples(samples_rohit),
    )

    resp_aarav = client_aarav.post(
        "/api/v1/telemetry/batch",
        json=[raw_aarav.hex()],
        cookies={"cc_session": token_aarav},
    )
    assert resp_aarav.status_code == 200
    data_aarav = resp_aarav.json()
    assert data_aarav["status"] == "completed"
    assert data_aarav["processedChunks"] == 1
    assert data_aarav["duplicateChunks"] == 0
    assert data_aarav["conflictChunks"] == 0

    resp_rohit = client_rohit.post(
        "/api/v1/telemetry/batch",
        json=[raw_rohit.hex()],
        cookies={"cc_session": token_rohit},
    )
    assert resp_rohit.status_code == 200
    data_rohit = resp_rohit.json()
    assert data_rohit["status"] == "completed"
    assert data_rohit["processedChunks"] == 1
    assert data_rohit["duplicateChunks"] == 0
    assert data_rohit["conflictChunks"] == 0

    # Verify both rows exist with identical start_timestamp and lead_name='Lead-II', scoped by patient_id
    start_dt = datetime.utcfromtimestamp(shared_ts / 1000.0)
    async with async_session_factory() as db:
        stmt = select(TelemetryChunk).where(
            and_(
                TelemetryChunk.lead_name == "Lead-II",
                TelemetryChunk.start_timestamp == start_dt,
            )
        )
        rows = (await db.execute(stmt)).scalars().all()
        assert len(rows) == 2
        patient_ids = {r.patient_id for r in rows}
        assert patient_ids == {"prof_patient_aarav_44821", "prof_patient_rohit_11204"}

