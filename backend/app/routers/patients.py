"""
CardioCoreEdge Patient APIRouter
Targets /api/v1/patients/* endpoints.
Enforces patient role, self-access boundaries, and consent revocation controls.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.session import SessionModel
from app.models.profile import PatientProfile
from app.core.dependencies import require_role
from app.services.consent_service import get_patient_consent_grants, revoke_consent
from app.services.audit_service import log_audit_event
from app.schemas.common import GenericSuccessResponse

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/me")
async def get_my_patient_profile(
    session: SessionModel = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve authenticated patient's clinical baseline profile from database."""
    stmt = (
        select(PatientProfile)
        .where(PatientProfile.user_id == session.user_id)
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found.",
        )

    return {
        "id": session.user_id,
        "mrn": profile.mrn,
        "name": profile.full_name,
        "age": profile.age,
        "gender": profile.gender,
        "conditions": json.loads(profile.conditions_json),
        "baseline": json.loads(profile.baseline_summary_json),
        "adherencePct": profile.adherence_pct,
    }


@router.get("/consent")
async def get_my_consent_grants(
    session: SessionModel = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve patient's active and historical consent grants."""
    stmt = select(PatientProfile).where(PatientProfile.user_id == session.user_id)
    patient = (await db.execute(stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    grants = await get_patient_consent_grants(db, patient.id)
    return [
        {
            "id": g.id,
            "institution": g.institution,
            "status": g.status,
            "scopes": g.get_scopes(),
            "grantedAt": g.granted_at.isoformat() + "Z",
            "expiresAt": g.expires_at.isoformat() + "Z",
            "revokedAt": g.revoked_at.isoformat() + "Z" if g.revoked_at else None,
        }
        for g in grants
    ]


@router.post("/consent/{grant_id}/revoke", response_model=GenericSuccessResponse)
async def revoke_my_consent(
    grant_id: str,
    session: SessionModel = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Patient explicitly revokes a consent grant with immediate server-side effect."""
    stmt = select(PatientProfile).where(PatientProfile.user_id == session.user_id)
    patient = (await db.execute(stmt)).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    revoked = await revoke_consent(db, grant_id=grant_id, patient_id=patient.id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent grant not found or not owned by patient.",
        )

    await log_audit_event(
        db=db,
        actor_user_id=session.user_id,
        actor_role="patient",
        action="CONSENT_REVOKE",
        resource_type="consent_grant",
        resource_id=grant_id,
        outcome="SUCCESS",
        ip_hash=session.ip_hash,
    )

    return GenericSuccessResponse(status="ok", message="Consent successfully revoked.")
