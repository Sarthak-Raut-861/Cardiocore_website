"""
Patient & Clinician Profile Models
"""

import uuid
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class PatientProfile(Base, TimestampMixin):
    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    mrn: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)

    # JSON-encoded strings for SQLite compatibility, preserves path to JSONB in PostgreSQL
    conditions_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    baseline_summary_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    adherence_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    consent_grants = relationship("ConsentGrant", back_populates="patient", cascade="all, delete-orphan")
    telemetry_chunks = relationship("TelemetryChunk", back_populates="patient", cascade="all, delete-orphan")
    telemetry_recordings = relationship("TelemetryRecording", back_populates="patient", cascade="all, delete-orphan")
    alert_events = relationship("AlertEvent", back_populates="patient", cascade="all, delete-orphan")


class DoctorProfile(Base, TimestampMixin):
    __tablename__ = "doctor_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    degrees: Mapped[str] = mapped_column(String(100), nullable=False)
    specialty: Mapped[str] = mapped_column(String(100), nullable=False)
    medical_council: Mapped[str] = mapped_column(String(100), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    institution: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    registration_status: Mapped[str] = mapped_column(String(20), default="verified", nullable=False)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    consent_grants = relationship("ConsentGrant", back_populates="doctor")
