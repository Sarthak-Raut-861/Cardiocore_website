"""
User Identity Model
"""

import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    phone_number: Mapped[Optional[str]] = mapped_column(
        String(30), unique=True, index=True, nullable=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # "patient", "doctor", "admin"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 2FA (RFC 6238 TOTP)
    totp_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_totp_timestep: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Replay prevention

    # Account Lockout & Rate Limiting
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
