"""
CardioCoreEdge Telemetry APIRouter & WebSocket Ingestion
- Binary WebSocket streaming endpoint for low-latency physiological waveforms.
- Frame validation, CRC32 verification, duplicate rejection, and gap detection.
- Backpressure signaling and connection concurrency enforcement.
- Documented HTTP batch recovery endpoint for buffered offline synchronization.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    WebSocket,
    WebSocketDisconnect,
    Query,
    Body,
)
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, async_session_factory
from app.models.session import SessionModel
from app.models.telemetry import TelemetryChunk, TelemetryRecording, TelemetryMultiChannelChunk
from app.core.dependencies import get_current_session, verify_csrf_token
from app.services.session_service import get_valid_session
from app.services.audit_service import log_audit_event
from app.telemetry.protocol import (
    unpack_frame,
    pack_frame,
    make_ack_frame,
    make_backpressure_frame,
    make_error_frame,
    ProtocolParseError,
    MSG_TYPE_ECG_DATA,
    MSG_TYPE_HEARTBEAT,
    FLAG_DELTA_ZLIB,
    PROTOCOL_VERSION_V2,
    MultiChannelFrameHeader,
    unpack_multichannel_frame,
    ALL_12_LEADS_MASK,
    SUPPORTED_CHANNEL_CONFIGS,
    LEAD_NAMES_ORDER,
)
import base64
from app.telemetry.stream_manager import stream_manager
from app.telemetry.storage import telemetry_storage
from app.telemetry.chunk import (
    decode_delta_samples,
    decode_raw_samples,
    encode_multichannel_raw,
    decode_multichannel_raw,
    encode_multichannel_delta,
    decode_multichannel_delta,
    compute_multichannel_signal_quality,
)
import hashlib
from pydantic import BaseModel, Field

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.websocket("/ws/{session_token}")
async def websocket_telemetry_stream(
    websocket: WebSocket,
    session_token: str,
    device_id: str = Query(default="edge_device_default"),
    mode: str = Query(default="ingest"),
    patient_id: Optional[str] = Query(default=None),
):
    """
    WebSocket continuous binary telemetry streaming endpoint.
    - mode="ingest": Edge device sends binary frames to backend (validated & persisted).
    - mode="monitor": Monitor client receives validated synthetic Lead-II ECG frames at 250 Hz.
    """
    await websocket.accept()

    # 1. Authenticate session token
    async with async_session_factory() as db:
        session_record = await get_valid_session(db, session_token)
        if not session_record:
            await websocket.send_bytes(
                make_error_frame(0, 4401, "Authentication failed: invalid or expired session")
            )
            await websocket.close(code=4401)
            return

        user = session_record.user
        patient_profile = user.patient_profile if user else None
        if not patient_profile and session_record.role != "doctor":
            await websocket.send_bytes(
                make_error_frame(0, 4403, "Authorization failed: no patient profile associated")
            )
            await websocket.close(code=4403)
            return

        is_doctor = session_record.role == "doctor"
        doctor_institution = user.doctor_profile.institution if (is_doctor and user and user.doctor_profile) else None

        # Cross-patient access restriction: Patients cannot stream or request another patient's telemetry
        if not is_doctor:
            if patient_id and patient_profile and patient_id != patient_profile.id and patient_id != patient_profile.mrn:
                await websocket.send_bytes(
                    make_error_frame(0, 4403, "Access denied: cannot access another patient's telemetry stream")
                )
                await websocket.close(code=4403)
                return
            target_patient_id = patient_profile.id if patient_profile else session_record.user_id
        else:
            target_patient_id = patient_id or "prof_patient_aarav_44821"

        user_id = session_record.user_id

        # Verify initial consent if doctor monitoring patient
        if is_doctor:
            from app.services.consent_service import verify_consent
            has_consent, _ = await verify_consent(db, target_patient_id, doctor_institution or "Meridian Heart Institute", "ecg")
            if not has_consent:
                await websocket.send_bytes(
                    make_error_frame(0, 4403, "Access denied: patient has not granted ECG consent to institution")
                )
                await websocket.close(code=4403)
                return

    # 2. Concurrency and stream registration
    stream_id = f"{user_id}:{device_id}:{mode}"
    ok, err_msg, state = stream_manager.register_stream(
        stream_id=stream_id,
        user_id=user_id,
        patient_id=target_patient_id,
    )
    if not ok:
        await websocket.send_bytes(make_error_frame(0, 4429, err_msg or "Limit exceeded"))
        await websocket.close(code=4429)
        return

    # 3. Live Monitor Streaming Mode
    if mode == "monitor":
        import asyncio
        import time
        from app.telemetry.benchmark import generate_synthetic_ecg
        from app.telemetry.chunk import encode_raw_samples

        synthetic_pool = generate_synthetic_ecg(duration_seconds=60, sampling_rate_hz=250)
        pool_idx = 0
        seq = 1
        samples_per_frame = 50  # 200 ms chunks at 250 Hz (5 frames/sec)
        frame_interval_sec = 0.20
        security_check_counter = 0

        stream_start_perf = time.perf_counter()
        try:
            while True:
                # Calculate sleep duration to hit next nominal tick, compensating for loop processing drift
                target_tick = stream_start_perf + (seq * frame_interval_sec)
                now_perf = time.perf_counter()
                sleep_dur = max(0.0005, target_tick - now_perf)

                # Check for client-initiated close or message non-blockingly
                try:
                    client_msg = await asyncio.wait_for(websocket.receive(), timeout=sleep_dur)
                    if client_msg.get("type") == "websocket.disconnect":
                        break
                except asyncio.TimeoutError:
                    pass

                # Check session validity and consent periodically (every 5 frames ~ 1 sec)
                security_check_counter += 1
                if security_check_counter % 5 == 0:
                    async with async_session_factory() as db:
                        # 1. Enforce session active state (catches mid-stream logout / session expiration)
                        active_sess = await get_valid_session(db, session_token)
                        if not active_sess or not active_sess.is_valid():
                            await websocket.send_bytes(
                                make_error_frame(seq, 4401, "Session expired or invalidated during streaming")
                            )
                            await websocket.close(code=4401)
                            return

                        # 2. Enforce consent active state if clinician
                        if is_doctor:
                            from app.services.consent_service import verify_consent
                            has_consent, _ = await verify_consent(db, target_patient_id, doctor_institution or "Meridian Heart Institute", "ecg")
                            if not has_consent:
                                await websocket.send_bytes(
                                    make_error_frame(seq, 4403, "Consent revoked: streaming terminated")
                                )
                                await websocket.close(code=4403)
                                return

                # Slice next physiological waveform segment
                end_idx = pool_idx + samples_per_frame
                if end_idx <= len(synthetic_pool):
                    frame_samples = synthetic_pool[pool_idx:end_idx]
                    pool_idx = end_idx % len(synthetic_pool)
                else:
                    frame_samples = synthetic_pool[pool_idx:] + synthetic_pool[: (end_idx % len(synthetic_pool))]
                    pool_idx = end_idx % len(synthetic_pool)

                payload = encode_raw_samples(frame_samples)
                now_ms = int(time.time() * 1000)

                frame_data = pack_frame(
                    msg_type=MSG_TYPE_ECG_DATA,
                    sequence_number=seq,
                    base_timestamp_ms=now_ms,
                    sampling_rate_hz=250,
                    channel_id=1,  # Lead-II
                    sample_count=len(frame_samples),
                    flags=0,
                    payload=payload,
                )

                await websocket.send_bytes(frame_data)
                seq = (seq + 1) & 0xFFFFFFFF

        except WebSocketDisconnect:
            pass
        except Exception:
            pass
        finally:
            stream_manager.unregister_stream(stream_id)
        return

    # 4. Ingestion Mode (Edge device uploading frames)
    try:
        while True:
            # Receive binary frame
            data = await websocket.receive_bytes()

            # Parse and validate header, bounds, and CRC-32
            try:
                header, payload = unpack_frame(data)
            except ProtocolParseError as pe:
                await websocket.send_bytes(make_error_frame(0, pe.code, str(pe)))
                continue

            # Heartbeat handling
            if header.msg_type == MSG_TYPE_HEARTBEAT:
                await websocket.send_bytes(make_ack_frame(header.sequence_number, int(header.base_timestamp_ms)))
                continue

            # Sequence tracking & duplicate detection
            is_duplicate, is_gap, seq_err = state.record_frame(header)
            if is_duplicate:
                # Acknowledge without double-writing duplicate frame to DB
                await websocket.send_bytes(make_ack_frame(header.sequence_number, header.base_timestamp_ms))
                continue

            # Check backpressure conditions
            if state.should_apply_backpressure():
                await websocket.send_bytes(
                    make_backpressure_frame(header.sequence_number, state.pending_buffer_count)
                )

            # Persist valid ECG chunk to database
            if header.msg_type == MSG_TYPE_ECG_DATA:
                try:
                    # Decompress or unpack int16 samples
                    if header.is_compressed:
                        samples = decode_delta_samples(payload)
                        codec = "delta_zlib"
                    else:
                        samples = decode_raw_samples(payload)
                        codec = "raw"

                    start_dt = datetime.utcfromtimestamp(header.base_timestamp_ms / 1000.0)
                    duration_sec = header.sample_count / (header.sampling_rate_hz or 250)
                    end_dt = start_dt + timedelta(seconds=duration_sec)

                    async with async_session_factory() as db:
                        stmt_existing = select(TelemetryChunk).where(
                            and_(
                                TelemetryChunk.patient_id == target_patient_id,
                                TelemetryChunk.lead_name == "Lead-II",
                                TelemetryChunk.start_timestamp == start_dt,
                            )
                        )
                        existing_chunk = (await db.execute(stmt_existing)).scalars().first()
                        if not existing_chunk:
                            await telemetry_storage.store_chunk(
                                db=db,
                                patient_id=target_patient_id,
                                lead_name="Lead-II",
                                sampling_rate_hz=header.sampling_rate_hz,
                                start_timestamp=start_dt,
                                end_timestamp=end_dt,
                                samples=samples,
                                codec=codec,
                            )

                    # Send ACK frame upon successful storage (or duplicate ACK)
                    await websocket.send_bytes(make_ack_frame(header.sequence_number, header.base_timestamp_ms))

                except Exception as ex:
                    await websocket.send_bytes(
                        make_error_frame(header.sequence_number, 5000, f"Storage error: {str(ex)}")
                    )

    except WebSocketDisconnect:
        stream_manager.unregister_stream(stream_id)
    except Exception:
        stream_manager.unregister_stream(stream_id)


MAX_BATCH_FRAMES = 50


@router.post("/batch")
async def batch_upload_telemetry(
    raw_frames: List[str] = Body(default=[]),  # Hex-encoded binary frames
    patient_id: Optional[str] = Query(default=None),
    session: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Documented HTTP batch-upload contract for buffered recovery after disconnection.
    Guarantees idempotency: repeated submissions of identical batches do not create duplicates.
    Conflicting frames with identical timestamps but differing checksums are safely rejected.
    """
    if len(raw_frames) > MAX_BATCH_FRAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size {len(raw_frames)} exceeds maximum allowed limit ({MAX_BATCH_FRAMES} frames)",
        )

    user = session.user
    patient = user.patient_profile if user else None
    if not patient and session.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: active patient profile required for telemetry ingestion",
        )

    if session.role != "doctor":
        if patient_id and patient and patient_id != patient.id and patient_id != patient.mrn:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: patients cannot upload telemetry for another patient",
            )
        target_patient_id = patient.id if patient else session.user_id
    else:
        target_patient_id = patient_id or "prof_patient_aarav_44821"
        doctor_institution = user.doctor_profile.institution if (user and user.doctor_profile) else "Meridian Heart Institute"
        from app.services.consent_service import verify_consent
        has_consent, _ = await verify_consent(db, target_patient_id, doctor_institution, "ecg")
        if not has_consent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Consent revoked: patient has not granted ECG consent to institution",
            )

    patient_id = target_patient_id

    processed = 0
    duplicates = 0
    conflicts = 0
    errors = 0

    from sqlalchemy import select, and_
    from app.models.telemetry import TelemetryChunk
    import hashlib

    for hex_frame in raw_frames:
        try:
            data = bytes.fromhex(hex_frame)
            header, payload = unpack_frame(data)

            if header.msg_type != MSG_TYPE_ECG_DATA:
                continue

            # Phase 10 authorized scope: single-lead Lead-II telemetry pipeline
            lead_name = "Lead-II"
            start_dt = datetime.utcfromtimestamp(header.base_timestamp_ms / 1000.0)
            duration_sec = header.sample_count / (header.sampling_rate_hz or 250)
            end_dt = start_dt + timedelta(seconds=duration_sec)

            # Idempotency check: query if this chunk is already stored
            stmt_existing = select(TelemetryChunk).where(
                and_(
                    TelemetryChunk.patient_id == patient_id,
                    TelemetryChunk.lead_name == lead_name,
                    TelemetryChunk.start_timestamp == start_dt,
                )
            )
            result = await db.execute(stmt_existing)
            existing_chunks = result.scalars().all()

            computed_sha = hashlib.sha256(payload).hexdigest()

            if existing_chunks:
                # Exact identical retry -> idempotent success without duplicate row
                if any(c.payload_checksum_sha256 == computed_sha for c in existing_chunks):
                    duplicates += 1
                    continue
                else:
                    # Conflicting payload for identical timestamp and lead
                    conflicts += 1
                    errors += 1
                    continue

            # Process new frame
            if header.is_compressed:
                samples = decode_delta_samples(payload)
                codec = "delta_zlib"
            else:
                samples = decode_raw_samples(payload)
                codec = "raw"

            try:
                await telemetry_storage.store_chunk(
                    db=db,
                    patient_id=patient_id,
                    lead_name=lead_name,
                    sampling_rate_hz=header.sampling_rate_hz,
                    start_timestamp=start_dt,
                    end_timestamp=end_dt,
                    samples=samples,
                    codec=codec,
                )
                processed += 1
            except Exception:
                # Handle concurrent insert race condition
                await db.rollback()
                stmt_retry = select(TelemetryChunk).where(
                    and_(
                        TelemetryChunk.patient_id == patient_id,
                        TelemetryChunk.lead_name == lead_name,
                        TelemetryChunk.start_timestamp == start_dt,
                    )
                )
                result_retry = await db.execute(stmt_retry)
                retried = result_retry.scalars().all()
                if retried and any(c.payload_checksum_sha256 == computed_sha for c in retried):
                    duplicates += 1
                elif retried:
                    conflicts += 1
                    errors += 1
                else:
                    errors += 1
        except Exception:
            errors += 1

    return {
        "status": "completed",
        "processedChunks": processed,
        "duplicateChunks": duplicates,
        "conflictChunks": conflicts,
        "errorCount": errors,
        "contract": "HTTP-Batch-Recovery-v1",
    }


@router.get("/chunk/{chunk_id}")
async def get_telemetry_chunk_metadata(
    chunk_id: str,
    session: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata of a stored telemetry chunk."""
    chunk = await telemetry_storage.get_chunk_by_id(db, chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telemetry chunk not found.",
        )

    return {
        "id": chunk.id,
        "patientId": chunk.patient_id,
        "leadName": chunk.lead_name,
        "samplingRateHz": chunk.sampling_rate_hz,
        "sampleCount": chunk.sample_count,
        "signalQualityIndex": chunk.signal_quality_index,
        "missingSamplesCount": chunk.missing_samples_count,
        "compressionCodec": chunk.compression_codec,
        "uncompressedBytes": chunk.uncompressed_bytes,
        "compressedBytes": chunk.compressed_bytes,
        "checksumSha256": chunk.payload_checksum_sha256,
        "startTimestamp": chunk.start_timestamp.isoformat() + "Z",
        "endTimestamp": chunk.end_timestamp.isoformat() + "Z",
    }


# ==============================================================================
# Phase 12: Synchronized Multi-Channel Telemetry Endpoints (Protocol v2)
# ==============================================================================

class CreateRecordingRequest(BaseModel):
    patient_id: str
    device_id: str = "edge_device_default"
    lead_config: str = "12-lead"
    active_leads_mask: int = ALL_12_LEADS_MASK
    sampling_rate_hz: int = 250
    notes: Optional[str] = None


class UpdateRecordingStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(completed|interrupted)$")


class IngestMultiChannelChunksRequest(BaseModel):
    frames: List[str]


@router.post("/recordings", status_code=status.HTTP_201_CREATED)
async def create_telemetry_recording(
    data: CreateRecordingRequest,
    session: SessionModel = Depends(get_current_session),
    _csrf: None = Depends(verify_csrf_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Create an authorized, versioned multi-lead ECG telemetry recording.
    Enforces strict patient authorization, consent boundaries, and channel validation.
    """
    user = session.user
    patient_profile = user.patient_profile if user else None
    is_doctor = session.role == "doctor"

    if not is_doctor:
        if not patient_profile or (data.patient_id != patient_profile.id and data.patient_id != patient_profile.mrn):
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="RECORDING_CREATE_DENIED",
                resource_type="telemetry_recording",
                resource_id=None,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"target_patient_id": data.patient_id, "reason": "Cross-patient recording creation denied"},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cannot create recording for another patient.",
            )
        target_patient_id = patient_profile.id
    else:
        target_patient_id = data.patient_id
        from app.services.consent_service import verify_consent
        doctor_institution = user.doctor_profile.institution if (user and user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, target_patient_id, doctor_institution, "ecg")
        if not has_consent:
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="RECORDING_CREATE_DENIED",
                resource_type="telemetry_recording",
                resource_id=None,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"target_patient_id": target_patient_id, "reason": "No ECG consent for institution"},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: patient has not granted ECG consent to institution.",
            )

    # Validate channel mask and configurations
    if data.active_leads_mask == 0 or (data.active_leads_mask & ~ALL_12_LEADS_MASK):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid active leads mask 0x{data.active_leads_mask:04X}. Must be non-zero and within 0x0FFF.",
        )

    if data.sampling_rate_hz not in [125, 250, 500, 1000]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported sampling rate {data.sampling_rate_hz} Hz. Supported: [125, 250, 500, 1000].",
        )

    if data.lead_config not in ["12-lead", "6-lead", "3-lead", "single-lead"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported lead configuration '{data.lead_config}'.",
        )

    recording = TelemetryRecording(
        patient_id=target_patient_id,
        device_id=data.device_id,
        lead_config=data.lead_config,
        active_leads_mask=data.active_leads_mask,
        sampling_rate_hz=data.sampling_rate_hz,
        status="active",
        notes=data.notes,
    )
    db.add(recording)
    await db.commit()
    await db.refresh(recording)

    await log_audit_event(
        db=db,
        actor_user_id=session.user_id,
        actor_role=session.role,
        action="RECORDING_CREATE",
        resource_type="telemetry_recording",
        resource_id=recording.id,
        outcome="SUCCESS",
        ip_hash=session.ip_hash,
        details={
            "patient_id": target_patient_id,
            "lead_config": data.lead_config,
            "active_leads_mask": f"0x{data.active_leads_mask:04X}",
            "sampling_rate_hz": data.sampling_rate_hz,
        },
    )

    return {
        "id": recording.id,
        "patientId": recording.patient_id,
        "deviceId": recording.device_id,
        "leadConfig": recording.lead_config,
        "activeLeadsMask": recording.active_leads_mask,
        "samplingRateHz": recording.sampling_rate_hz,
        "status": recording.status,
        "startedAt": recording.started_at.isoformat() + "Z",
        "notes": recording.notes,
    }


@router.get("/recordings/{recording_id}")
async def get_telemetry_recording(
    recording_id: str,
    session: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata and status of a multi-lead ECG recording."""
    stmt = select(TelemetryRecording).where(TelemetryRecording.id == recording_id)
    recording = (await db.execute(stmt)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry recording not found.")

    # Authorization verification
    if session.role != "doctor":
        patient_profile = session.user.patient_profile if session.user else None
        if not patient_profile or recording.patient_id != patient_profile.id:
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="RECORDING_ACCESS_DENIED",
                resource_type="telemetry_recording",
                resource_id=recording_id,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"target_recording_id": recording_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: unauthorized access.")
    else:
        from app.services.consent_service import verify_consent
        doctor_institution = session.user.doctor_profile.institution if (session.user and session.user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, recording.patient_id, doctor_institution, "ecg")
        if not has_consent:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: no ECG consent.")

    # Aggregate chunk stats
    stmt_count = select(
        func.count(TelemetryMultiChannelChunk.id),
        func.coalesce(func.sum(TelemetryMultiChannelChunk.sample_count), 0),
    ).where(TelemetryMultiChannelChunk.recording_id == recording_id)
    res = await db.execute(stmt_count)
    chunk_count, total_samples = res.one()

    return {
        "id": recording.id,
        "patientId": recording.patient_id,
        "deviceId": recording.device_id,
        "leadConfig": recording.lead_config,
        "activeLeadsMask": recording.active_leads_mask,
        "samplingRateHz": recording.sampling_rate_hz,
        "status": recording.status,
        "startedAt": recording.started_at.isoformat() + "Z",
        "endedAt": (recording.ended_at.isoformat() + "Z") if recording.ended_at else None,
        "notes": recording.notes,
        "chunkCount": chunk_count,
        "totalSamplesPerLead": total_samples,
    }


@router.patch("/recordings/{recording_id}/status")
async def update_telemetry_recording_status(
    recording_id: str,
    data: UpdateRecordingStatusRequest,
    session: SessionModel = Depends(get_current_session),
    _csrf: None = Depends(verify_csrf_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Update recording lifecycle status (active -> completed or interrupted).
    Rejects transitions on already terminated recordings.
    """
    stmt = select(TelemetryRecording).where(TelemetryRecording.id == recording_id)
    recording = (await db.execute(stmt)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry recording not found.")

    # Authorization
    if session.role != "doctor":
        patient_profile = session.user.patient_profile if session.user else None
        if not patient_profile or recording.patient_id != patient_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        from app.services.consent_service import verify_consent
        doctor_institution = session.user.doctor_profile.institution if (session.user and session.user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, recording.patient_id, doctor_institution, "ecg")
        if not has_consent:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: no ECG consent.")

    if recording.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition recording from '{recording.status}' to '{data.status}'.",
        )

    recording.status = data.status
    recording.ended_at = datetime.utcnow()
    await db.commit()
    await db.refresh(recording)

    await log_audit_event(
        db=db,
        actor_user_id=session.user_id,
        actor_role=session.role,
        action="RECORDING_STATUS_UPDATE",
        resource_type="telemetry_recording",
        resource_id=recording.id,
        outcome="SUCCESS",
        ip_hash=session.ip_hash,
        details={"new_status": data.status},
    )

    return {
        "id": recording.id,
        "status": recording.status,
        "endedAt": recording.ended_at.isoformat() + "Z",
    }


@router.post("/recordings/{recording_id}/chunks")
async def ingest_multichannel_chunks(
    recording_id: str,
    body: IngestMultiChannelChunksRequest,
    session: SessionModel = Depends(get_current_session),
    _csrf: None = Depends(verify_csrf_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingest synchronized Protocol v2 multi-channel ECG chunks into a recording.
    Enforces atomic uniqueness, idempotent retries, conflict detection, and audit trails.
    """
    stmt = select(TelemetryRecording).where(TelemetryRecording.id == recording_id)
    recording = (await db.execute(stmt)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry recording not found.")

    # Authorization
    if session.role != "doctor":
        patient_profile = session.user.patient_profile if session.user else None
        if not patient_profile or recording.patient_id != patient_profile.id:
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="MULTICHANNEL_INGEST_DENIED",
                resource_type="telemetry_recording",
                resource_id=recording_id,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"target_recording_id": recording_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        from app.services.consent_service import verify_consent
        doctor_institution = session.user.doctor_profile.institution if (session.user and session.user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, recording.patient_id, doctor_institution, "ecg")
        if not has_consent:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: no ECG consent.")

    if recording.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot ingest chunks into a terminated recording (status: '{recording.status}').",
        )

    processed = 0
    duplicates = 0
    conflicts = 0
    errors = 0

    for hex_frame in body.frames:
        try:
            frame_bytes = bytes.fromhex(hex_frame)
            header, payload = unpack_frame(frame_bytes)

            # Must be multi-channel Protocol v2 frame
            if not isinstance(header, MultiChannelFrameHeader) and getattr(header, "version", 0) != PROTOCOL_VERSION_V2:
                errors += 1
                continue

            if header.msg_type != MSG_TYPE_ECG_DATA:
                continue

            # Validate configuration agreements
            if header.active_leads_mask != recording.active_leads_mask:
                errors += 1
                await log_audit_event(
                    db=db,
                    actor_user_id=session.user_id,
                    actor_role=session.role,
                    action="MULTICHANNEL_MASK_MISMATCH",
                    resource_type="telemetry_recording",
                    resource_id=recording_id,
                    outcome="REJECTED",
                    ip_hash=session.ip_hash,
                    details={
                        "frame_mask": f"0x{header.active_leads_mask:04X}",
                        "recording_mask": f"0x{recording.active_leads_mask:04X}",
                    },
                )
                continue

            if header.sampling_rate_hz != recording.sampling_rate_hz:
                errors += 1
                continue

            start_dt = datetime.utcfromtimestamp(header.base_timestamp_ms / 1000.0)
            duration_sec = header.sample_count / (header.sampling_rate_hz or 250)
            end_dt = start_dt + timedelta(seconds=duration_sec)

            computed_sha = hashlib.sha256(payload).hexdigest()

            # Check sequence idempotency
            stmt_seq = select(TelemetryMultiChannelChunk).where(
                and_(
                    TelemetryMultiChannelChunk.recording_id == recording_id,
                    TelemetryMultiChannelChunk.sequence_number == header.sequence_number,
                )
            )
            existing_seq = (await db.execute(stmt_seq)).scalar_one_or_none()

            # Check timestamp idempotency
            stmt_ts = select(TelemetryMultiChannelChunk).where(
                and_(
                    TelemetryMultiChannelChunk.recording_id == recording_id,
                    TelemetryMultiChannelChunk.start_timestamp == start_dt,
                )
            )
            existing_ts = (await db.execute(stmt_ts)).scalar_one_or_none()

            existing = existing_seq or existing_ts

            if existing:
                if existing.payload_checksum_sha256 == computed_sha:
                    duplicates += 1
                    continue
                else:
                    conflicts += 1
                    errors += 1
                    await log_audit_event(
                        db=db,
                        actor_user_id=session.user_id,
                        actor_role=session.role,
                        action="MULTICHANNEL_CHUNK_CONFLICT",
                        resource_type="telemetry_multichannel_chunk",
                        resource_id=existing.id,
                        outcome="CONFLICT",
                        ip_hash=session.ip_hash,
                        details={
                            "recording_id": recording_id,
                            "sequence_number": header.sequence_number,
                            "existing_sha": existing.payload_checksum_sha256,
                            "attempted_sha": computed_sha,
                        },
                    )
                    continue

            # Decode physiological samples for SQI and integrity check
            channel_count = header.active_channel_count
            if header.is_compressed:
                channel_samples = decode_multichannel_delta(payload, channel_count, header.sample_count)
                codec = "delta_zlib_planar"
                uncompressed_len = channel_count * header.sample_count * 2
            else:
                channel_samples = decode_multichannel_raw(payload, channel_count, header.sample_count)
                codec = "raw"
                uncompressed_len = len(payload)

            avg_sqi, missing_cnt, clipped_cnt = compute_multichannel_signal_quality(channel_samples)

            new_chunk = TelemetryMultiChannelChunk(
                recording_id=recording_id,
                patient_id=recording.patient_id,
                sequence_number=header.sequence_number,
                start_timestamp=start_dt,
                end_timestamp=end_dt,
                sample_count=header.sample_count,
                channel_count=channel_count,
                active_leads_mask=header.active_leads_mask,
                lead_off_mask=header.lead_off_mask,
                clipping_mask=header.clipping_mask,
                average_sqi=avg_sqi,
                missing_samples_count=missing_cnt,
                compression_codec=codec,
                uncompressed_bytes=uncompressed_len,
                compressed_bytes=len(payload),
                payload=payload,
                payload_checksum_sha256=computed_sha,
            )

            try:
                db.add(new_chunk)
                await db.commit()
                processed += 1
            except Exception:
                await db.rollback()
                # Handle concurrent insert race
                stmt_retry = select(TelemetryMultiChannelChunk).where(
                    and_(
                        TelemetryMultiChannelChunk.recording_id == recording_id,
                        TelemetryMultiChannelChunk.sequence_number == header.sequence_number,
                    )
                )
                retried = (await db.execute(stmt_retry)).scalar_one_or_none()
                if retried and retried.payload_checksum_sha256 == computed_sha:
                    duplicates += 1
                elif retried:
                    conflicts += 1
                    errors += 1
                    await log_audit_event(
                        db=db,
                        actor_user_id=session.user_id,
                        actor_role=session.role,
                        action="MULTICHANNEL_CONCURRENT_CONFLICT",
                        resource_type="telemetry_multichannel_chunk",
                        resource_id=retried.id,
                        outcome="CONFLICT",
                        ip_hash=session.ip_hash,
                        details={"recording_id": recording_id, "sequence": header.sequence_number},
                    )
                else:
                    errors += 1
        except Exception:
            errors += 1

    return {
        "status": "completed",
        "recordingId": recording_id,
        "processedChunks": processed,
        "duplicateChunks": duplicates,
        "conflictChunks": conflicts,
        "errorCount": errors,
        "contract": "HTTP-MultiChannel-Batch-v2",
    }


@router.get("/recordings/{recording_id}/chunks")
async def get_telemetry_recording_chunks(
    recording_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve ordered multi-channel chunks for a recording."""
    stmt = select(TelemetryRecording).where(TelemetryRecording.id == recording_id)
    recording = (await db.execute(stmt)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry recording not found.")

    # Authorization
    if session.role != "doctor":
        patient_profile = session.user.patient_profile if session.user else None
        if not patient_profile or recording.patient_id != patient_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        from app.services.consent_service import verify_consent
        doctor_institution = session.user.doctor_profile.institution if (session.user and session.user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, recording.patient_id, doctor_institution, "ecg")
        if not has_consent:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: no ECG consent.")

    stmt_chunks = (
        select(TelemetryMultiChannelChunk)
        .where(TelemetryMultiChannelChunk.recording_id == recording_id)
        .order_by(TelemetryMultiChannelChunk.sequence_number.asc())
        .offset(offset)
        .limit(limit)
    )
    chunks = (await db.execute(stmt_chunks)).scalars().all()

    return {
        "recordingId": recording_id,
        "offset": offset,
        "limit": limit,
        "chunks": [
            {
                "id": c.id,
                "sequenceNumber": c.sequence_number,
                "startTimestamp": c.start_timestamp.isoformat() + "Z",
                "endTimestamp": c.end_timestamp.isoformat() + "Z",
                "sampleCount": c.sample_count,
                "channelCount": c.channel_count,
                "activeLeadsMask": c.active_leads_mask,
                "leadOffMask": c.lead_off_mask,
                "clippingMask": c.clipping_mask,
                "averageSqi": c.average_sqi,
                "compressionCodec": c.compression_codec,
                "uncompressedBytes": c.uncompressed_bytes,
                "compressedBytes": c.compressed_bytes,
                "checksumSha256": c.payload_checksum_sha256,
            }
            for c in chunks
        ],
    }


@router.get("/recordings/{recording_id}/chunks/{chunk_id}/samples")
async def get_multichannel_chunk_samples(
    recording_id: str,
    chunk_id: str,
    session: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
):
    """
    Read-only retrieval of the waveform payload and metadata for a persisted multi-lead chunk.
    Enforces patient ownership and clinician consent boundaries.
    """
    stmt = select(TelemetryRecording).where(TelemetryRecording.id == recording_id)
    recording = (await db.execute(stmt)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry recording not found.")

    # Authorization
    if session.role != "doctor":
        patient_profile = session.user.patient_profile if session.user else None
        if not patient_profile or recording.patient_id != patient_profile.id:
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="CHUNK_SAMPLES_ACCESS_DENIED",
                resource_type="telemetry_multichannel_chunk",
                resource_id=chunk_id,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"recording_id": recording_id, "reason": "Cross-patient chunk sample access denied"},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        from app.services.consent_service import verify_consent
        doctor_institution = session.user.doctor_profile.institution if (session.user and session.user.doctor_profile) else "Meridian Heart Institute"
        has_consent, _ = await verify_consent(db, recording.patient_id, doctor_institution, "ecg")
        if not has_consent:
            await log_audit_event(
                db=db,
                actor_user_id=session.user_id,
                actor_role=session.role,
                action="CHUNK_SAMPLES_ACCESS_DENIED",
                resource_type="telemetry_multichannel_chunk",
                resource_id=chunk_id,
                outcome="FORBIDDEN",
                ip_hash=session.ip_hash,
                details={"recording_id": recording_id, "reason": "No ECG consent for institution"},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: no ECG consent.")

    stmt_chunk = select(TelemetryMultiChannelChunk).where(
        and_(
            TelemetryMultiChannelChunk.id == chunk_id,
            TelemetryMultiChannelChunk.recording_id == recording_id,
        )
    )
    chunk = (await db.execute(stmt_chunk)).scalar_one_or_none()
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telemetry chunk not found in recording.")

    # Explicit channel ordering derived from bitmask (bits 0..11)
    channel_order = [
        LEAD_NAMES_ORDER[i]
        for i in range(12)
        if (chunk.active_leads_mask & (1 << i))
    ]

    payload_b64 = base64.b64encode(chunk.payload).decode("ascii")

    return {
        "recordingId": recording.id,
        "chunkId": chunk.id,
        "sequenceNumber": chunk.sequence_number,
        "startTimestamp": chunk.start_timestamp.isoformat() + "Z",
        "endTimestamp": chunk.end_timestamp.isoformat() + "Z",
        "samplingRateHz": recording.sampling_rate_hz,
        "activeLeadsMask": chunk.active_leads_mask,
        "channelOrder": channel_order,
        "channelCount": chunk.channel_count,
        "sampleCount": chunk.sample_count,
        "compressionCodec": chunk.compression_codec,
        "uncompressedBytes": chunk.uncompressed_bytes,
        "compressedBytes": chunk.compressed_bytes,
        "payloadBase64": payload_b64,
        "payloadChecksumSha256": chunk.payload_checksum_sha256,
        "averageSqi": chunk.average_sqi,
        "leadOffMask": chunk.lead_off_mask,
        "clippingMask": chunk.clipping_mask,
    }


