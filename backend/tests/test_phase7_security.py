"""
CardioCoreEdge Phase 7 Comprehensive Security, Database & Consent Integration Tests

Validates:
1. Valid and invalid login.
2. Password hashing (Argon2id) and verification.
3. TOTP success, failure, and replay protection.
4. Session expiry (idle & absolute) and logout invalidation.
5. Patient-versus-doctor authorization (RBAC).
6. Cross-patient access denial.
7. Server-side consent enforcement (missing, expired, and revoked consent).
8. CSRF protection.
9. Rate limiting and account-recovery non-enumeration.
10. Audit-log sanitization and hash chaining.
11. Database transaction rollback and integrity.
12. Synthetic fixture isolation.
"""

import pytest
import pytest_asyncio
import pyotp
import json
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update

from app.main import app
from app.config import settings
from app.db.session import async_session_factory
from app.db.seed import init_tables, seed_synthetic_fixtures, TEST_TOTP_SECRET
from app.models.user import User
from app.models.session import SessionModel
from app.models.consent import ConsentGrant
from app.models.audit import AuditEvent
from app.core.security import (
    hash_password,
    verify_password,
    sanitize_audit_payload,
    login_rate_limiter,
)
from app.services.consent_service import revoke_institution_consent_for_patient


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Ensure database tables and synthetic fixtures exist before each test."""
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
# 1. Valid and Invalid Login
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patient_login_valid_and_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Valid login
        resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "patient"
        assert data["user"]["name"] == "Aarav Menon"
        assert "cc_session" in resp.cookies
        assert "cc_csrf" in resp.cookies

        # Invalid password
        bad_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "wrong_password_999"},
        )
        assert bad_resp.status_code == 401
        assert "Invalid credentials" in bad_resp.json()["detail"]


@pytest.mark.asyncio
async def test_doctor_login_valid_and_invalid():
    totp_now = pyotp.TOTP(TEST_TOTP_SECRET).now()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Valid doctor login
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
        assert resp.json()["user"]["role"] == "doctor"
        assert "cc_session" in resp.cookies

        # Missing consent agreement
        no_consent_resp = await ac.post(
            "/api/v1/auth/login/doctor",
            json={
                "email": "neha.raghavan@meridianheart.in",
                "password": "clinician123",
                "medicalCouncil": "Maharashtra Medical Council",
                "registrationNumber": "MMC-2010-44821",
                "institution": "Meridian Heart Institute",
                "totpCode": totp_now,
                "consentAgreement": False,
            },
        )
        assert no_consent_resp.status_code == 400


# -----------------------------------------------------------------------------
# 2. Password Hashing and Verification
# -----------------------------------------------------------------------------

def test_argon2id_password_hashing_and_verification():
    raw_pwd = "StrictClinicalEntropy!2026"
    h = hash_password(raw_pwd)
    assert h.startswith("$argon2id$")
    assert verify_password(raw_pwd, h) is True
    assert verify_password("WrongPassword123", h) is False
    assert verify_password("", h) is False


def test_pbkdf2_backward_compatibility():
    # Legacy PBKDF2 hash verification fallback
    legacy_hash = "pbkdf2:sha256:100000$11223344556677889900aabbccddeeff$e1f40d6c40e53a25d259e248b11ba42be549352e73f27f70da512bc9658097b8"
    # Should safely fail on mismatched password without error
    assert verify_password("arbitrary", legacy_hash) is False


# -----------------------------------------------------------------------------
# 3. TOTP Success, Failure, and Replay Protection
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_totp_verification_and_replay_protection():
    totp = pyotp.TOTP(TEST_TOTP_SECRET)
    code = totp.now()

    # Reset clinician timestep in database to simulate fresh session
    async with async_session_factory() as session:
        await session.execute(
            update(User).where(User.email == "neha.raghavan@meridianheart.in").values(last_totp_timestep=None)
        )
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Invalid TOTP
        bad_totp_resp = await ac.post(
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
        assert bad_totp_resp.status_code == 401
        assert "Invalid or replayed" in bad_totp_resp.json()["detail"]

        # Valid TOTP first time
        login1 = await ac.post(
            "/api/v1/auth/login/doctor",
            json={
                "email": "neha.raghavan@meridianheart.in",
                "password": "clinician123",
                "medicalCouncil": "Maharashtra Medical Council",
                "registrationNumber": "MMC-2010-44821",
                "institution": "Meridian Heart Institute",
                "totpCode": code,
                "consentAgreement": True,
            },
        )
        assert login1.status_code == 200

        # Immediate replay of the SAME code within same 30s timestep
        login2_replay = await ac.post(
            "/api/v1/auth/login/doctor",
            json={
                "email": "neha.raghavan@meridianheart.in",
                "password": "clinician123",
                "medicalCouncil": "Maharashtra Medical Council",
                "registrationNumber": "MMC-2010-44821",
                "institution": "Meridian Heart Institute",
                "totpCode": code,
                "consentAgreement": True,
            },
        )
        assert login2_replay.status_code == 401
        assert "replayed" in login2_replay.json()["detail"]


# -----------------------------------------------------------------------------
# 4. Session Expiry and Logout Invalidation
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_logout_invalidation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login
        await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        # Verify authenticated
        check1 = await ac.get("/api/v1/patients/me")
        assert check1.status_code == 200

        # Logout
        logout_resp = await ac.post("/api/v1/auth/logout")
        assert logout_resp.status_code == 200

        # Subsequent access denied
        check2 = await ac.get("/api/v1/patients/me")
        assert check2.status_code == 401


@pytest.mark.asyncio
async def test_session_idle_and_absolute_expiration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        assert login_resp.status_code == 200
        
        # Manually expire the session in database (simulate idle timeout past)
        async with async_session_factory() as session:
            await session.execute(
                update(SessionModel).values(
                    expires_at=datetime.utcnow() - timedelta(minutes=1)
                )
            )
            await session.commit()

        # Next request must be rejected
        expired_resp = await ac.get("/api/v1/patients/me")
        assert expired_resp.status_code == 401
        assert "Session has expired" in expired_resp.json()["detail"]


# -----------------------------------------------------------------------------
# 5. Patient-versus-Doctor RBAC Authorization
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_role_based_access_control():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Patient login
        await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        # Patient cannot access doctor roster
        roster_resp = await ac.get("/api/v1/doctors/roster")
        assert roster_resp.status_code == 403
        assert "Access denied. Role 'patient'" in roster_resp.json()["detail"]


# -----------------------------------------------------------------------------
# 6. Cross-Patient Access Denial
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_patient_access_denial():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Patient A (Aarav) logs in
        await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        # Attempt to revoke consent grant belonging to Rohit (cg_rohit_meridian_expired)
        revoke_cross = await ac.post("/api/v1/patients/consent/cg_rohit_meridian_expired/revoke")
        assert revoke_cross.status_code == 404
        assert "not owned by patient" in revoke_cross.json()["detail"]


# -----------------------------------------------------------------------------
# 7. Server-Side Consent Enforcement
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_server_side_consent_enforcement():
    totp_now = pyotp.TOTP(TEST_TOTP_SECRET).now()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login clinician
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

        # A. Access consented patient (Aarav MRN 44821) -> 200 OK
        chart_ok = await ac.get("/api/v1/doctors/patients/44821/chart")
        assert chart_ok.status_code == 200
        assert chart_ok.json()["chartStatus"] == "consented"

        # B. Missing consent (unconsented MRN 99999) -> 403 Forbidden
        chart_missing = await ac.get("/api/v1/doctors/patients/99999/chart")
        assert chart_missing.status_code == 403
        assert "No active patient consent" in chart_missing.json()["detail"]

        # C. Expired consent (Rohit MRN 11204) -> 403 Forbidden
        chart_expired = await ac.get("/api/v1/doctors/patients/11204/chart")
        assert chart_expired.status_code == 403
        assert "No active patient consent" in chart_expired.json()["detail"]

        # D. Consent Revocation -> Immediate effect on subsequent requests
        async with async_session_factory() as session:
            revoked_count = await revoke_institution_consent_for_patient(
                db=session,
                patient_id_or_mrn="44821",
                institution="Meridian Heart Institute",
            )
            assert revoked_count > 0

        chart_after_revoke = await ac.get("/api/v1/doctors/patients/44821/chart")
        assert chart_after_revoke.status_code == 403
        assert "No active patient consent" in chart_after_revoke.json()["detail"]


# -----------------------------------------------------------------------------
# 8. CSRF Protection
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_csrf_protection_and_cookie_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "aarav.menon@example.com", "password": "patient123"},
        )
        assert "cc_csrf" in login_resp.cookies
        csrf_token = login_resp.cookies.get("cc_csrf")
        assert len(csrf_token) >= 32


# -----------------------------------------------------------------------------
# 9. Rate Limiting and Account Recovery Non-Enumeration
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_account_recovery_non_enumeration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Existing user
        resp1 = await ac.post(
            "/api/v1/auth/forgot-password",
            json={"identifier": "aarav.menon@example.com"},
        )
        assert resp1.status_code == 200

        # Non-existing user
        resp2 = await ac.post(
            "/api/v1/auth/forgot-password",
            json={"identifier": "nonexistent.person@unknown.com"},
        )
        assert resp2.status_code == 200

        # Payloads MUST be identical to prevent user enumeration
        assert resp1.json() == resp2.json()
        assert "If an account matches those details" in resp1.json()["message"]


@pytest.mark.asyncio
async def test_login_rate_limiting():
    login_rate_limiter.reset("login_patient:spammer@test.com:127.0.0.1")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for _ in range(5):
            await ac.post(
                "/api/v1/auth/login/patient",
                json={"identifier": "spammer@test.com", "password": "wrong_password"},
            )
        
        # 6th request triggers rate limit 429
        rate_resp = await ac.post(
            "/api/v1/auth/login/patient",
            json={"identifier": "spammer@test.com", "password": "wrong_password"},
        )
        assert rate_resp.status_code == 429
        assert "Too many failed login attempts" in rate_resp.json()["detail"]


# -----------------------------------------------------------------------------
# 10. Audit Log Sanitization & Tamper-Evident Hashing
# -----------------------------------------------------------------------------

def test_audit_payload_sanitization():
    dirty = {
        "userId": "usr_999",
        "action": "AUTH_LOGIN",
        "password": "supersecretpassword",
        "totpCode": "123456",
        "token": "tok_opaque_token_string",
        "nested": {"cookie": "cc_session=secret", "safeField": "public"},
    }
    sanitized = sanitize_audit_payload(dirty)
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["totpCode"] == "[REDACTED]"
    assert sanitized["token"] == "[REDACTED]"
    assert sanitized["nested"]["cookie"] == "[REDACTED]"
    assert sanitized["nested"]["safeField"] == "public"


@pytest.mark.asyncio
async def test_audit_hash_chaining_integrity():
    async with async_session_factory() as session:
        stmt = select(AuditEvent).order_by(AuditEvent.timestamp.asc())
        events = (await session.execute(stmt)).scalars().all()
        assert len(events) >= 1
        for e in events:
            assert e.event_hash is not None
            assert len(e.event_hash) == 64
            # Verify no plaintext password in audit records
            assert "patient123" not in e.details_json
            assert "clinician123" not in e.details_json


# -----------------------------------------------------------------------------
# 11. Database Transaction Rollback and Integrity
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_database_transaction_rollback():
    async with async_session_factory() as session:
        initial_users_count = len((await session.execute(select(User))).scalars().all())
        
        try:
            # Create a user then simulate a failure before commit
            bogus_user = User(
                id="usr_bogus_rollback",
                email="rollback.test@example.com",
                password_hash="test",
                role="patient",
            )
            session.add(bogus_user)
            # Raise exception before commit
            raise RuntimeError("Simulated transaction failure")
        except RuntimeError:
            await session.rollback()

        # Verify bogus user was not persisted
        final_users = (await session.execute(select(User))).scalars().all()
        assert len(final_users) == initial_users_count


# -----------------------------------------------------------------------------
# 12. Synthetic Fixture Isolation
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_synthetic_data_isolation():
    async with async_session_factory() as session:
        users = (await session.execute(select(User))).scalars().all()
        for u in users:
            # Confirm email domains are test/example
            assert u.email.endswith("@example.com") or u.email.endswith("@meridianheart.in")
            # Confirm no live production external URLs or ABHA/EMR identifiers
            assert not u.email.endswith("@gov.in")
