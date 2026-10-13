"""
CardioCoreEdge Synthetic Deterministic Database Seeder
Strictly synthetic fixture data for automated tests and development.
NO real patient data or live credentialing connections.
"""

import json
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.session import engine, async_session_factory
from app.models.user import User
from app.models.profile import PatientProfile, DoctorProfile
from app.models.consent import ConsentGrant
from app.models.alert import AlertEvent
from app.models.audit import AuditEvent
from app.models.telemetry import TelemetryChunk, TelemetryRecording, TelemetryMultiChannelChunk
from app.core.security import hash_password
from app.telemetry.chunk import (
    encode_delta_samples,
    compute_signal_quality,
)
from app.telemetry.benchmark import generate_synthetic_ecg
from app.telemetry.storage import telemetry_storage


# Static TOTP secret for deterministic tests (pyotp.TOTP("JBSWY3DPEHPK3PXP").now())
TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP"


async def init_tables():
    """Create all database tables asynchronously."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_synthetic_fixtures(db: AsyncSession):
    """Seed deterministic development and test fixtures."""
    # Check if already seeded
    stmt = select(User).where(User.email == "aarav.menon@example.com")
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return

    # 1. Patient User (Aarav Menon)
    patient_user = User(
        id="usr_patient_aarav_44821",
        email="aarav.menon@example.com",
        phone_number="+919820011223",
        password_hash=hash_password("patient123"),
        role="patient",
        is_active=True,
    )
    db.add(patient_user)
    await db.flush()

    patient_profile = PatientProfile(
        id="prof_patient_aarav_44821",
        user_id=patient_user.id,
        mrn="44821",
        full_name="Aarav Menon",
        age=46,
        gender="Male",
        conditions_json=json.dumps(["Hypertension", "Type 2 Diabetes"]),
        baseline_summary_json=json.dumps({
            "hr": 72,
            "hrv": 52,
            "spo2": 98,
            "beatsObserved": 1420000,
            "daysCovered": 90,
        }),
        adherence_pct=94,
    )
    db.add(patient_profile)

    # 2. Clinician User (Dr. Neha Raghavan)
    doctor_user = User(
        id="usr_doctor_neha_4482",
        email="neha.raghavan@meridianheart.in",
        phone_number="+919820099881",
        password_hash=hash_password("clinician123"),
        role="doctor",
        is_active=True,
        totp_secret=TEST_TOTP_SECRET,
        last_totp_timestep=None,
    )
    db.add(doctor_user)
    await db.flush()

    doctor_profile = DoctorProfile(
        id="prof_doctor_neha_4482",
        user_id=doctor_user.id,
        full_name="Dr. Neha Raghavan",
        degrees="MD, DM (Cardiology)",
        specialty="Electrophysiology",
        medical_council="Maharashtra Medical Council",
        registration_number="MMC-2010-44821",
        institution="Meridian Heart Institute",
        registration_status="verified",
    )
    db.add(doctor_profile)

    # 3. Second Patient (Rohit Sharma - Expired Consent fixture)
    patient_user_2 = User(
        id="usr_patient_rohit_11204",
        email="rohit.sharma@example.com",
        phone_number="+919820055443",
        password_hash=hash_password("patient123"),
        role="patient",
        is_active=True,
    )
    db.add(patient_user_2)
    await db.flush()

    patient_profile_2 = PatientProfile(
        id="prof_patient_rohit_11204",
        user_id=patient_user_2.id,
        mrn="11204",
        full_name="Rohit Sharma",
        age=52,
        gender="Male",
        conditions_json=json.dumps(["Post-PCI Stent (LAD)"]),
        baseline_summary_json=json.dumps({"hr": 68, "hrv": 45, "spo2": 97}),
        adherence_pct=88,
    )
    db.add(patient_profile_2)
    await db.flush()

    # 4. Consent Grants
    # Grant A: Active full-scope consent for Aarav Menon -> Meridian Heart Institute
    grant_active = ConsentGrant(
        id="cg_aarav_meridian_active",
        patient_id=patient_profile.id,
        doctor_id=doctor_profile.id,
        institution="Meridian Heart Institute",
        status="active",
        scopes_json=json.dumps(["ecg", "vitals", "meds", "notes", "referrals"]),
        granted_at=datetime.utcnow() - timedelta(days=5),
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db.add(grant_active)

    # Grant B: Expired consent for Rohit Sharma
    grant_expired = ConsentGrant(
        id="cg_rohit_meridian_expired",
        patient_id=patient_profile_2.id,
        doctor_id=doctor_profile.id,
        institution="Meridian Heart Institute",
        status="expired",
        scopes_json=json.dumps(["vitals"]),
        granted_at=datetime.utcnow() - timedelta(days=40),
        expires_at=datetime.utcnow() - timedelta(days=10),
    )
    db.add(grant_expired)

    # 5. Alert Event
    alert = AlertEvent(
        id="alert_aarav_l3_vt",
        patient_id=patient_profile.id,
        level="L3",
        trigger_signal="ventricular_tachycardia",
        summary="Ventricular Tachycardia burst (168 bpm sustained 12s)",
        status="active",
        triggered_at=datetime.utcnow() - timedelta(minutes=15),
        escalation_tier=3,
        payload_json=json.dumps({"hr": 168, "sqi": 0.98, "lead": "Lead-II"}),
    )
    db.add(alert)

    # 6. Genesis Audit Event
    genesis_audit = AuditEvent(
        id="audit_genesis_001",
        actor_user_id=None,
        actor_role="system",
        action="SYSTEM_INIT",
        resource_type="database",
        resource_id="sqlite_main",
        outcome="SUCCESS",
        ip_hash="127.0.0.1",
        details_json=json.dumps({"version": "Phase-7-Release"}),
        previous_event_hash=None,
        event_hash=AuditEvent.calculate_event_hash(
            id_str="audit_genesis_001",
            actor_id=None,
            action="SYSTEM_INIT",
            outcome="SUCCESS",
            prev_hash=None,
            timestamp_str=datetime.utcnow().isoformat(),
        ),
        timestamp=datetime.utcnow(),
    )
    db.add(genesis_audit)

    await db.commit()

    # 7. Seed 5-second Synthetic Telemetry Chunk
    samples_5s = generate_synthetic_ecg(duration_seconds=5, sampling_rate_hz=250)
    now = datetime.utcnow()
    await telemetry_storage.store_chunk(
        db=db,
        patient_id=patient_profile.id,
        lead_name="Lead-II",
        sampling_rate_hz=250,
        start_timestamp=now - timedelta(seconds=5),
        end_timestamp=now,
        samples=samples_5s,
        codec="delta_zlib",
    )


async def main():
    await init_tables()
    async with async_session_factory() as session:
        await seed_synthetic_fixtures(session)
    print("Database tables initialized and synthetic fixtures seeded successfully.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
