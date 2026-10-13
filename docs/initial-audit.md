# CardioCore — Initial Frontend Audit

> **Phase 0 — Inspection only, no modifications made.**
> Audited: 2026-10-13 · Auditor: Antigravity

---

## 1. Existing Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | None — vanilla HTML/CSS/JS, single-page architecture using `display:none` routing |
| **Build tool** | Vite 6.x (dev server + production bundler) and a Python concatenation script (`build.py`) |
| **CSS** | All CSS is embedded in a single `<style>` block inside `src/00_head.html` (~88 KB) |
| **JavaScript** | 10 vanilla JS IIFE modules concatenated via `main.js` imports (~259 KB total source) |
| **Fonts** | Google Fonts: **Sora** (display) + **Manrope** (body), loaded via `<link>` |
| **Charts/ECG** | Custom Canvas 2D renderer — no charting library |
| **3D / WebGL** | **None** — no Three.js, no WebGL, no GLB/GLTF models |
| **Animations** | CSS keyframes + custom spring-physics engine in `80_motion.js` |
| **Dependencies** | `devDependencies: { "vite": "^6.0.0" }` — zero runtime dependencies |
| **Backend** | None present — no `fetch()`, no `XMLHttpRequest`, no API calls anywhere in the source |
| **State** | `localStorage` persistence via `X.store` in `70_extras.js` |
| **Testing** | None configured |

---

## 2. Project Directory Structure

```
EDI Website/
├── assets/                           # 9 image assets
│   ├── heart-q.png                   # 59 KB — main heart figure (used in UI)
│   ├── heart.png                     # 408 KB — larger variant (unused in build)
│   ├── heart-render.png              # 1.1 MB — full-res render (unused in build)
│   ├── about-hero-web.jpg            # 73 KB — About page hero photo
│   ├── about-hero.jpg                # 171 KB — full-res About hero (unused)
│   ├── about-story-1-web.jpg         # 45 KB — About story photo 1
│   ├── about-story-1.jpg             # 167 KB — full-res story 1 (unused)
│   ├── about-story-2-web.jpg         # 41 KB — About story photo 2
│   └── about-story-2.jpg             # 131 KB — full-res story 2 (unused)
├── src/                              # 22 source files
│   ├── 00_head.html                  # 86 KB — DOCTYPE, <head>, ALL CSS (1258 lines)
│   ├── 10_body_public.html           # 17 KB — Public landing page + footer
│   ├── 12_body_about.html            # 11 KB — About page
│   ├── 20_body_auth.html             # 13 KB — Patient + Doctor sign-in
│   ├── 26_body_onboard.html          # 15 KB — 8-step patient onboarding wizard
│   ├── 30_body_patient.html          # 96 KB — Patient dashboard (18 views, 1328 lines)
│   ├── 35_patient_extras.html        # 20 KB — Notifications, LDL detail, doc viewer
│   ├── 37_patient_live.html          # 12 KB — Live monitor / device bench
│   ├── 40_body_doctor.html           # 55 KB — Doctor dashboard (8 views, 637 lines)
│   ├── 45_doctor_extras.html         # 4 KB  — Doctor profile extras
│   ├── 50_modals.html                # 2 KB  — Modal + toast hosts
│   ├── 60_core.js                    # 50 KB — Router, charts, ECG engine, UI kit
│   ├── 70_extras.js                  # 55 KB — Persistence, theme, onboarding, palette
│   ├── 80_motion.js                  # 20 KB — Spring physics, gesture unlock, pointer
│   ├── 81_charts.js                  # 23 KB — Interactive charts, units, SI conversion
│   ├── 82_files.js                   # 41 KB — Custom PDF writer, CSV, FHIR export
│   ├── 83_messages.js                # 17 KB — Messaging system (patient ↔ clinician)
│   ├── 84_sim.js                     # 17 KB — Live device simulation
│   ├── 86_emergency.js               # 13 KB — Emergency response flow
│   ├── 87_booking.js                 # 13 KB — Appointment booking with week calendar
│   ├── 88_shell.js                   # 15 KB — Hero light rig, unlock panel, shortcuts
│   └── main.js                       # 1 KB  — Vite entry point (imports all modules)
├── dist/                             # Production build output
│   ├── index.html                    # 297 KB
│   └── assets/
│       ├── index-Db9FvRH6.js         # 189 KB (single bundle — all JS)
│       ├── heart-q-DBH7QkpN.png      # 59 KB
│       └── about-*-web-*.jpg         # 3 image assets
├── build.py                          # Python concatenator (single-file + Vite)
├── cardiocore.html                   # 938 KB — single-file build (data URIs)
├── index.html                        # 298 KB — Vite-compatible entry (asset paths)
├── package.json                      # Minimal: name "cardiocore", only vite dep
├── vite.config.js                    # Standard Vite config
└── workspace-*/                      # Older workspace copy (identical structure)
```

---

## 3. All Identified Pages and Major Components

### Screens (routed via `display:none` toggle)

| Screen ID | Description | Source file |
|-----------|------------|-------------|
| `site` | Public landing page | `10_body_public.html` |
| `about` | About / editorial page | `12_body_about.html` |
| `login-patient` | Patient sign-in (password, OTP, gesture) | `20_body_auth.html` |
| `login-doctor` | Clinician sign-in (reg#, council, 2FA) | `20_body_auth.html` |
| `onboard` | 8-step patient onboarding wizard | `26_body_onboard.html` |
| `app-patient` | Patient dashboard (18 sub-views) | `30_body_patient.html` + extras |
| `app-doctor` | Doctor dashboard (8 sub-views) | `40_body_doctor.html` + extras |

### Patient Dashboard Sub-views (18)

`home`, `health`, `ecg`, `live`, `day`, `twin`, `messages`, `alerts`, `symptoms`, `appts`, `meds`, `records`, `lipids`, `device`, `profile`, `notifications`, `marker` (LDL detail), document viewer

### Doctor Dashboard Sub-views (9)

`roster` (triage), `appts`, `patients`, `review` (ECG), `messages`, `analytics`, `schedule`, `handover`, `dprofile`

### Shared Components

- **Navbar** — sticky, glassmorphic blur, responsive hamburger
- **Toast system** — bottom-right notifications
- **Modal system** — scrim overlay, stacked modals
- **Command palette** — ⌘K fuzzy search across patients/features
- **Sidebar navigation** — fixed-height app shell with sticky sidebar
- **Charts engine** — Canvas 2D: line, bars, stack, dual-axis, multi-series, sparklines
- **ECG engine** — Synthesised P-QRS-T waveform, real-time strip animation
- **Spring physics** — Critically-damped spring for pointer tracking, card tilt, gesture unlock
- **Gesture unlock** — Drag heart into ring, hold for authentication
- **Theme system** — Light/dark toggle with full CSS custom property palette swap
- **Unit system** — SI/conventional unit toggle with live re-rendering
- **PDF writer** — Pure JS, library-free PDF generation
- **Booking calendar** — Week grid with deterministic slot availability
- **Messaging** — Shared thread store between patient and clinician views
- **Emergency flow** — 7-step sequential response with Meet link generation
- **Print report** — CSS print styles with dedicated layout

---

## 4. Inventory of Important Assets

| File | Size | Used in build | Purpose |
|------|------|---------------|---------|
| `assets/heart-q.png` | 59 KB | ✅ | **Primary heart figure** — hero, auth pages |
| `assets/heart.png` | 408 KB | ❌ | Higher-res variant (backup) |
| `assets/heart-render.png` | 1.1 MB | ❌ | Full-resolution original render |
| `assets/about-hero-web.jpg` | 73 KB | ✅ | About page hero photograph |
| `assets/about-story-1-web.jpg` | 45 KB | ✅ | About page story photo 1 |
| `assets/about-story-2-web.jpg` | 41 KB | ✅ | About page story photo 2 |
| `assets/about-hero.jpg` | 171 KB | ❌ | Full-res About hero (backup) |
| `assets/about-story-1.jpg` | 167 KB | ❌ | Full-res story 1 (backup) |
| `assets/about-story-2.jpg` | 131 KB | ❌ | Full-res story 2 (backup) |

All SVG icons are inline in the HTML source — there are no external SVG files.

---

## 5. Heart Figure — Source File and Implementation Method

### Source file

**`assets/heart-q.png`** — 59 KB, ~475×670 px PNG with transparent background.

It is a **pre-rendered 2D image** of a stylised anatomical heart in the CardioCore teal palette. Not a 3D model, not an SVG, not a video, not WebGL.

Higher-resolution copies exist at `heart.png` (408 KB) and `heart-render.png` (1.1 MB) but are not used in the build.

### How it is loaded

1. **Build time**: `build.py` reads `heart-q.png`, base64-encodes it, and substitutes the `{{HEART}}` placeholder.
2. **Vite mode**: The placeholder is replaced with `/assets/heart-q.png` so Vite serves it directly.
3. The `<img>` tag at line 78 of `10_body_public.html`:
   ```html
   <img class="heart-img" id="heartImg" src="{{HEART}}"
        alt="Anatomical heart rendered in CardioCore teal palette">
   ```
4. It also appears on both auth pages (`20_body_auth.html`), decorating the right panel.

### How it is positioned

- Inside `.stage` — a centered grid container with `perspective:1200px` and `height:min(560px,76vw)`.
- The image itself is `.heart-img` — `width:62%; max-width:330px; z-index:2`, centered via the grid.

### How it is animated

1. **Pulse rings** (`pulse-ring`): CSS `@keyframes beatring` — concentric expanding/fading rings.
2. **Float cards** (`float-card`): CSS `@keyframes float` — four floating metric cards bob vertically.
3. **Orbiting ring** (`orbit`): CSS `@keyframes spin` — dashed circle rotates at 44s period.
4. **Pointer-driven tilt**: `Shell.mountHero()` → `Motion.heroTilt()` — spring-driven 3D rotation following the cursor.
5. **Bloom and reflection**: `Shell.mountHero()` dynamically injects:
   - `.heart-bloom` — radial gradient glow, beating with `@keyframes bloombeat`
   - `.heart-floor` — elliptical shadow beneath
   - `.heart-refl` — vertically flipped copy with mask fade (reflection)
6. **Jitter**: `.heart-img.jitter` — `@keyframes jitter` — subtle shake on interaction.
7. **Drop shadow filter**: `filter:drop-shadow(0 26px 44px rgba(9,95,99,.26)) saturate(1.06)`.

### Styling

- Light theme: bright teal drop-shadow, saturated slightly.
- Dark theme: deeper shadow, reduced brightness via `filter`.

> **Verified**: The heart is a **static PNG image** with CSS/JS-driven visual effects. Zero 3D models, WebGL contexts, or video elements.

---

## 6. Potential Causes of Slow Loading and Visual Lag

> **Note**: These are hypotheses from source inspection. No Lighthouse or performance trace has been run.

### A. Monolithic HTML payload

- `index.html` is **298 KB** (Vite mode) or **938 KB** (cardiocore.html with data URIs).
- All screens (~2600+ lines of HTML) are in the DOM simultaneously, toggled with `display:none`.

### B. All JavaScript loads eagerly

- `main.js` imports all 10 modules unconditionally.
- Vite builds to a **single 189 KB JS bundle** — no code splitting.
- PDF writer (41 KB source), booking, emergency, messaging, simulation load for the landing page.

### C. Continuous animations on hero

- 2 pulse rings (1.6s cycle, `will-change:transform`)
- 1 orbiting ring (44s spin, `will-change:transform`)
- 4 floating cards (6s float, `will-change:transform`)
- 1 heart bloom (1.6s, `will-change:opacity,transform`)
- 3 blurred blobs (`filter:blur(70px)`, `opacity:.55`, `will-change:transform`)
- Spring physics rAF loop runs continuously for cursor tracking

### D. GPU-expensive blurred blobs

- Three `.blob` elements use `filter:blur(70px)` — large painted areas requiring GPU compositing.
- Existing mitigations on mobile: blur reduced to `46px`, opacity to `.4`, pulse rings hidden.

### E. Canvas redraws

- `drawAll()` redraws every visible canvas on every screen switch.
- ECG strips animate continuously on hero, auth pages, and live monitor.
- DPR capped at 1.6 (existing mitigation).

### F. Font loading

- Two Google Font families loaded synchronously — potential render-blocking.
- Both use `display=swap` (mitigates FOIT but may cause CLS).

---

## 7. Existing Frontend Functionality and Observed Status

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page with heart figure | ✅ Working | Hero, features, doctors, stats, FAQ, footer |
| About page | ✅ Working | Editorial layout with photographs |
| Dark/light theme | ✅ Working | Complete CSS variable swap |
| Patient sign-in (password) | ✅ Working | Demo credentials pre-filled |
| Patient sign-in (OTP) | ✅ Working | Demo code 481200 |
| Patient sign-in (gesture) | ✅ Working | Spring-physics drag-and-hold unlock |
| Doctor sign-in | ✅ Working | Registration/council/institution form |
| Patient onboarding (8 steps) | ✅ Working | Profile, conditions, meds, consent, family |
| Patient dashboard (18 views) | ✅ Working | Home, health, ECG, live, twin, etc. |
| Doctor dashboard (8 views) | ✅ Working | Roster, appointments, patients, ECG review |
| ECG recording with P-QRS-T synthesis | ✅ Working | 30-second recording, quality scoring |
| Canvas trend charts | ✅ Working | Range switching (24H/7D/30D/3M/1Y) |
| Interactive chart tooltips + zoom | ✅ Working | Crosshair, drag-scrub, pin, zoom |
| SI/conventional unit toggle | ✅ Working | °C↔°F, mmol/L↔mg/dL |
| Messaging (patient ↔ clinician) | ✅ Working | Shared threads, typing indicators |
| Appointment booking (week calendar) | ✅ Working | Deterministic slots, ICS export |
| Emergency response flow | ✅ Working | 7-step progression, Meet link |
| PDF export | ✅ Working | Hand-written PDF with ECG strip |
| CSV + FHIR export | ✅ Working | Clinical data formats |
| System diagnostics | ✅ Working | Health check suite |
| Command palette (⌘K) | ✅ Working | Fuzzy search |
| Print report | ✅ Working | CSS print styles |
| Responsive layout (mobile) | ✅ Working | Sidebar slides, grids collapse |
| prefers-reduced-motion | ✅ Working | Animations disabled |
| Keyboard shortcuts | ✅ Working | Documented in shortcut sheet |
| localStorage persistence | ✅ Working | Survives page reload |

> All functionality is **client-side only**. Login always succeeds because there is no backend.

---

## 8. API Integrations and Backend Dependencies

**There are zero API calls in the entire codebase.**

No `fetch()`, `XMLHttpRequest`, `axios`, or HTTP client. No `.env` files. No WebSocket/SSE.

All data is hardcoded in JS (`DEFAULTS` in `70_extras.js`), persisted in `localStorage`, or synthesised at runtime (ECG waveforms, seeded random chart data).

### Backend contracts to establish (when FastAPI becomes available)

1. Authentication (patient + doctor)
2. Patient records (vitals, conditions, medications, labs)
3. Real-time telemetry (wearable streaming)
4. Digital Twin (baseline computation)
5. Appointment booking (slot management)
6. Messaging (persistent threads)
7. Emergency response (hospital notification)
8. Doctor roster (verified directory)
9. File management (report storage)
10. Consent ledger (access logging)

---

## 9. Dependencies Analysis

| Dependency | Type | Verdict |
|-----------|------|---------|
| `vite ^6.0.0` | devDependency | ✅ Replace with Next.js |

The project has **zero runtime dependencies**. Everything is hand-written. The Python `build.py` becomes unnecessary after migration.

---

## 10. Features That Must Be Preserved

### Critical (identity-defining)

1. Heart figure with bloom, reflection, pulse rings, pointer-tilt
2. Teal/clinical design identity — palette, typography, glassmorphic nav
3. Light/dark theme system
4. ECG waveform synthesis and strip animation

### Functional (patient)

5–16: Sign-in (3 modes), dashboard (18 views), vitals with ranges, Digital Twin, booking, messaging, emergency flow, PDF/CSV/FHIR export, onboarding, unit toggle, symptom logging, lipid tracking

### Functional (clinician)

17–22: Sign-in, triage roster, ECG review, patient list, analytics, schedule

### System-level

23–28: Command palette, keyboard shortcuts, responsive mobile, reduced-motion, print styles, accessibility

---

## 11. Proposed Target Architecture

| Concern | Current | Target |
|---------|---------|--------|
| Framework | None | **Next.js 14+ App Router** |
| Language | JavaScript | **TypeScript** |
| Styling | Inline `<style>` | **Tailwind CSS** |
| Components | Raw HTML | **React + shadcn/ui** |
| Animations | CSS + custom spring | **CSS + Motion for React** |
| Charts | Custom Canvas 2D | **Preserve** (React wrappers) |
| Heart | PNG + CSS effects | **Preserve as-is** |
| State | localStorage | **React state + localStorage** |
| Routing | display:none toggle | **Next.js App Router** |
| API | None | **Typed fetch client** (prepared) |
| Testing | None | **TypeScript + Vitest** |

### Strategy: Incremental clean rebuild

A clean rebuild is recommended because the existing architecture (concatenated flat files, no component tree, single `<style>` block) cannot be incrementally migrated. The rebuild reuses all original assets, design tokens, chart renderers, ECG algorithms, and demo data.

---

## 12. Risks, Unknowns, and Questions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gesture unlock is complex spring physics | Medium | Port `Motion` module as standalone utility |
| Custom PDF writer is 41 KB | Low | Keep as-is — works, no deps |
| Dark theme has ~250 lines of CSS overrides | Medium | Systematic Tailwind dark: conversion |
| All demo data embedded | Low | Extract to fixtures module |

### Questions requiring your decision

1. **Tailwind version**: Should I use **v4** (latest) or **v3** (more mature)?
2. **Single-file output**: Should the rebuild continue producing `cardiocore.html` for offline demos?
3. **Chart library**: Keep custom Canvas renderer (with React wrappers) or replace with Recharts/Nivo?
4. **Gesture unlock**: Preserve exactly, simplify, or defer to a later phase?
5. **The `workspace-*` directory**: Can it be safely ignored?

---

## 13. Proposed Files for Phase 1 (Foundation)

### Scope

Establish Next.js project, design tokens, shared layout, verify heart asset renders.

### Files to create

```
next.config.ts
tailwind.config.ts
tsconfig.json
postcss.config.mjs
app/layout.tsx
app/page.tsx                    (temporary: hero with heart)
app/globals.css                 (design tokens, base styles)
public/assets/heart-q.png       (copied from existing)
public/assets/about-hero-web.jpg
public/assets/about-story-*.jpg
lib/design-tokens.ts            (color/spacing constants)
components/ui/                  (shadcn/ui init)
```

### What Phase 1 will NOT do

- Build any complete page
- Implement routing beyond the root
- Install charting or animation libraries
- Connect to any backend
- Modify the existing website

---

## 14. Summary

CardioCore is a **complete, self-contained frontend prototype** with 26+ screens, custom chart/ECG renderers, a spring-physics engine, PDF export, and a dual-theme design system — all in zero-dependency vanilla JavaScript.

The heart figure is a **59 KB PNG** with CSS/JS visual effects (pulse rings, bloom, reflection, pointer-tilt). It is not 3D.

There are **zero backend API calls** in the codebase. All data is hardcoded.

Main performance concerns: monolithic 298 KB HTML, no code splitting (189 KB single JS bundle), 10+ simultaneous animations on hero, GPU-expensive blur effects, and continuous rAF loops. All addressable without compromising visual identity.

**The existing website has not been modified. This concludes Phase 0.**

---

> **Awaiting your explicit approval to proceed to Phase 1.**
