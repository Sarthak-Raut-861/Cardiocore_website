"""
Alert Event Model
Tracks multi-tier escalation (L1, L2, L3) and physician triage state.
"""

import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class AlertEvent(Base, TimestampMixin):
    __tablename__ = "alert_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    level: Mapped[str] = mapped_column(String(10), index=True, nullable=False)  # "L1", "L2", "L3"
    trigger_signal: Mapped[str] = mapped_column(String(50), nullable=False)
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), index=True, default="active", nullable=False
    )  # "active", "acknowledged", "escalated", "resolved"
    
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False
    )
    
    acknowledged_by_doctor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    escalation_tier: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    # Relationships
    patient = relationship("PatientProfile", back_populates="alert_events")
    acknowledged_by = relationship("DoctorProfile")
