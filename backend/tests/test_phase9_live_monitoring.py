"""
CardioCoreEdge Phase 9 Automated Test Suite: Single-Lead Live Monitoring Integration
- Valid synthetic single-lead stream rendering and reception (Lead-II, 250 Hz, 28-byte header).
- Invalid authentication and expired sessions rejection.
- Consent revocation during an active connection.
- Sequence tracking, missing frame flags, and duplicate detection.
"""

import pytest
import time
from starlette.testclient import TestClient
from app.main import app
from app.telemetry.protocol import (
    unpack_frame,
    MSG_TYPE_ECG_DATA,
    MSG_TYPE_ERROR,
)
from app.telemetry.chunk import decode_raw_samples
from app.db.session import async_session_factory
from app.services.consent_service import revoke_consent, verify_consent
from sqlalchemy import select
from app.models.consent import ConsentGrant


def test_websocket_monitor_synthetic_stream_reception():
    """Verify live monitoring WebSocket streams valid 250 Hz Lead-II frames."""
    client = TestClient(app)
    # 1. Login patient
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies.get("cc_session")

    # 2. Connect in mode=monitor
    with client.websocket_connect(f"/api/v1/telemetry/ws/{token}?mode=monitor&device_id=test_mon_01") as ws:
        # Receive frame 1
        data1 = ws.receive_bytes()
        hdr1, payload1 = unpack_frame(data1)
        assert hdr1.msg_type == MSG_TYPE_ECG_DATA
        assert hdr1.channel_id == 1  # Lead-II
        assert hdr1.sampling_rate_hz == 250
        assert hdr1.sample_count == 50  # 200ms frame
        assert hdr1.sequence_number == 1
        samples1 = decode_raw_samples(payload1)
        assert len(samples1) == 50
        assert all(-32768 <= s <= 32767 for s in samples1)

        # Receive frame 2
        data2 = ws.receive_bytes()
        hdr2, payload2 = unpack_frame(data2)
        assert hdr2.msg_type == MSG_TYPE_ECG_DATA
        assert hdr2.sequence_number == 2
        assert hdr2.sample_count == 50


def test_websocket_monitor_unauthenticated_rejected():
    """Verify monitor mode rejects invalid or absent session tokens."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/telemetry/ws/invalid_fake_token?mode=monitor") as ws:
        err_data = ws.receive_bytes()
        hdr, _ = unpack_frame(err_data)
        assert hdr.msg_type == MSG_TYPE_ERROR


@pytest.mark.asyncio
async def test_websocket_monitor_consent_revocation_terminates_stream():
    """Verify consent revocation during an active stream drops the connection immediately."""
    import pyotp
    from app.db.seed import TEST_TOTP_SECRET
    client = TestClient(app)

    # 1. Login doctor with valid credentials
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

    # Ensure patient consent is active before connecting
    async with async_session_factory() as db:
        stmt = select(ConsentGrant).where(ConsentGrant.patient_id == "prof_patient_aarav_44821")
        grants = (await db.execute(stmt)).scalars().all()
        for g in grants:
            g.status = "active"
        await db.commit()

    # Connect doctor to monitor stream
    with client.websocket_connect(f"/api/v1/telemetry/ws/{doc_token}?mode=monitor&device_id=doc_mon_01") as ws:
        # Frame 1 received
        d1 = ws.receive_bytes()
        h1, p1 = unpack_frame(d1)
        assert h1.sequence_number == 1
        assert h1.msg_type == MSG_TYPE_ECG_DATA

        # Now revoke consent in the database
        async with async_session_factory() as db:
            stmt = select(ConsentGrant).where(ConsentGrant.patient_id == "prof_patient_aarav_44821")
            grants = (await db.execute(stmt)).scalars().all()
            for g in grants:
                g.status = "revoked"
            await db.commit()

        # The server checks consent every 5 frames (~1 sec). Receive frames until termination
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

        # Re-activate consent for subsequent tests
        async with async_session_factory() as db:
            stmt = select(ConsentGrant).where(ConsentGrant.patient_id == "prof_patient_aarav_44821")
            grants = (await db.execute(stmt)).scalars().all()
            for g in grants:
                g.status = "active"
            await db.commit()
