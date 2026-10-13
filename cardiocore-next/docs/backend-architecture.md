# CardioCoreEdge — Backend Architecture & Security Blueprint

**Document:** `docs/backend-architecture.md`  
**Phase:** Phase 6 — Backend Foundation and Security Architecture  
**Date:** 13 October 2026  
**Status:** Approved Design Specification  

---

## 1. System Overview & Module Decomposition

The CardioCoreEdge backend is an asynchronous Python service built on **FastAPI**, **Pydantic v2**, and **SQLAlchemy 2.0 (asyncio)**. It serves as the single source of truth for patient identity, clinical authorization, consent enforcement, telemetry stream management, and regulatory audit logging.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CardioCoreEdge FastAPI Service                        │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         Security & Middleware Layer                     │   │
│   │   • CORS (Explicit Origin) • CSRF Verification • Rate Limiting (Redis)   │   │
│   │   • Request Correlation ID • Security Headers • Exception Handlers      │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│   ┌────────────────────────────────────▼────────────────────────────────────┐   │
│   │                         FastAPI APIRouter Modules                       │   │
│   │                                                                         │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐   │   │
│   │   │     auth     │  │   patients   │  │   doctors    │  │  consent  │   │   │
│   │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘   │   │
│   │          │                 │                 │                │         │   │
│   │   ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  ┌─────▼─────┐   │   │
│   │   │  telemetry   │  │    alerts    │  │    audit     │  │  exports  │   │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘   │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│   ┌────────────────────────────────────▼────────────────────────────────────┐   │
│   │                       Core Services & Domain Logic                      │   │
│   │   • ConsentVerificationEngine       • TelemetryQualityGate              │   │
│   │   • SessionManager (Redis)          • AlertEscalationPipeline           │   │
│   │   • PasswordHasher (Argon2id)       • ImmutableAuditLogger              │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│   ┌────────────────────────────────────▼────────────────────────────────────┐   │
│   │                           Data Persistence Layer                        │   │
│   │   ┌──────────────────────────┐   ┌──────────────────────────────────┐   │   │
│   │   │   PostgreSQL (RDS/Aurora)│   │  TimescaleDB / ClickHouse TimeS  │   │   │
│   │   │   • Users, Patients, Roster │   │  • 250 Hz Lead-I ECG Samples     │   │   │
│   │   │   • Consent Grants, Audits  │   │  • Continuous PPG & SpO2 Metrics │   │   │
│   │   └──────────────────────────┘   └──────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Responsibilities & Trust Boundaries

### 2.1 Authentication and Session Management (`app.routers.auth`)
- **Responsibilities:** Handles patient password/OTP login, clinician credential + 2FA authentication, session renewal, password reset, and session termination.
- **Trust Boundary:** Untrusted public ingress. Must enforce strict rate limiting, payload size caps, constant-time credential comparison, and generic error responses.
- **Cookie Policy:** Issues opaque session IDs stored in `HTTP-Only`, `Secure`, `SameSite=Lax` cookies with a 15-minute idle timeout and a 12-hour absolute maximum lifetime.

### 2.2 User Identity and Role-Based Access Control (`app.core.dependencies`)
- **Roles:**
  - `patient`: Access restricted strictly to own profile, telemetry, care team, and consent settings.
  - `doctor`: Access restricted to consented patients, assigned clinic roster, pending triage queues, and practice analytics.
  - `admin`: Operational maintenance, system diagnostics, and compliance audit exports. Zero access to unconsented clinical telemetry.
- **Enforcement:** Enforced via FastAPI dependency injection (`Depends(require_role("doctor"))`). Frontend flags or query parameters are ignored.

### 2.3 Patient Consent and Access Authorization (`app.routers.consent`)
- **Responsibilities:** Manages patient consent directives (data types, expiry dates, purpose limitations).
- **Consent Gate Middleware:** Every clinician request accessing patient charts, ECG strips, trends, or lab records must pass through the `ConsentVerificationEngine`:
  1. Checks if an active, unexpired consent record exists linking the authenticated doctor's institution to the target patient.
  2. Verifies that the requested resource type (e.g., raw ECG vs. medication adherence) falls within the approved grant scope.
  3. Denies request with `403 Forbidden` (`code: CONSENT_REVOKED` or `CONSENT_REQUIRED`) if invalid.
  4. Records the outcome (allowed or blocked) in the immutable audit ledger.

### 2.4 Patient Profiles & Clinical Records (`app.routers.patients`)
- **Responsibilities:** Medical history, diagnosed conditions, demographic parameters, care-team assignments, and pre-arrival consult summaries.
- **Trust Boundary:** Regulated Health Information (Protected under DISHA / HIPAA / GDPR). Encrypted at rest via AES-256 and transmitted over TLS 1.3 only.

### 2.5 Telemetry Ingestion and Streaming (`app.routers.telemetry`)
- **Responsibilities:** Ingests ambulatory ECG waveforms (250 Hz Lead-I), PPG, accelerometry, and skin temperature.
- **Streaming:** Provides WebSocket and Server-Sent Events (SSE) pipelines for real-time clinician review.
- **Quality Gating:** Evaluates signal-to-noise ratio (SNR) and electrode impedance. Signals failing quality gating are tagged `uninterpretable` to prevent false-positive alert cascades.

### 2.6 Alert Events and Clinical Workflow (`app.routers.alerts`)
- **Responsibilities:** Manages physiological escalation tiers (Level 1 Info, Level 2 Attention, Level 3 Urgent).
- **Safety Rule:** The alert engine classifies statistical outliers and quality-verified anomalies; it **never generates automated clinical diagnoses**. All alerts require clinician interpretation.

### 2.7 Audit Logging (`app.core.audit`)
- **Responsibilities:** Records every authentication attempt, session event, chart read, telemetry export, and consent modification.
- **Security Invariant:** Redacts passwords, session tokens, OTP secrets, and raw clinical telemetry payloads. Includes cryptographic hash chaining (`prev_hash`) to guarantee non-repudiation.

### 2.8 Exports & Telehealth Integrations (`app.routers.exports`)
- **Responsibilities:** Generates signed PDF clinical summaries, FHIR R4 DiagnosticReport bundles, and printable inter-provider handover sheets.

---

## 3. Security Implementation Specifications

### 3.1 Password Hashing with Argon2id
Where password-based authentication is employed, passwords must be hashed using the **Argon2id** algorithm adhering to OWASP guidelines:
- **Memory Cost ($m$):** 65,536 KiB (64 MiB)
- **Time Cost ($t$):** 3 iterations
- **Parallelism ($p$):** 4 threads
- **Salt Length:** 16 cryptographically secure random bytes
- **Output Hash Length:** 32 bytes
- **Serialization:** Standard Modular Crypt Format (`$argon2id$v=19$m=65536,t=3,p=4$...`)

### 3.2 Secure Session Architecture
```
Client (Browser)                           FastAPI Backend                    Redis Session Store
      │                                           │                                   │
      ├── POST /api/v1/auth/login/patient ───────►│                                   │
      │   (Identifier + Password)                 ├── Verify Argon2id                 │
      │                                           ├── Generate 256-bit Session ID     │
      │                                           ├── Store Session Metadata ────────►│ Key: session:{id}
      │                                           │   (user_id, role, ip_hash, exp)   │ TTL: 900s
      │◄── 200 OK ────────────────────────────────┤                                   │
      │    Set-Cookie: cc_session=<opaque_id>;    │                                   │
      │    HttpOnly; Secure; SameSite=Lax; Path=/ │                                   │
      │                                           │                                   │
      ├── GET /api/v1/patients/me ────────────────►│                                   │
      │   Cookie: cc_session=<opaque_id>          ├── Check Session ─────────────────►│ Verify TTL & renew
      │                                           ├── Check Role & Authorization      │
      │◄── 200 OK (Patient Profile) ──────────────┤                                   │
```

### 3.3 CSRF Defense Architecture
For all non-idempotent HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via cookies:
1. The backend issues a cryptographically secure random token in an accessible cookie `cc_csrf`.
2. The frontend client must read `cc_csrf` and transmit its value in the custom header `X-CSRF-Token`.
3. The FastAPI `CSRFMiddleware` verifies that `X-CSRF-Token` matches the expected signed token.
4. Missing or mismatching tokens trigger an immediate `403 Forbidden` response.

### 3.4 Rate Limiting & Abuse Prevention
Implemented using a Redis-backed token bucket algorithm:
- **Patient Password Login:** 5 attempts per 15 minutes per IP + account identifier.
- **OTP Request (`/auth/otp/send`):** 1 attempt per 60 seconds per phone number; maximum 5 per day.
- **OTP Verification (`/auth/otp/verify`):** 3 failed attempts invalidates the active OTP code.
- **Clinician Login:** 5 attempts per 15 minutes; failed attempts trigger security notifications.
- **Exceeded Threshold:** Returns `429 Too Many Requests` with `Retry-After` header.

### 3.5 Non-Enumerating Account Recovery
The password recovery endpoint (`POST /api/v1/auth/forgot-password`):
- Accepts email or phone number.
- Always takes a uniform response duration (using artificial delay padding if account does not exist) to defeat timing attacks.
- Always returns identical generic success payload:
  `{"status": "ok", "message": "If an account matches those details, instructions have been sent."}`
- Never reveals whether the identifier exists in the database.

### 3.6 Error Handling & Information Leakage Prevention
- Global exception handlers map unhandled exceptions to generic `500 Internal Server Error` payloads.
- Stack traces, database column names, raw SQL queries, and internal file paths are **strictly suppressed** in all non-local environments.
- API validation errors conform to RFC 7807 (`application/problem+json`).

---

## 4. Testing & Validation Requirements

| Test Suite | Purpose | Acceptance Criterion |
| :--- | :--- | :--- |
| **Unit: Security** | Password hashing, token generation, CSRF matching | 100% test pass; timing attacks mitigated. |
| **Unit: Consent Engine** | Verification of active, expired, and revoked grants | 100% blocked access on revoked/expired consent. |
| **Integration: Auth Flow** | Login -> Session Cookie -> Protected Route -> Logout | Cookie invalidated; subsequent access returns 401. |
| **Integration: RBAC** | Doctor accessing patient route without consent; Patient accessing doctor queue | Returns 403 Forbidden on all boundary breaches. |
| **Schema Validation** | Pydantic v2 request body boundary fuzzing | Rejects malformed types, negative intervals, script tags. |
