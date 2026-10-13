"""
Patient Consent Directives & Scope Model
"""

import uuid
import json
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class ConsentGrant(Base, TimestampMixin):
    __tablename__ = "consent_grants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True
    )
    institution: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), index=True, default="active", nullable=False)  # "active", "expired", "revoked"

    # JSON-encoded array of permitted scopes: ["ecg", "vitals", "meds", "notes", "referrals"]
    scopes_json: Mapped[str] = mapped_column(Text, default='["vitals"]', nullable=False)

    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient = relationship("PatientProfile", back_populates="consent_grants")
    doctor = relationship("DoctorProfile", back_populates="consent_grants")

    def has_scope(self, scope: str) -> bool:
        if self.status != "active":
            return False
        if datetime.utcnow() > self.expires_at:
            return False
        try:
            scopes = json.loads(self.scopes_json)
            return scope in scopes
        except Exception:
            return False

    def get_scopes(self) -> List[str]:
        try:
            return json.loads(self.scopes_json)
        except Exception:
            return []
