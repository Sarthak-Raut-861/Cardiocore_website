"""
CardioCoreEdge Automated Backend Foundation & Security Tests
Validates authentication, RBAC, consent boundaries, and security utilities.
"""

import pytest
import pytest_asyncio
import pyotp
from httpx import AsyncClient, ASGITransport
from sqlalchemy import update

from app.main import app
from app.db.session import async_session_factory
from app.db.seed import init_tables, seed_synthetic_fixtures, TEST_TOTP_SECRET
from app.models.user import User
from app.models.consent import ConsentGrant
from app.core.security import hash_password, verify_password, sanitize_audit_payload
from app.core.dependencies import consent_registry


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Ensure database tables and synthetic fixtures exist."""
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


@pytest.mark.asyncio
async def test_health_check():
    """Verify health endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "CardioCoreEdge" in data["service"]


@pytest.mark.asyncio
async def test_patient_login_success_and_cookie():
    """Verify patient authentication issues HttpOnly session cookie."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={
                "identifier": "aarav.menon@example.com",
                "password": "patient123",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "patient"
        assert data["user"]["name"] == "Aarav Menon"
        assert "cc_session" in resp.cookies


@pytest.mark.asyncio
async def test_patient_login_failure():
    """Verify bad password rejected with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={
                "identifier": "aarav.menon@example.com",
                "password": "wrongpassword",
            },
        )
        assert resp.status_code == 401
        assert "Invalid credentials" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_doctor_login_success():
    """Verify clinician login with 2FA and registration number."""
    totp_now = pyotp.TOTP(TEST_TOTP_SECRET).now()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
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
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "doctor"
        assert "cc_session" in resp.cookies


@pytest.mark.asyncio
async def test_doctor_login_bad_totp():
    """Verify clinician login rejected when 2FA is invalid."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/auth/login/doctor",
            json={
                "email": "neha.raghavan@meridianheart.in",
                "password": "clinician123",
                "medicalCouncil": "Maharashtra Medical Council",
                "registrationNumber": "MMC-2010-44821",
                "institution": "Meridian Heart Institute",
                "totpCode": "000000",
                "consentAgreement": True,
            },
        )
        assert resp.status_code == 401
        assert "two-factor" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_unauthenticated_protected_route():
    """Verify accessing protected patient route without cookie returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/patients/me")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_rbac_patient_cannot_access_doctor_roster():
    """Verify patient session cannot access clinician roster (403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        assert login_resp.status_code == 200
        roster_resp = await ac.get("/api/v1/doctors/roster")
        assert roster_resp.status_code == 403
        assert "Access denied" in roster_resp.json()["detail"]


@pytest.mark.asyncio
async def test_consent_verification_boundary():
    """Verify doctor can access consented patient chart, but gets 403 if consent is missing or revoked."""
    totp_now = pyotp.TOTP(TEST_TOTP_SECRET).now()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post(
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
        assert login_resp.status_code == 200

        # 1. Access consented patient (Aarav Menon 44821) -> 200 OK
        chart_resp = await ac.get("/api/v1/doctors/patients/44821/chart")
        assert chart_resp.status_code == 200
        assert chart_resp.json()["chartStatus"] == "consented"

        # 2. Access unconsented patient (99999) -> 403 Forbidden
        unconsented_resp = await ac.get("/api/v1/doctors/patients/99999/chart")
        assert unconsented_resp.status_code == 403
        assert "No active patient consent" in unconsented_resp.json()["detail"]

        # 3. Revoke consent for 44821 -> immediate 403 Forbidden
        await consent_registry.revoke_consent_async("Meridian Heart Institute", "44821")
        revoked_resp = await ac.get("/api/v1/doctors/patients/44821/chart")
        assert revoked_resp.status_code == 403


def test_password_hashing_and_verification():
    """Test standard password hashing round-trip."""
    pwd = "SecretClinicianPassword!2026"
    h = hash_password(pwd)
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False


def test_audit_sanitization():
    """Test redaction of sensitive credentials and tokens."""
    dirty = {
        "userId": "usr_123",
        "action": "LOGIN",
        "password": "supersecretpassword",
        "totpCode": "482001",
        "details": {
            "token": "tok_abcdef123456",
            "ip": "127.0.0.1",
        },
    }
    clean = sanitize_audit_payload(dirty)
    assert clean["password"] == "[REDACTED]"
    assert clean["totpCode"] == "[REDACTED]"
    assert clean["details"]["token"] == "[REDACTED]"
    assert clean["userId"] == "usr_123"
    assert clean["action"] == "LOGIN"
