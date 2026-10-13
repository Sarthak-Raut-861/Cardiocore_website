# CardioCoreEdge — Authentication Architecture & Security Specification

> **Phase**: Phase 3 — Authentication and Navigation  
> **Status**: Proposed Specification & Integration Contract  
> **Target Backend**: FastAPI (Python) · Asynchronous REST / SSE / WebSockets  

---

## 1. Overview & Security Philosophy

CardioCoreEdge is an AI-driven cardiovascular monitoring platform handling sensitive telemetry (continuous ECG, heart rate variability, SpO₂, and patient clinical records).

### Core Security Principles

1. **Backend as the Sole Authority**:
   - The frontend is an untrusted presentation layer.
   - Frontend route guards and UI state transitions are strictly **User Experience (UX) conveniences**, never authorization boundaries.
   - Every protected API endpoint must independently validate session identity, role permissions, and patient consent on every HTTP request.
2. **Zero Storage of Credentials in Web Storage**:
   - Access tokens, session tokens, refresh tokens, passwords, and clinical records must **never** be stored in `localStorage`, `sessionStorage`, or window global variables.
   - Authentication relies strictly on secure, `HTTP-only`, `SameSite` cookies managed by the browser.
3. **Defense-in-Depth for Clinical Data**:
   - Patient health information is consent-gated. A doctor role does not confer blanket access to all patients; access requires an explicit, active consent grant verified server-side.
4. **No Simulated Authentication Success**:
   - In the absence of a live FastAPI backend, the web application must never fake authentication success, invent mock successful session responses, or generate synthetic JWT tokens client-side.

---

## 2. User Roles & Permission Boundaries

| Role Identifier | Description | Permitted Capabilities | Prohibited Capabilities |
|---|---|---|---|
| `patient` | Individual wearing the cardiovascular bio-sensor | - View own real-time telemetry and historical trends.<br>- View and revoke clinician consent grants in the ledger.<br>- Export own health summary (PDF/CSV/FHIR).<br>- Book appointments and message verified clinicians. | - Accessing another patient's vitals or identity.<br>- Accessing clinician triage queues or clinical review notes. |
| `doctor` | Verified clinician / cardiologist with medical council registration | - View triage roster of patients with active, documented consent.<br>- Review 30-second ECG strips and ambulatory trend summaries.<br>- Add clinical consultation notes.<br>- Manage appointment slots and respond to patient inquiries. | - Accessing patient records without active consent grants.<br>- Overriding patient consent revocations.<br>- Modifying raw sensor samples. |
| `anonymous` | Unauthenticated visitor | - View public landing page, clinical platform descriptions, educational FAQ, and specialist directory. | - Accessing any personal vitals, messaging, or dashboards. |

*Note on Administrator*: The legacy CardioCore application does not define an `admin` role. In this architecture, system-level audits, provider verification, and consent ledger integrity are enforced at the database and infrastructure levels.

---

## 3. Session Lifecycle, Cookies & Transport Security

### A. Session Mechanism: Secure HTTP-Only Cookie

Browser sessions are maintained via a signed, encrypted session cookie:

* **Cookie Name**: `cc_session`
* **Attributes**:
  * `HttpOnly`: **True** (Inaccessible to JavaScript, mitigating XSS token theft).
  * `Secure`: **True** (Transmitted only over HTTPS; allowed on localhost for development).
  * `SameSite`: **Lax** (or **Strict** for sensitive mutations), mitigating Cross-Site Request Forgery (CSRF).
  * `Path`: `/`
  * `Domain`: Locked to API domain or omitted for host-only restriction.
  * `Max-Age`: `28800` (8 hours for standard clinical shifts).

### B. Session Lifecycle States

1. **Unauthenticated**: No valid `cc_session` cookie present. Client requests to `/api/auth/session` return HTTP `401 Unauthorized`.
2. **Active**: Valid cookie verified by FastAPI against backend session store (Redis / Database).
3. **Idle Timeout & Expiration**: Sessions expire after 8 hours of inactivity, or upon explicit logout.
4. **Renewal (Sliding Window)**: On authenticated requests within the final 60 minutes of validity, FastAPI issues a refreshed `Set-Cookie` header.
5. **Revocation**: Logging out sends `POST /api/auth/logout`, instructing FastAPI to invalidate the session ID in the store and return an expired `Set-Cookie` (`Max-Age=0`).

### C. CSRF Protection

For state-changing requests (`POST`, `PUT`, `DELETE`), FastAPI implements double-submit or synchronizer tokens:
* FastAPI provides a cryptographically random, masked CSRF token via a readable cookie (`cc_csrf`) or `/api/auth/csrf`.
* The Next.js frontend sends this value in the `X-CSRF-Token` header for all mutating API calls.

---

## 4. Proposed FastAPI Authentication API Contracts

All endpoints are prefixed with `/api/v1/auth`.

### 1. Patient Sign-In (Password)
* **Endpoint**: `POST /api/v1/auth/login/patient`
* **Request Schema**:
  ```json
  {
    "identifier": "aarav.menon@example.com",
    "password": "user_provided_password",
    "rememberMe": false
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "pat_aarav_9821",
      "role": "patient",
      "name": "Aarav Menon",
      "email": "aarav.menon@example.com"
    }
  }
  ```
  *Sets Header*: `Set-Cookie: cc_session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
* **Error Responses**:
  * `401 Unauthorized`: Invalid credentials or unverified email.
  * `429 Too Many Requests`: Rate limit exceeded (e.g. > 5 failed attempts in 15 minutes).

### 2. Patient Sign-In (OTP Verification)
* **Request Step 1 (Send Code)**: `POST /api/v1/auth/otp/send`
  * Body: `{ "phoneNumber": "+919820000000" }`
  * Response: `{ "success": true, "message": "Verification code dispatched" }`
* **Request Step 2 (Verify Code)**: `POST /api/v1/auth/otp/verify`
  * Body: `{ "phoneNumber": "+919820000000", "code": "481200" }`
  * Response: Returns user profile and sets session cookie.

### 3. Clinician Sign-In (Multi-Factor & Medical Council Verification)
* **Endpoint**: `POST /api/v1/auth/login/doctor`
* **Request Schema**:
  ```json
  {
    "email": "neha.raghavan@meridianheart.in",
    "password": "clinician_password",
    "medicalCouncil": "Maharashtra Medical Council",
    "registrationNumber": "MMC-2010-44821",
    "institution": "Meridian Heart Institute",
    "totpCode": "482001",
    "consentAgreement": true
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "doc_neha_4482",
      "role": "doctor",
      "name": "Dr Neha Raghavan",
      "email": "neha.raghavan@meridianheart.in",
      "medicalCouncil": "Maharashtra Medical Council",
      "registrationNumber": "MMC-2010-44821",
      "institution": "Meridian Heart Institute"
    }
  }
  ```

### 4. Current Session Retrieval
* **Endpoint**: `GET /api/v1/auth/session`
* **Request**: Empty body (browser automatically attaches `cc_session` cookie).
* **Success Response (`200 OK`)**:
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "pat_aarav_9821",
      "role": "patient",
      "name": "Aarav Menon"
    }
  }
  ```
* **Unauthenticated Response (`401 Unauthorized`)**:
  ```json
  {
    "authenticated": false,
    "user": null,
    "error": "No active session or session expired"
  }
  ```

### 5. Sign-Out
* **Endpoint**: `POST /api/v1/auth/logout`
* **Response (`200 OK`)**:
  ```json
  { "success": true, "message": "Session terminated" }
  ```
  *Sets Header*: `Set-Cookie: cc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`

### 6. Account Recovery / Password Reset
* **Step 1 (Request Reset)**: `POST /api/v1/auth/forgot-password`
  * Body: `{ "email": "aarav.menon@example.com" }`
  * Response: `{ "success": true, "message": "If the account exists, a recovery link has been sent." }` (Generic response to avoid user enumeration).
* **Step 2 (Confirm Reset)**: `POST /api/v1/auth/reset-password`
  * Body: `{ "token": "crypto_token", "newPassword": "new_secure_password" }`
  * Response: `{ "success": true, "message": "Password updated successfully." }`

---

## 5. Security Enforcements for Future FastAPI Backend

1. **Password Hashing**: Use `argon2id` (or `bcrypt` with work factor >= 12).
2. **Brute-Force & Rate Limiting**:
   * Maximum 5 failed attempts per IP / identifier per 15-minute window via Redis token bucket.
   * CAPTCHA challenge or progressive delay upon repeated failures.
3. **Audit Logging**:
   * Every login attempt (success and failure), session invalidation, and password reset must be timestamped and logged with client IP and User-Agent.
4. **Strict HTTP Status Codes**:
   * `401 Unauthorized`: Missing, invalid, or expired session.
   * `403 Forbidden`: Authenticated session lacks required role or active consent grant.
   * `429 Too Many Requests`: Rate limit triggered.
