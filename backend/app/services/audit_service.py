"""
Tamper-Evident Audit Logging Service
Ensures all security-relevant operations (auth, consent changes, chart access)
are recorded with sanitized payloads and cryptographic hash chaining.
"""

import json
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditEvent
from app.core.security import sanitize_audit_payload


async def log_audit_event(
    db: AsyncSession,
    actor_user_id: Optional[str],
    actor_role: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    outcome: str,
    ip_hash: str,
    details: Optional[Dict[str, Any]] = None,
) -> AuditEvent:
    """Record an audit event with sanitized payload and chained SHA-256 hash."""
    clean_details = sanitize_audit_payload(details or {})
    details_str = json.dumps(clean_details, sort_keys=True)
    
    # Query previous event hash for tamper-evident chaining
    stmt = select(AuditEvent.event_hash).order_by(desc(AuditEvent.timestamp)).limit(1)
    result = await db.execute(stmt)
    prev_hash = result.scalar_one_or_none()
    
    timestamp = datetime.utcnow()
    timestamp_str = timestamp.isoformat()
    
    import uuid
    actual_id = str(uuid.uuid4())
    
    event_hash = AuditEvent.calculate_event_hash(
        id_str=actual_id,
        actor_id=actor_user_id,
        action=action,
        outcome=outcome,
        prev_hash=prev_hash,
        timestamp_str=timestamp_str,
    )
    
    event = AuditEvent(
        id=actual_id,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        ip_hash=ip_hash,
        details_json=details_str,
        previous_event_hash=prev_hash,
        event_hash=event_hash,
        timestamp=timestamp,
    )
    
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
