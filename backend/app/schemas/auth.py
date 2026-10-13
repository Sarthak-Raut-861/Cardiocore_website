"""
CardioCoreEdge Pydantic v2 Authentication Schemas
Synchronized with frontend contracts in cardiocore-next/src/lib/api/types.ts
"""

from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class UserPublic(BaseModel):
    id: str
    role: Literal["patient", "doctor", "admin"]
    name: str
    email: Optional[str] = None
    phoneNumber: Optional[str] = None
    avatarUrl: Optional[str] = None


class PatientSignInRequest(BaseModel):
    identifier: str = Field(..., min_length=3, description="Email or mobile number")
    password: str = Field(..., min_length=6, description="Patient plaintext password")
    rememberMe: Optional[bool] = False


class DoctorSignInRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Official hospital email")
    password: str = Field(..., min_length=6, description="Clinician password")
    medicalCouncil: str = Field(..., min_length=3, description="State/National medical council")
    registrationNumber: str = Field(..., min_length=3, description="MMC or equivalent license ID")
    institution: str = Field(..., min_length=2, description="Affiliated healthcare institution")
    totpCode: str = Field(..., min_length=6, max_length=8, description="Second-factor authenticator code")
    consentAgreement: bool = Field(..., description="Legal affirmation of consent-scoped data access")


class OtpSendRequest(BaseModel):
    phoneNumber: str = Field(..., min_length=10, max_length=15)
    channel: Optional[Literal["sms", "whatsapp"]] = "sms"


class OtpSendResponse(BaseModel):
    status: Literal["sent", "queued"]
    expiresInSeconds: int = 300
    maskedDestination: str


class OtpVerifyRequest(BaseModel):
    phoneNumber: str = Field(..., min_length=10, max_length=15)
    code: str = Field(..., min_length=4, max_length=8)


class AuthSuccessResponse(BaseModel):
    user: UserPublic
    sessionExpiresAt: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: Optional[UserPublic] = None
    role: Optional[Literal["patient", "doctor", "admin"]] = None
    sessionExpiresAt: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., min_length=3)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16)
    newPassword: str = Field(..., min_length=8)
