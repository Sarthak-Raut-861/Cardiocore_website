# CardioCoreEdge — API Contract Mapping & Schema Specification

**Document:** `docs/api-contract-mapping.md`  
**Phase:** Phase 6 — Backend Foundation and Security Architecture  
**Date:** 13 October 2026  
**Status:** Approved Integration Mapping  

---

## 1. Overview & Frontend Compatibility Statement

This document maps all frontend operations defined in `cardiocore-next/src/lib/api/` to their target **FastAPI** route definitions, request/response schemas, security dependencies, consent prerequisites, and error responses.

**Contract Preservation Guarantee:**  
All existing TypeScript contracts in `src/lib/api/types.ts` and `src/lib/api/auth.ts` remain **100% backward-compatible**. No existing client models are broken. Newly specified endpoints extend the contract surface to support Phases 4 & 5 clinical operations.

---

## 2. Authentication & Session Contracts (`/api/v1/auth`)

| Frontend Method / Operation | HTTP & Route | Request Schema | Response Schema | Auth & Consent Required | Expected HTTP Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `authApi.signInPatient()` | `POST /api/v1/auth/login/patient` | `PatientSignInRequest` (`identifier`, `password`, `rememberMe`) | `AuthSuccessResponse` (`user`, `sessionExpiresAt`) + `Set-Cookie: cc_session` | Public; CSRF header required for browser | `401 Unauthorized` (Invalid credentials)<br>`422 Unprocessable` (Malformed body)<br>`429 Too Many Requests` (Rate limit exceeded) |
| `authApi.signInDoctor()` | `POST /api/v1/auth/login/doctor` | `DoctorSignInRequest` (`email`, `password`, `medicalCouncil`, `registrationNumber`, `institution`, `totpCode`, `consentAgreement`) | `AuthSuccessResponse` (`user`, `sessionExpiresAt`) + `Set-Cookie: cc_session` | Public; CSRF header required | `401 Unauthorized` (Bad credentials or 2FA)<br>`403 Forbidden` (Council reg expired)<br>`429 Too Many Requests` |
| `authApi.sendOtp()` | `POST /api/v1/auth/otp/send` | `OtpSendRequest` (`phoneNumber`, `channel`) | `OtpSendResponse` (`status`, `expiresInSeconds`, `maskedDestination`) | Public; Strict rate limit (1/min) | `429 Too Many Requests`<br>`422 Unprocessable` |
| `authApi.verifyOtp()` | `POST /api/v1/auth/otp/verify` | `OtpVerifyRequest` (`phoneNumber`, `code`) | `AuthSuccessResponse` + `Set-Cookie: cc_session` | Public | `401 Unauthorized` (Bad code)<br>`410 Gone` (Code expired) |
| `authApi.getSession()` | `GET /api/v1/auth/session` | None (reads cookie) | `SessionResponse` (`authenticated`, `user`, `role`, `sessionExpiresAt`) | Optional cookie | `401 Unauthorized` (if cookie expired or invalid) |
| `authApi.signOut()` | `POST /api/v1/auth/logout` | None | `{"status": "logged_out"}` + `Set-Cookie: cc_session=; Max-Age=0` | Valid session cookie | `401 Unauthorized` |
| `authApi.forgotPassword()` | `POST /api/v1/auth/forgot-password` | `ForgotPasswordRequest` (`identifier`) | `{"status": "ok", "message": "..."}` | Public (constant-time response) | `429 Too Many Requests` |
| `authApi.resetPassword()` | `POST /api/v1/auth/reset-password` | `ResetPasswordRequest` (`token`, `newPassword`) | `{"status": "password_updated"}` | Public with single-use reset token | `400 Bad Request` (Invalid/expired token)<br>`422 Unprocessable` (Weak password) |

---

## 3. Patient Clinical & Telemetry Contracts (`/api/v1/patients`)

| Operation | HTTP & Route | Request Schema | Response Schema | Auth & Consent Required | Expected HTTP Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Get My Profile** | `GET /api/v1/patients/me` | None | `PatientProfileResponse` (Demographics, conditions, baseline metadata) | Role: `patient` | `401 Unauthorized` |
| **Get Telemetry Trends** | `GET /api/v1/patients/me/telemetry?range=7d` | Query: `range`, `signal` | `TelemetryTrendResponse` (HR, HRV, SpO2 downsampled intervals) | Role: `patient` | `401 Unauthorized`<br>`400 Bad Request` |
| **Get Active Prescriptions** | `GET /api/v1/patients/me/medications` | None | `MedicationListResponse` (Prescriptions, daily doses, 7d adherence) | Role: `patient` | `401 Unauthorized` |
| **Log Medication Dose** | `POST /api/v1/patients/me/medications/log` | `MedicationLogRequest` (`medicationId`, `takenAt`, `status`) | `MedicationLogResponse` | Role: `patient` | `401 Unauthorized` |
| **Get Consent Directives** | `GET /api/v1/patients/me/consent` | None | `ConsentDirectivesResponse` (Institutions, data scopes, expiry) | Role: `patient` | `401 Unauthorized` |
| **Update Consent Directive** | `PUT /api/v1/patients/me/consent/{grantId}` | `ConsentUpdateRequest` (`active`, `scope`) | `ConsentDirective` (Updated state + audit log ID) | Role: `patient` | `401 Unauthorized`<br>`404 Not Found` |

---

## 4. Clinician Workflow & Triage Contracts (`/api/v1/doctors`)

| Operation | HTTP & Route | Request Schema | Response Schema | Auth & Consent Required | Expected HTTP Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Get Clinical Queue** | `GET /api/v1/doctors/roster` | Query: `cohort`, `search` | `DoctorRosterResponse` (List of consented patients with alert tier, vitals delta, sync timestamp) | Role: `doctor` | `401 Unauthorized`<br>`403 Forbidden` |
| **Get Patient Chart (Scoped)** | `GET /api/v1/doctors/patients/{patientId}` | None | `DoctorPatientChartResponse` (Vitals, ECG strip, clinical summary) | Role: `doctor` + **Valid Consent Grant** | `401 Unauthorized`<br>`403 Forbidden` (`CONSENT_REVOKED`)<br>`404 Not Found` |
| **Get 250 Hz ECG Strip** | `GET /api/v1/doctors/patients/{patientId}/ecg/{stripId}` | None | `EcgStripResponse` (Raw Lead-I samples, duration, SNR, sampleRate: 250) | Role: `doctor` + **Consent: ECG Scope** | `403 Forbidden` (`CONSENT_SCOPE_DENIED`) |
| **Save ECG Interpretation** | `POST /api/v1/doctors/patients/{patientId}/ecg/{stripId}/interpretation` | `EcgInterpretationRequest` (`impression`, `patientNote`, `caliperIntervalsMs`) | `EcgInterpretationResponse` (Timestamped, signed with MMC number) | Role: `doctor` + **Consent: Clinical Notes** | `403 Forbidden`<br>`422 Unprocessable` |
| **Get Clinician Schedule** | `GET /api/v1/doctors/me/schedule` | Query: `week` | `WeeklyScheduleResponse` (Daily slots, urgent reserves) | Role: `doctor` | `401 Unauthorized` |
| **Update Schedule Rules** | `PUT /api/v1/doctors/me/schedule` | `ScheduleUpdateRequest` (Weekly template, booking rules) | `WeeklyScheduleResponse` | Role: `doctor` | `401 Unauthorized` |
| **Get Practice Analytics** | `GET /api/v1/doctors/me/analytics?range=30d` | Query: `range` | `PracticeAnalyticsResponse` (Aggregated de-identified alert distributions, quality correlation) | Role: `doctor` | `401 Unauthorized` |
| **Route Referral Handover** | `POST /api/v1/doctors/referrals` | `ReferralCreateRequest` (`patientId`, `recipientId`, `urgency`, `notes`) | `ReferralResponse` (Document Ref ID, audit hash) | Role: `doctor` + **Consent: Referral Scope** | `403 Forbidden`<br>`404 Not Found` |

---

## 5. Standardized Error Payload Architecture

All API endpoints return errors conforming to the RFC 7807 specification:

```json
{
  "type": "https://cardiocore.edge/errors/consent-required",
  "title": "Consent Required",
  "status": 403,
  "code": "CONSENT_REVOKED",
  "detail": "Patient Aarav Menon has revoked clinical data-sharing consent for Meridian Heart Institute.",
  "instance": "/api/v1/doctors/patients/44821/chart",
  "timestamp": "2026-10-13T13:30:00Z",
  "correlationId": "req_8bfa923e1104"
}
```
