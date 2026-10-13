# CardioCoreEdge — Phase 12B Implementation Report
## Backend Security & Reliability Corrections

**Date:** October 13, 2026  
**Status:** Corrections Complete & Verified Across All Test Orders  
**Authorized Scope:** Phase 12B Only — Smallest safe corrections addressing audit findings F-01 through F-04:
- **F-01:** Synchronized Protocol v2 header documentation with implemented struct layout.
- **F-02:** Attached existing double-submit CSRF verification (`verify_csrf_token`) to recording mutation endpoints and added dedicated tests.
- **F-03:** Resolved cross-test TOTP replay state coupling via test fixture isolation without weakening application security.
- **F-04:** Clarified batch chunk payload conflict reporting semantics in documentation.

**Prohibited / Untouched Scope:** Frontend (`cardiocore-next/`), Legacy HTML/CSS/JS (`5173`), External Databases (PostgreSQL / TimescaleDB / Redis), Schema Alterations / Migrations, Real Hardware / Live Patient Data, Clinical Diagnostics.

---

## 1. Exact Files Created or Modified

### Files Modified:
1. [`backend/app/routers/telemetry.py`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/app/routers/telemetry.py):
   - Attached `_csrf: None = Depends(verify_csrf_token)` to:
     - `POST /api/v1/telemetry/recordings`
     - `PATCH /api/v1/telemetry/recordings/{recording_id}/status`
     - `POST /api/v1/telemetry/recordings/{recording_id}/chunks`
   - Verified that `get_current_session` executes first to reject unauthenticated requests with `401 Unauthorized`, before CSRF verification evaluates double-submit headers for cookie-authenticated sessions.
2. [`backend/tests/test_phase12_multilead.py`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/tests/test_phase12_multilead.py):
   - Added `csrf_headers(client)` helper to model browser client double-submit header transmission.
   - Updated all authenticated mutation requests to supply the double-submit CSRF header.
   - Added 6 dedicated CSRF tests verifying rejection of missing/invalid CSRF tokens, acceptance of valid tokens, rejection of unauthenticated requests, and non-bypass of patient isolation or clinician consent.
3. [`docs/phase-12-report.md`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/phase-12-report.md):
   - Corrected Protocol v2 32-byte header table in Section 2.1 to match `protocol.py`.
   - Clarified Section 4.2 payload conflict reporting semantics (`conflictChunks` in HTTP 200 response vs. HTTP 409 on terminated recording).

### Files Created:
1. [`backend/tests/conftest.py`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/tests/conftest.py):
   - Introduced an autouse fixture `isolate_totp_replay_state` that resets `last_totp_timestep = NULL` on seeded test users in `cardiocore_dev.db` before and after each test.
   - Restores clean test isolation without touching production authentication code or weakening replay checks.
2. [`docs/phase-12b-report.md`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/phase-12b-report.md):
   - This comprehensive Phase 12B report.

---

## 2. F-01: Corrected Protocol v2 Header Specification

The binary struct layout in `backend/app/telemetry/protocol.py` (`HEADER_STRUCT_FMT_V2 = "!BBBB I Q H H H H H H I"`) is confirmed as the ground truth. Documentation in `docs/phase-12-report.md` was updated to accurately reflect the 32-byte layout:

| Offset | Width | Type | Signedness | Endianness | Field Name | Description |
| :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| 0 | 1 byte | `uint8` | Unsigned | — | `magic_byte` | Constant `0xCC` (CardioCore protocol) |
| 1 | 1 byte | `uint8` | Unsigned | — | `version` | Constant `0x02` (Protocol Version 2) |
| 2 | 1 byte | `uint8` | Unsigned | — | `msg_type` | `0x01` (ECG Data), `0x02` (Alert), `0x03` (Control), `0x04` (Ack) |
| 3 | 1 byte | `uint8` | Unsigned | — | `flags` | Bit 0: Raw (`0`) vs Delta-Zlib (`1`); Bits 1–7: Reserved (`0`) |
| 4 | 4 bytes | `uint32` | Unsigned | Big-endian | `sequence_number` | Monotonic per-recording sequence index ($0 \dots 2^{32}-1$) |
| 8 | 8 bytes | `uint64` | Unsigned | Big-endian | `base_timestamp_ms` | Milliseconds since Unix epoch |
| 16 | 2 bytes | `uint16` | Unsigned | Big-endian | `sampling_rate_hz` | Sampling frequency: `250` or `500` Hz |
| 18 | 2 bytes | `uint16` | Unsigned | Big-endian | `active_leads_mask` | 12-lead bitmask: Bits 0–11 map to I, II, III, aVR, aVL, aVF, V1–V6 |
| 20 | 2 bytes | `uint16` | Unsigned | Big-endian | `sample_count_per_channel` | Sample count per channel ($N$) across all active channels ($1 \le N \le 1000$) |
| 22 | 2 bytes | `uint16` | Unsigned | Big-endian | `payload_length` | Encoded payload byte count ($L \le 65,504$ bytes) |
| 24 | 2 bytes | `uint16` | Unsigned | Big-endian | `lead_off_mask` | 16-bit bitmask of physical lead disconnection status |
| 26 | 2 bytes | `uint16` | Unsigned | Big-endian | `clipping_mask` | 16-bit bitmask of ADC clipping / rail saturation status |
| 28 | 4 bytes | `uint32` | Unsigned | Big-endian | `checksum_crc32` | IEEE 802.3 CRC-32 protecting **Header[0:28] + Payload** |

Total header size: **32 bytes**. CRC coverage explicitly protects the first 28 bytes of header fields concatenated with the complete payload.

---

## 3. F-02: Double-Submit CSRF Enforcement & Verification

### 3.1 Mechanism Architecture
In CardioCoreEdge, user authentication is managed via HttpOnly session cookies (`cc_session`). To defend against Cross-Site Request Forgery (CSRF), `backend/app/routers/auth.py` generates a cryptographically secure 256-bit CSRF token during login and sets it in a accessible cookie (`cc_csrf`).

The existing validator [`verify_csrf_token`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/app/core/dependencies.py#L89-L110) implements the standard Double-Submit Cookie pattern:
- It requires that for state-changing HTTP requests (`POST`, `PATCH`, `PUT`, `DELETE`), the header `X-CSRF-Token` must be present and match the value in cookie `cc_csrf`.
- If missing, empty, or mismatched, it raises `HTTP 403 Forbidden` (`detail="CSRF validation failed. Missing or mismatched CSRF token."`).

### 3.2 Endpoint Integration
The validator was wired to the three new recording mutation routes in `backend/app/routers/telemetry.py`:
- `POST /api/v1/telemetry/recordings`: `_csrf: None = Depends(verify_csrf_token)`
- `PATCH /api/v1/telemetry/recordings/{recording_id}/status`: `_csrf: None = Depends(verify_csrf_token)`
- `POST /api/v1/telemetry/recordings/{recording_id}/chunks`: `_csrf: None = Depends(verify_csrf_token)`

Because `session: SessionModel = Depends(get_current_session)` is declared prior to `_csrf`, unauthenticated requests are rejected immediately with `HTTP 401 Unauthorized`. Authenticated requests with a missing or invalid `X-CSRF-Token` header are rejected with `HTTP 403 Forbidden`.

### 3.3 Automated CSRF Test Evidence
Six dedicated tests were added to `backend/tests/test_phase12_multilead.py`:
1. `test_recording_csrf_missing_token_rejected`: Authenticated patient submits `POST /recordings` without `X-CSRF-Token` $\to$ Returns `403 Forbidden` (`"CSRF validation failed"`).
2. `test_recording_csrf_invalid_token_rejected`: Authenticated patient submits `POST /recordings` with `X-CSRF-Token: bogus_tampered_csrf_token_12345` $\to$ Returns `403 Forbidden` (`"CSRF validation failed"`).
3. `test_recording_csrf_valid_token_accepted`: Authenticated patient submits `POST /recordings` with matching `X-CSRF-Token` $\to$ Returns `201 Created` with valid `recordingId`.
4. `test_recording_csrf_unauthenticated_rejected`: Unauthenticated client submits request with token $\to$ Returns `401 Unauthorized` (`"Authentication required"`).
5. `test_recording_csrf_patient_isolation_not_bypassed`: Authenticated patient with valid CSRF token attempts to create recording for another patient $\to$ Returns `403 Forbidden` (`"Access denied"`).
6. `test_recording_csrf_clinician_consent_not_bypassed`: Authenticated clinician with valid CSRF token attempts recording creation for patient without active consent $\to$ Returns `403 Forbidden` (`"Access denied: patient has not granted ECG consent to institution."`).

---

## 4. F-03: TOTP Test Isolation & Order Independence

### 4.1 Root Cause Analysis
During doctor login (`POST /api/v1/auth/login/doctor`), `verify_totp_code` enforces strict 30-second window replay protection:
$$\text{If } \text{last\_timestep} \ge \text{current\_timestep} \implies \text{Reject with 401 Unauthorized}$$
When Dr. Neha logged in during test execution, `user.last_totp_timestep` was persisted to the SQLite database. If a subsequent test logged in Dr. Neha within 30 seconds, it was rejected as a replayed token unless `last_totp_timestep` was cleared.

### 4.2 Safe Fixture Solution
Production code in `backend/app/core/security.py` and `backend/app/routers/auth.py` was **left 100% untouched** to preserve strict production replay defense.

Test isolation was resolved by creating [`backend/tests/conftest.py`](file:///C:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/tests/conftest.py):
```python
@pytest.fixture(autouse=True)
def isolate_totp_replay_state():
    """Ensure seeded test users have clean TOTP replay state before and after each test."""
    _reset_replay_timesteps()
    yield
    _reset_replay_timesteps()
```
This safely isolates test authentication state per test function, guaranteeing order independence across sync and async test runners.

### 4.3 Order-Independence Verification Results

| Test Execution Order | Command Executed | Result Observed |
| :--- | :--- | :---: |
| **Order 1: Phase 10 then Phase 12** | `python -m pytest tests/test_phase10_reliability_security.py tests/test_phase12_multilead.py` | **40 passed, 0 failed** (5.53s) |
| **Order 2: Phase 12 then Phase 10** | `python -m pytest tests/test_phase12_multilead.py tests/test_phase10_reliability_security.py` | **40 passed, 0 failed** (5.80s) |
| **Order 3: Full Backend Suite** | `python -m pytest` | **92 passed, 0 failed** (11.66s) |

Order-independence is verified across all execution sequences.

---

## 5. F-04: Batch Payload Conflict Reporting Semantics

No application code was changed for F-04. The API behavior is preserved and documented:
- In `POST /api/v1/telemetry/recordings/{recording_id}/chunks`, an incoming batch of frames is evaluated individually.
- If an individual frame matches an existing chunk's sequence/timestamp but has a differing SHA-256 payload checksum:
  - The conflicting frame is rejected (`conflictChunks: 1`, `errorCount: 1`).
  - An audit event `MULTICHANNEL_CHUNK_CONFLICT` is logged.
  - The HTTP endpoint returns status `200 OK` with the batch processing contract summary (`contract: "HTTP-MultiChannel-Batch-v2"`).
- `HTTP 409 Conflict` is returned when attempting to ingest chunks into an already terminated/completed recording (`recording.status != "active"`).

---

## 6. Baseline versus Final Test Comparison

| Metric | Phase 12 Baseline | Phase 12A Audit | Phase 12B Verified | Status |
| :--- | :---: | :---: | :---: | :---: |
| `test_phase12_multilead.py` | 22 passed | 22 passed | **28 passed** (+6 CSRF tests) | **Clean** |
| `test_phase10_reliability_security.py` | 12 passed | 12 passed | **12 passed** | **Clean** |
| `test_phase9_step_zero.py` | 10 passed | 10 passed | **10 passed** | **Clean** |
| `test_phase9_live_monitoring.py` | 3 passed | 3 passed | **3 passed** | **Clean** |
| `test_phase8_telemetry_integration.py` | 12 passed | 12 passed | **12 passed** | **Clean** |
| `test_phase7_security.py` | 17 passed | 17 passed | **17 passed** | **Clean** |
| `test_backend.py` | 10 passed | 10 passed | **10 passed** | **Clean** |
| **Total Automated Tests** | **86 passed** | **86 passed** | **92 passed, 0 failed** | **100% Pass Rate** |

---

## 7. Confirmations & Scope Boundaries

1. **Frontend & Legacy Application Untouched**:
   - Zero files in `cardiocore-next/` were modified.
   - The legacy HTML/CSS/JavaScript app and Vite server on port `5173` remain untouched.
2. **Infrastructure Untouched**:
   - No external databases (PostgreSQL, TimescaleDB, Redis) were introduced.
   - Database schema remained unchanged (no migrations or table modifications).
3. **Single-Lead Pipeline Untouched**:
   - Protocol v1 single-lead (Lead-II, 250 Hz) batch upload (`/api/v1/telemetry/batch`) and WebSocket streaming (`/ws/telemetry/...`) continue to pass all tests.

---

**STOP: Phase 12B corrections and verification are complete.** No further phases or integrations will proceed without explicit authorization.
