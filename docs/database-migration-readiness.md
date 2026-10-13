# CardioCoreEdge — Database Migration Readiness & Concurrency Analysis

## 1. Executive Summary & Objective

In Phase 8, CardioCoreEdge retains **SQLite** (`aiosqlite` under WAL mode) for local integration and synthetic-load testing, while establishing empirical performance boundaries and objective quantitative criteria for transitioning to **PostgreSQL** and **TimescaleDB**.

---

## 2. Empirical SQLite Concurrency Benchmark Results

### A. Phase 9 Normalized Workload Benchmark (Controlled 60-Chunk Workload)

> [!NOTE]
> **Environment & Scope Disclaimer**: Measured on a single local development machine (Windows, Python 3.11, SQLite WAL Mode, Local NVMe SSD). These results isolate concurrent write contention under a constant total workload (60 chunks = 150,000 uncompressed bytes = 5 minutes of continuous 250 Hz Lead-II ECG) across 2 iterations per concurrency tier. They do **not** represent production capacity or horizontally distributed infrastructure.

| Concurrency Level | Total Workload | Median Throughput | Decimal Throughput | Binary Throughput | Median Latency | Mean Latency | p95 Latency | Max Latency | Failures |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Worker** (60 ch/w) | 60 chunks | 224.50 ch/s | 0.561 MB/s | 0.535 MiB/s | 4.26 ms | 4.45 ms | 5.22 ms | 9.93 ms | 0 |
| **2 Workers** (30 ch/w) | 60 chunks | 296.58 ch/s | 0.741 MB/s | 0.707 MiB/s | 6.22 ms | 6.64 ms | 9.40 ms | 19.59 ms | 0 |
| **5 Workers** (12 ch/w) | 60 chunks | 292.51 ch/s | 0.731 MB/s | 0.697 MiB/s | 5.82 ms | 12.64 ms | 50.99 ms | 136.56 ms | 0 |
| **10 Workers** (6 ch/w) | 60 chunks | 205.54 ch/s | 0.514 MB/s | 0.490 MiB/s | 8.52 ms | 28.12 ms | 146.13 ms | 264.74 ms | 0 |
| **20 Workers** (3 ch/w) | 60 chunks | 176.97 ch/s | 0.442 MB/s | 0.422 MiB/s | 37.31 ms | 60.27 ms | 217.02 ms | 459.96 ms | 0 |

### B. Phase 10 Sustained 1,000-Chunk WAL Concurrency & Integrity Benchmark

> [!NOTE]
> **Phase 10 Hardening Benchmark**: Executed on a disposable test database (`_cce_stability.db`) using Python 3.11 with SQLite WAL mode (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;`). Workload consisted of 1,000 discrete chunk transactions (50 samples / 100 bytes payload per chunk, representing **200.0 seconds / 3.33 minutes** of continuous 250 Hz single-lead ECG telemetry).  
> *Workload Duration Arithmetic Correction*: Earlier draft documentation stated "~3.3 hours" due to a units transcription error where 3.33 minutes ($200\text{ s} / 60\text{ s}$) was mistakenly transcribed as hours. A true 3.33-hour (12,000-second) 250 Hz stream contains 3,000,000 samples, corresponding to 60,000 chunks of 50 samples each (or 1,000 chunks of 3,000 samples / 12 seconds each).

| Metric | Measured Value | Operational Status |
| :--- | :--- | :--- |
| **Total Transactions Attempted** | 1,000 chunks (50,000 samples) | 200.0 s (3.33 min) of 250 Hz ECG |
| **Successful Transactions** | 1,000 chunks | **100% Success Rate (0 Failures)** |
| **Failed Transactions / Lock Errors** | 0 | **0 Lock Timeouts** |
| **Total Workload Duration** | 9.599 seconds | Sustained Ingestion |
| **Write Throughput** | **104.18 chunks/sec** | ~5,209 ECG samples/sec |
| **Median Write Latency** | **7.55 ms** | Sub-10ms transactional overhead |
| **Mean Write Latency** | **9.59 ms** | Consistent performance |
| **p95 Write Latency** | **9.32 ms** | Well below 200 ms migration trigger |
| **Maximum Write Latency** | **597.12 ms** | Initial WAL file expansion / allocation |
| **Pre-Workload Integrity (`PRAGMA integrity_check`)** | `ok` | Baseline verified |
| **Post-Workload Integrity (`PRAGMA integrity_check`)** | `ok` | **Zero page or index corruption** |
| **Database File Size on Disk** | 430,080 bytes (~420 KiB) | Predictable relational storage growth |
| **Post-Benchmark WAL Size** | 0 bytes (Clean Checkpoint) | WAL cleanly reclaimed |

### C. Historical Phase 8 Variable-Workload Measurements (Retained for Reference)

| Concurrency Level | Total Chunks | Elapsed Time | Throughput | Mean Latency | p95 Latency | Max Latency | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Worker** | 5 | 0.024 s | 209.86 ch/s | 4.75 ms | 8.40 ms | 8.40 ms | 0 |
| **5 Workers** | 25 | 0.082 s | 304.68 ch/s | 13.09 ms | 36.71 ms | 37.16 ms | 0 |
| **10 Workers** | 50 | 0.224 s | 223.61 ch/s | 27.43 ms | 122.75 ms | 205.25 ms | 0 |
| **20 Workers** | 100 | 0.393 s | 254.43 ch/s | 52.36 ms | 157.52 ms | 366.53 ms | 0 |

### Key Findings from Normalized Workload Analysis:
1. **Low Contention (1–5 Workers)**: Median write latency remains excellent at $4.26\text{ ms} - 5.82\text{ ms}$, with p95 well below $55\text{ ms}$.
2. **Contention Knee (10–20 Workers)**: Because SQLite serializes writers through a single database file lock, p95 write latency scales from **5.22 ms** at 1 worker to **146.13 ms** at 10 workers and **217.02 ms** at 20 workers, with maximum contention reaching **459.96 ms**.
3. **Migration Trigger Confirmation**: The measured p95 latency crossing 200 ms at 20 concurrent workers ($217.02\text{ ms}$) empirically validates the **20 concurrent streaming connections threshold** as the mandatory trigger for PostgreSQL migration.

---

## 3. Objective Criteria for PostgreSQL Migration

PostgreSQL migration becomes **mandatory** when ANY of the following four conditions are met:

1. **Concurrent Active Ingestion Streams**: Active patient streaming connections exceed **20 continuous concurrent streams**, or sustained write latency exceeds **200 ms**.
2. **Analytical Read/Write Contention**: Long-running reporting queries (e.g., 30-day baseline vitals recalculations or audit log audits) run concurrently with streaming writes, causing database lock timeouts.
3. **Database Volume Threshold**: Total database file size on disk exceeds **50 GiB** ($53.7\text{ GB}$), requiring disk partitioning and independent tablespaces.
4. **Horizontal Multi-Worker Deployment**: Deploying more than 1 Uvicorn worker process or running behind a multi-container Kubernetes/Docker cluster, where multiple independent processes require shared transactional ACID guarantees.

---

## 4. PostgreSQL & TimescaleDB Migration Plan

### Phase A: Schema & Type Alignment
| Domain Entity | SQLite Representation | Target PostgreSQL Representation |
| :--- | :--- | :--- |
| Primary Keys | `VARCHAR(36)` | Native `UUID` (`gen_random_uuid()`) |
| Structured Data | `TEXT` (JSON serialized) | Native `JSONB` with GIN indexing |
| Waveform Payload | `BLOB` (`LargeBinary`) | `BYTEA` or external S3 chunk URI |
| Timestamps | `DATETIME(timezone=True)` | `TIMESTAMPTZ` |

### Phase B: TimescaleDB Time-Series Optimization
- Convert `telemetry_chunks` to a **TimescaleDB Hypertable** partitioned on `start_timestamp` with a 1-day chunk interval:
  ```sql
  SELECT create_hypertable('telemetry_chunks', 'start_timestamp', chunk_time_interval => INTERVAL '1 day');
  ```
- Enable **TimescaleDB Columnar Compression** for chunks older than 7 days, achieving an additional 3–5x compression over relational storage.

### Phase C: Dual-Write & Zero-Downtime Migration Strategy
1. **Alembic Migration**: Run Alembic revisions targeting PostgreSQL schema.
2. **Dual-Write Pipeline**: Implement dual-write repository adapter logging writes to PostgreSQL while reading from SQLite.
3. **Data Verification**: Run checksum and row-count verification across all tables.
4. **Cutover**: Switch `DATABASE_URL` in environment variables and decommission SQLite database.

---

## 5. Distributed Infrastructure & Redis Trigger Conditions

### Current Single-Process Architecture
- Rate limiting is currently managed in-memory via `InMemoryRateLimiter` (sliding-window timestamps in process memory).
- WebSocket streaming state is tracked in-process via `TelemetryStreamManager`.
- **Limitation**: This architecture is valid **only for single-worker development and integration testing**. In a multi-worker production cluster, memory state is not shared between processes.

### Conditions Requiring Redis:
1. **Multi-Worker Scaling**: Scaling FastAPI beyond 1 worker process (`uvicorn --workers 4`).
2. **Distributed Session Invalidation**: Instant global revocation of sessions across multiple backend pods.
3. **Distributed Rate Limiting**: Enforcing account and IP rate limits across multiple servers using Redis sliding-window sorted sets (`ZADD` / `ZREMRANGEBYSCORE`).
