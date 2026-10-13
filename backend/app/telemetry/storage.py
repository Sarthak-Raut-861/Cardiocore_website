"""
Replaceable ECG Telemetry Storage Interface
Isolates storage mechanism behind repository boundary to preserve migration path
from SQLite BLOB in Phase 7 to PostgreSQL/TimescaleDB or Object Store (S3) in Phase 8+.
"""

import hashlib
from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.telemetry import TelemetryChunk
from app.telemetry.chunk import (
    validate_chunk_metadata,
    compute_signal_quality,
    decode_delta_samples,
    decode_raw_samples,
)


class TelemetryStorageInterface(ABC):
    """Abstract contract for ECG telemetry chunk storage."""

    @abstractmethod
    async def store_chunk(
        self,
        db: AsyncSession,
        patient_id: str,
        lead_name: str,
        sampling_rate_hz: int,
        start_timestamp: datetime,
        end_timestamp: datetime,
        samples: List[int],
        codec: str = "delta_zlib",
    ) -> TelemetryChunk:
        """Store chunk with metadata and binary payload."""
        pass

    @abstractmethod
    async def get_chunk_by_id(
        self,
        db: AsyncSession,
        chunk_id: str,
    ) -> Optional[TelemetryChunk]:
        """Fetch chunk by ID."""
        pass

    @abstractmethod
    async def query_patient_chunks(
        self,
        db: AsyncSession,
        patient_id: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 50,
    ) -> List[TelemetryChunk]:
        """Retrieve chunks within a time window for a patient."""
        pass


class RelationalBlobTelemetryStorage(TelemetryStorageInterface):
    """
    SQLite/PostgreSQL relational BLOB implementation.
    Stores binary payload inside telemetry_chunks table.
    """

    async def store_chunk(
        self,
        db: AsyncSession,
        patient_id: str,
        lead_name: str,
        sampling_rate_hz: int,
        start_timestamp: datetime,
        end_timestamp: datetime,
        samples: List[int],
        codec: str = "delta_zlib",
    ) -> TelemetryChunk:
        from app.telemetry.chunk import (
            encode_raw_samples,
            encode_delta_samples,
        )

        sample_count = len(samples)
        raw_bytes = encode_raw_samples(samples)
        uncompressed_size = len(raw_bytes)

        if codec == "delta_zlib":
            payload = encode_delta_samples(samples)
        elif codec == "zlib":
            import zlib
            payload = zlib.compress(raw_bytes, level=6)
        else:
            codec = "raw"
            payload = raw_bytes

        compressed_size = len(payload)
        checksum = hashlib.sha256(payload).hexdigest()
        sqi, missing = compute_signal_quality(samples)

        # Validate metadata
        is_valid, err = validate_chunk_metadata(
            start_time=start_timestamp,
            end_time=end_timestamp,
            sampling_rate_hz=sampling_rate_hz,
            sample_count=sample_count,
            payload_bytes=payload,
            expected_checksum=checksum,
        )
        if not is_valid:
            raise ValueError(f"Telemetry chunk validation failed: {err}")

        chunk = TelemetryChunk(
            patient_id=patient_id,
            lead_name=lead_name,
            sampling_rate_hz=sampling_rate_hz,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            sample_count=sample_count,
            signal_quality_index=sqi,
            missing_samples_count=missing,
            compression_codec=codec,
            uncompressed_bytes=uncompressed_size,
            compressed_bytes=compressed_size,
            payload=payload,
            payload_checksum_sha256=checksum,
        )

        db.add(chunk)
        await db.commit()
        await db.refresh(chunk)
        return chunk

    async def get_chunk_by_id(
        self,
        db: AsyncSession,
        chunk_id: str,
    ) -> Optional[TelemetryChunk]:
        stmt = select(TelemetryChunk).where(TelemetryChunk.id == chunk_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def query_patient_chunks(
        self,
        db: AsyncSession,
        patient_id: str,
        start_time: datetime,
        end_time: datetime,
        limit: int = 50,
    ) -> List[TelemetryChunk]:
        stmt = (
            select(TelemetryChunk)
            .where(
                and_(
                    TelemetryChunk.patient_id == patient_id,
                    TelemetryChunk.start_timestamp >= start_time,
                    TelemetryChunk.end_timestamp <= end_time,
                )
            )
            .order_by(TelemetryChunk.start_timestamp.asc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


telemetry_storage = RelationalBlobTelemetryStorage()
