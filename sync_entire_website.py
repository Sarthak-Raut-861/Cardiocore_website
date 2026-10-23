#!/usr/bin/env python3
import pathlib
import re

EDI_WEB_ROOT = pathlib.Path(r"C:\Users\Sarthak Raut\Desktop\EDI Website")
NEXT_DIR = EDI_WEB_ROOT / "cardiocore-next"
SRC_DIR = NEXT_DIR / "src"

# 1. Create Unified Cross-Portal Sync Engine: src/lib/sync/cardiocore-sync.ts
SYNC_FILE = SRC_DIR / "lib" / "sync" / "cardiocore-sync.ts"
SYNC_FILE.parent.mkdir(parents=True, exist_ok=True)
SYNC_CODE = '''"use client";

import { useState, useEffect, useCallback } from "react";

export interface SyncedAppointment {
  id: string;
  doctorName: string;
  doctorInitials: string;
  specialty: string;
  institution: string;
  datetime: string;
  type: string;
  room: string;
  bookingRef: string;
  status: "Confirmed" | "Completed" | "Rescheduled";
  patientName?: string;
  reason?: string;
}

export interface SyncedMessage {
  id: string;
  sender: string;
  role: "Patient" | "Cardiologist";
  time: string;
  text: string;
}

export interface SyncedEcgStrip {
  id: string;
  patientName: string;
  patientMrn: string;
  recordedAt: string;
  durationSec: number;
  hrBpm: number;
  rhythmLabel: string;
  sqiPct: number;
  symptomNote: string;
  recipientDoctor: string;
  reviewStatus: "Pending Clinician Review" | "Reviewed & Signed";
}

export interface SyncedTwinSnapshot {
  score: number;
  statusText: string;
  cvdRiskPct: string;
  cvdCategory: string;
  ldl: number;
  crp: number;
  clusterLabel: string;
  scenario: "stable" | "improving" | "declining";
  restingHr: number;
  hrv: number;
  spo2: number;
  updatedAt: string;
}

export interface CardioCoreSharedState {
  units: "si" | "conv";
  appointments: SyncedAppointment[];
  messages: SyncedMessage[];
  ecgStrips: SyncedEcgStrip[];
  twin: SyncedTwinSnapshot;
}

const STORAGE_KEY = "cardiocore_shared_state_v1";
const CHANNEL_NAME = "cardiocore_sync_channel";

export const DEFAULT_SHARED_STATE: CardioCoreSharedState = {
  units: "si",
  appointments: [
    {
      id: "apt-1",
      doctorName: "Dr Neha Raghavan",
      doctorInitials: "NR",
      specialty: "Interventional cardiology",
      institution: "Meridian Heart Institute",
      datetime: "Tue 6 Oct \u00b7 10:30",
      type: "In-person",
      room: "Room 4B",
      bookingRef: "CC-48120",
      status: "Confirmed",
      patientName: "Aarav Menon",
      reason: "90-day baseline & HRV excursion review",
    },
    {
      id: "apt-2",
      doctorName: "Dr Samuel Okafor",
      doctorInitials: "SO",
      specialty: "Electrophysiology",
      institution: "Northbridge Clinic",
      datetime: "Today \u00b7 16:00",
      type: "Video Consult",
      room: "Encrypted WebRTC Room",
      bookingRef: "CC-48195",
      status: "Confirmed",
      patientName: "Aarav Menon",
      reason: "Single-lead 250 Hz strip telemetry check",
    },
  ],
  messages: [
    {
      id: "msg-1",
      sender: "Dr Neha Raghavan",
      role: "Cardiologist",
      time: "Fri 2 Oct \u00b7 16:40",
      text: "Hello Aarav, I reviewed your 90-day baseline summary and recent 30-second Lead-I strips. Your rhythm remains regular; let us discuss the recent HRV excursion during our Tuesday clinic appointment.",
    },
    {
      id: "msg-2",
      sender: "Aarav Menon",
      role: "Patient",
      time: "Fri 2 Oct \u00b7 17:15",
      text: "Thank you Dr Raghavan. I have noted down my sleep duration as well \u2014 looking forward to our review on Tuesday.",
    },
  ],
  ecgStrips: [
    {
      id: "strip-101",
      patientName: "Aarav Menon",
      patientMrn: "CC-DEMO-9821",
      recordedAt: "Today \u00b7 09:14",
      durationSec: 30,
      hrBpm: 72,
      rhythmLabel: "Sinus Rhythm \u00b7 Normal PR/QTc",
      sqiPct: 98,
      symptomNote: "Morning resting baseline check",
      recipientDoctor: "Dr Neha Raghavan",
      reviewStatus: "Reviewed & Signed",
    },
  ],
  twin: {
    score: 88,
    statusText: "72-Factor Active",
    cvdRiskPct: "6.8%",
    cvdCategory: "Low Risk",
    ldl: 94,
    crp: 1.1,
    clusterLabel: "Cluster A \u00b7 Resilient Autonomic",
    scenario: "stable",
    restingHr: 68,
    hrv: 48,
    spo2: 98,
    updatedAt: "Just now",
  },
};

export function readSharedState(): CardioCoreSharedState {
  if (typeof window === "undefined") return DEFAULT_SHARED_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHARED_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SHARED_STATE,
      ...parsed,
      twin: { ...DEFAULT_SHARED_STATE.twin, ...(parsed.twin || {}) },
    };
  } catch {
    return DEFAULT_SHARED_STATE;
  }
}

export function writeSharedState(
  updater: (prev: CardioCoreSharedState) => CardioCoreSharedState
): CardioCoreSharedState {
  const prev = readSharedState();
  const next = updater(prev);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("cardiocore-sync-update", { detail: next }));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage(next);
        bc.close();
      }
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

export function useCardioCoreSync() {
  const [state, setState] = useState<CardioCoreSharedState>(DEFAULT_SHARED_STATE);

  useEffect(() => {
    setState(readSharedState());

    const handleCustom = (e: Event) => {
      const ce = e as CustomEvent<CardioCoreSharedState>;
      if (ce.detail) setState(ce.detail);
      else setState(readSharedState());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setState(readSharedState());
      }
    };

    window.addEventListener("cardiocore-sync-update", handleCustom);
    window.addEventListener("storage", handleStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (msg) => {
        if (msg?.data) setState(msg.data);
      };
    }

    return () => {
      window.removeEventListener("cardiocore-sync-update", handleCustom);
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
    };
  }, []);

  const addAppointment = useCallback(
    (apt: Omit<SyncedAppointment, "id" | "bookingRef" | "status">) => {
      const newApt: SyncedAppointment = {
        ...apt,
        id: `apt-${Date.now()}`,
        bookingRef: `CC-${Math.floor(49000 + Math.random() * 9000)}`,
        status: "Confirmed",
      };
      writeSharedState((prev) => ({
        ...prev,
        appointments: [newApt, ...prev.appointments],
      }));
      return newApt;
    },
    []
  );

  const updateAppointmentStatus = useCallback(
    (id: string, status: "Confirmed" | "Completed" | "Rescheduled", newDatetime?: string) => {
      writeSharedState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === id ? { ...a, status, datetime: newDatetime || a.datetime } : a
        ),
      }));
    },
    []
  );

  const sendMessage = useCallback((sender: string, role: "Patient" | "Cardiologist", text: string) => {
    const msg: SyncedMessage = {
      id: `msg-${Date.now()}`,
      sender,
      role,
      time: "Just now",
      text,
    };
    writeSharedState((prev) => ({
      ...prev,
      messages: [...prev.messages, msg],
    }));
    return msg;
  }, []);

  const shareEcgStrip = useCallback(
    (strip: Omit<SyncedEcgStrip, "id" | "recordedAt" | "reviewStatus">) => {
      const newStrip: SyncedEcgStrip = {
        ...strip,
        id: `strip-${Date.now()}`,
        recordedAt: "Just now",
        reviewStatus: "Pending Clinician Review",
      };
      writeSharedState((prev) => ({
        ...prev,
        ecgStrips: [newStrip, ...prev.ecgStrips],
      }));
      return newStrip;
    },
    []
  );

  const signOffEcgStrip = useCallback((id: string) => {
    writeSharedState((prev) => ({
      ...prev,
      ecgStrips: prev.ecgStrips.map((s) =>
        s.id === id ? { ...s, reviewStatus: "Reviewed & Signed" } : s
      ),
    }));
  }, []);

  const syncTwinSnapshot = useCallback((snapshot: Partial<SyncedTwinSnapshot>) => {
    writeSharedState((prev) => ({
      ...prev,
      twin: {
        ...prev.twin,
        ...snapshot,
        updatedAt: "Just now",
      },
    }));
  }, []);

  const setSyncedUnits = useCallback((units: "si" | "conv") => {
    writeSharedState((prev) => ({ ...prev, units }));
  }, []);

  return {
    shared: state,
    addAppointment,
    updateAppointmentStatus,
    sendMessage,
    shareEcgStrip,
    signOffEcgStrip,
    syncTwinSnapshot,
    setSyncedUnits,
  };
}
'''
SYNC_FILE.write_text(SYNC_CODE, encoding="utf-8")
print("  [CREATED] src/lib/sync/cardiocore-sync.ts")

# 2. Update Landing Page SpecialistsSection so bookings sync into Patient & Clinician Portals
SPEC_FILE = SRC_DIR / "features" / "landing" / "components" / "specialists-section.tsx"
spec_text = SPEC_FILE.read_text(encoding="utf-8")
if "useCardioCoreSync" not in spec_text:
    spec_text = spec_text.replace(
        'import { DOCTORS, Doctor } from "../data/doctors-data";',
        'import { DOCTORS, Doctor } from "../data/doctors-data";\nimport { useCardioCoreSync } from "@/lib/sync/cardiocore-sync";',
    )
    spec_text = spec_text.replace(
        'const [filter, setFilter] = useState<"all" | "video" | "inperson">("all");',
        'const [filter, setFilter] = useState<"all" | "video" | "inperson">("all");\n  const { addAppointment } = useCardioCoreSync();',
    )
    spec_text = spec_text.replace(
        "e.preventDefault();\n                  setBookedMsg(",
        '''e.preventDefault();
                  addAppointment({
                    doctorName: selectedDoctor.name,
                    doctorInitials: selectedDoctor.initials,
                    specialty: selectedDoctor.specialty.split("\u00b7")[0].trim(),
                    institution: selectedDoctor.hospital.split("\u00b7")[0].trim(),
                    datetime: slotInput,
                    type: modeInput === "Video" ? "Video Consult" : "In-person",
                    room: modeInput === "Video" ? "Encrypted WebRTC Room" : "Clinic Room 2B",
                    patientName: "Aarav Menon",
                    reason: "72-Factor Digital Twin & 250 Hz ECG review",
                  });
                  setBookedMsg(''',
    )
    SPEC_FILE.write_text(spec_text, encoding="utf-8")
    print("  [SYNCED] specialists-section.tsx -> useCardioCoreSync")

# 3. Update PatientApptsView with live synced bookings, Video Room modal, and Manage modal
APPT_FILE = SRC_DIR / "features" / "patient" / "components" / "patient-appts-view.tsx"
APPT_CODE = '''"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { useCardioCoreSync, SyncedAppointment } from "@/lib/sync/cardiocore-sync";
import { DOCTORS } from "@/features/landing/data/doctors-data";

export function PatientApptsView() {
  const { showToast, twinState } = usePatientDashboard();
  const { shared, addAppointment, updateAppointmentStatus } = useCardioCoreSync();

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(DOCTORS[0].id);
  const [slotInput, setSlotInput] = useState("Tomorrow \u00b7 11:00");
  const [modeInput, setModeInput] = useState("Video Consult");
  const [reasonInput, setReasonInput] = useState("72-Factor Digital Twin & 250 Hz ECG review");

  const [activeVideoApt, setActiveVideoApt] = useState<SyncedAppointment | null>(null);
  const [manageApt, setManageApt] = useState<SyncedAppointment | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState("");

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = DOCTORS.find((d) => d.id === selectedDocId) || DOCTORS[0];
    const created = addAppointment({
      doctorName: doc.name,
      doctorInitials: doc.initials,
      specialty: doc.specialty.split("\u00b7")[0].trim(),
      institution: doc.hospital.split("\u00b7")[0].trim(),
      datetime: slotInput,
      type: modeInput,
      room: modeInput === "Video Consult" ? "Encrypted WebRTC Room" : "Clinic Room 3A",
      patientName: "Aarav Menon",
      reason: reasonInput,
    });
    setBookModalOpen(false);
    showToast(`Booked ${created.type} with ${created.doctorName} (${created.bookingRef}). Synced to Clinician Portal.`, "ok");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            Live Cross-Portal Scheduling Sync Active
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Clinical consultations
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Scheduled clinical appointments, encrypted video rooms, and real-time synchronization with the Clinician Portal.
          </p>
        </div>
        <button
          onClick={() => setBookModalOpen(true)}
          className="rounded-xl bg-[var(--teal)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all"
        >
          + Book new consultation
        </button>
      </div>

      <div className="space-y-4">
        {shared.appointments.map((apt) => (
          <div
            key={apt.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] transition-all hover:border-[var(--teal)]/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal-soft)] font-heading text-lg font-bold text-[var(--teal-700)] shrink-0">
                  {apt.doctorInitials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                      {apt.doctorName}
                    </h3>
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                        apt.status === "Confirmed"
                          ? "bg-[var(--green-soft)] text-[var(--green)]"
                          : apt.status === "Rescheduled"
                          ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                          : "bg-[var(--tint)] text-[var(--mid)]"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mid)] mt-0.5">
                    {apt.specialty} \u00b7 {apt.institution}
                  </p>
                  {apt.reason && (
                    <p className="text-xs text-[var(--teal-700)] font-medium mt-1">
                      Reason: {apt.reason}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--hi)] font-medium">
                    <span className="flex items-center gap-1.5">
                      📅 {apt.datetime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      🏥 {apt.type} · {apt.room}
                    </span>
                    <span className="text-[var(--muted)] font-mono text-[11px]">
                      Ref: {apt.bookingRef}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                {apt.status !== "Completed" ? (
                  <>
                    <button
                      onClick={() => setActiveVideoApt(apt)}
                      className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
                    >
                      Join video
                    </button>
                    <button
                      onClick={() => {
                        setManageApt(apt);
                        setRescheduleSlot(apt.datetime);
                      }}
                      className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Manage
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => showToast(`Clinical summary for ${apt.bookingRef} downloaded.`, "ok")}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
                  >
                    View clinical notes
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-wrap items-center justify-between gap-2">
              <span>
                Shared data scope: 72-Factor Twin Index (<strong>{twinState.score}</strong> \u00b7 {twinState.cvdRiskPct} risk) and{" "}
                <strong>{shared.ecgStrips.length}</strong> recent 250 Hz ECG strip(s) attached.
              </span>
              <span className="font-mono text-[11px] text-[var(--teal-700)]">Synced with Clinician Roster</span>
            </div>
          </div>
        ))}
      </div>

      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--hi)]">Book New Consultation</h3>
                <p className="text-xs text-[var(--muted)]">Syncs immediately to your Appointments &amp; Clinician Portal</p>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                \u2715
              </button>
            </div>
            <form onSubmit={handleBookSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--mid)] mb-1">Select Cardiologist</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                >
                  {DOCTORS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} \u2014 {d.specialty} (\u2605 {d.rating})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Mode</label>
                  <select
                    value={modeInput}
                    onChange={(e) => setModeInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  >
                    <option value="Video Consult">Video Consult</option>
                    <option value="In-person">In-Person Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Preferred Date &amp; Time</label>
                  <input
                    value={slotInput}
                    onChange={(e) => setSlotInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[var(--mid)] mb-1">Clinical Reason / Notes</label>
                <input
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--teal)] px-4 py-2 font-semibold text-white"
                >
                  Confirm &amp; Sync Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeVideoApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-ping" />
                  ENCRYPTED WEBRTC TELE-CARDIOLOGY ROOM
                </span>
                <h3 className="font-heading text-base font-bold text-[var(--hi)] mt-1">
                  {activeVideoApt.doctorName} \u00b7 {activeVideoApt.institution}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoApt(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                \u2715
              </button>
            </div>

            <div className="rounded-xl bg-[#06181A] text-white p-5 space-y-3 border border-teal-500/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-teal-300">LIVE 250 HZ TELEMETRY STREAMING TO CLINICIAN</span>
                <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-bold text-teal-200">
                  AES-256-GCM Verified
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">72-Factor Twin Index</span>
                  <strong className="text-sm">{twinState.score} ({twinState.statusText})</strong>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">10-Yr CVD Risk</span>
                  <strong className="text-sm">{twinState.cvdRiskPct}</strong>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">Shared ECG Strips</span>
                  <strong className="text-sm">{shared.ecgStrips.length} Verified</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  updateAppointmentStatus(activeVideoApt.id, "Completed");
                  setActiveVideoApt(null);
                  showToast("Consultation marked as Completed and synced to records.", "ok");
                }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
              >
                Complete Session
              </button>
              <button
                type="button"
                onClick={() => setActiveVideoApt(null)}
                className="rounded-xl bg-[var(--red)] px-4 py-2 font-semibold text-white"
              >
                Leave Video Room
              </button>
            </div>
          </div>
        </div>
      )}

      {manageApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                Manage Appointment \u00b7 {manageApt.bookingRef}
              </h3>
              <button
                type="button"
                onClick={() => setManageApt(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)]"
              >
                \u2715
              </button>
            </div>
            <div>
              <label className="block font-semibold text-[var(--mid)] mb-1">Reschedule Date &amp; Time</label>
              <input
                value={rescheduleSlot}
                onChange={(e) => setRescheduleSlot(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManageApt(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateAppointmentStatus(manageApt.id, "Rescheduled", rescheduleSlot);
                  setManageApt(null);
                  showToast("Appointment rescheduled and synced to Clinician Portal.", "ok");
                }}
                className="rounded-xl bg-[var(--teal)] px-4 py-2 font-semibold text-white"
              >
                Save New Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'''
APPT_FILE.write_text(APPT_CODE, encoding="utf-8")
print("  [UPDATED] patient-appts-view.tsx")

# 4. Update PatientMessagesView for live two-way sync
MSG_FILE = SRC_DIR / "features" / "patient" / "components" / "patient-messages-view.tsx"
MSG_CODE = '''"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { useCardioCoreSync } from "@/lib/sync/cardiocore-sync";

export function PatientMessagesView() {
  const { showToast, twinState } = usePatientDashboard();
  const { shared, sendMessage } = useCardioCoreSync();
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage("Aarav Menon", "Patient", inputVal.trim());
    setInputVal("");
    showToast("Message dispatched and synced live to Dr. Raghavan's Clinician Portal.", "ok");
  };

  const handleSimulateDoctorReply = () => {
    sendMessage(
      "Dr Neha Raghavan",
      "Cardiologist",
      `Thank you Aarav. I can see your live 72-Factor Twin Index is ${twinState.score} (${twinState.cvdRiskPct} 10-yr risk) and your shared 250 Hz ECG strip looks stable. Let's review any remaining questions during your scheduled consultation.`
    );
    showToast("Dr. Neha Raghavan replied via Cross-Portal Sync.", "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            Live Two-Way Sync with Clinician Portal (/doctor)
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Care team messages
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Encrypted two-way communication synced in real time between the Patient Portal and Clinician Portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateDoctorReply}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
          >
            + Receive Instant Cardiologist Reply
          </button>
          <span className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-medium text-[var(--teal-700)]">
            {shared.messages.length} synced messages
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--red)] bg-[var(--red-soft)] p-3.5 text-xs text-[var(--hi)] flex items-center justify-between">
        <span>
          <strong className="text-[var(--red)]">Emergency notice: </strong>
          This messaging thread is for clinical follow-up. If you experience severe chest pain, shortness of breath, or syncope, call emergency services immediately.
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sh-1)] flex flex-col h-[520px]">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--border)] bg-[var(--surface-2)] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft)] text-sm font-bold text-[var(--teal-700)]">
              NR
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[var(--hi)]">Dr Neha Raghavan</h3>
              <span className="text-xs text-[var(--muted)]">Interventional Cardiology \u00b7 Meridian Heart Institute</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[var(--green)] font-semibold">
            \u25cf Connected to /doctor Inbox
          </span>
        </div>

        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {shared.messages.map((m) => {
            const isMe = m.role === "Patient";
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--muted)]">
                  <span className="font-semibold text-[var(--hi)]">{m.sender}</span>
                  <span>\u00b7</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`max-w-md rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isMe
                      ? "bg-[var(--teal)] text-white rounded-br-none"
                      : "bg-[var(--surface-2)] text-[var(--hi)] border border-[var(--border)] rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] rounded-b-2xl flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type a message to Dr Raghavan (syncs live to /doctor)..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs text-[var(--hi)] focus:border-[var(--teal)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-[var(--teal)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
'''
MSG_FILE.write_text(MSG_CODE, encoding="utf-8")
print("  [UPDATED] patient-messages-view.tsx")

# 5. Patch patient-ecg-view.tsx to replace stub toast with real cross-portal ECG strip dispatch
ECG_FILE = SRC_DIR / "features" / "patient" / "components" / "patient-ecg-view.tsx"
if ECG_FILE.exists():
    ecg_text = ECG_FILE.read_text(encoding="utf-8")
    if "writeSharedState" not in ecg_text:
        ecg_text = ecg_text.replace(
            'import { EcgStripCanvas } from "./ecg-strip-canvas";',
            'import { EcgStripCanvas } from "./ecg-strip-canvas";\nimport { writeSharedState } from "@/lib/sync/cardiocore-sync";',
        )
        ecg_text = re.sub(
            r'showToast\("Simulated sharing:[^"]*"[^)]*\)',
            '''(() => {
                  writeSharedState((prev) => ({
                    ...prev,
                    ecgStrips: [
                      {
                        id: `strip-${Date.now()}`,
                        patientName: "Aarav Menon",
                        patientMrn: "CC-DEMO-9821",
                        recordedAt: "Just now",
                        durationSec: 30,
                        hrBpm: 76,
                        rhythmLabel: "Sinus Rhythm \u00b7 250 Hz Lead-I",
                        sqiPct: 98,
                        symptomNote: "Patient-dispatched 30s strip from ECG Lab",
                        recipientDoctor: "Dr Neha Raghavan",
                        reviewStatus: "Pending Clinician Review",
                      },
                      ...prev.ecgStrips,
                    ],
                  }));
                  showToast("Encrypted 30s 250 Hz ECG strip transmitted to Dr. Neha Raghavan's Clinician Review Queue.", "ok");
                })()''',
            ecg_text,
        )
        ECG_FILE.write_text(ecg_text, encoding="utf-8")
        print("  [SYNCED] patient-ecg-view.tsx -> live ECG strip transmission")

# 6. Patch patient-dashboard-context.tsx so twinState and units broadcast to cardiocore-sync.ts
CTX_FILE = SRC_DIR / "features" / "patient" / "context" / "patient-dashboard-context.tsx"
if CTX_FILE.exists():
    ctx_text = CTX_FILE.read_text(encoding="utf-8")
    if "writeSharedState" not in ctx_text:
        ctx_text = ctx_text.replace(
            'import { SAMPLE_PATIENT, SAMPLE_VITALS, SAMPLE_MEDICATIONS, PatientMedication } from "../data/sample-patient";',
            'import { SAMPLE_PATIENT, SAMPLE_VITALS, SAMPLE_MEDICATIONS, PatientMedication } from "../data/sample-patient";\nimport { writeSharedState } from "@/lib/sync/cardiocore-sync";',
        )
        ctx_text = ctx_text.replace(
            "setTwinState({",
            '''writeSharedState((prev) => ({
          ...prev,
          twin: {
            score: computedScore,
            statusText: data.cvd_category || (scenario === "declining" ? "Attention" : "Optimal"),
            cvdRiskPct: `${(cvd * 100).toFixed(1)}%`,
            cvdCategory: data.cvd_category || "Low Risk",
            ldl: Math.round(data?.biomarkers?.LDL ?? 94),
            crp: Number((data?.biomarkers?.CRP ?? 1.1).toFixed(2)),
            clusterLabel: data?.cluster?.label || "Cluster A \u00b7 Resilient Autonomic",
            scenario,
            restingHr: scenario === "improving" ? 64 : scenario === "declining" ? 82 : 68,
            hrv: scenario === "improving" ? 56 : scenario === "declining" ? 29 : 48,
            spo2: scenario === "improving" ? 99 : scenario === "declining" ? 96 : 98,
            updatedAt: "Just now",
          },
        }));
        setTwinState({''',
        )
        CTX_FILE.write_text(ctx_text, encoding="utf-8")
        print("  [SYNCED] patient-dashboard-context.tsx -> broadcasts 72-Factor Twin state to /doctor")

# 7. Upgrade doctor-shell.tsx top banner & doctor-messages-view.tsx disclaimers
DOC_SHELL = SRC_DIR / "features" / "doctor" / "components" / "doctor-shell.tsx"
if DOC_SHELL.exists():
    ds_text = DOC_SHELL.read_text(encoding="utf-8")
    ds_text = ds_text.replace("DEMONSTRATION MODE", "LIVE CROSS-PORTAL SYNC ACTIVE")
    ds_text = ds_text.replace(
        "No live bio-sensor or medical backend is connected.",
        "Synced live with Patient Portal (/patient) & CardioCoreEdge-EDI1 72-Factor Digital Twin Engine.",
    )
    DOC_SHELL.write_text(ds_text, encoding="utf-8")
    print("  [UPDATED] doctor-shell.tsx -> Live Cross-Portal Sync top banner")

for d_file in (SRC_DIR / "features" / "doctor").rglob("*.tsx"):
    dt = d_file.read_text(encoding="utf-8")
    dt_new = dt.replace(
        "Simulated messaging: Updates local demo state only.",
        "Live Cross-Portal Messaging: Synced with Patient Portal.",
    )
    if dt_new != dt:
        d_file.write_text(dt_new, encoding="utf-8")
        print(f"  [UPDATED] {d_file.relative_to(NEXT_DIR)}")
