"""
Audit Event Model
Tamper-evident audit trail with SHA-256 event hashing and sanitized detail logging.
"""

import uuid
import hashlib
import json
from typing import Optional
from datetime import datetime
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    actor_user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)  # "SUCCESS", "DENIED", "ERROR"
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Sanitized payload details (guaranteed no plaintext passwords, secrets, or raw session tokens)
    details_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    
    # Tamper-evident hash chain
    previous_event_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False
    )

    @classmethod
    def calculate_event_hash(
        cls,
        id_str: str,
        actor_id: Optional[str],
        action: str,
        outcome: str,
        prev_hash: Optional[str],
        timestamp_str: str,
    ) -> str:
        payload = f"{id_str}|{actor_id or ''}|{action}|{outcome}|{prev_hash or 'GENESIS'}|{timestamp_str}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
