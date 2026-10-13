"""
Timestamped Binary Telemetry Chunk Model
Relational metadata with binary payload (BLOB) for 250 Hz ECG samples.
Supports replaceable storage interface (SQLite BLOB in dev, filesystem/S3 abstraction ready).
"""

import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, LargeBinary, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class TelemetryChunk(Base):
    __tablename__ = "telemetry_chunks"
    __table_args__ = (
        UniqueConstraint("patient_id", "lead_name", "start_timestamp", name="uq_telemetry_patient_lead_start"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    lead_name: Mapped[str] = mapped_column(String(20), default="Lead-II", nullable=False)
    sampling_rate_hz: Mapped[int] = mapped_column(Integer, default=250, nullable=False)
    
    start_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    end_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Signal quality & clinical telemetry integrity
    signal_quality_index: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)  # 0.0 to 1.0 (SQI)
    missing_samples_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Compression & Storage representation
    # "raw": uncompressed int16 array
    # "zlib": zlib/deflate compressed int16
    # "delta_zlib": first-order delta difference + zlib compressed
    compression_codec: Mapped[str] = mapped_column(String(20), default="raw", nullable=False)
    uncompressed_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    compressed_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Binary Chunk Payload
    payload: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    payload_checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    patient = relationship("PatientProfile", back_populates="telemetry_chunks")


class TelemetryRecording(Base, TimestampMixin):
    __tablename__ = "telemetry_recordings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    device_id: Mapped[str] = mapped_column(String(100), default="edge_device_default", nullable=False)
    lead_config: Mapped[str] = mapped_column(String(20), default="12-lead", nullable=False)
    active_leads_mask: Mapped[int] = mapped_column(Integer, default=0x0FFF, nullable=False)
    sampling_rate_hz: Mapped[int] = mapped_column(Integer, default=250, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, completed, interrupted
    
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    patient = relationship("PatientProfile", back_populates="telemetry_recordings")
    chunks = relationship(
        "TelemetryMultiChannelChunk",
        back_populates="recording",
        cascade="all, delete-orphan",
        order_by="TelemetryMultiChannelChunk.sequence_number",
    )


class TelemetryMultiChannelChunk(Base):
    __tablename__ = "telemetry_multichannel_chunks"
    __table_args__ = (
        UniqueConstraint("recording_id", "sequence_number", name="uq_multichannel_recording_seq"),
        UniqueConstraint("recording_id", "start_timestamp", name="uq_multichannel_recording_start"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    recording_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("telemetry_recordings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sequence_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    start_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    end_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    channel_count: Mapped[int] = mapped_column(Integer, nullable=False)
    active_leads_mask: Mapped[int] = mapped_column(Integer, nullable=False)
    lead_off_mask: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clipping_mask: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    average_sqi: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    missing_samples_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    compression_codec: Mapped[str] = mapped_column(String(20), default="delta_zlib_planar", nullable=False)
    uncompressed_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    compressed_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    payload: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    payload_checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    recording = relationship("TelemetryRecording", back_populates="chunks")
    patient = relationship("PatientProfile")

