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

const STORAGE_KEY = "cardiocore_shared_state_v2";
const CHANNEL_NAME = "cardiocore_sync_channel";

// Clean user state: No dummy appointments, no dummy messages, no dummy strips for real users
export const DEFAULT_SHARED_STATE: CardioCoreSharedState = {
  units: "si",
  appointments: [],
  messages: [],
  ecgStrips: [],
  twin: {
    score: 88,
    statusText: "ESP32 Calibrated",
    cvdRiskPct: "6.8%",
    cvdCategory: "Low Risk",
    ldl: 94,
    crp: 1.1,
    clusterLabel: "Cluster A · Resilient Autonomic",
    scenario: "stable",
    restingHr: 72,
    hrv: 52,
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
