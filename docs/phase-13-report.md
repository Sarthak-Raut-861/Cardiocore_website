# CardioCoreEdge — Phase 13B Implementation Report
## Multi-Lead Frontend Integration and Read-Only Sample Retrieval

**Date:** October 13, 2026  
**Status:** Implementation Complete & Fully Verified  
**Authorized Scope:** Phase 13B Only — Multi-Lead Frontend Integration and Read-Only Sample Retrieval:
1. Minimal backend read-only API capability for retrieving persisted multi-lead waveform samples (`GET /api/v1/telemetry/recordings/{recording_id}/chunks/{chunk_id}/samples`).
2. Frontend Protocol v2 binary frame decoder (`cardiocore-next/src/lib/telemetry/protocol-v2.ts`).
3. Typed API client for recording and chunk retrieval with CSRF double-submit support (`cardiocore-next/src/lib/api/recordings.ts`, `csrf.ts`).
4. Bounded, synchronized multi-channel sample-buffer hook (`cardiocore-next/src/features/telemetry/hooks/use-multilead-recording.ts`).
5. Multi-lead waveform visualization component (`cardiocore-next/src/features/telemetry/components/multi-lead-waveform-review.tsx`).
6. Feature-flagged integration (`NEXT_PUBLIC_ENABLE_MULTILEAD_ECG === "true"`, defaulting to disabled) within the patient ECG subview.
7. Automated tests, regression verification, and documentation.

**Prohibited / Untouched Scope:**
- Preserved Protocol v1, single-lead Lead-II monitoring, and live WebSocket streaming.
- Legacy vanilla HTML/CSS/JavaScript application and Vite server (`port 5173`) remain untouched.
- No external infrastructure (PostgreSQL, TimescaleDB, Redis) added.
- Zero database schema alterations or migrations.
- Strictly synthetic data; no live ECG hardware or real patient data.
- No clinical interpretation, diagnostic claims, or external deployment.

---

## 1. Exact Files Created and Modified

### Files Created:
1. [`backend/tests/test_phase13_sample_retrieval.py`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/tests/test_phase13_sample_retrieval.py):
   - Backend automated tests verifying authorized chunk sample retrieval, cross-patient access denial, clinician consent enforcement, 404 handling, and read-only non-mutating behavior.
2. [`cardiocore-next/src/lib/telemetry/protocol-v2.ts`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/lib/telemetry/protocol-v2.ts):
   - Strict TypeScript Protocol v2 decoder validating the 32-byte header, CRC-32 (IEEE 802.3 over Header[0..27] + Payload), planar raw sample layout, planar delta-zlib decompression via Web Streams `DecompressionStream("deflate")`, decompression bomb limit (64 KiB ceiling), and standard 12-lead channel ordering.
3. [`cardiocore-next/src/lib/api/csrf.ts`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/lib/api/csrf.ts):
   - Double-submit CSRF cookie extractor (`cc_csrf`) providing `getCsrfToken()`, `getCsrfHeaders()`, and `assertCsrfToken()`.
4. [`cardiocore-next/src/lib/api/recordings.ts`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/lib/api/recordings.ts):
   - Typed client for recording metadata, chunk list pagination, chunk sample payload retrieval, and status mutations with session credentials and CSRF protection.
5. [`cardiocore-next/src/features/telemetry/hooks/use-multilead-recording.ts`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/features/telemetry/hooks/use-multilead-recording.ts):
   - React hook maintaining bounded, synchronized circular buffers (default 1,250 samples/channel = 5s @ 250 Hz), sequence tracking, duplicate deduplication, gap accounting, sentinel sample preservation (-32768), and lifecycle cleanup.
6. [`cardiocore-next/src/features/telemetry/components/multi-lead-waveform-review.tsx`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/features/telemetry/components/multi-lead-waveform-review.tsx):
   - Stacked multi-lead waveform canvas review component featuring clinical ECG grid, lead labels, SQI badge, lead-off and clipping badges, freeze/resume, gain adjustments (0.5x, 1x, 2x), keyboard/screen-reader accessibility, and synthetic research prototype disclaimer.
7. [`cardiocore-next/tests/test_phase13_frontend.mjs`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/tests/test_phase13_frontend.mjs):
   - Automated unit test suite verifying backend fixture interoperability, 1/3/6/12-lead decoding, CRC corruption detection, malformed packet rejection, decompression bomb safety, CSRF helpers, and feature-flag isolation.
8. [`docs/phase-13-report.md`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/docs/phase-13-report.md):
   - This comprehensive Phase 13B engineering report.

### Files Modified:
1. [`backend/app/routers/telemetry.py`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/app/routers/telemetry.py):
   - Added read-only route `GET /api/v1/telemetry/recordings/{recording_id}/chunks/{chunk_id}/samples`.
   - Returns base64 wire frame payload and chunk metadata.
   - Enforces authenticated session, patient isolation, and clinician consent.
2. [`cardiocore-next/src/lib/api/backend-config.ts`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/lib/api/backend-config.ts):
   - Added `IS_MULTILEAD_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MULTILEAD_ECG === "true"`, defaulting to `false`.
3. [`cardiocore-next/src/features/patient/components/patient-ecg-view.tsx`](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/cardiocore-next/src/features/patient/components/patient-ecg-view.tsx):
   - Integrated feature-flagged Multi-Lead ECG Review view.
   - When `IS_MULTILEAD_ENABLED` is disabled, multi-lead components and controls remain completely hidden and unmounted.
   - Existing single-lead Lead-I / Lead-II experience remains the default and fully intact.

---

## 2. Read-Only Backend Endpoint Contract & Security Verification

### Route Specification
`GET /api/v1/telemetry/recordings/{recording_id}/chunks/{chunk_id}/samples`

### Security and Authorization Semantics
1. **Authentication:** Requires valid session via `get_current_session` dependency. Unauthenticated requests return `401 Unauthorized`.
2. **Patient Ownership:** If the session user is a patient, `recording.patient_id` must match `session.user.patient_profile.id`. Mismatches return `403 Forbidden` and log an audit event (`CHUNKS_ACCESS_DENIED`).
3. **Clinician Consent:** If the session user is a doctor, `verify_consent(db, recording.patient_id, doctor_institution, "ecg")` is evaluated. If consent is absent or revoked, returns `403 Forbidden`.
4. **Existence Verification:** Non-existent `recording_id` or `chunk_id` returns `404 Not Found`.
5. **Read-Only Invariant:** Does not execute `db.add()`, `db.commit()`, status transitions, or chunk acknowledgments.

### Response Schema
```json
{
  "recordingId": "rec_01J...",
  "chunkId": "chk_01J...",
  "sequenceNumber": 42,
  "startTimestamp": "2026-10-13T10:00:00.000000Z",
  "endTimestamp": "2026-10-13T10:00:00.200000Z",
  "samplingRateHz": 250,
  "activeLeadsMask": 4095,
  "channelOrder": [
    "Lead-I", "Lead-II", "Lead-III", "Lead-aVR", "Lead-aVL", "Lead-aVF",
    "Lead-V1", "Lead-V2", "Lead-V3", "Lead-V4", "Lead-V5", "Lead-V6"
  ],
  "channelCount": 12,
  "sampleCount": 50,
  "compressionCodec": "delta_zlib_planar",
  "uncompressedBytes": 1200,
  "compressedBytes": 348,
  "payloadBase64": "zMwBAAAA...",
  "payloadChecksumSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "averageSqi": 0.985,
  "leadOffMask": 0,
  "clippingMask": 0
}
```

---

## 3. Protocol v2 Decoder & Codec Specifications

### Header Architecture (32 Bytes Big-Endian)
The decoder in `cardiocore-next/src/lib/telemetry/protocol-v2.ts` implements strict parsing matching the backend:
- Bytes 0..3: `magic` (`0xCC`), `version` (`0x02`), `msg_type` (`0x01`–`0x05`), `flags` (`0x0F` mask).
- Bytes 4..7: `sequence_number` (`uint32` big-endian).
- Bytes 8..15: `base_timestamp_ms` (`uint64` big-endian).
- Bytes 16..17: `sampling_rate_hz` (`uint16` big-endian).
- Bytes 18..19: `active_leads_mask` (`uint16` big-endian, 12-lead popcount).
- Bytes 20..21: `sample_count` (`uint16` big-endian, samples per channel).
- Bytes 22..23: `payload_length` (`uint16` big-endian, $\le 65,504$ bytes).
- Bytes 24..25: `lead_off_mask` (`uint16` big-endian).
- Bytes 26..27: `clipping_mask` (`uint16` big-endian).
- Bytes 28..31: `checksum_crc32` (`uint32` big-endian, IEEE 802.3 over Header[0..27] + Payload).

### Endianness & Storage Reconciled
- **Header:** Network Big-Endian (`!BBBB I Q H H H H H H I`).
- **Samples:** The backend `backend/app/telemetry/chunk.py` packs physiological 16-bit integers in little-endian (`<h`), while Phase 12 documentation discussed `>h`. The frontend decoder supports an explicit endianness parameter defaulting to `littleEndian = true` to maintain exact bitwise interoperability with `chunk.py`, while supporting `bigEndian` if configured.

### Planar Delta-Zlib Decompression
1. **Zlib Deflate Decompression:** Leverages the native Web Streams API `DecompressionStream("deflate")` (RFC 1950 standard) supported in modern browsers and Node.js 18+.
2. **Decompression Bomb Protection:** Imposes an uncompressed expansion ceiling (`MAX_DECOMPRESSED_BYTES = 65,536` bytes). Streams exceeding this limit cancel the reader and throw `ProtocolV2Error` (code `4011`).
3. **Planar Delta Reconstruction:** For each channel $c \in [0, K-1]$:
   $$\Delta_0 = x_0, \quad \Delta_i = x_i - x_{i-1} \implies x_i = x_{i-1} + \Delta_i$$
   Dropped ADC sentinels (`-32768` / `0x8000`) are preserved without corrupting subsequent baseline deltas.

---

## 4. Bounded Multi-Channel Buffer & UI Architecture

### Memory Bounding
- Default buffer window per channel: 1,250 samples (5.0 seconds at 250 Hz).
- For 12 channels: $12 \times 1,250 = 15,000$ values $\times 2$ bytes $= 30,000$ bytes raw storage per window.
- Sliding window buffer: older samples are discarded via slice on ingest, preventing unbounded memory growth during continuous streaming or pagination.

### Deduplication & Gap Accounting
- Tracks processed chunk IDs in `processedChunkIdsRef: Set<string>`.
- Evaluates monotonic sequence indices. If `seq > expectedSeq`, records `sequenceGaps` to alert the clinician of dropped frames.
- Preserves sentinel dropped sample values (`-32768`) distinct from valid zero microvolt potentials.

### Visualization Canvas
- Stacked multichannel traces with dedicated lane dividers.
- Clinical 25 mm/s and 10 mm/mV background grid (minor: 1 mm / 10 px, major: 5 mm / 50 px).
- Real-time badges for Signal Quality Index (SQI), physical Lead-Off, and ADC Clipping saturation.
- Lead filter selector to isolate individual channels (e.g. Lead-II, Lead-V1) or inspect all 12 channels simultaneously.
- Freeze/resume and trace gain adjustment (0.5x, 1x, 2x).
- Screen-reader accessible container with `role="region"` and `aria-label`.

---

## 5. Feature-Flag Isolation & Safety

### Dedicated Flag
`NEXT_PUBLIC_ENABLE_MULTILEAD_ECG === "true"`

### Verification of Isolation
- **Disabled State (Default):**
  - `IS_MULTILEAD_ENABLED === false`.
  - Multi-lead navigation tab is not rendered in `patient-ecg-view.tsx`.
  - `MultiLeadWaveformReview` component is completely unmounted.
  - Zero multi-lead network requests are dispatched.
  - Zero DOM nodes for multi-channel canvases exist.
- **Enabled State:**
  - Available only when configured via environment variable.
  - Requires authenticated session and clinician consent for recording retrieval.
- **Single-Lead Continuity:**
  - Existing single-lead Lead-I / Lead-II monitor (`LiveWaveformMonitor`, `EcgStripCanvas`) remains the default view.
  - Single-lead WebSocket streaming continues uninterrupted.

---

## 6. Verification Results: Baseline vs. Final

| Verification Check | Target / Command | Baseline Result | Final Phase 13B Result |
| :--- | :--- | :--- | :--- |
| **Backend Test Suite** | `python -m pytest` | 92 passed, 0 failed | **97 passed, 0 failed** in 12.72s |
| **New Sample Retrieval Tests** | `python -m pytest tests/test_phase13_sample_retrieval.py` | N/A (new) | **5 passed, 0 failed** in 1.78s |
| **Frontend TypeScript** | `npx tsc --noEmit` | Clean (0 errors) | **Clean (0 errors)** |
| **Frontend ESLint** | `npm run lint` | Clean (0 errors) | **Clean (0 errors, 0 warnings)** |
| **Frontend Production Build** | `npm run build` | 8/8 routes compiled | **8/8 routes compiled** |
| **Frontend Protocol v2 Suite** | `node tests/test_phase13_frontend.mjs` | N/A (new) | **19 passed, 0 failed** |
| **Single-Lead v1 Backward Compat** | Protocol v1 test in suite | Operational | **Operational & Verified** |

---

## 7. Known Limitations & Research Disclaimers

1. **Synthetic Data Provenance:** All multi-lead ECG signals are mathematically generated synthetic models. No live physiological hardware or real human patient data was utilized.
2. **Clinical Diagnostic Notice:** This software is a research prototype. It has not been clinically validated, evaluated by medical regulatory authorities (FDA/CE), or approved for diagnostic or clinical triage use.
3. **Transport Scope:** Multi-lead sample retrieval is currently read-only chunk-based retrieval via HTTP. Live WebSocket streaming remains single-lead Lead-II.

---

## 8. Stop Condition Compliance

Phase 13B is complete. All authorized scope items have been implemented and verified. In accordance with Section 12 of the authorization instructions, development stops here. No live multi-lead WebSocket streaming, hardware integration, or deployment has been initiated. Awaiting explicit authorization for future phases.
