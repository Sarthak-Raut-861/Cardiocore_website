"""
Database-Backed Opaque Session Service
- Generates 256-bit cryptographically secure opaque tokens.
- Stores only SHA-256 hashes in database (`token_hash`).
- Enforces both sliding idle inactivity timeout and absolute expiration ceiling.
- Generates and verifies CSRF tokens.
"""

from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.session import SessionModel
from app.models.user import User
from app.core.security import generate_session_token, hash_session_token, generate_csrf_token


async def create_database_session(
    db: AsyncSession,
    user_id: str,
    role: str,
    ip_hash: str,
    user_agent: Optional[str] = None,
) -> Tuple[str, SessionModel, str]:
    """
    Create a new database-backed session.
    Returns: (raw_opaque_token, session_model, csrf_token)
    """
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    csrf_token = generate_csrf_token()

    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)
    absolute_expires_at = now + timedelta(seconds=settings.SESSION_MAX_LIFETIME_SECONDS)

    session_record = SessionModel(
        token_hash=token_hash,
        user_id=user_id,
        role=role,
        ip_hash=ip_hash,
        user_agent=user_agent[:255] if user_agent else None,
        created_at=now,
        last_accessed_at=now,
        expires_at=expires_at,
        absolute_expires_at=absolute_expires_at,
        is_revoked=False,
    )

    db.add(session_record)
    await db.commit()
    await db.refresh(session_record)

    return raw_token, session_record, csrf_token


async def get_valid_session(
    db: AsyncSession,
    raw_token: str,
) -> Optional[SessionModel]:
    """
    Lookup session by SHA-256 hash of token, verifying idle and absolute expiration.
    Refreshes idle expiration if valid.
    """
    if not raw_token:
        return None

    token_hash = hash_session_token(raw_token)
    stmt = (
        select(SessionModel)
        .options(
            selectinload(SessionModel.user).selectinload(User.patient_profile),
            selectinload(SessionModel.user).selectinload(User.doctor_profile),
        )
        .where(SessionModel.token_hash == token_hash)
    )
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()

    if not session_record:
        return None

    # Check validity (revocation, idle timeout, absolute timeout)
    if not session_record.is_valid():
        if not session_record.is_revoked:
            session_record.is_revoked = True
            await db.commit()
        return None

    # Slide idle expiration window up to absolute ceiling
    now = datetime.utcnow()
    new_expires = now + timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)
    if new_expires > session_record.absolute_expires_at:
        new_expires = session_record.absolute_expires_at

    session_record.last_accessed_at = now
    session_record.expires_at = new_expires
    await db.commit()

    return session_record


async def revoke_session_by_token(db: AsyncSession, raw_token: str) -> bool:
    """Revoke a session by raw token hash."""
    if not raw_token:
        return False

    token_hash = hash_session_token(raw_token)
    stmt = (
        update(SessionModel)
        .where(SessionModel.token_hash == token_hash)
        .values(is_revoked=True)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def revoke_all_sessions_for_user(db: AsyncSession, user_id: str) -> int:
    """Revoke all active sessions for a user (e.g., on password reset or lockout)."""
    stmt = (
        update(SessionModel)
        .where(SessionModel.user_id == user_id, SessionModel.is_revoked == False)
        .values(is_revoked=True)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
