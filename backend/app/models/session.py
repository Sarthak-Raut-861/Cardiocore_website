"""
Database-Backed Session Model
Stores SHA-256 hash of opaque tokens to prevent exposure if DB is compromised.
Enforces both idle inactivity timeout and absolute session ceiling.
"""

import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Stored token hash (SHA-256 of opaque token)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    absolute_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def is_valid(self) -> bool:
        if self.is_revoked:
            return False
        now = datetime.utcnow()
        if now > self.expires_at or now > self.absolute_expires_at:
            return False
        return True
