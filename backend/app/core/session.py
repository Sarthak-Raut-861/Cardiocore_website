"""
CardioCoreEdge Session Management
Provides abstract session store with in-memory fallback for testing.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.core.security import generate_session_token
from app.config import settings


class SessionData:
    def __init__(self, user_id: str, role: str, ip_hash: str, user_metadata: Dict[str, Any]):
        self.user_id = user_id
        self.role = role
        self.ip_hash = ip_hash
        self.user_metadata = user_metadata
        self.created_at = datetime.utcnow()
        self.last_accessed_at = datetime.utcnow()
        self.expires_at = self.last_accessed_at + timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def touch(self):
        self.last_accessed_at = datetime.utcnow()
        self.expires_at = self.last_accessed_at + timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)


class InMemorySessionStore:
    """Thread-safe development/test session repository."""
    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}

    def create_session(self, user_id: str, role: str, ip_hash: str, user_metadata: Dict[str, Any]) -> str:
        session_id = generate_session_token()
        self._sessions[session_id] = SessionData(user_id, role, ip_hash, user_metadata)
        return session_id

    def get_session(self, session_id: str) -> Optional[SessionData]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        if session.is_expired():
            del self._sessions[session_id]
            return None
        session.touch()
        return session

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def clear(self):
        self._sessions.clear()


session_store = InMemorySessionStore()
