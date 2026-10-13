# Historical QA Scenarios & Viewport Coverage (Phases 1–4 Archive)

During the early development of CardioCore (Phases 1–4), approximately 30 Playwright test scripts were maintained in `workspace-.../dev/` to validate the legacy single-file bundle (`cardiocore.html`).

This document records the user-journey scenarios and viewport test matrices from those historical scripts for future reference when developing automated end-to-end tests for the modern Next.js frontend (`cardiocore-next/`).

---

## 1. Core User-Journey Scenarios Tested

1. **Public Marketing & Authentication:**
   - Landing page hero rendering with anatomical heart canvas and tilt interaction.
   - Smooth-scrolling anchors (`#site`, `#about`, `#faq`).
   - Patient gesture unlock (drag-and-hold heart into ring), PIN code (`481200`), password auth, demo profile bypass.
   - Clinician login credentials validation, council number input, 2FA prompt.

2. **Patient Experience:**
   - Patient navigation views: Home, Health & Trends, ECG Lab, Digital Twin, Alerts, Appointments, Medications, Health Records, Profile.
   - Range tab toggles on Trend charts: `24H`, `7D`, `30D`, `3M`, `1Y`.
   - 30-second live ECG recording simulation: P-QRS-T synthesis, live canvas rendering, quality scoring.
   - Alert center modals: Urgent assessment sheet (Level 3), emergency action sheet, video consultation room.
   - Appointment booking modal and confirmation receipt.
   - Consent-scoped health record export/sharing modal.

3. **Clinician Portal:**
   - Triage roster sorted by validated alert urgency level.
   - Patient record inspection (e.g. demo patient 'Rohit') with vitals history and ECG strip.
   - ECG review workspace with caliper annotation and clinician timestamped note.
   - Clinician-patient messaging interface.
   - Roster availability and schedule views.

---

## 2. Tested Viewport Matrix

The historical scripts evaluated responsive layouts and checked for horizontal scrollbar overflow (`scrollWidth > clientWidth`) across:
- **Mobile Viewports:** `375×812` (iPhone), `390×844`, `412×915` (Pixel/Android).
- **Tablet Viewports:** `768×1024` (iPad portrait), `820×1180`.
- **Desktop Viewports:** `1280×800`, `1440×900`, `1920×1080`.
- **Theme Modes:** Light and Dark color schemes (`prefers-color-scheme: dark`, `.dark` class).

---

## 3. Transition to Modern Testing

The legacy scripts hardcoded references to `file:///home/user/cardiocore.html` and old global objects (`window.CC`). They have been replaced in the active repository by:
- **Frontend Test Suite:** `cardiocore-next/tests/test_phase13_frontend.mjs` (unit/integration tests for Protocol v1/v2 decoders, CSRF handling, and typed client models).
- **Backend Test Suite:** `backend/tests/` (FastAPI pytest suite covering auth, sessions, CSRF, telemetry ingestion, and multi-lead persistence).
