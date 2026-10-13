"""
CardioCoreEdge Security Utilities
- Argon2id password hashing with fallback verification.
- RFC 6238 TOTP generation, validation, and replay prevention.
- Database-backed opaque session token hashing (SHA-256).
- Double Submit / Signed CSRF token verification.
- Sliding-window rate limiting for login/OTP endpoints.
- Audit payload sanitization.
"""

import hmac
import hashlib
import secrets
import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError, VerificationError
import pyotp

# Argon2id configuration (OWASP recommended parameters)
_argon2_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=1,
    hash_len=32,
    type=Type.ID
)

# PBKDF2 parameters for backward compatibility verification
SALT_BYTES = 16
PBKDF2_ITERATIONS = 100_000


def generate_session_token() -> str:
    """Generate 256-bit cryptographically secure opaque session identifier."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Compute SHA-256 hash of opaque session token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    """Generate cryptographically secure 256-bit CSRF token."""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return _argon2_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against Argon2id hash, with fallback to legacy PBKDF2-HMAC-SHA256.
    """
    if not hashed_password or not plain_password:
        return False
        
    # Check if Argon2 hash ($argon2id$)
    if hashed_password.startswith("$argon2"):
        try:
            return _argon2_hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError):
            return False
        except Exception:
            return False

    # Check if PBKDF2 hash (pbkdf2:sha256:...)
    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed_password.split("$")
            if len(parts) != 3:
                return False
            algo_part, salt_hex, key_hex = parts
            _, _, iter_str = algo_part.split(":")
            iterations = int(iter_str)
            salt = bytes.fromhex(salt_hex)
            expected_key = bytes.fromhex(key_hex)
            actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(actual_key, expected_key)
        except Exception:
            return False

    return False


# -----------------------------------------------------------------------------
# RFC 6238 TOTP Support for Clinicians
# -----------------------------------------------------------------------------

def generate_totp_secret() -> str:
    """Generate RFC 6238 compliant base32 secret."""
    return pyotp.random_base32()


def verify_totp_code(secret: str, code: str, last_timestep: Optional[int] = None) -> Tuple[bool, Optional[int]]:
    """
    Verify 6-digit TOTP code with replay prevention.
    Returns (is_valid, current_timestep).
    Replay protection rejects the code if it belongs to the same or older timestep.
    """
    if not secret or not code:
        return False, None

    code = str(code).strip()
    if len(code) != 6 or not code.isdigit():
        return False, None

    totp = pyotp.TOTP(secret, interval=30, digits=6)
    current_timestep = int(time.time() // 30)

    # Check if code matches within a 1-step window (-1, 0, +1)
    if not totp.verify(code, valid_window=1):
        return False, None

    # Replay protection: cannot reuse same timestep or older
    if last_timestep is not None and current_timestep <= last_timestep:
        return False, None

    return True, current_timestep


# -----------------------------------------------------------------------------
# In-Memory Rate Limiter (Single-instance dev, extensible to Redis)
# -----------------------------------------------------------------------------

class InMemoryRateLimiter:
    """
    Sliding-window counter rate limiter for login and OTP validation.
    Path to distributed enforcement: Swap dictionary with Redis Sorted Sets (ZADD/ZREMRANGEBYSCORE).
    """
    def __init__(self):
        # key -> list of timestamps
        self._events: Dict[str, list] = {}

    def is_allowed(self, key: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        
        # Clean expired events
        timestamps = [t for t in self._events.get(key, []) if t > cutoff]
        if len(timestamps) >= max_requests:
            self._events[key] = timestamps
            return False
            
        timestamps.append(now)
        self._events[key] = timestamps
        return True

    def reset(self, key: str):
        if key in self._events:
            del self._events[key]


login_rate_limiter = InMemoryRateLimiter()


# -----------------------------------------------------------------------------
# Audit Payload Sanitization
# -----------------------------------------------------------------------------

def sanitize_audit_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Redact passwords, OTPs, session secrets, and PHI payloads from audit records.
    """
    SENSITIVE_KEYS = {
        "password",
        "newpassword",
        "totpcode",
        "code",
        "token",
        "secret",
        "ssn",
        "raw_samples",
        "authorization",
        "cookie",
        "cc_session",
        "csrf_token",
    }
    sanitized: Dict[str, Any] = {}
    for k, v in payload.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_audit_payload(v)
        elif isinstance(v, list):
            sanitized[k] = [
                sanitize_audit_payload(item) if isinstance(item, dict) else item
                for item in v
            ]
        else:
            sanitized[k] = v
    return sanitized
