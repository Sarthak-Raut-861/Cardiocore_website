"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { SAMPLE_PATIENT, SAMPLE_VITALS, SAMPLE_MEDICATIONS, PatientMedication } from "../data/sample-patient";

export type UnitSystem = "si" | "conv";

export type PatientViewId =
  | "home"
  | "health"
  | "ecg"
  | "twin"
  | "alerts"
  | "live"
  | "day"
  | "records"
  | "profile"
  | "meds"
  | "appts"
  | "messages";

interface PatientDashboardContextValue {
  activeView: PatientViewId;
  setActiveView: (view: PatientViewId) => void;
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;
  formatUnit: (kind: "hr" | "hrv" | "spo2" | "temp", value: number) => { value: string; unit: string; display: string };
  medications: PatientMedication[];
  toggleMedication: (id: string) => void;
  toastMessage: string | null;
  toastType: "ok" | "warn" | "info";
  showToast: (msg: string, type?: "ok" | "warn" | "info") => void;
  patient: typeof SAMPLE_PATIENT;
  vitals: typeof SAMPLE_VITALS;
}

const PatientDashboardContext = createContext<PatientDashboardContextValue | null>(null);

export function PatientDashboardProvider({
  children,
  initialView = "home",
}: {
  children: React.ReactNode;
  initialView?: PatientViewId;
}) {
  const [activeView, setActiveView] = useState<PatientViewId>(initialView);
  const [units, setUnits] = useState<UnitSystem>("si");
  const [medications, setMedications] = useState<PatientMedication[]>(SAMPLE_MEDICATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"ok" | "warn" | "info">("ok");

  const showToast = useCallback((msg: string, type: "ok" | "warn" | "info" = "ok") => {
    setToastMessage(msg);
    setToastType(type);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const toggleMedication = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newTaken = !m.taken;
          return {
            ...m,
            taken: newTaken,
            timeLabel: newTaken ? `taken just now` : `due today`,
          };
        }
        return m;
      })
    );
  }, []);

  const formatUnit = useCallback(
    (kind: "hr" | "hrv" | "spo2" | "temp", value: number) => {
      if (units === "si") {
        switch (kind) {
          case "hr":
            return { value: Math.round(value).toString(), unit: "min⁻¹", display: `${Math.round(value)} min⁻¹` };
          case "hrv":
            return { value: Math.round(value).toString(), unit: "ms", display: `${Math.round(value)} ms` };
          case "spo2":
            return { value: Math.round(value).toString(), unit: "%", display: `${Math.round(value)}%` };
          case "temp":
            return { value: value.toFixed(1), unit: "°C", display: `${value.toFixed(1)} °C` };
        }
      } else {
        switch (kind) {
          case "hr":
            return { value: Math.round(value).toString(), unit: "BPM", display: `${Math.round(value)} BPM` };
          case "hrv":
            return { value: Math.round(value).toString(), unit: "ms", display: `${Math.round(value)} ms` };
          case "spo2":
            return { value: Math.round(value).toString(), unit: "%", display: `${Math.round(value)}%` };
          case "temp": {
            const f = value * (9 / 5) + 32;
            return { value: f.toFixed(1), unit: "°F", display: `${f.toFixed(1)} °F` };
          }
        }
      }
    },
    [units]
  );

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      units,
      setUnits,
      formatUnit,
      medications,
      toggleMedication,
      toastMessage,
      toastType,
      showToast,
      patient: SAMPLE_PATIENT,
      vitals: SAMPLE_VITALS,
    }),
    [activeView, units, medications, toggleMedication, toastMessage, toastType, showToast, formatUnit]
  );

  return (
    <PatientDashboardContext.Provider value={value}>
      {children}
    </PatientDashboardContext.Provider>
  );
}

export function usePatientDashboard() {
  const context = useContext(PatientDashboardContext);
  if (!context) {
    throw new Error("usePatientDashboard must be used within a PatientDashboardProvider");
  }
  return context;
}
