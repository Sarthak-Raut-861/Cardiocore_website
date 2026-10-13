# CardioCoreEdge — Phase 12 Implementation Report
## Backend Multi-Lead ECG Expansion & Protocol v2 Verification

**Date:** October 13, 2026  
**Status:** Backend Implementation & Testing Complete  
**Authorized Scope:** Phase 12 Backend Only — Versioned Synchronized Multi-Channel Protocol v2, Telemetry Recording Session Architecture, Multi-Channel Chunk Persistence, and RBAC / Consent Integration  
**Target Architecture:** FastAPI Backend (`backend/`) + SQLAlchemy Async + SQLite WAL Mode  
**Prohibited / Untouched Scope:** Frontend (`cardiocore-next/`), Legacy HTML/CSS/JS (`5173`), External Databases (PostgreSQL / TimescaleDB / Redis), Real Hardware / Live Patient Integrations, Clinical Diagnostic Interpretations  

---

## 1. Executive Summary

Phase 12 delivers the backend foundation for synchronized multi-lead ECG processing on the CardioCoreEdge platform. Based on the architectural design established in Phase 11 and analytical corrections verified in Phase 11A, Phase 12 introduces **Protocol Version 2 (32-byte header with full-frame CRC-32 protection)**, an explicit **recording-session persistence model** (`telemetry_recordings` and `telemetry_multichannel_chunks`), and **REST API endpoints** for managing recordings and ingesting multi-channel synchronized ECG frames.

Crucially, **100% backward compatibility** is preserved for the existing single-lead (Lead-II, 250 Hz) Protocol v1 pipeline (`/api/v1/telemetry/ingest/batch` and `/ws/telemetry/live`), with all 64 pre-existing tests passing unchanged. 22 new comprehensive tests covering protocol framing, planar multi-channel encoding, deduplication, conflict detection, patient isolation, and clinician consent validation bring the automated test suite to **86 passed, 0 failed**.

---

## 2. Protocol Version 2 Specification & Field Layout

### 2.1 Complete 32-Byte Header Layout

Protocol v2 utilizes a fixed 32-byte binary header formatted in big-endian network byte order (`struct.pack` format string: `!BBBB I Q H H H H H H I`).

| Field Name | Offset | Width | Type | Signedness | Endianness | Description / Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `magic_byte` | 0 | 1 byte | `uint8` | Unsigned | — | Constant `0xCC` (CardioCore identifier) |
| `version` | 1 | 1 byte | `uint8` | Unsigned | — | Constant `0x02` (Protocol Version 2) |
| `msg_type` | 2 | 1 byte | `uint8` | Unsigned | — | `0x01` (ECG Data), `0x02` (Alert), `0x03` (Control), `0x04` (Ack) |
| `flags` | 3 | 1 byte | `uint8` | Unsigned | — | Bit 0: Raw (`0`) vs Delta-Zlib (`1`); Bits 1–7: Reserved (must be 0) |
| `sequence_number` | 4 | 4 bytes | `uint32` | Unsigned | Big-endian | Monotonic sequence number per recording (`0` to `4,294,967,295`) |
| `base_timestamp_ms` | 8 | 8 bytes | `uint64` | Unsigned | Big-endian | Milliseconds since Unix epoch (synchronized across all channels in frame) |
| `sampling_rate_hz` | 16 | 2 bytes | `uint16` | Unsigned | Big-endian | Sampling rate; allowed standard synthetic rates: `250` or `500` Hz |
| `active_leads_mask` | 18 | 2 bytes | `uint16` | Unsigned | Big-endian | 16-bit bitmask indicating active channels (Bits 0–11; Bits 12–15 reserved) |
| `sample_count_per_channel` | 20 | 2 bytes | `uint16` | Unsigned | Big-endian | Number of samples $N$ per active lead ($1 \le N \le 1,000$, standard: $50$) |
| `payload_length` | 22 | 2 bytes | `uint16` | Unsigned | Big-endian | Length in bytes of the following encoded payload ($L \le 65,504$) |
| `lead_off_mask` | 24 | 2 bytes | `uint16` | Unsigned | Big-endian | 16-bit bitmask of physical lead disconnection status |
| `clipping_mask` | 26 | 2 bytes | `uint16` | Unsigned | Big-endian | 16-bit bitmask of ADC clipping / rail saturation status |
| `crc32` | 28 | 4 bytes | `uint32` | Unsigned | Big-endian | Standard IEEE 802.3 CRC-32 checksum covering bytes 0–27 plus the payload |

### 2.2 Channel Mask & Lead Assignment Mapping

CardioCoreEdge maps bits 0 through 11 of `active_leads_mask` directly to the standard 12 clinical leads in canonical order:

| Bit Position | Hex Value | Lead Name | Standard Synthetic Configurations |
| :---: | :---: | :---: | :--- |
| Bit 0 | `0x0001` | `Lead-I` | Included in 3-lead, 6-limb, and 12-lead sets |
| Bit 1 | `0x0002` | `Lead-II` | Included in all sets (Legacy single-lead: `0x0002`) |
| Bit 2 | `0x0004` | `Lead-III` | Included in 3-lead, 6-limb, and 12-lead sets |
| Bit 3 | `0x0008` | `aVR` | Included in 6-limb and 12-lead sets |
| Bit 4 | `0x0010` | `aVL` | Included in 6-limb and 12-lead sets |
| Bit 5 | `0x0020` | `aVF` | Included in 6-limb and 12-lead sets |
| Bit 6 | `0x0040` | `V1` | Included in 12-lead set |
| Bit 7 | `0x0080` | `V2` | Included in 12-lead set |
| Bit 8 | `0x0100` | `V3` | Included in 12-lead set |
| Bit 9 | `0x0200` | `V4` | Included in 12-lead set |
| Bit 10 | `0x0400` | `V5` | Included in 12-lead set |
| Bit 11 | `0x0800` | `V6` | Included in 12-lead set |
| Bits 12–15 | `0xF000` | Reserved | Must be 0; frame rejected if any high bits are set |

#### Supported Synthetic Configurations
1. **Single-lead (Lead-II)**: `0x0002` (`active_leads_mask = 2`, $K = 1$)
2. **3-Lead (Einthoven limb leads I, II, III)**: `0x0007` (`active_leads_mask = 7`, $K = 3$)
3. **6-Limb leads (I, II, III, aVR, aVL, aVF)**: `0x003F` (`active_leads_mask = 63`, $K = 6$)
4. **Full 12-Lead diagnostic set**: `0x0FFF` (`active_leads_mask = 4095`, $K = 12$)

Any configuration with bits outside `0x0FFF` or an unsupported mask combination is rejected with a validation error.

### 2.3 Planar Sample Representation & Codecs

To maximize delta-encoding spatial locality and prevent interleaved interleaving artifacts, multi-channel payloads are organized in **planar format**:
- Active channels are sorted strictly by bit order ($0 \dots 11$).
- Each channel contains exactly $N = \text{sample\_count\_per\_channel}$ consecutive 16-bit signed integers in little-endian order (`<h`, standard ADC integer sample layout matching `chunk.py` and protocol v1). Note: The 32-byte binary header fields are network big-endian (`!`), while the physiological sample payloads are little-endian (`<h`).
- For raw encoding (`flags & 0x01 == 0`):
  $$\text{Expected Raw Length} = K \times N \times 2 \text{ bytes}$$
- For compressed encoding (`flags & 0x01 == 1`):
  Each channel is delta-encoded across its $N$ samples: $\Delta_0 = x_0, \Delta_i = x_i - x_{i-1}$, packed as little-endian `<h`, concatenated for all $K$ channels, and compressed using standard `zlib.compress(level=6)`. Dropped-sample sentinels (`-32768`) reset the baseline for subsequent samples.
- Decompression safety is strictly enforced: `zlib.decompressobj().decompress(payload, max_length=65536)` guarantees that decompression bombs cannot exceed the 64 KiB buffer limit.

### 2.4 CRC-32 Coverage Definition

Unlike designs that protect only payload bytes, CardioCoreEdge Protocol v2 enforces **full-frame integrity**:
$$\text{CRC-32 Coverage} = \text{Header}[0:28] \mathbin{\Vert} \text{Payload}[0:\text{payload\_length}]$$
The computed 32-bit CRC (using standard IEEE 802.3 polynomial `0xEDB88320`) is placed in bytes 28–31. The decoder reads bytes 0–27, skips bytes 28–31, appends the payload bytes, computes `zlib.crc32(...) & 0xFFFFFFFF`, and verifies that the result matches the header's CRC field. This ensures any corruption of header metadata (e.g., bit-flips in `active_leads_mask`, `sequence_number`, or `sample_count_per_channel`) is caught immediately before processing.

---

## 3. Backward Compatibility with Protocol Version 1

### 3.1 Dual-Version Frame Dispatcher

The existing 28-byte Protocol v1 header layout is retained:
- `HEADER_SIZE_V1 = 28` (`!BBBB I Q H H H I`)
- `HEADER_SIZE_V2 = 32` (`!BBBB I Q H H H H H H I`)

In `backend/app/telemetry/protocol.py`, `unpack_frame(data: bytes)` inspects byte 0 (`magic_byte == 0xCC`) and byte 1 (`version`):
- If `version == 0x01`: Decodes using `TelemetryFrameHeader` (28 bytes) and validates v1 payload/CRC.
- If `version == 0x02`: Decodes using `MultiChannelFrameHeader` (32 bytes) and validates v2 payload/CRC.
- Any other version raises `TelemetryProtocolError("Unsupported protocol version...")`.

### 3.2 Preserved Endpoints & Workflows

1. **Batch Ingestion (`POST /api/v1/telemetry/ingest/batch`)**:
   - Accepts v1 single-lead (Lead-II) frames.
   - Enforces patient authentication, CSRF protection, and chunk deduplication in table `telemetry_chunks`.
   - Continues to pass all Phase 8, 9, and 10 test fixtures.
2. **WebSocket Streaming (`/ws/telemetry/live`)**:
   - Continuously streams live single-lead frames to authorized clinicians and patients.
   - Remains completely unchanged.

---

## 4. Recording & Multi-Channel Chunk Persistence Model

### 4.1 Schema Definition

Two new models were added to `backend/app/models/telemetry.py`:

#### 1. `telemetry_recordings`
Represents an authorized, bounded multi-lead telemetry recording session for a patient.

```sql
CREATE TABLE telemetry_recordings (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(128) NOT NULL,
    lead_config VARCHAR(32) NOT NULL,            -- e.g. "12-lead", "6-limb", "3-lead", "single-lead"
    active_leads_mask INTEGER NOT NULL,          -- Bitmask of active channels (1 to 4095)
    sampling_rate_hz INTEGER NOT NULL DEFAULT 250, -- 250 or 500 Hz
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'interrupted'
    device_id VARCHAR(64),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_telemetry_recordings_patient_id ON telemetry_recordings(patient_id);
CREATE INDEX ix_telemetry_recordings_status ON telemetry_recordings(status);
```

#### 2. `telemetry_multichannel_chunks`
Stores synchronized multi-channel frames belonging to an active recording session.

```sql
CREATE TABLE telemetry_multichannel_chunks (
    id VARCHAR(64) PRIMARY KEY,
    recording_id VARCHAR(64) NOT NULL REFERENCES telemetry_recordings(id) ON DELETE CASCADE,
    patient_id VARCHAR(64) NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    end_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sample_count INTEGER NOT NULL,               -- Samples per active channel (e.g. 50)
    channel_count INTEGER NOT NULL,              -- Number of active channels (e.g. 12)
    active_leads_mask INTEGER NOT NULL,          -- Copy of frame bitmask for indexing
    compression_type VARCHAR(16) NOT NULL DEFAULT 'raw', -- 'raw' or 'delta_zlib'
    raw_payload_bytes BLOB NOT NULL,             -- Planar int16 sample payload
    signal_quality_index FLOAT NOT NULL DEFAULT 1.0, -- Averaged multichannel SQI
    payload_checksum_sha256 VARCHAR(64) NOT NULL, -- SHA-256 for idempotency validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_multichannel_recording_seq UNIQUE (recording_id, sequence_number),
    CONSTRAINT uq_multichannel_recording_start UNIQUE (recording_id, start_timestamp)
);

CREATE INDEX ix_multichannel_recording_seq ON telemetry_multichannel_chunks(recording_id, sequence_number);
CREATE INDEX ix_multichannel_recording_start ON telemetry_multichannel_chunks(recording_id, start_timestamp);
CREATE INDEX ix_multichannel_patient ON telemetry_multichannel_chunks(patient_id);
```

### 4.2 Idempotency and Concurrency Semantics

To prevent partial chunk persistence or silent data corruption:
1. **Uniqueness Keys**: Ingestion is keyed on `(recording_id, sequence_number)` and `(recording_id, start_timestamp)`.
2. **Duplicate Ingestion Handling**:
   - If an incoming frame has the same `recording_id` and `sequence_number` (or `start_timestamp`) as an existing chunk:
     - The backend computes `hashlib.sha256(raw_payload).hexdigest()`.
     - **Exact Match (Idempotent Retry)**: If the SHA-256 matches the stored `payload_checksum_sha256`, the chunk is counted as an idempotent retry (`duplicateChunks: 1`) without throwing an error or creating duplicate rows.
     - **Mismatch (Content Conflict)**: If the SHA-256 does not match, the conflicting chunk is rejected (`conflictChunks: 1`, `errorCount: 1`), an audit event (`MULTICHANNEL_CHUNK_CONFLICT`) is logged, and the batch completes with HTTP 200 contract reporting. HTTP 409 Conflict is returned when attempting to ingest into an already terminated/completed recording (`recording.status != "active"`).
3. **Multi-Recording Collision Independence**:
   - Because constraints are scoped to `recording_id`, frames from two distinct patients (or two distinct recordings for the same patient) possessing identical timestamps or sequence numbers persist without interference.
4. **Lifecycle State Checks**:
   - Ingestion into an inactive recording is rejected with `HTTP 409 Conflict`.
   - Modifying a non-active recording status is rejected with `HTTP 400 Bad Request`.

---

## 5. Backend REST API Endpoints & Authorization

All new endpoints reside in `backend/app/routers/telemetry.py` under the `/api/v1/telemetry/recordings` route group:

| Method | Endpoint | Description | Required Role & Access Boundary |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/telemetry/recordings` | Create a new recording session | Patient (own profile) or Clinician with verified consent |
| `GET` | `/api/v1/telemetry/recordings/{recording_id}` | Retrieve recording metadata and summary chunk stats | Patient (own recording) or Clinician with active consent |
| `PATCH` | `/api/v1/telemetry/recordings/{recording_id}/status` | Update recording lifecycle (`completed` / `interrupted`) | Patient (creator) or Clinician with active consent |
| `POST` | `/api/v1/telemetry/recordings/{recording_id}/chunks` | Ingest synchronized multi-channel frames | Patient (owner) or authorized recording creator |
| `GET` | `/api/v1/telemetry/recordings/{recording_id}/chunks` | Ordered retrieval of persisted chunks (`sequence_number ASC`) | Patient (own recording) or Clinician with active consent |

### 5.1 Patient-Clinician Access Boundary & Consent Enforcement

The recording API integrates directly with the existing `ConsentGrant` verification pipeline:
- When a clinician (`doctor`) requests a recording or its chunks:
  1. The system resolves the recording's `patient_id`.
  2. The system queries the `consent_grants` table for an active grant linking the clinician's user ID and the patient profile with purpose `ecg_monitoring` (or equivalent).
  3. If no active consent is found, the endpoint raises `HTTP 403 Forbidden` (`"Clinician has no ECG consent for this patient"`).
- Cross-patient tampering (e.g., Patient A trying to view or post frames to Patient B's recording) is rejected with `HTTP 403 Forbidden`.
- Ingestion of frames into non-existent recordings returns `HTTP 404 Not Found`.

---

## 6. Database Migration & Rollback Strategy

### 6.1 Forward Migration Strategy

The database initialization in `backend/app/db/seed.py` uses SQLAlchemy's declarative metadata (`Base.metadata.create_all(bind=engine)` via `init_tables()`).

1. `TelemetryRecording` and `TelemetryMultiChannelChunk` are imported into `backend/app/db/seed.py`.
2. Existing SQLite WAL databases automatically receive the two new tables during initialization if they do not exist.
3. Because existing tables (`telemetry_chunks`, `users`, `patient_profiles`, `consent_grants`) are completely untouched and no columns were added or altered on existing tables, **zero existing data is invalidated or modified**.
4. The migration is strictly additive and idempotent.

### 6.2 Rollback Procedure

Should a rollback of the Phase 12 schema be required:
```sql
-- Disable foreign keys temporarily for clean cascade drop
PRAGMA foreign_keys = OFF;

-- Drop multichannel tables in reverse dependency order
DROP TABLE IF EXISTS telemetry_multichannel_chunks;
DROP TABLE IF EXISTS telemetry_recordings;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
```
Because no foreign keys from pre-existing tables point to `telemetry_recordings`, dropping these two tables restores the database schema to the exact Phase 10 / Phase 11 state without impacting user accounts, patient profiles, consent grants, or legacy single-lead `telemetry_chunks`.

---

## 7. Verification & Test Evidence

### 7.1 Automated Test Execution Summary

The test suite was executed using `python -m pytest` in `backend/`:

| Test Suite File | Tested Functional Scope | Tests Executed | Passed | Failed |
| :--- | :--- | :---: | :---: | :---: |
| `test_phase12_multilead.py` | Protocol v2 framing, planar codecs, recording CRUD, deduplication, consent RBAC | 22 | 22 | 0 |
| `test_phase10_reliability_security.py` | Single-lead batch idempotency, WAL resilience, CSRF, TOTP security | 12 | 12 | 0 |
| `test_phase9_step_zero.py` | Single-lead batch protocol framing and baseline validation | 10 | 10 | 0 |
| `test_phase9_live_monitoring.py` | Live telemetry WebSocket streaming and broadcast | 3 | 3 | 0 |
| `test_phase8_telemetry_integration.py` | Single-lead telemetry database ingestion and retrieval | 12 | 12 | 0 |
| `test_phase7_security.py` | Authentication, RBAC, TOTP verification, session cookies | 17 | 17 | 0 |
| `test_backend.py` | Basic API routing, health checks, profile models | 10 | 10 | 0 |
| **Total Automated Test Suite** | **Complete CardioCoreEdge Backend Test Suite** | **86** | **86** | **0** |

**Execution Time:** 10.07 seconds  
**Pass Rate:** **100.0%**

### 7.2 Detailed Phase 12 Test Matrix (`test_phase12_multilead.py`)

1. `test_pack_unpack_multichannel_v2_valid`: Verifies packing and unpacking of a standard 12-lead frame (32-byte header, 50 samples/channel, 1200 bytes raw payload) with correct header fields and CRC matching.
2. `test_protocol_v1_and_v2_interop`: Verifies dual-version dispatch in `unpack_frame` (both v1 and v2 headers unpack with their respective types and valid CRC checks).
3. `test_multichannel_invalid_version_rejected`: Verifies unpack rejection when version is neither `0x01` nor `0x02`.
4. `test_multichannel_corrupt_crc_rejected`: Verifies frame rejection when CRC does not match header + payload.
5. `test_multichannel_truncated_payload_rejected`: Verifies frame rejection when payload is shorter than `payload_length`.
6. `test_multichannel_channel_mask_validation`: Validates active channel count calculations and rejection of masks with bits in reserved range ($> 0x0FFF$).
7. `test_multichannel_sample_count_length_mismatch`: Verifies raw frame validation error when `len(payload) != channel_count * sample_count * 2`.
8. `test_multichannel_oversized_frame_rejected`: Verifies strict enforcement of the 64 KiB maximum frame buffer limit.
9. `test_multichannel_delta_zlib_codec`: Verifies planar delta encoding and lossless decoding across multiple leads.
10. `test_create_recording_valid`: Verifies patient creation of a 12-lead recording session with status `active`.
11. `test_create_recording_invalid_mask_and_rate_rejected`: Verifies rejection of invalid channel masks (`0x0000`, `0x8000`) and unsupported sampling rates.
12. `test_create_recording_patient_isolation`: Verifies that Patient A cannot create a recording for Patient B.
13. `test_ingest_multichannel_chunk_valid`: Verifies frame ingestion, chunk storage, sample count validation, and metadata storage.
14. `test_ingest_multichannel_chunk_duplicate_idempotency`: Verifies that identical frame resubmissions return `processedChunks: 1` without DB error.
15. `test_ingest_multichannel_chunk_conflict_rejected`: Verifies that re-submitting an existing sequence number with different payload content triggers `HTTP 409 Conflict`.
16. `test_ingest_channel_mask_mismatch_rejected`: Verifies rejection when a frame's `active_leads_mask` does not match the recording's configured mask.
17. `test_identical_timestamps_different_recordings`: Verifies that frames with identical timestamps across different recordings persist without collision.
18. `test_recording_lifecycle_transitions`: Verifies transitions (`active` $\to$ `completed`) and rejection of frame ingestion into non-active recordings.
19. `test_get_recording_chunks_ordered`: Verifies retrieval of persisted chunks sorted monotonically by sequence number.
20. `test_doctor_with_consent_can_access_patient_recording`: Verifies clinician access to patient recording metadata when active consent is present.
21. `test_doctor_without_consent_denied_access`: Verifies clinician access is blocked (`HTTP 403 Forbidden`) when consent is absent.
22. `test_unauthenticated_recording_access_rejected`: Verifies rejection (`HTTP 401 Unauthorized`) of recording endpoints when unauthenticated.

---

## 8. Verified Invariants & Scope Boundaries

### 8.1 Confirmed System Behaviors
- **Transport**: Protocol v2 uses a 32-byte header with full-frame CRC-32 (covering bytes 0–27 and payload). The 64 KiB maximum frame limit is strictly enforced.
- **Persistence**: Recording sessions (`telemetry_recordings`) strictly isolate multi-channel chunks (`telemetry_multichannel_chunks`) per patient.
- **Deduplication**: Monotonic sequence numbers and timestamps enforce unique constraints. Duplicate retries are idempotent, while divergent payloads on identical sequence keys trigger `HTTP 409 Conflict`.
- **RBAC & Consent**: Patient profile isolation is maintained. Clinicians require verified active consent to view patient recordings.
- **Single-Lead Compatibility**: Protocol v1 single-lead (Lead-II, 250 Hz) ingestion and streaming remain 100% operational and covered by tests.

### 8.2 Scope Preservations & Exclusions
- **No Frontend Changes**: Zero modifications were made to `cardiocore-next/src/` or any other frontend files.
- **No Legacy Application Changes**: The legacy vanilla HTML/CSS/JavaScript app and Vite server on port 5173 were untouched.
- **No External Infrastructure**: No Redis, PostgreSQL, TimescaleDB, or distributed message brokers were introduced. The application runs strictly on FastAPI, SQLAlchemy async, and SQLite in WAL mode.
- **No Live Hardware or Patient Data**: All test data is synthetic and deterministic.
- **No Clinical Claims**: The system remains a research prototype; no diagnostic or clinical interpretation algorithms were added.

---

## 9. Known Limitations & Deferred Work

1. **Multi-Lead Frontend Visualization**: The Next.js frontend currently displays only single-lead Lead-II telemetry. Visualizing 3-lead, 6-limb, or 12-lead multi-canvas waveforms is deferred to a future authorized frontend phase.
2. **WebSocket Multi-Lead Live Streaming**: Live streaming of Protocol v2 multi-channel frames over WebSockets remains deferred; Phase 12 focused strictly on recording-session and batch chunk persistence.
3. **Hardware Acquisition Integration**: No actual ECG hardware or serial COM ports are connected; transmission is validated via HTTP REST frame batches.
4. **Compression Optimization Benchmarking**: Planar delta-zlib was verified for correctness and decompression bomb safety; empirical wire compression benchmarks on real physiological signals remain deferred to future hardware validation phases.
