"""
FastAPI Security & RBAC Dependencies
Enforces database-backed session validation, role-based access control,
CSRF verification, and server-side consent enforcement.
"""

from typing import Optional, Callable
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.models.session import SessionModel
from app.services.session_service import get_valid_session
from app.services.consent_service import verify_consent


async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SessionModel:
    """Extract and validate database-backed session from HttpOnly cookie."""
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No session cookie found.",
        )

    session_record = await get_valid_session(db, raw_token)
    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid.",
        )

    return session_record


def require_role(allowed_role: str) -> Callable:
    """Dependency factory checking user role against database-backed session."""
    async def role_checker(
        session: SessionModel = Depends(get_current_session),
    ) -> SessionModel:
        if session.role != allowed_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{session.role}' is not authorized for this resource.",
            )
        return session
    return role_checker


def require_consent(scope: str = "vitals") -> Callable:
    """
    Verify server-side patient consent.
    Denies access by default if consent is missing, revoked, expired, or insufficient.
    """
    async def consent_checker(
        patient_id: str,
        session: SessionModel = Depends(require_role("doctor")),
        db: AsyncSession = Depends(get_db),
    ) -> SessionModel:
        doctor_profile = session.user.doctor_profile
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinician profile not found.",
            )

        institution = doctor_profile.institution
        has_consent, grant = await verify_consent(
            db=db,
            patient_identifier=patient_id,
            institution=institution,
            required_scope=scope,
        )

        if not has_consent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. No active patient consent granted to '{institution}' for scope '{scope}'.",
            )

        return session
    return consent_checker


async def verify_csrf_token(
    request: Request,
):
    """
    Verify CSRF token on state-changing methods (POST, PUT, DELETE, PATCH).
    Double-submit cookie validation: Header X-CSRF-Token must match cc_csrf cookie.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    csrf_cookie = request.cookies.get("cc_csrf")
    csrf_header = request.headers.get("X-CSRF-Token")

    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        # Don't fail unauthenticated public auth routes (e.g., initial login)
        if request.url.path.startswith("/api/v1/auth/login") or request.url.path.startswith("/api/v1/auth/forgot-password"):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed. Missing or mismatched CSRF token.",
        )


class CompatibilityConsentRegistry:
    """Backward compatibility helper for synchronous test calls."""
    async def revoke_consent_async(self, institution: str, patient_id: str):
        from app.db.session import async_session_factory
        from app.services.consent_service import revoke_institution_consent_for_patient
        async with async_session_factory() as session:
            await revoke_institution_consent_for_patient(session, patient_id, institution)

    def revoke_consent(self, institution: str, patient_id: str):
        import asyncio
        from app.db.session import async_session_factory
        from app.services.consent_service import revoke_institution_consent_for_patient
        async def _revoke():
            async with async_session_factory() as session:
                await revoke_institution_consent_for_patient(session, patient_id, institution)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_revoke())
            else:
                loop.run_until_complete(_revoke())
        except Exception:
            pass


consent_registry = CompatibilityConsentRegistry()
