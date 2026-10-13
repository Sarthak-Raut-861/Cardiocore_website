# CardioCoreEdge

> **Cardiovascular Telemetry & Synthetic Electrocardiogram Platform**  
> *Research prototype exploring real-time single-lead telemetry, synchronized multi-lead review, and clinician-patient workflows.*

---

## ⚠️ Important Disclaimers

> [!CAUTION]
> **Synthetic Data & Non-Clinical Validation Notice:**  
> CardioCoreEdge is an experimental research and educational prototype. **All electrocardiogram (ECG) waveforms, telemetry streams, biometric markers, and patient records are synthetically generated or simulated.**  
> - This software is **NOT** a certified medical device and has **NOT** undergone clinical validation.  
> - It is **NOT** intended for diagnostic, therapeutic, surgical, or emergency clinical decision-making.  
> - **NOT** certified for HIPAA, FDA, CE, or MDR clinical production use.

---

## 1. Project Overview

CardioCoreEdge is a full-stack cardiovascular telemetry system designed to demonstrate end-to-end wearable data streaming, edge-to-cloud telemetry ingest, and dual-portal clinician/patient interaction.

The system features:
- **Patient Portal:** Real-time ambient Lead-II live monitoring, biometric trends (HR, HRV, SpO₂, skin temperature), appointment booking, and encrypted session security.
- **Clinician Workspace:** Priority-based triage queues, multi-channel ECG caliper review, longitudinal patient health record inspection, and audited clinical notes.
- **Telemetry Protocol Support:**
  - **Protocol v1 (Single-Lead):** 16-byte fixed binary frames optimized for continuous 250 Hz Lead-II streaming over WebSocket with CRC-16 integrity verification.
  - **Protocol v2 (Multi-Lead):** Synchronized variable multi-channel frames supporting 1, 3, 6, and 12 leads at 250 Hz with 16-bit signed integer deltas and channel-mask headers.

---

## 2. System Architecture

```
CardioCoreEdge Repository
├── cardiocore-next/           # Modern Next.js Frontend (App Router, React 19, Tailwind CSS)
│   ├── src/app/               # Application routes (Patient, Clinician, Landing, About)
│   ├── src/components/        # Reusable UI components & canvas ECG renderers
│   ├── src/features/          # Domain features (Auth, Telemetry, Triage, Multi-lead)
│   ├── src/lib/               # Telemetry decoders (v1, v2), API clients, CSRF protection
│   └── tests/                 # Automated frontend unit & contract regression suites
│
├── backend/                   # High-Performance FastAPI Backend (Python 3.12, aiosqlite)
│   ├── app/routers/           # REST endpoints (auth, sessions, telemetry, multi-lead recordings)
│   ├── app/telemetry/         # Protocol v1 & v2 binary frame decoders and ingestion
│   ├── app/models/            # SQLAlchemy database models
│   ├── app/db/                # Asynchronous database session & engine
│   └── tests/                 # Pytest test suite (auth, sessions, CSRF, ingestion, recordings)
│
└── docs/                      # Comprehensive Engineering Documentation & Specifications
    ├── design/                # Original UI/UX design specification & test scenario archive
    └── phase-*.md             # Complete architectural audit reports (Phases 1 through 13D)
```

---

## 3. Development Status

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Frontend (`cardiocore-next/`)** | **Phase 13D Complete** | Next.js 15, TypeScript, Protocol v2 decoder, multi-lead canvas renderer |
| **Backend (`backend/`)** | **Phase 13D Complete** | FastAPI, async SQLite, CSRF tokens, session timeouts, multi-lead sample retrieval |
| **Next Planned Phase** | **Phase 13E (Not Started)**| Production readiness, external cloud services, or further expansions |

---

## 4. Local Installation & Development

### Prerequisites
- **Node.js:** v18.18.0 or higher (v20+ recommended)
- **Python:** v3.10, v3.11, or v3.12
- **npm:** v9+

---

### Backend Setup (`backend/`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment:
   ```bash
   cp .env.example .env
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API documentation is available at `http://127.0.0.1:8000/docs`.

6. Run automated backend tests:
   ```bash
   python -m pytest
   ```

---

### Frontend Setup (`cardiocore-next/`)

1. Navigate to the frontend directory:
   ```bash
   cd cardiocore-next
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend application is available at `http://localhost:3000`.

5. Run frontend validation:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   node tests/test_phase13_frontend.mjs
   ```

---

## 5. Environment Variables

### Frontend (`cardiocore-next/.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | URL of the backend API service |
| `NEXT_PUBLIC_ENABLE_REAL_BACKEND` | `true` | Enables real HTTP/WebSocket backend communication |
| `NEXT_PUBLIC_ENABLE_MULTILEAD_ECG` | `true` | Enables Protocol v2 multi-lead playback & visualization |

### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `CardioCoreEdge API` | OpenAPI project label |
| `ENVIRONMENT` | `development` | Deployment environment identifier |
| `SECRET_KEY` | *(Set strong secret)* | Cryptographic key for session signing |
| `DATABASE_URL` | `sqlite+aiosqlite:///./cardiocore_dev.db` | SQLAlchemy asynchronous database URL |
| `REDIS_URL` | `redis://localhost:6379/0` | Ephemeral test cache URL |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS frontend origins |

---

## 6. Deployment Guide

### Frontend Deployment (Vercel)
The Next.js frontend is structured for deployment to Vercel:

1. Connect the GitHub repository `https://github.com/Sarthak-Raut-861/Cardiocore_website` to Vercel.
2. In the Vercel Project Settings, set the **Root Directory** to:
   ```
   cardiocore-next
   ```
3. Set the build settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_API_URL`: Your hosted backend URL (e.g., `https://api.yourdomain.com/api/v1`)
   - `NEXT_PUBLIC_ENABLE_REAL_BACKEND`: `true`
   - `NEXT_PUBLIC_ENABLE_MULTILEAD_ECG`: `true`

> [!NOTE]
> **Separate Backend Hosting:**  
> Vercel hosts the Next.js static and serverless frontend only. The FastAPI backend requires persistent Python hosting (e.g., AWS ECS, Render, Fly.io, Railway, or DigitalOcean) to maintain stateful WebSocket streams, cryptographic sessions, and SQLite/PostgreSQL persistence.

---

## 7. Documentation Index

Detailed architectural specifications, security threat models, and phase implementation reports are located in `docs/`:

- [docs/design/CardioCore-Mobile-UIUX-System.pdf](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/design/CardioCore-Mobile-UIUX-System.pdf) — Authoritative Mobile UI/UX Design System Specification.
- [docs/telemetry-protocol-spec.md](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/telemetry-protocol-spec.md) — Binary frame layout and CRC specifications for Protocol v1 and v2.
- [docs/backend-architecture.md](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/backend-architecture.md) — Backend service architecture, authentication, and database models.
- [docs/phase-13c-audit-report.md](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/phase-13c-audit-report.md) & [docs/phase-13d-report.md](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/phase-13d-report.md) — Multi-lead integration verification and corrections.
- [docs/legacy-cleanup-report.md](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/legacy-cleanup-report.md) — Full audit and repository consolidation record.

---

## 8. License & Intellectual Property

Proprietary research prototype developed for CardioCoreEdge. All rights reserved.
