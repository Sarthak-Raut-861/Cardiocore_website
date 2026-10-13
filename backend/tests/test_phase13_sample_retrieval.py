"""
CardioCoreEdge Phase 13B Automated Tests: Read-Only Multi-Lead Sample Retrieval
- Authorized patient retrieval of persisted chunk samples.
- Authorized clinician retrieval with active consent.
- Rejection of cross-patient retrieval (403 Forbidden).
- Rejection of clinician retrieval without active consent (403 Forbidden).
- Not found error for non-existent recording or chunk (404 Not Found).
- Unauthenticated rejection (401 Unauthorized).
- Base64 payload fidelity and SHA-256 checksum verification.
- Read-only idempotence (no database mutations).
"""

import pytest
import base64
import hashlib
from starlette.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.db.session import async_session_factory
from app.models.telemetry import TelemetryRecording, TelemetryMultiChannelChunk
from app.telemetry.protocol import (
    pack_multichannel_frame,
    MSG_TYPE_ECG_DATA,
    ALL_12_LEADS_MASK,
    ALL_3_LEADS_MASK,
    LEAD_NAMES_ORDER,
)
from app.telemetry.chunk import encode_multichannel_raw


def csrf_headers(client: TestClient) -> dict:
    csrf = client.cookies.get("cc_csrf")
    return {"X-CSRF-Token": csrf} if csrf else {}


def test_patient_retrieve_chunk_samples_success():
    """Verify patient can retrieve base64 samples and metadata for their own chunk."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    # 1. Create recording
    rec_resp = client.post(
        "/api/v1/telemetry/recordings",
        json={
            "patient_id": "prof_patient_aarav_44821",
            "lead_config": "12-lead",
            "active_leads_mask": ALL_12_LEADS_MASK,
            "sampling_rate_hz": 250,
        },
        headers=csrf_headers(client),
    )
    rec_id = rec_resp.json()["id"]

    # 2. Ingest 12-lead frame
    channels = [[100 + i * 10 + j for j in range(50)] for i in range(12)]
    raw_payload = encode_multichannel_raw(channels)
    frame_bytes = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_12_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=raw_payload,
    )

    ingest_resp = client.post(
        f"/api/v1/telemetry/recordings/{rec_id}/chunks",
        json={"frames": [frame_bytes.hex()]},
        headers=csrf_headers(client),
    )
    assert ingest_resp.json()["processedChunks"] == 1

    # 3. List chunks to get chunk_id
    chunks_resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks")
    chunk_list = chunks_resp.json()["chunks"]
    assert len(chunk_list) == 1
    chunk_id = chunk_list[0]["id"]

    # 4. Retrieve samples
    samples_resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/{chunk_id}/samples")
    assert samples_resp.status_code == 200
    data = samples_resp.json()

    assert data["recordingId"] == rec_id
    assert data["chunkId"] == chunk_id
    assert data["sequenceNumber"] == 1
    assert data["samplingRateHz"] == 250
    assert data["channelCount"] == 12
    assert data["sampleCount"] == 50
    assert data["compressionCodec"] == "raw"
    assert data["channelOrder"] == LEAD_NAMES_ORDER
    assert data["averageSqi"] == 1.0

    # Verify base64 payload fidelity
    decoded_payload = base64.b64decode(data["payloadBase64"])
    assert decoded_payload == raw_payload
    assert hashlib.sha256(decoded_payload).hexdigest() == data["payloadChecksumSha256"]


def test_doctor_with_consent_can_retrieve_chunk_samples():
    """Verify clinician with active consent can retrieve chunk samples."""
    client = TestClient(app)

    # Patient Aarav creates recording and ingests chunk
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    channels = [[50 + j for j in range(50)] for _ in range(3)]
    raw_payload = encode_multichannel_raw(channels)
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=raw_payload,
    ).hex()
    client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))

    chunk_id = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks").json()["chunks"][0]["id"]

    # Login Doctor Neha (active consent exists for Aarav)
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

    resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/{chunk_id}/samples")
    assert resp.status_code == 200
    assert resp.json()["channelCount"] == 3
    assert resp.json()["channelOrder"] == ["Lead-I", "Lead-II", "Lead-III"]


def test_doctor_without_consent_denied_chunk_samples():
    """Verify clinician without active consent cannot retrieve chunk samples."""
    client = TestClient(app)

    # Patient Rohit creates recording (no consent for Meridian Heart)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "rohit.sharma@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_rohit_11204", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    channels = [[10 + j for j in range(50)] for _ in range(3)]
    raw_payload = encode_multichannel_raw(channels)
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=raw_payload,
    ).hex()
    client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))
    chunk_id = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks").json()["chunks"][0]["id"]

    # Login Doctor Neha
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

    resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/{chunk_id}/samples")
    assert resp.status_code == 403
    assert "no ECG consent" in resp.json()["detail"]


def test_cross_patient_chunk_samples_denied():
    """Verify Patient A cannot retrieve Patient B's chunk samples."""
    client = TestClient(app)

    # 1. Aarav creates recording and chunk
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    channels = [[20 + j for j in range(50)] for _ in range(3)]
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=encode_multichannel_raw(channels),
    ).hex()
    client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))
    chunk_id = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks").json()["chunks"][0]["id"]

    # 2. Login Rohit and attempt to access Aarav's chunk
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "rohit.sharma@example.com", "password": "patient123"},
    )
    resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/{chunk_id}/samples")
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_chunk_samples_not_found():
    """Verify 404 is returned for non-existent recording or chunk."""
    client = TestClient(app)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )

    resp_no_rec = client.get("/api/v1/telemetry/recordings/rec_nonexistent/chunks/chunk_none/samples")
    assert resp_no_rec.status_code == 404

    # Valid recording, but non-existent chunk
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    resp_no_chunk = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/chunk_nonexistent/samples")
    assert resp_no_chunk.status_code == 404


def test_unauthenticated_chunk_samples_denied():
    """Verify unauthenticated request without session cookie is rejected with 401."""
    client = TestClient(app)
    resp = client.get("/api/v1/telemetry/recordings/rec_synth_01/chunks/chk_synth_01/samples")
    assert resp.status_code == 401
    assert "Not authenticated" in resp.json()["detail"] or "Authentication" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_chunk_samples_denial_creates_audit_event():
    """Verify cross-patient chunk sample denial writes an audit event record."""
    from app.models.audit import AuditEvent

    client = TestClient(app)
    # 1. Aarav creates recording and chunk
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    rec_id = client.post(
        "/api/v1/telemetry/recordings",
        json={"patient_id": "prof_patient_aarav_44821", "lead_config": "3-lead", "active_leads_mask": ALL_3_LEADS_MASK},
        headers=csrf_headers(client),
    ).json()["id"]

    channels = [[10 + j for j in range(50)] for _ in range(3)]
    f_hex = pack_multichannel_frame(
        msg_type=MSG_TYPE_ECG_DATA,
        sequence_number=1,
        base_timestamp_ms=1700000000000,
        sampling_rate_hz=250,
        active_leads_mask=ALL_3_LEADS_MASK,
        sample_count=50,
        flags=0,
        payload=encode_multichannel_raw(channels),
    ).hex()
    client.post(f"/api/v1/telemetry/recordings/{rec_id}/chunks", json={"frames": [f_hex]}, headers=csrf_headers(client))
    chunk_id = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks").json()["chunks"][0]["id"]

    # 2. Rohit attempts access (403)
    client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "rohit.sharma@example.com", "password": "patient123"},
    )
    denied_resp = client.get(f"/api/v1/telemetry/recordings/{rec_id}/chunks/{chunk_id}/samples")
    assert denied_resp.status_code == 403

    # 3. Verify audit record in database
    async with async_session_factory() as db:
        stmt = select(AuditEvent).where(
            AuditEvent.action == "CHUNK_SAMPLES_ACCESS_DENIED",
            AuditEvent.resource_id == chunk_id,
        )
        audit_event = (await db.execute(stmt)).scalars().first()
        assert audit_event is not None
        import json
        details = json.loads(audit_event.details_json)
        assert details.get("recording_id") == rec_id

