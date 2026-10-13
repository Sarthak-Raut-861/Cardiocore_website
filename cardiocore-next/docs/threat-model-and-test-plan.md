# CardioCoreEdge — Threat Model & Security Test Plan

**Document:** `docs/threat-model-and-test-plan.md`  
**Phase:** Phase 6 — Backend Foundation and Security Architecture  
**Date:** 13 October 2026  
**Status:** Approved Security Verification Specification  

---

## 1. STRIDE Threat Model & Security Mitigations

The CardioCoreEdge backend interfaces with wearable medical sensors, patient personal devices, and clinical hospital workstations. The threat landscape has been modeled using the **STRIDE** methodology:

| Threat Category | Specific Attack Vector | Potential Clinical Impact | Architectural Mitigation in FastAPI Backend |
| :--- | :--- | :--- | :--- |
| **S**poofing | Attacker impersonates a doctor using stolen credentials or fabricated session token. | Unauthorized access to patient cardiovascular telemetry. | 1. Opaque 256-bit cryptographically random session IDs stored in Redis.<br>2. Two-factor authentication (TOTP) required for clinician login.<br>3. Medical council registration number verified against state council records. |
| **S**poofing | Rogue hardware device injects fabricated ECG samples. | Falsified arrhythmia alert causing unwarranted emergency dispatch. | 1. Mutual TLS (mTLS) or device-level HMAC signatures for wearable ingest.<br>2. Hardware device certificate binding to patient record. |
| **T**ampering | Interception and modification of ECG samples or vital signs in transit. | Conceals acute myocardial ischemia or ventricular tachycardia. | 1. Strict TLS 1.3 encryption in transit with HSTS header.<br>2. Cryptographic checksums (SHA-256) embedded in 1-second ECG sample chunks. |
| **R**epudiation | Clinician claims they never viewed an urgent alert strip; patient claims they never revoked consent. | Legal liability; compliance violation under medical governance. | 1. Append-only, tamper-evident audit log with hash chaining (`prev_hash`).<br>2. Every chart view, strip review, and consent update logs timestamp, actor ID, and IP hash. |
| **I**nformation Disclosure | Doctor attempts to browse patient charts across hospitals without documented consent. | Breach of protected health information (PHI) under DISHA / HIPAA. | 1. Server-side `ConsentVerificationEngine` intercepts every clinical read.<br>2. Access blocked with 403 if active unexpired consent is not present.<br>3. AES-256 database encryption at rest. |
| **I**nformation Disclosure | Account enumeration via forgot-password or login endpoints. | Harvests registered cardiac patient phone numbers and emails. | 1. Non-enumerating responses: identical message and uniform latency.<br>2. Generic error messages: `"Invalid credentials"` for all failures. |
| **D**enial of Service | SMS flooding on `/auth/otp/send` or brute force on password logins. | Financial drain on SMS gateway; service outage for legitimate patients. | 1. Redis sliding-window rate limiting (1 OTP per 60s; 5 login attempts per 15 min).<br>2. Cloudflare / WAF IP reputation filtering. |
| **E**levation of Privilege | Patient modifies client-side token or role flag to access clinician queue. | Patient manipulates clinical records or views other patients' data. | 1. Frontend role flags are ignored; role is resolved strictly from server-side session.<br>2. Route dependency injection (`Depends(require_role("doctor"))`) blocks unauthorized roles. |

---

## 2. Automated Security Test Plan

A formal automated test suite implemented in `pytest` will validate these security invariants:

```
tests/security/
├── test_auth_boundaries.py      # Session management, cookie flags, expiration
├── test_csrf_defense.py         # CSRF token validation and rejection
├── test_rbac_enforcement.py     # Role isolation (Patient vs Doctor vs Admin)
├── test_consent_engine.py       # Consent verification, scoping, revocation
├── test_rate_limiting.py        # Token bucket abuse limits on login/OTP
├── test_account_recovery.py     # Non-enumeration and timing constancy
└── test_audit_sanitization.py   # Redaction of passwords, tokens, and PHI
```

### Concrete Test Specifications:

1. **`test_unauthenticated_protected_route`**: Sending request without session cookie to `/api/v1/patients/me` must return `401 Unauthorized`.
2. **`test_invalid_session_cookie`**: Sending forged or expired `cc_session` cookie must return `401 Unauthorized` and clear the cookie.
3. **`test_csrf_token_required_on_mutations`**: `POST /api/v1/patients/me/consent` with valid session but missing `X-CSRF-Token` header must return `403 Forbidden`.
4. **`test_csrf_mismatch_rejected`**: Mismatched `X-CSRF-Token` value must return `403 Forbidden`.
5. **`test_patient_cannot_access_doctor_queue`**: Authenticated `patient` accessing `/api/v1/doctors/roster` must return `403 Forbidden`.
6. **`test_doctor_blocked_without_consent`**: Authenticated `doctor` accessing `/api/v1/doctors/patients/{id}/chart` for an unconsented patient must return `403 Forbidden` (`code: CONSENT_REVOKED` or `CONSENT_REQUIRED`).
7. **`test_doctor_allowed_with_active_consent`**: Access succeeds with `200 OK` when an active, unexpired consent grant exists.
8. **`test_consent_revocation_immediate_effect`**: When patient revokes consent via `PUT /api/v1/patients/me/consent/{id}`, subsequent doctor requests within the same second must immediately return `403 Forbidden`.
9. **`test_login_rate_limiting`**: 6 consecutive failed password attempts within 15 minutes must trigger `429 Too Many Requests` on the 6th attempt with `Retry-After` header.
10. **`test_forgot_password_non_enumeration`**: Submitting an existing email and a nonexistent email must return identical payload status and execution timing within a 50ms variance window.
11. **`test_audit_log_redaction`**: Inspecting audit ledger after login and consent updates confirms zero occurrence of passwords, OTP codes, session tokens, or raw ECG sample payloads.
