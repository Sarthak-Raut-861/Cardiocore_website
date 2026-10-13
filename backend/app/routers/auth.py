"""
CardioCoreEdge Authentication APIRouter
Database-backed authentication, Argon2id verification, RFC 6238 TOTP with replay protection,
opaque session management with SHA-256 hashing, and non-enumerating recovery.
"""

from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.session import SessionModel
from app.core.security import (
    verify_password,
    verify_totp_code,
    login_rate_limiter,
)
from app.services.session_service import (
    create_database_session,
    get_valid_session,
    revoke_session_by_token,
)
from app.services.audit_service import log_audit_event
from app.schemas.auth import (
    PatientSignInRequest,
    DoctorSignInRequest,
    AuthSuccessResponse,
    SessionResponse,
    ForgotPasswordRequest,
    UserPublic,
)
from app.schemas.common import GenericSuccessResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login/patient", response_model=AuthSuccessResponse)
async def login_patient(
    req: PatientSignInRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate patient via email or phone number and Argon2id password."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    identifier = req.identifier.strip()

    # Rate Limiting (5 attempts per minute per identifier/IP)
    rate_key = f"login_patient:{identifier}:{client_ip}"
    if not login_rate_limiter.is_allowed(rate_key, max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds before retrying.",
        )

    # Query user by email or phone
    stmt = (
        select(User)
        .options(selectinload(User.patient_profile))
        .where(
            (User.email == identifier.lower()) | (User.phone_number == identifier)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.role != "patient" or not verify_password(req.password, user.password_hash):
        await log_audit_event(
            db=db,
            actor_user_id=user.id if user else None,
            actor_role="patient",
            action="AUTH_LOGIN_FAILED",
            resource_type="auth",
            resource_id=identifier,
            outcome="DENIED",
            ip_hash=client_ip,
            details={"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/phone and password.",
        )

    # Reset rate limiting counter on success
    login_rate_limiter.reset(rate_key)

    # Create database-backed opaque session
    raw_token, session_record, csrf_token = await create_database_session(
        db=db,
        user_id=user.id,
        role=user.role,
        ip_hash=client_ip,
        user_agent=request.headers.get("user-agent"),
    )

    # Set secure HttpOnly session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_MAX_LIFETIME_SECONDS,
        path="/",
    )

    # Set CSRF cookie (accessible to client for double-submit header)
    response.set_cookie(
        key="cc_csrf",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_MAX_LIFETIME_SECONDS,
        path="/",
    )

    await log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="AUTH_LOGIN_SUCCESS",
        resource_type="session",
        resource_id=session_record.id,
        outcome="SUCCESS",
        ip_hash=client_ip,
    )

    patient_name = user.patient_profile.full_name if user.patient_profile else "Patient"
    return AuthSuccessResponse(
        user=UserPublic(
            id=user.id,
            role=user.role,
            name=patient_name,
            email=user.email,
            phoneNumber=user.phone_number,
        ),
        sessionExpiresAt=session_record.expires_at.isoformat() + "Z",
    )


@router.post("/login/doctor", response_model=AuthSuccessResponse)
async def login_doctor(
    req: DoctorSignInRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate clinician via credentials, medical registration, and RFC 6238 TOTP."""
    if not req.consentAgreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the clinical data-handling policy to proceed.",
        )

    client_ip = request.client.host if request.client else "127.0.0.1"
    email = req.email.strip().lower()

    # Rate Limiting
    rate_key = f"login_doctor:{email}:{client_ip}"
    if not login_rate_limiter.is_allowed(rate_key, max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed clinician login attempts. Please wait 60 seconds before retrying.",
        )

    stmt = (
        select(User)
        .options(selectinload(User.doctor_profile))
        .where(User.email == email)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.role != "doctor" or not verify_password(req.password, user.password_hash):
        await log_audit_event(
            db=db,
            actor_user_id=user.id if user else None,
            actor_role="doctor",
            action="AUTH_LOGIN_FAILED",
            resource_type="auth",
            resource_id=email,
            outcome="DENIED",
            ip_hash=client_ip,
            details={"reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or medical registration number.",
        )

    # Verify registration number matches profile
    doc_prof = user.doctor_profile
    if not doc_prof or doc_prof.registration_number != req.registrationNumber.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or medical registration number.",
        )

    # Verify 2FA TOTP with replay protection
    is_totp_valid, new_timestep = verify_totp_code(
        secret=user.totp_secret or "",
        code=req.totpCode,
        last_timestep=user.last_totp_timestep,
    )
    if not is_totp_valid:
        await log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role="doctor",
            action="AUTH_2FA_FAILED",
            resource_type="auth",
            resource_id=email,
            outcome="DENIED",
            ip_hash=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or replayed two-factor authentication code.",
        )

    # Advance TOTP replay timestep
    user.last_totp_timestep = new_timestep
    await db.commit()

    login_rate_limiter.reset(rate_key)

    # Create database session
    raw_token, session_record, csrf_token = await create_database_session(
        db=db,
        user_id=user.id,
        role=user.role,
        ip_hash=client_ip,
        user_agent=request.headers.get("user-agent"),
    )

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_MAX_LIFETIME_SECONDS,
        path="/",
    )

    response.set_cookie(
        key="cc_csrf",
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_MAX_LIFETIME_SECONDS,
        path="/",
    )

    await log_audit_event(
        db=db,
        actor_user_id=user.id,
        actor_role=user.role,
        action="AUTH_LOGIN_SUCCESS",
        resource_type="session",
        resource_id=session_record.id,
        outcome="SUCCESS",
        ip_hash=client_ip,
    )

    return AuthSuccessResponse(
        user=UserPublic(
            id=user.id,
            role=user.role,
            name=doc_prof.full_name,
            email=user.email,
        ),
        sessionExpiresAt=session_record.expires_at.isoformat() + "Z",
    )


@router.get("/session", response_model=SessionResponse)
async def get_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Inspect active session status and validity."""
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw_token:
        return SessionResponse(authenticated=False)

    session_record = await get_valid_session(db, raw_token)
    if not session_record:
        return SessionResponse(authenticated=False)

    user = session_record.user
    name = "User"
    if user:
        if user.patient_profile:
            name = user.patient_profile.full_name
        elif user.doctor_profile:
            name = user.doctor_profile.full_name

    return SessionResponse(
        authenticated=True,
        role=session_record.role,
        user=UserPublic(
            id=user.id if user else session_record.user_id,
            role=session_record.role,
            name=name,
            email=user.email if user else None,
            phoneNumber=user.phone_number if user else None,
        ),
        sessionExpiresAt=session_record.expires_at.isoformat() + "Z",
    )


@router.post("/logout", response_model=GenericSuccessResponse)
async def logout(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Terminate session in database and delete cookies."""
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_token:
        await revoke_session_by_token(db, raw_token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key="cc_csrf",
        path="/",
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return GenericSuccessResponse(status="ok", message="Successfully logged out.")


@router.post("/forgot-password", response_model=GenericSuccessResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Non-enumerating account recovery request.
    Returns identical success message regardless of whether identifier exists.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"forgot_pwd:{client_ip}"
    if not login_rate_limiter.is_allowed(rate_key, max_requests=3, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many recovery requests. Please wait a minute.",
        )

    identifier = req.identifier.strip().lower()
    stmt = select(User).where((User.email == identifier) | (User.phone_number == identifier))
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user:
        await log_audit_event(
            db=db,
            actor_user_id=user.id,
            actor_role=user.role,
            action="AUTH_PASSWORD_RESET_REQUESTED",
            resource_type="user",
            resource_id=user.id,
            outcome="SUCCESS",
            ip_hash=client_ip,
        )

    # Identical non-enumerating generic response
    return GenericSuccessResponse(
        status="ok",
        message="If an account matches those details, instructions have been sent.",
    )
