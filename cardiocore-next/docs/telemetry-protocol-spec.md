# CardioCoreEdge — Telemetry Protocol Specification (v1)

## 1. Protocol Architecture & Ingestion Design

CardioCoreEdge implements a high-throughput, low-latency binary framing protocol optimized for streaming 250 Hz physiological waveforms (Lead-II, 12-lead, and multi-channel biosignals) over WebSockets, supplemented by a deterministic HTTP batch-upload contract for buffered offline recovery.

### Ingestion Primitives
- **Transport**: WebSocket binary frames (`ws://` / `wss://`).
- **Binary Header Size**: Fixed 28 bytes (Big-Endian network order).
- **Maximum Frame Size**: 65,536 bytes (64 KiB). Frames exceeding this ceiling are rejected immediately to protect against buffer exhaustion.
- **Integrity Check**: 32-bit CRC (`zlib.crc32`) computed over the variable-length payload.
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
|                      PAYLOAD (Variable) ...                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Header Field Definitions

| Offset | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **0** | `magic` | `uint8` | Fixed constant `0xCC` (CardioCore identifier). |
| **1** | `version` | `uint8` | Protocol version (`0x01`). |
| **2** | `msg_type` | `uint8` | Packet type: `0x01` (ECG), `0x02` (PING), `0x03` (ACK), `0x04` (BACKPRESSURE), `0x05` (ERROR). |
| **3** | `flags` | `uint8` | Bitmask: bit 0 = `delta_zlib`, bit 1 = `lead_off`, bit 2 = `clipped`, bit 3 = `clock_unsync`. |
| **4–7** | `sequence_number` | `uint32` | Monotonically increasing chunk sequence counter (0 to 4,294,967,295). |
| **8–15**| `base_timestamp_ms`| `uint64` | Milliseconds since Unix epoch (UTC) of first sample in chunk. |
| **16–17**| `sampling_rate_hz` | `uint16` | Sampling frequency in Hz (default: 250 Hz). |
| **18–19**| `channel_id` | `uint16` | Lead identifier: `1` = Lead-II, `2` = Lead-I, `3` = Lead-V1, etc. |
| **20–21**| `sample_count` | `uint16` | Number of physiological samples in frame (e.g. 1,250 for 5 seconds). |
| **22–23**| `payload_length` | `uint16` | Exact byte count of the variable payload section. |
| **24–27**| `checksum_crc32` | `uint32` | Standard CRC-32 checksum calculated over `payload`. |

---

## 3. Sequence Tracking, Gaps & Duplicate Rejection

To ensure clinical telemetry integrity across intermittent network conditions:

1. **Duplicate Rejection**:
   - The ingestion server maintains `last_sequence` per stream session.
   - If an incoming frame has `sequence_number <= last_sequence`, it is identified as a duplicate or replayed packet.
   - The server acknowledges the frame to clear the edge queue but drops the payload to avoid duplicate database insertion.
2. **Missing Sample & Gap Detection**:
   - If an incoming frame has `sequence_number > last_sequence + 1`, a sequence gap is recorded.
   - The server increments `total_missing_gaps_detected` by `(seq - last_seq - 1)` and calculates missing sample counts.
3. **Reconnection State Preservation**:
   - The `StreamManager` retains sequence numbers and stream metadata for a **5-minute grace period** after unexpected disconnects, allowing edge devices to resume seamlessly without stream reset.

---

## 4. Flow Control & Backpressure Signaling

When ingestion buffer depth reaches the high watermark (`BUFFER_HIGH_WATERMARK = 10` pending uncommitted frames):
1. The server issues a binary `BACKPRESSURE_WARNING` (`msg_type = 0x04`) frame to the client.
2. The payload contains a 16-bit integer reflecting current server buffer queue depth.
3. Edge firmware must respond by:
   - Throttling chunk transmission frequency.
   - Temporarily buffering 5-second chunks to local non-volatile flash memory.
   - Switching from raw encoding to maximum `delta_zlib` compression.

---

## 5. HTTP Batch-Upload Contract (Offline Recovery)

For devices recovering from extended cellular or Wi-Fi disconnections, the server provides an idempotent batch sync endpoint:

- **Endpoint**: `POST /api/v1/telemetry/batch`
- **Authentication**: Opaque session cookie (`cc_session`) or device bearer token.
- **Request Body**: JSON array of hex-encoded binary frames (or multipart gzip binary bundle):
  ```json
  [
    "cc0101010000000a00000199...",
    "cc0101010000000b00000199..."
  ]
  ```
- **Response**:
  ```json
  {
    "status": "completed",
    "processedChunks": 120,
    "duplicateChunks": 0,
    "errorCount": 0,
    "contract": "HTTP-Batch-Recovery-v1"
  }
  ```

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
