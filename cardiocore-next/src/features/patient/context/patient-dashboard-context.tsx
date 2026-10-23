"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { SAMPLE_PATIENT, SAMPLE_VITALS, SAMPLE_MEDICATIONS, PatientMedication, PatientProfile } from "../data/sample-patient";
import { useAuth } from "@/features/auth/context/auth-context";

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

export interface TwinLiveState {
  score: number;
  statusText: string;
  headline: string;
  summary: string;
  cvdRiskPct: string;
  cvdCategory: string;
  ldl: number;
  crp: number;
  ctr: number;
  clusterLabel: string;
  clusterConfidence: number;
  scenario: "stable" | "improving" | "declining";
  source: string;
  loading: boolean;
}

export interface CustomLabItem {
  id: string;
  name: string;
  valueConv: string;
  valueSi: string;
  status: string;
  date: string;
}

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
  engineMode: "demo" | "live";
  setEngineMode: (mode: "demo" | "live") => void;
  twinState: TwinLiveState;
  runTwinSimulation: (
    scenario?: "stable" | "improving" | "declining",
    customProfile?: Record<string, number>
  ) => Promise<void>;
  labModalOpen: boolean;
  setLabModalOpen: (open: boolean) => void;
  customLabs: CustomLabItem[];
  addLabResult: (item: { name: string; valueConv: string; valueSi: string; status: string }) => void;
}

const PatientDashboardContext = createContext<PatientDashboardContextValue | null>(null);

export function PatientDashboardProvider({
  children,
  initialView = "home",
}: {
  children: React.ReactNode;
  initialView?: PatientViewId;
}) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<PatientViewId>(initialView);
  const [units, setUnits] = useState<UnitSystem>("si");
  const [medications, setMedications] = useState<PatientMedication[]>(SAMPLE_MEDICATIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"ok" | "warn" | "info">("ok");
  const [engineMode, setEngineMode] = useState<"demo" | "live">("live");
  const [labModalOpen, setLabModalOpen] = useState<boolean>(false);
  const [customLabs, setCustomLabs] = useState<CustomLabItem[]>([
    { id: "lab-1", name: "Calculated LDL-C", valueConv: "94 mg/dL", valueSi: "2.43 mmol/L", status: "Optimal", date: "Today" },
    { id: "lab-2", name: "hs-CRP Inflammatory", valueConv: "1.10 mg/L", valueSi: "10.5 nmol/L", status: "Normal", date: "Today" },
  ]);

  const currentPatient = useMemo<PatientProfile>(() => {
    if (!user) {
      return SAMPLE_PATIENT;
    }

    const name = user.name?.trim() || SAMPLE_PATIENT.name;
    const parts = name.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    return {
      ...SAMPLE_PATIENT,
      id: user.id || SAMPLE_PATIENT.id,
      name,
      initials,
      email: user.email || "patient@example.com",
    };
  }, [user]);

  const [twinState, setTwinState] = useState<TwinLiveState>({
    score: 88,
    statusText: "72-Factor Active",
    headline: "72-Factor Twin: Resilient Autonomic State",
    summary:
      "CardioCoreEdge-EDI1 BiomarkerTwin assimilated 60 days of continuous 250 Hz telemetry and 72 clinical risk factors.",
    cvdRiskPct: "6.8%",
    cvdCategory: "Low Risk",
    ldl: 94,
    crp: 1.1,
    ctr: 0.46,
    clusterLabel: "Cluster A · Resilient Autonomic",
    clusterConfidence: 92,
    scenario: "stable",
    source: "CardioCoreEdge-EDI1 72-Factor Engine",
    loading: false,
  });

  const showToast = useCallback((msg: string, type: "ok" | "warn" | "info" = "ok") => {
    setToastMessage(msg);
    setToastType(type);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const runTwinSimulation = useCallback(
    async (
      scenario: "stable" | "improving" | "declining" = "stable",
      customProfile?: Record<string, number>
    ) => {
      setTwinState((prev) => ({ ...prev, loading: true, scenario }));
      try {
        const res = await fetch("/api/v1/twin/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            days: 60,
            profile: customProfile || {
              baseline_resting_hr: scenario === "improving" ? 64 : scenario === "declining" ? 82 : 68,
              baseline_hrv_rmssd: scenario === "improving" ? 56 : scenario === "declining" ? 29 : 48,
              baseline_systolic: scenario === "improving" ? 116 : scenario === "declining" ? 138 : 122,
              baseline_total_cholesterol: 184,
              baseline_hdl: 54,
              baseline_triglycerides: 128,
            },
          }),
        });
        const data = await res.json();
        const cvd = typeof data.cvd_score === "number" ? data.cvd_score : 0.068;
        const computedScore =
          typeof data.state_score === "number"
            ? data.state_score
            : Math.min(98, Math.max(38, Math.round((1 - cvd * 1.35) * 100)));

        const headlineMap = {
          stable: "72-Factor Twin: Stable Personal Corridor",
          improving: "72-Factor Twin: Positive Autonomic & Lipid Trajectory",
          declining: "72-Factor Twin: Early Autonomic & Hemodynamic Drift",
        };
        const summaryMap = {
          stable:
            "CardioCoreEdge-EDI1 BiomarkerTwin assimilated 60 days of wearable streams across 72 factors. Resting HR, HRV, and lipids remain inside your personal corridor.",
          improving:
            "60-day intervention trajectory shows +16% HRV rMSSD recovery and reduced 10-year cardiovascular risk score.",
          declining:
            "BiomarkerTwin flagged a 14-day HRV suppression and +14 mmHg systolic drift across your 72-factor risk profile.",
        };

        setTwinState({
          score: computedScore,
          statusText: data.cvd_category || (scenario === "declining" ? "Attention" : "Optimal"),
          headline: headlineMap[scenario],
          summary: summaryMap[scenario],
          cvdRiskPct: `${(cvd * 100).toFixed(1)}%`,
          cvdCategory: data.cvd_category || "Low Risk",
          ldl: Math.round(data?.biomarkers?.LDL ?? 94),
          crp: Number((data?.biomarkers?.CRP ?? 1.1).toFixed(2)),
          ctr: Number((data?.ctr ?? 0.46).toFixed(2)),
          clusterLabel: data?.cluster?.label || "Cluster A · Resilient Autonomic",
          clusterConfidence: Math.round((data?.cluster?.confidence ?? 0.92) * 100),
          scenario,
          source: data?.source || "CardioCoreEdge-EDI1 72-Factor Engine",
          loading: false,
        });
      } catch {
        setTwinState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  useEffect(() => {
    runTwinSimulation("stable");
  }, [runTwinSimulation]);

  const addLabResult = useCallback(
    (item: { name: string; valueConv: string; valueSi: string; status: string }) => {
      setCustomLabs((prev) => [
        {
          id: `lab-${Date.now()}`,
          name: item.name,
          valueConv: item.valueConv,
          valueSi: item.valueSi,
          status: item.status,
          date: "Just now",
        },
        ...prev,
      ]);
      showToast(`Saved ${item.name} to longitudinal record & updated BiomarkerTwin.`, "ok");
    },
    [showToast]
  );

  const toggleMedication = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newTaken = !m.taken;
          return {
            ...m,
            taken: newTaken,
            timeLabel: newTaken ? "taken just now" : "due today",
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

  const liveVitals = useMemo(() => {
    if (engineMode === "demo") return SAMPLE_VITALS;
    if (twinState.scenario === "improving") {
      return { ...SAMPLE_VITALS, restingHr: 64, hrv: 56, spo2: 99, skinTemp: 36.5 };
    }
    if (twinState.scenario === "declining") {
      return { ...SAMPLE_VITALS, restingHr: 82, hrv: 29, spo2: 96, skinTemp: 37.1 };
    }
    return SAMPLE_VITALS;
  }, [engineMode, twinState.scenario]);

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
      patient: currentPatient,
      vitals: liveVitals,
      engineMode,
      setEngineMode,
      twinState,
      runTwinSimulation,
      labModalOpen,
      setLabModalOpen,
      customLabs,
      addLabResult,
    }),
    [
      activeView,
      units,
      medications,
      toggleMedication,
      toastMessage,
      toastType,
      showToast,
      formatUnit,
      currentPatient,
      liveVitals,
      engineMode,
      twinState,
      runTwinSimulation,
      labModalOpen,
      customLabs,
      addLabResult,
    ]
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
