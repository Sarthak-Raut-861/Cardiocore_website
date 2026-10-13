"""
Server-Side Patient Consent Enforcement Service
Enforces strict consent directives:
- Denies access by default if consent is missing, revoked, expired, or insufficient.
- Immediate effect upon revocation.
- Scoped access verification ("ecg", "vitals", "meds", "notes", "referrals").
"""

from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentGrant
from app.models.profile import PatientProfile


async def verify_consent(
    db: AsyncSession,
    patient_identifier: str,  # MRN or patient_profile.id
    institution: str,
    required_scope: str = "vitals",
) -> Tuple[bool, Optional[ConsentGrant]]:
    """
    Check if institution has active, unexpired consent covering required_scope for patient.
    Returns (is_authorized, grant_or_none).
    """
    if not institution or not patient_identifier:
        return False, None

    # First resolve patient profile id if MRN was provided
    stmt_pat = select(PatientProfile).where(
        (PatientProfile.id == patient_identifier) | (PatientProfile.mrn == patient_identifier)
    )
    result_pat = await db.execute(stmt_pat)
    patient = result_pat.scalar_one_or_none()
    if not patient:
        return False, None

    # Query active consent grants
    stmt_grant = select(ConsentGrant).where(
        ConsentGrant.patient_id == patient.id,
        ConsentGrant.institution == institution,
        ConsentGrant.status == "active",
        ConsentGrant.expires_at > datetime.utcnow(),
    )
    result_grant = await db.execute(stmt_grant)
    grants = result_grant.scalars().all()

    for grant in grants:
        if grant.has_scope(required_scope):
            return True, grant

    return False, None


async def revoke_consent(
    db: AsyncSession,
    grant_id: str,
    patient_id: Optional[str] = None,
) -> bool:
    """Revoke consent grant with immediate server-side effect."""
    stmt = (
        update(ConsentGrant)
        .where(
            ConsentGrant.id == grant_id,
            *([ConsentGrant.patient_id == patient_id] if patient_id else [])
        )
        .values(status="revoked", revoked_at=datetime.utcnow())
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def revoke_institution_consent_for_patient(
    db: AsyncSession,
    patient_id_or_mrn: str,
    institution: str,
) -> int:
    """Revoke all consent grants for an institution by patient."""
    stmt_pat = select(PatientProfile).where(
        (PatientProfile.id == patient_id_or_mrn) | (PatientProfile.mrn == patient_id_or_mrn)
    )
    res_pat = await db.execute(stmt_pat)
    patient = res_pat.scalar_one_or_none()
    if not patient:
        return 0

    stmt = (
        update(ConsentGrant)
        .where(
            ConsentGrant.patient_id == patient.id,
            ConsentGrant.institution == institution,
            ConsentGrant.status == "active",
        )
        .values(status="revoked", revoked_at=datetime.utcnow())
    )
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount


async def get_patient_consent_grants(
    db: AsyncSession,
    patient_id: str,
) -> List[ConsentGrant]:
    """Retrieve all consent grants for a patient."""
    stmt = select(ConsentGrant).where(ConsentGrant.patient_id == patient_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
