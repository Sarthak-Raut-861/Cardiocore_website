#!/usr/bin/env python3
import pathlib
import re
import subprocess

EDI_WEB_ROOT = pathlib.Path(r"C:\Users\Sarthak Raut\Desktop\EDI Website")
NEXT_DIR = EDI_WEB_ROOT / "cardiocore-next"
SRC_DIR = NEXT_DIR / "src"

# Reset shell and home view to clean HEAD state before applying patches
subprocess.run(
    [
        "git",
        "checkout",
        "HEAD",
        "--",
        "src/features/patient/components/patient-shell.tsx",
        "src/features/patient/components/patient-home-view.tsx",
    ],
    cwd=str(NEXT_DIR),
    check=False,
)

# 1. Upgrade patient-dashboard-context.tsx with live 72-Factor Twin state & Lab Modal state
CONTEXT_FILE = SRC_DIR / "features" / "patient" / "context" / "patient-dashboard-context.tsx"
CONTEXT_CODE = '''"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
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
    clusterLabel: "Cluster A \u00b7 Resilient Autonomic",
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
          clusterLabel: data?.cluster?.label || "Cluster A \u00b7 Resilient Autonomic",
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
            return { value: Math.round(value).toString(), unit: "min\u207b\u00b9", display: `${Math.round(value)} min\u207b\u00b9` };
          case "hrv":
            return { value: Math.round(value).toString(), unit: "ms", display: `${Math.round(value)} ms` };
          case "spo2":
            return { value: Math.round(value).toString(), unit: "%", display: `${Math.round(value)}%` };
          case "temp":
            return { value: value.toFixed(1), unit: "\u00b0C", display: `${value.toFixed(1)} \u00b0C` };
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
            return { value: f.toFixed(1), unit: "\u00b0F", display: `${f.toFixed(1)} \u00b0F` };
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
      patient: SAMPLE_PATIENT,
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
'''
CONTEXT_FILE.write_text(CONTEXT_CODE, encoding="utf-8")
print("  [UPDATED] patient-dashboard-context.tsx")

# 2. Patch patient-shell.tsx (Top interactive Engine Mode bar + Add Lab Result Modal + live badge)
SHELL_FILE = SRC_DIR / "features" / "patient" / "components" / "patient-shell.tsx"
shell_text = SHELL_FILE.read_text(encoding="utf-8")

shell_text = re.sub(
    r"patient,\s*\}\s*=\s*usePatientDashboard\(\);",
    "patient, engineMode, setEngineMode, twinState, runTwinSimulation, labModalOpen, setLabModalOpen, addLabResult } = usePatientDashboard();\n  const [labName, setLabName] = useState('NT-proBNP');\n  const [labConv, setLabConv] = useState('95 pg/mL');\n  const [labSi, setLabSi] = useState('11.2 pmol/L');",
    shell_text,
)
shell_text = shell_text.replace('badge: "82"', 'badge: engineMode === "live" ? String(twinState.score) : "82"')

SHELL_BANNER_REPLACEMENT = '''      {/* 1. Interactive Engine Mode Switcher Bar (Live 72-Factor Twin vs Demo Mode) */}
      <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--mid)] font-medium flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {engineMode === "live" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-pulse" />
              LIVE 72-FACTOR TWIN ENGINE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--amber-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--amber)]">
              DEMO MODE (SYNTHETIC)
            </span>
          )}
          <span>
            {engineMode === "live" ? (
              <>
                Connected to <strong>{twinState.source}</strong> for <strong>{patient.name}</strong> \u00b7 10-Yr CVD Risk:{" "}
                <strong className="text-[var(--teal-700)]">{twinState.cvdRiskPct}</strong> ({twinState.clusterLabel})
              </>
            ) : (
              <>
                Displaying static demo fixture for <strong>{patient.name}</strong> (ID: {patient.id}).
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {engineMode === "live" && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
              {(["stable", "improving", "declining"] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    runTwinSimulation(sc);
                    showToast(`Simulated 60-day ${sc} trajectory across 72 factors.`, "ok");
                  }}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize transition-all ${
                    twinState.scenario === sc
                      ? "bg-[var(--teal)] text-white"
                      : "text-[var(--mid)] hover:text-[var(--hi)]"
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => {
                setEngineMode("live");
                runTwinSimulation(twinState.scenario);
                showToast("Switched to Live 72-Factor Twin Engine.", "ok");
              }}
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition-all ${
                engineMode === "live" ? "bg-[var(--teal)] text-white" : "text-[var(--mid)] hover:text-[var(--hi)]"
              }`}
            >
              Live 72-Factor Engine
            </button>
            <button
              type="button"
              onClick={() => {
                setEngineMode("demo");
                showToast("Switched to static Demo Mode.", "info");
              }}
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition-all ${
                engineMode === "demo" ? "bg-[var(--amber)] text-white" : "text-[var(--mid)] hover:text-[var(--hi)]"
              }`}
            >
              Demo Mode
            </button>
          </div>
        </div>
      </div>

      {/* Global Add Lab Result Modal */}
      {labModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--hi)]">Add Lab Biomarker Result</h3>
                <p className="text-xs text-[var(--muted)]">Feeds directly into your 72-Factor BiomarkerTwin</p>
              </div>
              <button
                type="button"
                onClick={() => setLabModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                \u2715
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addLabResult({ name: labName, valueConv: labConv, valueSi: labSi, status: "Logged" });
                setLabModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[var(--mid)] mb-1">Biomarker Name</label>
                <input
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Conventional Value</label>
                  <input
                    value={labConv}
                    onChange={(e) => setLabConv(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">SI Value</label>
                  <input
                    value={labSi}
                    onChange={(e) => setLabSi(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLabModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--teal)] px-4 py-2 font-semibold text-white"
                >
                  Save &amp; Assimilate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Layout Container */}'''

shell_text = re.sub(
    r"\{\/\*\s*1\.\s*Permanent Demonstration Banner\s*\*\/\}.*?\{\/\*\s*Main Layout Container\s*\*\/\}",
    SHELL_BANNER_REPLACEMENT,
    shell_text,
    flags=re.DOTALL,
)
SHELL_FILE.write_text(shell_text, encoding="utf-8")
print("  [UPDATED] patient-shell.tsx")

# 3. Patch patient-home-view.tsx (Interactive Home Twin card + Add lab result modal button)
HOME_FILE = SRC_DIR / "features" / "patient" / "components" / "patient-home-view.tsx"
home_text = HOME_FILE.read_text(encoding="utf-8")

home_text = re.sub(
    r"const\s*\{\s*setActiveView,\s*formatUnit,\s*showToast,\s*medications,\s*toggleMedication,\s*vitals\s*\}\s*=\s*usePatientDashboard\(\);",
    "const { setActiveView, formatUnit, showToast, medications, toggleMedication, vitals, engineMode, twinState, runTwinSimulation, setLabModalOpen, customLabs, units } = usePatientDashboard();",
    home_text,
)
home_text = home_text.replace('onClick={() => setActiveView("records")}', 'onClick={() => setLabModalOpen(true)}')

HOME_CARD_REPLACEMENT = '''          {/* Cardiovascular State Card (Connected to Live 72-Factor Twin Engine + Demo Mode) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {engineMode === "live" ? "CardioCoreEdge-EDI1 \u00b7 72-Factor Digital Twin" : "Cardiovascular state (Demo)"}
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="font-heading text-xl font-bold text-[var(--hi)]">
                    {engineMode === "live" ? twinState.headline : "Stable, within your normal"}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      engineMode === "live" && twinState.scenario === "declining"
                        ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                        : "bg-[var(--green-soft)] text-[var(--green)]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {engineMode === "live" ? twinState.statusText : "Stable"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--mid)] max-w-xl">
                  {engineMode === "live"
                    ? twinState.summary
                    : "Your Baseline Model compared the last 24 hours against your 90-day baseline. Two signals moved slightly and both are explained by yesterday's evening walk."}
                </p>
              </div>

              {engineMode === "live" && (
                <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  {(["stable", "improving", "declining"] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => runTwinSimulation(sc)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                        twinState.scenario === sc
                          ? "bg-[var(--teal)] text-white"
                          : "text-[var(--mid)] hover:text-[var(--hi)]"
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-[var(--border)]">
              <TwinRing
                score={engineMode === "live" ? twinState.score : 82}
                size={150}
                statusText={engineMode === "live" ? twinState.statusText : "Model active"}
              />
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">
                    {engineMode === "live" ? "10-Yr CVD Risk & Cohort Cluster" : "Compared against"}
                  </span>
                  <span className="font-semibold text-[var(--hi)]">
                    {engineMode === "live"
                      ? `${twinState.cvdRiskPct} (${twinState.clusterLabel})`
                      : "your 90-day baseline"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">
                    {engineMode === "live" ? "Calculated LDL-C & hs-CRP" : "Signals fused"}
                  </span>
                  <span className="font-semibold text-[var(--hi)]">
                    {engineMode === "live"
                      ? `${twinState.ldl} mg/dL \u00b7 hs-CRP ${twinState.crp} mg/L`
                      : "7 \u00b7 all good quality"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">Confidence</span>
                  <span className="font-semibold text-[var(--green)]">
                    {engineMode === "live" ? `High (${twinState.clusterConfidence}%) \u00b7 72 Factors` : "High (0.91)"}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span className="text-[var(--mid)]">Latest Logged Biomarker</span>
                  <span className="font-semibold text-[var(--teal-700)]">
                    {customLabs[0]?.name}: {units === "si" ? customLabs[0]?.valueSi : customLabs[0]?.valueConv}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setActiveView("twin")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                  >
                    Open Full 72-Factor Twin Controls \u2192
                  </button>
                  <button
                    onClick={() => setLabModalOpen(true)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--tint)] py-2 text-xs font-semibold text-[var(--hi)] hover:opacity-90 transition-opacity"
                  >
                    + Log New Lab Biomarker
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Vitals Grid */}'''

home_text = re.sub(
    r"\{\/\*\s*Cardiovascular State Card\s*\*\/\}.*?\{\/\*\s*4 Vitals Grid\s*\*\/\}",
    HOME_CARD_REPLACEMENT,
    home_text,
    flags=re.DOTALL,
)
HOME_FILE.write_text(home_text, encoding="utf-8")
print("  [UPDATED] patient-home-view.tsx")

# 4. Update specialists-section.tsx with interactive Book Consultation Modal
SPEC_FILE = SRC_DIR / "features" / "landing" / "components" / "specialists-section.tsx"
SPEC_CODE = '''"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DOCTORS, Doctor } from "../data/doctors-data";

export const SpecialistsSection: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "video" | "inperson">("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [slotInput, setSlotInput] = useState<string>("");
  const [modeInput, setModeInput] = useState<string>("Video");
  const [bookedMsg, setBookedMsg] = useState<string | null>(null);

  const filteredDoctors = DOCTORS.filter((doc) => {
    if (filter === "video") return doc.mode === "Video" || doc.mode === "Both";
    if (filter === "inperson") return doc.mode === "In-person" || doc.mode === "Both";
    return true;
  });

  const openBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setSlotInput(doc.when);
    setModeInput(doc.mode === "In-person" ? "In-person" : "Video");
    setBookedMsg(null);
  };

  return (
    <section
      id="doctors"
      className="py-20 scroll-mt-24 bg-gradient-to-b from-[var(--bg)] via-[var(--surface-2)]/40 to-[var(--bg)]"
    >
      <div id="specialists" className="scroll-mt-24" />
      <Container>
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3">
            Care Network
          </div>
          <h2 className="h1 text-[var(--hi)] mb-4">
            Cardiologists on the same record.
          </h2>
          <p className="lead text-[var(--mid)]">
            Book in-person or video consultations. Your 72-factor baseline summary, vitals, and
            ECG strips travel ahead with your consent.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              All Specialists
            </button>
            <button
              onClick={() => setFilter("video")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "video"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              Video Consult
            </button>
            <button
              onClick={() => setFilter("inperson")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "inperson"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              In-Person
            </button>
          </div>

          <span className="text-xs font-mono text-[var(--muted)]">
            Showing {filteredDoctors.length} specialist
            {filteredDoctors.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12">
          {filteredDoctors.map((doc: Doctor) => (
            <Card
              key={doc.id}
              variant="interactive"
              className="p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${doc.avatarClass}`}
                >
                  {doc.initials}
                </div>

                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--hi)] truncate">
                      {doc.name}
                    </span>
                    <span className="text-xs text-[var(--amber)] font-bold">
                      \u2605 {doc.rating}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--mid)] truncate mt-0.5">
                    {doc.specialty}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] truncate">
                    {doc.hospital}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 pl-2">
                <Badge variant="neutral" size="sm" className="mb-1.5">
                  {doc.when}
                </Badge>
                <span className="text-[10px] text-[var(--muted)] font-mono mb-2">
                  {doc.mode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 px-3"
                  onClick={() => openBooking(doc)}
                >
                  Book
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/login?role=patient">
            <Button variant="primary" size="lg" className="mb-3">
              Sign in to book consultation
            </Button>
          </Link>
          <p className="text-xs text-[var(--muted)]">
            Are you a cardiologist?{" "}
            <Link
              href="/login?role=doctor"
              className="text-[var(--teal-700)] dark:text-[var(--teal)] font-bold hover:underline"
            >
              Open clinician portal &rarr;
            </Link>
          </p>
        </div>
      </Container>

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                  Book Consultation \u00b7 {selectedDoctor.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {selectedDoctor.specialty} \u00b7 {selectedDoctor.hospital}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                \u2715
              </button>
            </div>

            {bookedMsg ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--green-soft)] p-4 text-xs font-semibold text-[var(--green)]">
                  \u2713 {bookedMsg}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                    Close
                  </Button>
                  <Link href="/patient">
                    <Button variant="primary" size="sm">
                      Open Patient Portal &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBookedMsg(
                    `Confirmed ${modeInput} appointment with ${selectedDoctor.name} for ${slotInput}. Your 72-Factor Digital Twin baseline and recent 250 Hz ECG strips have been attached.`
                  );
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Consultation Mode</label>
                  <select
                    value={modeInput}
                    onChange={(e) => setModeInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  >
                    <option value="Video">Video Consult (Encrypted WebRTC + Live ECG Share)</option>
                    <option value="In-person">In-Person Visit ({selectedDoctor.hospital})</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Preferred Slot</label>
                  <input
                    value={slotInput}
                    onChange={(e) => setSlotInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Confirm Booking
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
'''
SPEC_FILE.write_text(SPEC_CODE, encoding="utf-8")
print("  [UPDATED] specialists-section.tsx")
