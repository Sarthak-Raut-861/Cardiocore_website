# CardioCoreEdge — Database Migration Readiness & Concurrency Analysis

## 1. Executive Summary & Objective

In Phase 8, CardioCoreEdge retains **SQLite** (`aiosqlite` under WAL mode) for local integration and synthetic-load testing, while establishing empirical performance boundaries and objective quantitative criteria for transitioning to **PostgreSQL** and **TimescaleDB**.

---

## 2. Empirical SQLite Concurrency Benchmark Results

Using [benchmark_sqlite_concurrency.py](file:///c:/Users/Sarthak%20Raut/Desktop/EDI%20Website/backend/app/db/benchmark_sqlite_concurrency.py), synthetic 250 Hz Lead-II telemetry chunks (5 seconds each) were concurrently persisted under increasing worker loads:

| Concurrency Level | Total Chunks | Elapsed Time | Throughput (chunks/sec) | Throughput (MB/s) | Throughput (MiB/s) | Mean Latency | p95 Latency | Max Latency | Write Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Worker** | 5 | 0.024 s | 209.86 | 0.525 MB/s | 0.500 MiB/s | 4.75 ms | 8.40 ms | 8.40 ms | 0 |
| **5 Workers** | 25 | 0.082 s | 304.68 | 0.762 MB/s | 0.726 MiB/s | 13.09 ms | 36.71 ms | 37.16 ms | 0 |
| **10 Workers** | 50 | 0.224 s | 223.61 | 0.559 MB/s | 0.533 MiB/s | 27.43 ms | 122.75 ms | 205.25 ms | 0 |
| **20 Workers** | 100 | 0.393 s | 254.43 | 0.636 MB/s | 0.607 MiB/s | 52.36 ms | 157.52 ms | 366.53 ms | 0 |

### Analysis of SQLite Concurrency:
1. **WAL Mode Viability**: SQLite's Write-Ahead Log allows concurrent readers and a single serialized writer without data corruption or lock errors (`0 errors` across 100 concurrent transactions).
2. **Latency Spikes under Contention**: Because SQLite serializes all write operations into a single file lock, p95 write latency scales from **8.4 ms** at 1 worker to **157.5 ms** at 20 workers, with maximum latency reaching **366.5 ms**.

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
