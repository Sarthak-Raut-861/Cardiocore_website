# CardioCore — website + patient app + clinician portal

A single-file, dependency-free website built from the **CardioCore Mobile UI/UX System** PDF
you uploaded, extended into three connected experiences and restyled in the
**light blue / green / white** aesthetic you asked for, with a real anatomical heart.

**Open `cardiocore.html`** — double-click it, or drag it into any browser. No server,
no build step, no internet required at runtime.

---

## What's inside

### 1. Landing page (`#site`) and About (`#about`)
- Hero with a **real anatomical heart render** (generated for this project, background
  removed so it sits on the light palette), floating live-metric cards, an animated ECG
  strip, orbiting signal badges, and pointer-tilt + beat-synced jiggle.
- 4-step clinical pathway, care network directory, stats band, trust & consent ledger, FAQ
  and footer — the two long explainer sections now live on the **About** page instead.
- **About** (`#about`): photographic hero, the four benefits, four stories-of-care chapters,
  a pull quote, eleven "we monitor" chips and the closing CTA.
- Safety copy carried straight from your design system: *“Monitoring support — not a
  diagnostic device”*, *“CardioCore does not diagnose conditions…”*.

### 2. Patient experience
- **Sign-in** (`#login-patient`): **gesture unlock** (drag the heart into the ring and hold),
  password, or one-time-code (demo code `481200` — tap the boxes to autofill),
  "continue with demo profile" for one-click entry.
- **App** (`#app-patient`) with 18 screens, including the **live device bench** and
  **Day in review**: Home, Health & trends, ECG lab, Digital Twin,
  Alert centre, Appointments, Medications, Health record, Profile.
- Live 30-second ECG recording with a real P-QRS-T waveform synthesiser, beat counter,
  signal-quality scoring, and a share sheet at the end.
- Trend charts (resting HR, HRV, SpO₂, temperature) that **redraw when you switch the
  24H / 7D / 30D / 3M / 1Y range tabs**.
- Working flows: book an appointment → confirmation card, consent-scoped data sharing,
  the Level-3 urgent assessment sheet, emergency-action sheet, and a video waiting room.
- Digital Twin screen with state ring, contribution weights, recalibration timeline and
  the explicit criteria that would raise an urgent alert.

### 3. Clinician portal
- **Sign-in** (`#login-doctor`): registration number, medical council, institution, 2FA.
- **App** (`#app-doctor`) with 8 screens: Triage roster, Appointments, Patients, ECG review,
  Messages, Analytics, Availability, Profile & credentials.
- Triage roster ranked by validated alert level; click any row for the full consented
  record, contributing measurements and ECG strip; save interpretation or message the patient.
- ECG review workspace with caliper/annotate/second-opinion actions and an
  interpretation note that is explicitly timestamped and shown to the patient.
- Access-audit language throughout ("Every record access is logged and visible to the patient").

---

## Phase 4 — About page, SI units, live messaging, real downloads

### The landing page got shorter, and the long version moved to `/about`

The landing page was carrying two deep sections (the "digital twin" explainer and the
platform architecture block) that nobody reads on the way to signing in. Both were cut —
`src/10_body_public.html` went from 27 000 to 20 700 bytes and the page now ends in under
7 000 px of scroll — and rebuilt on a dedicated **About** screen (`CC.go('about')`,
`src/12_body_about.html`), modelled on the editorial structure of `generalmedicine.co/overview`:

| Section | What's in it |
| --- | --- |
| Hero | Full-bleed photograph, dark glass kicker, headline, one-line promise, both CTAs |
| Statement | Three-line summary with four numbers underneath (7 days, 250 hr, <60 s, 3 levels) |
| The idea | "Any rhythm. Any day. Anywhere you are." + three tick bullets, paired with a lifestyle photo |
| Four benefits | Numbered cards, 01–04, one idea each |
| What a caught change looks like | Photo + four numbered chapters ("01 / 04") — feel → gates → someone looks → continued, not concluded |
| Pull quote | "It didn't tell me I was dying. It told me my resting rate had drifted for two days — and that was the conversation worth having." |
| We monitor | Eleven condition chips, including "and more over time" |
| Safety + CTA | What CardioCore never claims, then both sign-in paths |

Three photographs are embedded as data URIs at build time (`{{ABOUT_HERO}}`,
`{{ABOUT_STORY_1}}`, `{{ABOUT_STORY_2}}`), re-encoded to 1080/540 px at q68 so the single
file grows by ~160 KB rather than ~600 KB.

### "ISO 27001 aligned" is gone

The badge was replaced with **Data-residency ready** everywhere it appeared, and the About
page's safety card states plainly that CardioCore is monitoring support, not a diagnostic
device — no certification claims at all.

### SI units, switchable both ways

A new `Units` layer (`src/81_charts.js`) owns every number that carries a dimension.
Both topbars gained an **SI / Conventional** switch:

| Measure | SI | Conventional |
| --- | --- | --- |
| Heart rate | `68 min⁻¹` | `68 BPM` |
| Heart-rate variability | `48 ms` | `48 ms` |
| SpO₂ | `98 %` | `98 %` |
| Skin temperature | `36.6 °C` | `97.9 °F` |
| LDL cholesterol | `2.90 mmol/L` | `112 mg/dL` |

The rule that makes the switch honest: the **first** paint stores the raw measurement in
`dataset.raw`, and every later paint converts from that raw value, never from already
rendered text. Switching SI → conventional → SI is lossless (`36.6 → 97.9 → 36.6`), verified
as a round-trip in the acceptance run. Charts, hover readouts, pinned markers and the lipid
target copy (`SI target < 5.17 mmol/L`) all follow the active system. The demo bench writes
through `Units.write()`, which stamps the raw value on the tagged wrapper so a scenario that
drives heart rate to 138 keeps showing 138 after a unit switch.

### Charts that answer back

Every canvas chart is now three layers: an **envelope underlay** (the 7-day range band), the
series itself with an EWMA trend line, and a transparent **interaction overlay**. On top of
that:

- **Hover** — a crosshair and a live readout in the active units (`NOW | 70 min⁻¹`), holding
  until the draw-in animation has settled.
- **Click** — pins a reading (up to four), so you can compare two moments without a screenshot.
- **Shift-drag** — brushes a window and zooms into it; **scroll wheel** zooms around the
  cursor; **double-click** resets. A `.zoombar` chip appears whenever a chart is zoomed and
  offers Reset.
- **Every view change** re-runs the spring draw-in, so charts are never caught mid-animation.

### Messages that actually travel

`src/83_messages.js` replaced the static message mock with a real store shared by both
portals. Seeded threads, a composer, quick replies, typing indicator, read ticks, thread
switching, attachments, and unread badges on the nav, the topbar and the thread list.

The part that matters: it is **one store, two views**. A message the patient sends appears in
their bubble instantly, shows "typing…", and gets a clinician reply ~3.6 s later; the
clinician's portal shows the same text in `#docMsgs` with `1 unread` on the badge; anything
the clinician types mirrors back into the patient's thread. Both directions are asserted in
`dev/qa4.py`, not just described.

### Reports download for real

`Files.download()` used to fall through to a toast. It now fires a genuine browser save: a
blob, an `<a download>` click, and a deliberately late `URL.revokeObjectURL` (revoking early
cancels the save). Both the emergency PDF and the export modal produce real `download` events
in the acceptance run, for all five export kinds. Where the browser supports it, the export
modal also offers **Save as…** (File System Access API, with a graceful fallback).

When the page is embedded in a frame that blocks saves — as this workspace's preview does —
`Files.download()` detects it and opens the document in the in-app viewer instead, with a
toast explaining exactly why and how to get the file (Print / Save as PDF, or open
`cardiocore.html` in a browser tab). The viewer renders tables, the ECG trace, and a print
stylesheet. Nothing silently pretends to have saved.

### Dark-mode hardening

A dark-mode audit (`dev/qa_dark.py`) walks 25 surfaces — the site, the About page, both
sign-ins, onboarding, all 11 patient views, all 4 clinician views and 7 modals/overlays —
and reports every text run under a 3:1 contrast ratio against its computed background.

The root cause of most findings was subtle: Chrome resolves an unstyled `<button>` background
to `buttonface`, which is `rgb(107,107,107)` in a dark colour scheme, so nav items rendered
grey-on-dark. One reset (`[data-theme="dark"] button{background-color:transparent}` plus
`button.btn{background:var(--bgc)}`) fixed the class of bugs rather than the instances;
chips, alerts, slot pills, bubbles, inputs, toasts and viewer pages got explicit dark tokens.
The audit now reports **0 low-contrast findings**.

### Phase-4 QA

```
python3 dev/qa4.py              # 29 passed · 0 failed   (About, units, charts, messaging, downloads)
python3 dev/qa_dark.py          # low-contrast findings: 0 across 25 surfaces
python3 dev/qa_overflow_all.py   # mobile / tablet / desktop: ALL CLEAR, 0 js errors
python3 dev/qa3p.py             # 50 passed · 0 failed   (phase-3 suite re-run on this build)
python3 dev/regression.py       # 39 steps · 0 failures · 0 js errors
python3 dev/qa2.py              # ERRORS: []
python3 dev/shots4.py           # dev/shots/p4-*.png — About light/dark at 390/768/1440, messages
```

Two real bugs were caught by that sweep and fixed rather than papered over: the simulator's
bench values were being overwritten by a stale first paint (fixed by `Units.write()`), and
the new messaging grid overflowed both portals at 390 px because grid and flex items were
allowed to keep their min-content width (fixed with `minmax(0,1fr)` plus `min-width:0`).

---

## Phase 3 — physical interaction + the emergency flow

### One press each, right on the landing page
Under the hero there is a **"Try it" strip** with four tiles. Each one takes you straight into
the interaction instead of explaining it:

| Tile | What one press does |
| --- | --- |
| **Gesture unlock** | Opens the patient sign-in and starts the hand-tracked unlock panel |
| **Emergency in one press** | Signs in, lands on Home and runs the whole emergency response |
| **Device bench** | Opens the live monitor with the simulator running |
| **Day in review** | Opens the 24-hour view of the day |

The tiles themselves are lit surfaces — they tilt toward the cursor, carry a moving sheen and
lean ~5 px when you hover them.

### Gesture unlock, built on paired springs (not pointer-follow)
`src/80_motion.js` is a small spring engine — every value is a mass-spring
(`x'' = (−k(x−t) − c·x') / m`) stepped on one shared `requestAnimationFrame` loop with 8 ms
sub-steps, so the whole page moves on one clock.

On the patient sign-in screen, **Unlock with the heart gesture** opens a tracking panel:

- **Two springs, one gesture.** A heavy heart orb (`k 120, m 2.6`) lags, overshoots and
  settles; a light palm (`k 420, m 1`) trails it. Momentum — not the pointer — keeps moving
  both, so flicks carry and stops wobble.
- **Weight is expressed visually.** Orb rotation comes from horizontal velocity, tilt from
  vertical velocity, scale from speed, the palm rotates slightly behind the orb, and a fading
  ribbon canvas draws the path it has travelled.
- **Light is coupled to the physics:** the contact shadow slides opposite the motion
  (`--sx/--sy`), the highlight leads it (`--lx`), and a glow charges as the ring fills.
- **Hold to unlock.** Bring the heart into the ring and hold — a still hand fills the ring in
  1.2 s, a drifting one still gets there at ~40% rate. On success the panel flips to
  "identity confirmed" and continues into the normal sign-in path.
- **Accessibility:** with `prefers-reduced-motion: reduce` the physics is skipped and the
  panel becomes click-to-unlock (or Enter/Space). Clinician sign-in has the same panel in a modal.

### Sprung transitions across the app
Entrances are sprung rather than eased, so nothing in the app stops dead: switching patient or
clinician views lifts the new view in on a spring (`y 16 → 0`, scale `0.992 → 1`) with its
cards staggering 32 ms apart, and every dialog arrives on its own spring (`y 20`, scale `0.975`).
Reduce motion and all of it disappears — content simply appears.

### Light, shadow and reflection, everywhere
- The landing hero gets a **bloom** that swells with systole, a **contact shadow** on the
  floor, and a **mirrored reflection** that tracks the pointer — the heart reads as an object
  standing in light rather than a pasted image.
- Every card is a **lit surface**: a per-card spring pair tilts it toward the pointer
  (±5.4° yaw / ±4.2° pitch) with a specular sheen that follows the cursor and a contact shadow
  that deepens on hover.
- Buttons, tabs, slots and nav items are **magnetic** — they lean ~5 px toward the cursor and
  spring home.
- The hero heart itself parallaxes and tilts with the pointer and beats subtly (7.5% swell),
  so it never fights the data cards in front of it.

### Emergency call — Meet link, shared report, download, all at once
The red emergency button (topbar, and from the urgent-review sheet) now runs the whole
response in one action and shows its work:

1. **Google Meet room created instantly** — a secure-room link exists in the first second,
   with Copy and Join actions, and it survives in a banner that stays above the app.
2. **Emergency report compiled** — vitals, the ECG strip, medications, labs and consent
   preferences, built by the from-scratch PDF writer in `src/82_files.js`.
3. **Report shared to the on-call cardiologist ASAP** — secure link + SMS, with a delivery
   timeline and a "who has it" panel (clinician, hospital emergency bay, next of kin).
4. **Downloadable report** — Download PDF (and Open in tab). The PDF is a real
   `%PDF-1.4` document with an embedded letterhead, a stroked teal ECG polyline, tables,
   a page footer and an xref table; ~21 KB, generated locally, no libraries.
5. Session state is auditable and reversible — **End session and revoke** closes the room
   and revokes the share, keeping the access log.

Emergency sharing never contacts anyone silently: it is one explicit press, and the "Call
emergency services" action stays a separate, clearly-labelled step.

### Live device bench (`Live monitor`)
A 12 Hz simulator drives the real app screens. Pick a scenario — resting, walking, asleep,
psychological stress, **arrhythmia episode**, recovery — and watch:

- HR / HRV / SpO₂ / temperature spring toward the scenario target with sensor jitter, each
  with its own sparkline, and an event log that explains what was measured and what was skipped.
- Signal-quality, motion, persistence and multi-signal **decision gates** evaluate live;
  the urgent card only appears when persistence (≥ 8 min) and signal agreement are both met —
  the same four gates the Digital Twin screen documents.
- "Drive the app" pushes the simulated state into Home, the Twin state index and the live ECG.

### Day in review (`Day in review`)
Twenty-four hours of heart rate with sleep and activity bands, a personal-baseline band,
excluded low-quality minutes, and event markers (walks, ECGs, insights, doses) that line up
with a timeline. Day navigation (‹ ›) rebuilds the whole day, and `Export day report`
prints/downloads it.

### Booking on a real week grid
Book an appointment now opens a **seven-day slot matrix** — free / booked / urgent-review /
closed, deterministic so it never flickers, today's column shortened to what is still
bookable, and Sunday closed (except today). Confirming a **video consult** generates its own
Google Meet room for that appointment, and "Download .ics" produces a real calendar file
with a two-hour reminder.

### Exports and diagnostics (`src/82_files.js`)
- Hand-written **PDF 1.4 writer** — four report specs: emergency, health record, day review,
  lipid history (letterhead, ECG block, tables, page numbers, xref).
- **CSV** for vitals, raw ECG, labs and symptoms; **FHIR R4** collection Bundle (Patient,
  Condition, Observation, Device) as JSON.
- **Export modal** with per-format preview, single download, open-in-tab, or download everything
  — plus a graceful toast when a sandboxed frame blocks blob downloads.
- **System checks**: eleven live diagnostics (storage round-trip, canvas/DPR, ECG synthesiser
  speed, a measured frame budget, pointer capability, fonts, network, consent ledger, PDF
  engine, baseline coverage) shown as a tick list and a summary, copyable as a report.
- **Keyboard shortcut sheet** (`?`) — 14 shortcuts including `G`-prefixed navigation,
  export, print, checks and medical ID.

### QA for this pass
`dev/qa3p.py` — **50 checks, 0 failures** — drives the gesture unlock through real pointer
physics, verifies the emergency flow end to end (Meet link in the first second, 7/7 actions,
a real `%PDF` payload, sharing, the banner), the week grid, all four report builders, CSV +
FHIR, the diagnostics, the shortcut sheet and the reduced-motion fallbacks.
`dev/qa_overflow_all.py` re-scans **every screen and every overlay** at 390 / 768 / 1440 px
for real horizontal scrolling (none). `dev/regression.py` still passes its 39 flows with
0 JS errors, and `dev/shots/p3-*.png` holds the screenshots.

---

## Phase 2 — dark mode, onboarding, persistence, palette

### Dark mode — the palette your PDF was drawn in
A sun/moon control sits in both app topbars. Everything re-themes: tokens, canvas
charts (grid, axes, halos, baseline bands), the ECG strips, the hero heart and the
blobs. The choice persists, and `prefers-color-scheme` is respected on first load.

### Full 8-step onboarding (the wizard from your PDF)
Triggered on patient sign-in (or from **Profile → Re-run onboarding**):
1. How CardioCore works — seven signals, one personal model
2. Personal information — with a live-calculating BMI and its reference tag
3. Medical history — condition picker, "diagnosed by a professional only" warning
4. Lipid profile — the five lab fields with reference ranges
5. Medications — add/remove, with the medication-aware baseline note
6. Family history — per-relative conditions and age at diagnosis
7. Emergency care preferences — contact, hospital, doctor, automation & consent toggles
8. Consent & privacy — what is shared, before anything is

Ends on the Home screen with a "Twin starts learning today — insights unlock after 14 days" toast.

### Real persistence (mock store, localStorage-backed)
Onboarding answers, personal details, conditions, medications, lab results (immutable —
appending a result recomputes the LDL/HDL trends), symptoms, bookings, doses taken,
notification read-state, theme and online status all survive a reload. A clinician panel
reads the same store, so **what you enter on the patient side appears on the doctor side**.

### Command palette — ⌘K (or `/`, or the search icon)
Searches across patient views, clinician views, the consented patient roster, the
cardiologist network and 12 actions ("Record a 30-second ECG", "Simulate going offline",
"Generate clinician handover", "Export health record as PDF"). Full keyboard control
(↑ ↓ ↵, Esc), highlighted matches, focus trapping, empty state.

### Six new patient screens
- **Notifications** — everything you were told, grouped by day, filtered by Health /
  Insights / Appointments / Device, with delivery rules per alert level
- **LDL cholesterol detail** — the drill-down from your PDF: result, status, reference
  bands, four-report trend against the clinician's target, export
- **Lipid profile** — four tiles with deltas, switchable LDL / HDL / Triglycerides / overlay
  chart, full results table, clinician targets
- **Symptom log** — timestamped severity entries, "near a signal deviation" correlation,
  share-entry consent flow, emergency warning copy
- **Device & sync** — battery ring, signal-quality breakdown, firmware, diagnostics, re-pair
- **Offline state** — your PDF's offline screen: stale badge, what still works, queued items

### Clinician additions
- **Handover & referral** — a printable summary per patient (state, why it was raised,
  clinical context, consent scope) routable to EP, on-call, or a patient copy
- **Cohort filtering** on the patients table (High risk / New consents / Adherence < 80% /
  Baseline building) with a live count
- **Print / PDF export** at three levels — health record, lipid history, clinical handover —
  with a real `@media print` stylesheet, letterhead, registration numbers and the
  monitoring-support disclaimer on every page

### Charts and polish
- Hover readouts on every trend chart (label + exact value, colour-coded per series)
- A shaded **personal-normal band** around your baseline on the trend charts
- Edge-clamped axis labels, multi-series line renderer with target lines
- Skip-to-content link, `aria-current` on the active nav item, labelled canvases,
  focus trapping in modals, Escape handling, `aria-live` toasts

---

## Design system mapping (from your PDF)

| Token in the PDF | Used as |
|---|---|
| bg/base, surface, elevated, border | `#F2FAF9`, `#FFFFFF`, `#FFFFFF`, `#D5EAE8` |
| teal/brand | `#0E9E9E` |
| cyan/data | `#12A6CF` |
| green/ok | `#12A06A` |
| violet/twin | `#7A6BF0` |
| amber/attn | `#D98314` |
| red/urgent | `#E0453F` |
| text/hi, text/muted | `#0A2B2F`, `#6E9A9E` |
| Sora / Manrope | display + body fonts, loaded from Google Fonts when online |
| Radius 10 · 16 · 20 · 28 | cards, inputs, sheets, panels |
| Status tokens | Stable · Attention · Urgent · Twin — as chips, left borders and alert levels |

Screens adapted from the PDF: onboarding promise, "How CardioCore works", live ECG,
Trends, lipid profile, medical history, medications, alert centre (levels 1–3), doctor
search, appointment confirmed, Level-3 urgent sheet, urgent workflow, emergency
preferences, notifications, offline state, and profile.

---

## Rebuilding

Sources are split for editing; `build.py` concatenates them and embeds the heart as a
data URI:

```
python3 build.py          # → cardiocore.html
```

```
src/00_head.html          design tokens + all CSS (light + dark themes)
src/10_body_public.html   landing page (short: hero → clinical → network → FAQ)
src/12_body_about.html    About page — the long-form story, photos, benefits, quote, CTA
src/20_body_auth.html     patient + clinician sign-in
src/26_body_onboard.html  8-step onboarding wizard
src/30_body_patient.html  patient application (10 views)
src/35_patient_extras.html  notifications, LDL detail, lipids, symptoms, device, offline
src/40_body_doctor.html   clinician portal (8 views)
src/45_doctor_extras.html handover & referral
src/50_modals.html        modal, toast, palette, offline banner, print hosts
src/60_core.js            router, canvas charts, ECG engine, sign-in, print
src/70_extras.js          store, theme, wizard, palette, tooltips, print, a11y
src/80_motion.js          spring engine, gesture unlock, magnets, lighting, hero rig
src/81_charts.js          Units layer (SI ↔ conventional), chart envelopes, zoom/pin/hover
src/83_messages.js        shared message store behind both portals
src/82_files.js           PDF writer, CSV/FHIR exports, export modal, diagnostics
src/84_sim.js             live device bench + day-in-review chart and timeline
src/86_emergency.js       one-press emergency response (Meet, report, share, download)
src/87_booking.js         seven-day slot matrix, .ics, per-consult video rooms
src/88_shell.js           mounts the hero light rig, unlock panels, banner, shortcuts
assets/heart-q.png        background-removed heart render (embedded at build)
assets/about-*.jpg        the three About photographs (embedded as data URIs at build)
cd dev/                   QA scripts (qa4, qa_dark, qa_overflow_all, qa3p, regression…) + screenshots
```

## Notes

- Everything is one 932 KB HTML file: inline CSS/JS and a data-URI heart. The only external
  request is the Google Fonts stylesheet — offline it falls back to system fonts and the
  layout still holds.
- Charts and ECG strips are drawn on `<canvas>`, so they stay crisp at any size.
- Respects `prefers-reduced-motion`, animates only what is on screen, and pauses canvas
  work when a view is hidden.
- Responsive down to 390 px: the app sidebars become slide-in drawers, tables scroll
  horizontally, and nothing overflows (verified at 390 / 768 / 1440 px on every screen and
  overlay). Decorative layers — blurred blobs, orbiting rings, the heart's reflection — are
  deliberately larger than the viewport and clipped, so the page never scrolls sideways.
- Physics, magnets, sheen and parallax all switch off together when the system asks for
  reduced motion; the gesture unlock becomes a click-to-unlock panel.
- The Google Meet links and the FHIR/PDF exports are generated locally: the links are valid
  Meet room *addresses* (a real room would be created through Google's API with a signed-in
  account), and no data leaves the browser.
- State is a mock store in `localStorage` (`cardiocore.v2`). Clear it, or run
  `localStorage.removeItem('cardiocore.v2')` in the console, to get the first-run wizard back.
- Demo data only — Aarav Menon and Dr Neha Raghavan are fictional. This is an interface
  prototype for demonstration and is **not** for clinical use.
