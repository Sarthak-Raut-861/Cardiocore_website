# CardioCoreEdge — Implemented API Contract Mapping

## 1. Overview & Scope Status

This document defines the exact status of backend endpoints in CardioCoreEdge Phase 7, cross-referenced with `docs/api-contract-mapping.md` and frontend TypeScript interfaces in `cardiocore-next/src/lib/api/types.ts`.

Endpoints are classified as:
- **IMPLEMENTED**: Real database persistence, Argon2id/TOTP security, role enforcement, consent gating, and audit logging.
- **PROPOSED / SIMULATED**: Mock or synthetic responses for frontend prototypes.
- **DEFERRED**: Explicitly out of Phase 7 scope (external live hospital integrations, ABHA gateways, live wearable BLE streaming).

---

## 2. API Endpoint Matrix

| Method | Endpoint | Status | Auth Required | Role | Consent Scope | Audit Logged |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | **IMPLEMENTED** | None | Public | None | No |
| `POST`| `/api/v1/auth/login/patient` | **IMPLEMENTED** | Credentials | Patient | None | Yes |
| `POST`| `/api/v1/auth/login/doctor` | **IMPLEMENTED** | 2FA + Reg | Doctor | Affirmation | Yes |
| `GET` | `/api/v1/auth/session` | **IMPLEMENTED** | Session Cookie | Any | None | No |
| `POST`| `/api/v1/auth/logout` | **IMPLEMENTED** | Session Cookie | Any | None | Yes |
| `POST`| `/api/v1/auth/forgot-password` | **IMPLEMENTED** | None | Public | None | Yes (Non-enum) |
| `GET` | `/api/v1/patients/me` | **IMPLEMENTED** | Session Cookie | Patient | Self | No |
| `GET` | `/api/v1/patients/consent` | **IMPLEMENTED** | Session Cookie | Patient | Self | No |
| `POST`| `/api/v1/patients/consent/{id}/revoke`| **IMPLEMENTED** | Session Cookie | Patient | Self | Yes |
| `GET` | `/api/v1/doctors/roster` | **IMPLEMENTED** | Session Cookie | Doctor | Institution | No |
| `GET` | `/api/v1/doctors/patients/{id}/chart`| **IMPLEMENTED** | Session Cookie | Doctor | `vitals` | Yes |
| `GET` | `/api/v1/doctors/patients/{id}/telemetry`| **IMPLEMENTED** | Session Cookie | Doctor | `ecg` | Yes |
| `GET` | `/api/v1/telemetry/chunk/{chunk_id}` | **IMPLEMENTED** | Session Cookie | Any | Chunk Owner | No |
| `POST`| `/api/v1/auth/otp/send` | **DEFERRED** | None | Public | None | No (No SMS provider) |
| `POST`| `/api/v1/auth/otp/verify` | **DEFERRED** | None | Public | None | No |
| `POST`| `/api/v1/patients/telemetry/stream` | **DEFERRED** | Device Key | Patient | None | No (Phase 8 ingest) |
| `POST`| `/api/v1/clinical/abha/verify` | **DEFERRED** | Token | Doctor | None | No (No live ABHA) |

---

## 3. Implemented Route Specifications

### 1. `POST /api/v1/auth/login/patient`
- **Request Body**:
  ```json
  {
    "identifier": "aarav.menon@example.com",
    "password": "patient123"
  }
  ```
- **Responses**:
  - `200 OK`: Sets HttpOnly `cc_session` and `cc_csrf` cookies. Returns `AuthSuccessResponse` with user metadata and session expiry.
  - `401 Unauthorized`: Bad password or unknown identifier.
  - `422 Unprocessable`: Password shorter than 6 characters.
  - `429 Too Many Requests`: Triggered upon >5 attempts in 60 seconds.

### 2. `POST /api/v1/auth/login/doctor`
- **Request Body**:
  ```json
  {
    "email": "neha.raghavan@meridianheart.in",
    "password": "clinician123",
    "medicalCouncil": "Maharashtra Medical Council",
    "registrationNumber": "MMC-2010-44821",
    "institution": "Meridian Heart Institute",
    "totpCode": "123456",
    "consentAgreement": true
  }
  ```
- **Responses**:
  - `200 OK`: Sets HttpOnly `cc_session` and `cc_csrf` cookies. Advances `last_totp_timestep`.
  - `400 Bad Request`: `consentAgreement` is false.
  - `401 Unauthorized`: Bad password, mismatched registration number, or invalid/replayed TOTP code.
  - `429 Too Many Requests`: Rate limit exceeded.

### 3. `GET /api/v1/doctors/patients/{patient_id}/chart`
- **Authentication**: Requires clinician session (`role: doctor`).
- **Authorization**: Enforces server-side consent verification (`scope: vitals`).
- **Responses**:
  - `200 OK`: Consented clinical record and vital statistics.
  - `403 Forbidden`: Access denied if patient consent is missing, expired, revoked, or granted to a different hospital institution.
  - `404 Not Found`: Unknown patient ID.
- **Audit Effect**: Logs `CHART_ACCESS` audit event with actor, institution, and outcome.

### 4. `GET /api/v1/doctors/patients/{patient_id}/telemetry`
- **Authentication**: Requires clinician session (`role: doctor`).
- **Authorization**: Enforces server-side consent verification (`scope: ecg`).
- **Responses**:
  - `200 OK`: Returns 250 Hz Lead-II waveform preview and decompression metrics.
  - `403 Forbidden`: Patient has not granted `ecg` scope.
- **Audit Effect**: Logs `ECG_TELEMETRY_ACCESS` audit record.

### 5. `POST /api/v1/patients/consent/{grant_id}/revoke`
- **Authentication**: Requires patient session (`role: patient`).
- **Authorization**: Patient can only revoke their own consent grants.
- **Responses**:
  - `200 OK`: Generic success confirmation. Subsequent doctor requests for this patient immediately fail with 403 Forbidden.
  - `404 Not Found`: Grant not found or owned by a different patient.
- **Audit Effect**: Logs `CONSENT_REVOKE` audit record.
