# CardioCoreEdge — Patient Dashboard Audit & Inventory

> **Phase**: Phase 4 — Patient Dashboard Reconstruction  
> **Source of Truth**: Legacy Prototype (`src/30_body_patient.html`, `src/60_core.js`, `src/81_charts.js`, `src/84_sim.js`)  
> **Scope**: Documenting legacy views, telemetry logic, data provenance, and component breakdown.

---

## 1. Audit of Legacy Patient Views & Capabilities

The legacy application is a client-side prototype. It models a comprehensive patient experience for a demonstrative profile (**Aarav Menon**, 44 years old, diagnosed with hypertension and type 2 diabetes, monitored for 138 days via a wearable device).

### View Catalog

| View ID | Title in Legacy Nav | Description & Major Sub-Components | Data Provenance | Backend Dependencies |
|---|---|---|---|---|
| `home` | **Home** | Overview dashboard: Cardiovascular state card with Twin State Ring (score 82); 4 vital cards with sparkline canvases (Resting HR, HRV, SpO₂, Skin Temp); 250 Hz Lead I ECG strip preview; Level 2 Attention insight card; Next appointment card (Dr Neha Raghavan); Recent alerts list; Today's medications checklist (2/4 taken) with adherence bar; Quick actions. | **Synthetic / Static**: Predefined sample metrics in `60_core.js`, simulated ECG sweep loop. | Vitals telemetry stream, appointment calendar API, medication sync. |
| `health` | **Health & trends** | Historical telemetry analytics: Multi-range tabs (`24H`, `7D`, `30D`, `3M`, `1Y`); 4 vital trend charts with normal variability bands and baselines; Weekly ECG events bar chart + recordings table; Activity & sleep context cards; Data quality progress bars (ECG 96%, PPG 92%, contact 88%); PDF export trigger. | **Synthetic / Algorithmic**: `rangeData()` uses pseudo-random noise (`seedRand`) around baseline seeds with EWMA smoothing. | Historical time-series query service, telemetry data store, PDF generation service. |
| `ecg` | **ECG lab** | ECG inspection & recording bench: 30-second live capture canvas at 250 Hz with grid; real-time elapsed counter (`00:18 / 00:30`); live HR (76 bpm), detected beat count (23), signal quality (96%); Record/Stop/Share buttons; Previous recordings history list; Clinical non-diagnostic disclaimer and medication warnings. | **Synthetic Engine**: Canvas synthetic P-QRS-T generator (`ecgTrace`) driven by requestAnimationFrame. | Raw Lead-I telemetry ingest, server-side beat classification, clinical report sharing API. |
| `twin` | **Digital Twin** | Baseline model inspection: Large State Index ring (score 82, stable); Confidence metric (0.91, 1.42M beats, 124 strips); Contributing signal weight breakdown (Resting HR 34%, HRV 27%, SpO₂ 18%, Temp 11%, Activity 10%); Recalibration timeline (4 historical stages); 4 Level 3 decision gates description. | **Static / Illustrative**: Fixed weights and values demonstrating model transparency; not connected to a live ML model. | Personalized digital twin baseline model inference & retraining engine. |
| `alerts` | **Alert centre** | Multi-level alerts dashboard: Summary counts for Level 3 (Urgent, 1), Level 2 (Attention, 2), Level 1 (Informational, 6); Category tabs (`All`, `Daily`, `Weekly`, `Device`, `Marked read`); Detailed alert cards with multi-signal telemetry triggers, assessment modal trigger, PDF export, doctor sharing. | **Static Samples**: Preconfigured clinical alert scenarios; actions trigger client toasts. | Multi-signal alert evaluator, push notifications, escalation dispatcher. |
| `live` | **Live monitor** | Interactive device test bench: Scenario selector (`Resting`, `Walking`, `Asleep`, `Stress`, `Arrhythmia`, `Recovery`); Real-time parameter display with baseline deviations; 4 mini sparklines; Simulated Lead I ECG canvas; 4 decision gates evaluation; Real-time event log; Optional "Drive the app" switch. | **Client Simulation**: `84_sim.js` mathematical scenario generator with timers and event logs. | Standalone device simulation bench (safe to run completely client-side in preview). |
| `day` | **Day in review** | 24-hour retrospective: Day switcher (-1 / +1 day, `Sat 4 Oct 2026`); Summary metrics (Resting HR 68, Time in range 96%, Peak HR 114, Excluded 6 min); Full-width 24-hour HR time-series canvas with shaded sleep/activity/ECG/insight bands; Chronological day timeline. | **Synthetic / Static**: Canvas-drawn 24-hour diurnal curve with annotated events. | Daily telemetry rollups, sleep stage classification, activity tracking ingest. |
| `appts` | **Appointments** | Care consultation overview: Confirmed upcoming appointment card with Dr Neha Raghavan (Tue 6 Oct, 10:30); Video consultation trigger; Past consultation records; Booking workflow trigger. | **Static Sample**: Hardcoded appointment data. | Telehealth video signaling, clinician booking & schedule availability API. |
| `meds` | **Medications** | Medication adherence tracker: Daily schedule (Ramipril 5mg, Metformin 500mg morning/evening, Atorvastatin 20mg); Check-off interactions; 7-day adherence rate (96%); Active prescription details. | **Locally Persisted**: Pre-populated medication list; toggling persists to in-memory state. | Clinical prescription management, pharmacy integration, compliance auditing. |
| `records` | **Health record** | Medical background: Personal demographics (Aarav Menon, 44y, 176cm, 78kg, BMI 25.2, B+); Lipid profile lab table (Total Chol, LDL, HDL, Triglycerides, VLDL with targets and trends); Medical history tags; Family history cards; Relevant clinical events timeline. | **Static Sample**: Lab results from "Apollo Diagnostics" (24 Sep 2026). | FHIR clinical record server, diagnostic lab ingest API. |
| `profile` | **Profile & settings** | Patient preferences & security: Demographics summary; Emergency care preferences (Emergency contact, preferred hospital, urgent workflow toggle); Privacy & consent checkboxes (Care team baseline sharing, ECG sharing, anonymous research); 2FA indicator; Device sync details (CardioCore Band 2, 78% battery); Export & delete triggers. | **Static / Client-side**: Checkboxes toggle client state; consent ledger button opens toast. | Patient consent ledger service, emergency dispatch registry, account deletion service. |
| `messages` | **Messages** | Care team messaging interface: Secure message thread with Dr Neha Raghavan; Message timestamps; Compose input. | **Static Mock**: Hardcoded clinical exchange. | End-to-end encrypted messaging service, clinician inbox. |

---

## 2. Telemetry, Algorithm & Data Provenance Classification

To satisfy **clinical safety requirements**, every feature is classified into one of four provenance categories:

1. **Static Demonstrative Data**:
   - Patient profile (Aarav Menon, age 44, BMI 25.2, blood group B+).
   - Appointments, medication schedule, lipid laboratory results, family medical history.
   - Non-diagnostic disclaimers and educational guidance.
2. **Synthetic Telemetry Engine**:
   - P-QRS-T synthetic Lead-I ECG strip generation (250 Hz sampling simulation with synthetic noise, wandering baseline, and heart rate parameters).
   - `rangeData()` multi-day trend simulation with pseudo-random EWMA variability bands around baseline seeds.
3. **Client-Side Simulation Bench**:
   - `Sim` module in `84_sim.js`: drives physiological response scenarios (`rest`, `walk`, `sleep`, `stress`, `arrhythmia`, `recovery`) with decision gate evaluation (quality, motion, persistence, multi-signal agreement).
4. **Backend-Dependent Integrations (Pending)**:
   - Live sensor ingest, server-side session authentication, remote consent ledger authorization, telehealth video sessions, actual PDF generation, and verified clinical escalation.

---

## 3. Clinical Safety & Language Corrections

During the audit, several clinical statements in the legacy prototype were evaluated against the safety guidelines:

1. **"Digital Twin active · Model v4.2"**:
   - *Risk*: May imply an FDA/CE-cleared predictive medical AI.
   - *Correction*: Clearly label as **"Personal Baseline Model (Demonstration)"** and preserve the non-diagnostic disclaimer.
2. **"Urgent review workflow was started and closed after clinical review"**:
   - *Risk*: May imply automated real-time dispatch to emergency medical services.
   - *Correction*: Explicitly label sample alerts with **"Sample Alert · Simulated Data"** and state: *"CardioCore does not contact emergency services automatically without confirmed provider integration."*
3. **"Single-lead ECG at 250 Hz"**:
   - *Correction*: Ensure visible notice: *"Simulated ECG trace for interface demonstration. Not clinically measured patient data."*

---

## 4. Proposed Component Breakdown (`src/features/patient/`)

```
src/features/patient/
├── data/
│   ├── sample-patient.ts          # Strictly isolated demonstration data for Aarav Menon
│   ├── sample-charts.ts           # Deterministic sparkline and trend series generators
│   └── sample-scenarios.ts        # Simulator benchmarks (rest, walk, sleep, stress, arrhythmia)
├── components/
│   ├── patient-shell.tsx          # Navigation sidebar, responsive topbar, preview notice, unit switcher
│   ├── patient-home-view.tsx      # Overview: Twin ring, vital cards, ECG preview, alert banner, meds
│   ├── patient-health-view.tsx    # Health & trends: Range tabs (24H-1Y), 4 trend charts with bands, data quality
│   ├── patient-ecg-view.tsx       # ECG lab: 30s recording loop, live metrics, historical strips
│   ├── patient-twin-view.tsx      # Digital Twin: State index, contributing signals, recalibration timeline
│   ├── patient-alerts-view.tsx    # Alert centre: Level 1/2/3 categorization, simulated triggers
│   ├── patient-live-view.tsx      # Live monitor bench: Scenario drivers, decision gates, real-time log
│   ├── patient-day-view.tsx       # Day in review: 24h scrubber, time-series canvas with sleep/activity bands
│   ├── patient-records-view.tsx   # Health records: Demographics, lipid panel, medical history
│   ├── patient-profile-view.tsx   # Profile, consent controls (with disclaimer), emergency contacts, device sync
│   ├── patient-meds-view.tsx      # Medication list, daily adherence checklist
│   ├── patient-appts-view.tsx     # Appointments with care team (Dr Raghavan)
│   ├── patient-messages-view.tsx  # Secure message thread preview
│   └── ecg-lab-canvas.tsx         # High-performance 250 Hz Canvas renderer with grid and sweep
```

---

## 5. Architectural & Performance Principles

1. **Retain Canvas Renderers**: Use lightweight HTML5 `<canvas>` for ECG waveforms, sparklines, and trend envelopes (matching `81_charts.js` and `60_core.js`), avoiding bulky third-party chart libraries.
2. **IntersectionObserver Animation Control**: Pause ECG canvas sweeps and trend animations when offscreen or when another tab is active.
3. **SI vs Conventional Unit Formatting**: Support switching between SI (`min⁻¹`, `ms`, `°C`, `mmol/L`) and Conventional (`BPM`, `°F`, `mg/dL`) units.
4. **Demonstration Banner**: A permanent, prominent header banner clearly indicates:
   > *"Demonstration Mode — Displaying simulated telemetry for Aarav Menon. No wearable sensor or live clinical backend is connected."*
5. **No LocalStorage Credential Leakage**: No authentication tokens or simulated medical records persisted in `localStorage`.
