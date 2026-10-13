# CardioCoreEdge — Backend Architecture Audit

**Document:** `docs/backend-architecture-audit.md`  
**Phase:** Phase 6 — Backend Foundation and Security Architecture  
**Date:** 13 October 2026  
**Auditor:** Antigravity AI Engineering Team  

---

## 1. Executive Summary

A comprehensive audit of the workspace was executed prior to implementing Phase 6. The audit inspected the repository root, subdirectories (`cardiocore-next/`, `src/`, `assets/`, `workspace-01a11201-46fb-7cd3-bd7e-00b469c8cab6/`, and `dev/`), Python interpreters, and package registries.

**Primary Finding:**  
No live FastAPI application, backend API routes, database instances, schema migrations, or persistent service containers currently exist in the codebase. All existing patient records and clinician views in `cardiocore-next/` operate via client-side demonstration fixtures. Historical Python files are limited to an offline HTML build script (`build.py`) and browser regression/QA scripts in a legacy backup folder.

---

## 2. Workspace Inventory & Forensic Inspection

### 2.1 Repository Root Analysis
| Path / File | Purpose & Architecture Role | Backend Code Present? | Notes |
| :--- | :--- | :--- | :--- |
| `build.py` | Legacy build concatenation tool | **No** | Reads `src/` HTML chunks (00–90) and outputs `cardiocore.html`. Contains zero network or API logic. |
| `vite.config.js` | Legacy Vite development server config | **No** | Runs static prototype HMR on port 5173. Untouched. |
| `cardiocore.html` | Legacy monolithic single-file prototype | **No** | Pure client-side HTML/CSS/JS with embedded canvas animations and mock data. |
| `index.html` | Legacy entry point | **No** | Pure client-side static entry point. |
| `src/` | Legacy HTML/JS partials (00–90) | **No** | Static HTML snippets; no server or database code. |
| `assets/` | Legacy static assets | **No** | Images, fonts, and icons. |
| `cardiocore-next/` | Next.js 16 App Router application | **No** | Reconstructed frontend (Phases 1–5). Features TypeScript API contracts in `src/lib/api/` targeting a future FastAPI server. |
| `workspace-01a11201-46fb-7cd3-bd7e-00b469c8cab6/` | Historical workspace archive | **No** | Contains legacy snapshots and `dev/` folder with browser QA scripts (`final_shots.py`, `smoke.py`, `doc_check.py`). |

### 2.2 Python Environment & Package Registry
The host environment was audited for Python runtimes:
- **Active Interpreter:** Python 3.11.9 (64-bit on Windows)
- **Secondary Interpreter:** Python 3.14.2
- **Virtual Environments:** No virtual environments (`venv`, `.venv`, or `env`) were configured within the project workspace.
- **Relevant Installed Packages:**
  - Web Framework & Server: `fastapi (0.141.1)`, `starlette (1.6.0)`, `uvicorn (0.52.4)`
  - Schema & Validation: `pydantic (2.13.4)`, `pydantic-settings (2.15.0)`
  - Database & ORM: `sqlalchemy (2.0.52)`, `alembic (1.19.2)`, `asyncpg (0.31.0)`, `aiosqlite (0.22.1)`, `psycopg (3.3.5)`
  - Cryptography & Security: `cryptography (50.0.0)` *(Note: `argon2-cffi` is required for Argon2id password hashing and must be specified in the backend dependency manifest)*
  - Caching & Mock Stores: `redis (8.1.0)`, `fakeredis (2.37.1)`
  - Testing & HTTP Clients: `pytest (8.4.2)`, `pytest-asyncio (1.4.0)`, `httpx (0.28.1)`

### 2.3 Existing Frontend API Contracts
The TypeScript client contracts in `cardiocore-next/src/lib/api/` were audited:
- `client.ts`: Configures base URL (`NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"`).
- `auth.ts`: Defines `AuthApiClient` class with proposed endpoints:
  - `POST /auth/login/patient`
  - `POST /auth/login/doctor`
  - `POST /auth/otp/send`
  - `POST /auth/otp/verify`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `GET /auth/session`
  - `POST /auth/logout`
- `types.ts`: Strongly typed schemas for credentials, session metadata, roles, and error payloads.
- **Offline Behavior:** Correctly catches `NetworkError` / `Failed to fetch` and raises `"FastAPI authentication service is offline. (Backend integration pending)"`.

---

## 3. Gap Analysis: Current State vs. Production Requirements

| Subsystem | Current State (Audit Finding) | Production Target Requirement | Gap to Bridge |
| :--- | :--- | :--- | :--- |
| **API Server** | Absent | Asynchronous FastAPI server running on port 8000 under Uvicorn | Build modular FastAPI application with APIRouter separation. |
| **Authentication** | Proposed client-side contracts only | Server-side password verification (Argon2id), 2FA TOTP/SMS, secure HTTP-only cookie issuance | Implement auth router, password hashing, and cookie management. |
| **Session Management** | None | Secure server-side sessions with Redis / database backing, inactivity timeouts, sliding refresh | Implement session store abstraction and middleware. |
| **Authorization & RBAC** | None (client role flags only) | Strict role-based access control (Patient, Doctor, Admin) enforced on every API route | Implement FastAPI dependency injection guards (`require_role`, `require_session`). |
| **Consent Enforcement** | Simulated UI toggles | Server-enforced cryptographic consent gate for clinician reads and writes to patient records | Implement consent check middleware/dependency before clinician access. |
| **Patient Data Store** | Static TypeScript fixtures | Relational database (PostgreSQL / SQLite in test) with encryption at rest | Define SQLAlchemy models, Alembic migrations, and repositories. |
| **Telemetry Ingestion** | Canvas client-side playback | High-throughput time-series ingestion (TimescaleDB / ClickHouse) with WebSocket / SSE streaming | Design ingestion endpoint, backpressure buffering, and retention tiers. |
| **Audit Logging** | Client UI toasts | Tamper-evident, non-repudiable audit ledger recording all patient chart accesses without PHI/secrets | Implement structured audit logging service with hash chaining. |

---

## 4. Proposed Target Architecture Overview

The proposed backend architecture will reside in an isolated `backend/` directory at the repository root, ensuring complete decoupling from both the Next.js frontend and the legacy Vite application:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application factory, lifespan, CORS, middleware
│   ├── config.py                # Pydantic Settings (environment, secrets, origins)
│   ├── core/                    # Security, sessions, hashing, dependencies
│   │   ├── security.py          # Argon2id password hashing, token generation
│   │   ├── session.py           # Session store interface & memory/Redis provider
│   │   ├── dependencies.py      # get_current_user, require_role, require_consent
│   │   └── audit.py            # Audit logger (redacting secrets/PHI)
│   ├── models/                  # SQLAlchemy ORM transactional models
│   ├── schemas/                 # Pydantic v2 validation & response contracts
│   ├── routers/                 # Modular APIRouters
│   │   ├── auth.py              # Login, logout, session, OTP, password recovery
│   │   ├── patients.py          # Patient profile, baseline summary, telemetry reads
│   │   ├── doctors.py           # Clinician roster, appointments, queue triage
│   │   ├── consent.py           # Consent grants, scopes, verification, revocation
│   │   ├── telemetry.py         # 250 Hz Lead-I ingest, quality gating, derived trends
│   │   ├── alerts.py            # Level 1/2/3 alert lifecycle and review states
│   │   └── audit.py             # Access log querying for compliance officers
│   └── services/                # Business logic and domain validation
├── tests/                       # Pytest unit and integration test suite
├── alembic/                     # Database migrations
└── requirements.txt             # Strict pinned dependencies
```

---

## 5. Architectural Safeguards for Phase 6

1. **No Production Claims:** Phase 6 implements the architectural blueprint, formal schemas, security specifications, and an isolated testable foundation. It does not connect to live hospital databases or external clinical systems.
2. **Preservation of Existing Assets:** The legacy `build.py`, `cardiocore.html`, `index.html`, `src/`, `assets/`, and the running Vite dev server (port 5173) will remain untouched.
3. **Frontend Contract Stability:** The Next.js frontend contracts in `cardiocore-next/src/lib/api/` will serve as the ground truth. Any discrepancy between proposed backend schemas and existing frontend interfaces will be documented in `docs/api-contract-mapping.md`.
