"""
RFC 7807 Problem Details & Common Response Schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    code: Optional[str] = None
    detail: str
    instance: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    correlationId: Optional[str] = None


class GenericSuccessResponse(BaseModel):
    status: str = "ok"
    message: str
