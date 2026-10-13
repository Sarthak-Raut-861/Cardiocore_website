# CardioCoreEdge — Telemetry Protocol Specification (v1)

## 1. Protocol Architecture & Ingestion Design

CardioCoreEdge implements a high-throughput, low-latency binary framing protocol optimized for streaming 250 Hz physiological waveforms (Lead-II, 12-lead, and multi-channel biosignals) over WebSockets, supplemented by a deterministic HTTP batch-upload contract for buffered offline recovery.

### Ingestion Primitives
- **Transport**: WebSocket binary frames (`ws://` / `wss://`).
- **Binary Header Size**: Fixed 28 bytes (Big-Endian network order).
- **Maximum Frame Size**: Exactly 65,536 bytes (64 KiB) including header; therefore, the **maximum payload is 65,508 bytes**. Frames exceeding this ceiling are rejected immediately to protect against buffer exhaustion (`ProtocolParseError`, code 4001).
- **Integrity Check**: 32-bit CRC (`zlib.crc32`) computed over the variable-length payload, packed as a 4-byte big-endian unsigned integer.
- **Decompression Bomb Protection**: Decompression enforces an explicit 64 KiB (65,536 byte) expansion ceiling using `zlib.decompressobj()`. Payloads whose expansion exceeds this limit are rejected to prevent denial-of-service memory exhaustion.
- **Sample Representation**: 16-bit signed integers (`int16`, little-endian ADC values), optionally compressed using first-order delta encoding with deflate (`delta_zlib`).

---

## 2. Binary Frame Structure (28-Byte Fixed Header)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     MAGIC     |    VERSION    |   MSG_TYPE    |     FLAGS     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        SEQUENCE_NUMBER                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       BASE_TIMESTAMP_MS                       +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       SAMPLING_RATE_HZ        |          CHANNEL_ID           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         SAMPLE_COUNT          |        PAYLOAD_LENGTH         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        CHECKSUM_CRC32                         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      PAYLOAD (Variable, max 65508 B) ...      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Header Field Definitions

| Offset | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **0** | `magic` | `uint8` | Fixed constant `0xCC` (CardioCore identifier). |
| **1** | `version` | `uint8` | Protocol version (`0x01`). Non-0x01 rejected with code 4004. |
| **2** | `msg_type` | `uint8` | Packet type: `0x01` (ECG), `0x02` (PING), `0x03` (ACK), `0x04` (BACKPRESSURE), `0x05` (ERROR). Other types rejected with code 4008. |
| **3** | `flags` | `uint8` | Bitmask: bit 0 = `delta_zlib`, bit 1 = `lead_off`, bit 2 = `clipped`, bit 3 = `clock_unsync`. Reserved bits (0xF0) rejected with code 4009. |
| **4–7** | `sequence_number` | `uint32` | Monotonically increasing sequence counter ($0$ to $2^{32}-1$). Handled via RFC 1982 modular arithmetic. |
| **8–15**| `base_timestamp_ms`| `uint64` | Milliseconds since Unix epoch (UTC) of first sample in chunk. |
| **16–17**| `sampling_rate_hz` | `uint16` | Sampling frequency in Hz (default: 250 Hz). |
| **18–19**| `channel_id` | `uint16` | Lead identifier: `1` = Lead-II, `2` = Lead-I, `3` = Lead-V1, etc. |
| **20–21**| `sample_count` | `uint16` | Number of physiological samples in frame (e.g. 50 for 200 ms). |
| **22–23**| `payload_length` | `uint16` | Exact byte count of payload section (max 65,508 bytes). Must match actual received length. |
| **24–27**| `checksum_crc32` | `uint32` | Standard CRC-32 checksum calculated over `payload` bytes. |

---

## 3. Sequence Tracking, Rollover & Gap Handling

To ensure deterministic behavior across continuous operation and network packet anomalies:

1. **RFC 1982 Modular Serial Arithmetic**:
   - Sequence distance is computed modulo $2^{32}$: `diff = (seq - last_seq) & 0xFFFFFFFF`.
   - **Forward progression**: If $1 \le \text{diff} < 2^{31}$, sequence is valid and progressing forward.
   - **Duplicate frame**: If $\text{diff} = 0$, frame is acknowledged but not re-saved to storage.
   - **Replay / Backward window**: If $\text{diff} \ge 2^{31}$, frame is flagged as replayed or out-of-order.
   - **Sequence Rollover**: Rollover from $4,294,967,295$ to $0$ is handled seamlessly ($\text{diff} = 1$).
2. **Missing Sample & Gap Detection**:
   - If $\text{diff} > 1$, missing frames count is $(\text{diff} - 1)$ and logged in telemetry stream stats.
3. **Reconnection State Preservation**:
   - The `StreamManager` retains sequence numbers and stream metadata for a **5-minute grace period** after unexpected disconnects.

---

## 4. Operational Modes: Ingest vs. Monitor

The WebSocket endpoint (`/api/v1/telemetry/ws/{session_token}`) supports dual operational modes via the `mode` query parameter:

1. **Ingest Mode (`mode=ingest`, default)**:
   - Used by edge devices, synthetic test harnesses, and buffered sync clients.
   - Client sends 28-byte binary frames to backend. Backend validates header, bounds, CRC-32, updates sequence state, persists chunks to database, and responds with binary ACK frames (`0x03`).
2. **Live Monitor Mode (`mode=monitor`)**:
   - Used by the Next.js Patient Dashboard Live Monitor Bench.
   - Backend streams validated synthetic 250 Hz Lead-II ECG frames at real-time rate (50 samples every 200 ms).
   - Backend verifies active patient session and clinician consent periodically (every 1 second). If consent is revoked, stream terminates with code 4403.
   - Client renders the waveform on a calibrated medical grid canvas with bounded buffering.

---

## 5. Flow Control & Backpressure Signaling

When ingestion buffer depth reaches the high watermark (`BUFFER_HIGH_WATERMARK = 10` pending uncommitted frames):
1. The server issues a binary `BACKPRESSURE_WARNING` (`msg_type = 0x04`) frame to the client.
2. The payload contains a 16-bit integer reflecting current server buffer queue depth.
3. Edge firmware must respond by throttling chunk transmission or buffering to local flash memory.

---

## 6. HTTP Batch-Upload Contract & Idempotency Rules

For devices recovering from extended cellular or Wi-Fi disconnections:
- **Endpoint**: `POST /api/v1/telemetry/batch`
- **Batch Ceiling**: Maximum 50 frames per batch. Exceeding 50 frames returns HTTP 400 Bad Request.
- **Idempotency Guarantees**:
  - Repeated submission of an identical batch (same timestamp and matching payload SHA-256) is deduplicated without inserting duplicate database rows (`duplicateChunks` incremented).
  - Submitting a frame with an identical timestamp but conflicting payload content is rejected with conflict error (`conflictChunks` incremented).
- **Authentication & RBAC**: Enforces active patient session or doctor authorization and server-side consent validation.

---

## 6. Telemetry Capacity Normalization (Decimal vs. Binary)

All telemetry calculations strictly distinguish decimal standards from binary memory standards:

### Single-Lead 250 Hz Continuous ECG (16-Bit Resolution)
- **Samples per second**: 250
- **Bytes per second**: $250 \times 2 = 500\text{ B/s}$
- **Samples per 24 hours**: $250 \times 86,400 = 21,600,000\text{ samples}$
- **Raw bytes per 24 hours**: $21,600,000 \times 2 = 43,200,000\text{ Bytes}$

| Unit Scale | Decimal Standard ($10^3, 10^6, 10^9$) | Binary Standard ($2^{10}, 2^{20}, 2^{30}$) |
| :--- | :--- | :--- |
| **Daily Uncompressed** | **43.20 MB** ($43,200,000 / 10^6$) | **41.20 MiB** ($43,200,000 / 2^{20}$) |
| **Monthly Uncompressed (30d)**| **1.296 GB** | **1.207 GiB** |
| **Daily Compressed (Delta-Deflate, 3.54x)**| **12.20 MB** | **11.64 MiB** |
| **Monthly Compressed (Delta-Deflate, 3.54x)**| **366.1 MB** | **349.0 MiB** |
| **Annual Compressed (365d)**| **4.453 GB** | **4.148 GiB** |
