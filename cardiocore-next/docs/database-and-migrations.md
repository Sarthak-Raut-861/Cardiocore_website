# CardioCoreEdge — Database Architecture & Schema Documentation

## 1. Overview & Architectural Boundaries

In accordance with Phase 7 architectural decisions, CardioCoreEdge utilizes **SQLite** (`sqlite+aiosqlite`) for development and automated integration testing while isolating all persistence behind repository and service boundaries. This architecture provides zero-setup local execution while guaranteeing a strict, schema-compatible path to production **PostgreSQL** and **TimescaleDB** in subsequent phases.

### Connection & Concurrency Primitives
- **Engine**: SQLAlchemy 2.0 asynchronous engine (`create_async_engine`) with `async_sessionmaker`.
- **Integrity Enforcement**: SQLite foreign keys (`PRAGMA foreign_keys = ON`) and Write-Ahead Logging (`PRAGMA journal_mode = WAL`) are enforced upon every connection via SQLAlchemy event listeners (`@event.listens_for(Engine, "connect")`).
- **Transaction Isolation**: Service functions operate inside atomic async transactions (`async with async_session_factory() as session`). Sensitive mutations (login attempt counters, 2FA timesteps, session revocations, and consent changes) are committed atomically or rolled back cleanly upon error.

---

## 2. Entity Relational Models & Schemas

### A. User Identity (`users`)
Stores core identity and credentials. Decoupled from clinical profiles.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | UUID identifier |
| `email` | `VARCHAR(255)` | UNIQUE, INDEX, Nullable | Clinician/patient email address |
| `phone_number` | `VARCHAR(30)` | UNIQUE, INDEX, Nullable | Patient mobile identifier (+91 format) |
| `password_hash` | `VARCHAR(255)` | NOT NULL | **Argon2id** password hash |
| `role` | `VARCHAR(20)` | INDEX, NOT NULL | RBAC role: `"patient"`, `"doctor"`, `"admin"` |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT True | Account status flag |
| `totp_secret` | `VARCHAR(64)` | Nullable | RFC 6238 Base32 secret (clinicians only) |
| `last_totp_timestep` | `INTEGER` | Nullable | Replay prevention: stores last verified timestep |
| `failed_login_attempts`| `INTEGER` | NOT NULL, DEFAULT 0 | Account lockout counter |
| `locked_until` | `DATETIME` | Nullable | Account lockout expiration timestamp |
| `created_at` / `updated_at` | `DATETIME` | NOT NULL | Audit timestamps |

### B. Patient Clinical Profile (`patient_profiles`)
Contains baseline cardiovascular metrics and medical demographics.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | UUID identifier |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`, ON DELETE CASCADE), UNIQUE | 1:1 relationship to User |
| `mrn` | `VARCHAR(50)` | UNIQUE, INDEX, NOT NULL | Medical Record Number (e.g. `44821`) |
| `full_name` | `VARCHAR(100)` | NOT NULL | Patient legal name |
| `age` | `INTEGER` | NOT NULL | Patient age |
| `gender` | `VARCHAR(20)` | NOT NULL | Biological sex/gender |
| `conditions_json` | `TEXT` | NOT NULL, DEFAULT `'[]'` | JSON array of diagnosed conditions |
| `baseline_summary_json`| `TEXT` | NOT NULL, DEFAULT `'{}'` | JSON baseline vitals (HR, HRV, SpO2, beats) |
| `adherence_pct` | `INTEGER` | Nullable | 30-day monitoring adherence rate |

### C. Clinician Profile (`doctor_profiles`)
Captures verified professional credentials and hospital affiliations.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | UUID identifier |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`, ON DELETE CASCADE), UNIQUE | 1:1 relationship to User |
| `full_name` | `VARCHAR(100)` | NOT NULL | Clinician name with title |
| `degrees` | `VARCHAR(100)` | NOT NULL | Credentials (e.g. `MD, DM (Cardiology)`) |
| `specialty` | `VARCHAR(100)` | NOT NULL | Subspecialty (e.g. `Electrophysiology`) |
| `medical_council` | `VARCHAR(100)` | NOT NULL | State council (e.g. `Maharashtra Medical Council`) |
| `registration_number`| `VARCHAR(50)` | UNIQUE, INDEX, NOT NULL | Official council ID (e.g. `MMC-2010-44821`) |
| `institution` | `VARCHAR(150)` | INDEX, NOT NULL | Hospital/clinic affiliation |
| `registration_status`| `VARCHAR(20)` | NOT NULL, DEFAULT `'verified'` | Verification status |

### D. Opaque Sessions (`sessions`)
Database-backed opaque sessions storing SHA-256 token hashes rather than raw tokens.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Session UUID |
| `token_hash` | `VARCHAR(64)` | UNIQUE, INDEX, NOT NULL | **SHA-256** hash of raw cookie token |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`users.id`, ON DELETE CASCADE), INDEX | Owning user |
| `role` | `VARCHAR(20)` | NOT NULL | Session authorization role |
| `ip_hash` | `VARCHAR(64)` | NOT NULL | Masked client IP |
| `user_agent` | `VARCHAR(255)` | Nullable | Client user-agent string |
| `created_at` | `DATETIME` | NOT NULL | Session initialization timestamp |
| `last_accessed_at` | `DATETIME` | NOT NULL | Idle activity tracker |
| `expires_at` | `DATETIME` | INDEX, NOT NULL | Inactivity expiration (15-minute sliding window) |
| `absolute_expires_at`| `DATETIME` | INDEX, NOT NULL | Hard expiration ceiling (12 hours maximum) |
| `is_revoked` | `BOOLEAN` | INDEX, NOT NULL, DEFAULT False | Explicit logout / revocation flag |

### E. Patient Consent Directives (`consent_grants`)
Enforces server-side access control for clinicians and institutions.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Grant UUID |
| `patient_id` | `VARCHAR(36)` | FOREIGN KEY (`patient_profiles.id`, ON DELETE CASCADE), INDEX | Grantor patient profile |
| `doctor_id` | `VARCHAR(36)` | FOREIGN KEY (`doctor_profiles.id`, ON DELETE SET NULL), Nullable | Specific clinician (if restricted) |
| `institution` | `VARCHAR(150)` | INDEX, NOT NULL | Permitted hospital/institution |
| `status` | `VARCHAR(20)` | INDEX, NOT NULL, DEFAULT `'active'` | `"active"`, `"expired"`, `"revoked"` |
| `scopes_json` | `TEXT` | NOT NULL | JSON array: `["ecg", "vitals", "meds", "notes"]` |
| `granted_at` | `DATETIME` | NOT NULL | Grant timestamp |
| `expires_at` | `DATETIME` | INDEX, NOT NULL | Legal expiration timestamp |
| `revoked_at` | `DATETIME` | Nullable | Immediate revocation timestamp |

### F. Telemetry Chunks (`telemetry_chunks`)
Stores timestamped 250 Hz binary physiological waveforms with relational metadata.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Chunk UUID |
| `patient_id` | `VARCHAR(36)` | FOREIGN KEY (`patient_profiles.id`, ON DELETE CASCADE), INDEX | Subject patient |
| `lead_name` | `VARCHAR(20)` | NOT NULL, DEFAULT `'Lead-II'` | ECG lead configuration |
| `sampling_rate_hz` | `INTEGER` | NOT NULL, DEFAULT 250 | Sampling frequency (250 Hz) |
| `start_timestamp` | `DATETIME` | INDEX, NOT NULL | Window start (UTC) |
| `end_timestamp` | `DATETIME` | INDEX, NOT NULL | Window end (UTC) |
| `sample_count` | `INTEGER` | NOT NULL | Number of samples (e.g. 1,250 for 5s) |
| `signal_quality_index`| `FLOAT` | NOT NULL | SQI (0.0 to 1.0) |
| `missing_samples_count`| `INTEGER`| NOT NULL, DEFAULT 0 | Count of dropped ADC samples |
| `compression_codec` | `VARCHAR(20)` | NOT NULL | `"raw"`, `"zlib"`, `"delta_zlib"` |
| `uncompressed_bytes`| `INTEGER` | NOT NULL | Raw byte size (2 bytes * sample_count) |
| `compressed_bytes` | `INTEGER` | NOT NULL | Stored payload size in bytes |
| `payload` | `BLOB` | NOT NULL | Binary compressed payload |
| `payload_checksum_sha256`| `VARCHAR(64)`| NOT NULL | Cryptographic payload checksum |

### G. Tiered Alert Events (`alert_events`)
Records clinical triggers across Level 1, 2, and 3 escalation tiers.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Alert UUID |
| `patient_id` | `VARCHAR(36)` | FOREIGN KEY (`patient_profiles.id`, ON DELETE CASCADE), INDEX | Affected patient |
| `level` | `VARCHAR(10)` | INDEX, NOT NULL | `"L1"`, `"L2"`, `"L3"` |
| `trigger_signal` | `VARCHAR(50)` | NOT NULL | Arrhythmia trigger (e.g. `ventricular_tachycardia`) |
| `summary` | `VARCHAR(255)` | NOT NULL | Clinical summary description |
| `status` | `VARCHAR(20)` | INDEX, NOT NULL, DEFAULT `'active'`| `"active"`, `"acknowledged"`, `"resolved"` |
| `triggered_at` | `DATETIME` | INDEX, NOT NULL | Event trigger timestamp |
| `acknowledged_by_doctor_id`| `VARCHAR(36)`| FOREIGN KEY (`doctor_profiles.id`), Nullable | Reviewing clinician |
| `acknowledged_at` | `DATETIME` | Nullable | Review timestamp |
| `escalation_tier` | `INTEGER` | NOT NULL, DEFAULT 1 | Escalation step |
| `payload_json` | `TEXT` | NOT NULL, DEFAULT `'{}'` | Vitals snapshot and lead metrics |

### H. Tamper-Evident Audit Trail (`audit_events`)
Cryptographically hash-chained audit log with strict credential sanitization.
| Column | Type | Constraints / Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY | Audit event UUID |
| `actor_user_id` | `VARCHAR(36)` | INDEX, Nullable | Acting user UUID (or Null for unauth) |
| `actor_role` | `VARCHAR(20)` | NOT NULL | User role |
| `action` | `VARCHAR(50)` | INDEX, NOT NULL | Operation (e.g. `AUTH_LOGIN`, `CHART_ACCESS`) |
| `resource_type` | `VARCHAR(50)` | NOT NULL | Target type (`session`, `patient_chart`, `consent`) |
| `resource_id` | `VARCHAR(50)` | Nullable | Specific record identifier |
| `outcome` | `VARCHAR(20)` | NOT NULL | `"SUCCESS"`, `"DENIED"`, `"ERROR"` |
| `ip_hash` | `VARCHAR(64)` | NOT NULL | Client IP hash |
| `details_json` | `TEXT` | NOT NULL | Sanitized JSON metadata (secrets redacted) |
| `previous_event_hash`| `VARCHAR(64)`| Nullable | SHA-256 hash of previous audit record |
| `event_hash` | `VARCHAR(64)` | NOT NULL | SHA-256 hash of this record and previous hash |
| `timestamp` | `DATETIME` | INDEX, NOT NULL | UTC event timestamp |

---

## 3. Synthetic Test Fixtures

All records seeded during initialization are deterministic synthetic fixtures. No real clinical records or identifiable private health information are stored:
1. **Patient Fixture**: Aarav Menon (`aarav.menon@example.com`, MRN `44821`, password `patient123`).
2. **Clinician Fixture**: Dr. Neha Raghavan (`neha.raghavan@meridianheart.in`, registration `MMC-2010-44821`, TOTP secret `JBSWY3DPEHPK3PXP`, password `clinician123`).
3. **Unconsented/Expired Patient Fixture**: Rohit Sharma (`rohit.sharma@example.com`, MRN `11204`).
4. **Active Consent**: Granted by Aarav Menon to Meridian Heart Institute with full scopes (`["ecg", "vitals", "meds", "notes", "referrals"]`).
5. **Expired Consent**: Rohit Sharma grant to Meridian Heart Institute expired 10 days ago.

---

## 4. Migration Path to PostgreSQL / TimescaleDB

The schema is built to ensure seamless transition to PostgreSQL:
1. All JSON fields (`conditions_json`, `baseline_summary_json`, `scopes_json`, `details_json`) map 1:1 to `JSONB` in PostgreSQL.
2. `UUID` identifiers map directly to PostgreSQL native `UUID` types.
3. `telemetry_chunks` payload uses `LargeBinary` (SQLite `BLOB` / PostgreSQL `BYTEA`). In Phase 8, this table will be partitioned into a TimescaleDB hypertable on `start_timestamp` or redirected to S3 presigned storage.
