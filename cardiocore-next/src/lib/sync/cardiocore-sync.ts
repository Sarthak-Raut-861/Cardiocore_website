"use client";

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
      datetime: "Tue 6 Oct · 10:30",
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
      datetime: "Today · 16:00",
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
      time: "Fri 2 Oct · 16:40",
      text: "Hello Aarav, I reviewed your 90-day baseline summary and recent 30-second Lead-I strips. Your rhythm remains regular; let us discuss the recent HRV excursion during our Tuesday clinic appointment.",
    },
    {
      id: "msg-2",
      sender: "Aarav Menon",
      role: "Patient",
      time: "Fri 2 Oct · 17:15",
      text: "Thank you Dr Raghavan. I have noted down my sleep duration as well — looking forward to our review on Tuesday.",
    },
  ],
  ecgStrips: [
    {
      id: "strip-101",
      patientName: "Aarav Menon",
      patientMrn: "CC-DEMO-9821",
      recordedAt: "Today · 09:14",
      durationSec: 30,
      hrBpm: 72,
      rhythmLabel: "Sinus Rhythm · Normal PR/QTc",
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
    clusterLabel: "Cluster A · Resilient Autonomic",
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
