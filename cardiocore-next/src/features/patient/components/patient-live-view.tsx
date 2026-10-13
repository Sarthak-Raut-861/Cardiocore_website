"use client";

import React, { useState, useEffect } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SIMULATOR_SCENARIOS, SimulatorScenario } from "../data/sample-scenarios";
import { SparklineCanvas } from "./sparkline-canvas";
import { IS_REAL_BACKEND_ENABLED, getWebSocketTelemetryUrl } from "@/lib/api/backend-config";
import { LiveWaveformMonitor } from "@/features/telemetry/components/live-waveform-monitor";

export function PatientLiveView() {
  const { showToast } = usePatientDashboard();
  const [activeScenarioId, setActiveScenarioId] = useState<string>("rest");
  const [elapsed, setElapsed] = useState(0);
  const [logEntries, setLogEntries] = useState<Array<{ time: string; text: string; kind: string }>>([
    { time: "00:00", text: "Bench initialised: resting baseline loaded.", kind: "info" },
  ]);

  const currentScenario: SimulatorScenario = SIMULATOR_SCENARIOS[activeScenarioId] || SIMULATOR_SCENARIOS.rest;

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleScenarioChange = (id: string) => {
    setActiveScenarioId(id);
    const scn = SIMULATOR_SCENARIOS[id];
    setLogEntries((prev) => [
      {
        time: formatElapsed(elapsed),
        text: `Switched to scenario: ${scn.label} (HR: ${scn.hr}, HRV: ${scn.hrv}ms).`,
        kind: scn.id === "arrhythmia" ? "warn" : "info",
      },
      ...prev.slice(0, 15),
    ]);
  };

  const resetBench = () => {
    setActiveScenarioId("rest");
    setElapsed(0);
    setLogEntries([{ time: "00:00", text: "Simulator reset to resting scenario.", kind: "info" }]);
    showToast("Simulator benchmark reset to resting state.", "ok");
  };

  // Sparkline synthetic history
  const hrHistory = [currentScenario.hr - 2, currentScenario.hr - 1, currentScenario.hr, currentScenario.hr + 1, currentScenario.hr];
  const hrvHistory = [currentScenario.hrv + 2, currentScenario.hrv + 1, currentScenario.hrv, currentScenario.hrv - 1, currentScenario.hrv];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Live monitor bench
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            A controlled simulation bench: drive bio-signals through physiological scenarios to evaluate real-time decision gating.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-mono text-xs font-semibold text-[var(--mid)]">
            {formatElapsed(elapsed)} elapsed
          </span>
          <button
            onClick={resetBench}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Grid: 1.55fr and 1fr */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Scenario Selector */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Physiological scenario
            </span>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.values(SIMULATOR_SCENARIOS).map((scn) => (
                <button
                  key={scn.id}
                  onClick={() => handleScenarioChange(scn.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    activeScenarioId === scn.id
                      ? "bg-[var(--teal)] text-white shadow-sm"
                      : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--mid)] hover:text-[var(--hi)]"
                  }`}
                >
                  {scn.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--mid)] bg-[var(--tint)]/50 p-3 rounded-xl border border-[var(--border)]">
              {currentScenario.note}
            </p>
          </div>

          {/* 4 Real-time Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <span className="text-xs text-[var(--muted)] block">Heart rate</span>
              <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
                {currentScenario.hr} <span className="text-xs font-normal text-[var(--muted)]">bpm</span>
              </div>
              <span className="text-[11px] text-[var(--mid)] mt-0.5 block">baseline 69 bpm</span>
              <div className="mt-2">
                <SparklineCanvas data={hrHistory} color="#0E9E9E" height={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <span className="text-xs text-[var(--muted)] block">HRV</span>
              <div className="mt-1 font-heading text-2xl font-bold text-[var(--violet)]">
                {currentScenario.hrv} <span className="text-xs font-normal text-[var(--muted)]">ms</span>
              </div>
              <span className="text-[11px] text-[var(--mid)] mt-0.5 block">baseline 52 ms</span>
              <div className="mt-2">
                <SparklineCanvas data={hrvHistory} color="#7A6BF0" height={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <span className="text-xs text-[var(--muted)] block">SpO₂</span>
              <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
                {currentScenario.spo2} <span className="text-xs font-normal text-[var(--muted)]">%</span>
              </div>
              <span className="text-[11px] text-[var(--mid)] mt-0.5 block">floor 96%</span>
              <div className="mt-2">
                <SparklineCanvas data={[98, 98, currentScenario.spo2, currentScenario.spo2]} color="#12A6CF" height={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <span className="text-xs text-[var(--muted)] block">Skin temp</span>
              <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
                {currentScenario.temp.toFixed(1)} <span className="text-xs font-normal text-[var(--muted)]">°C</span>
              </div>
              <span className="text-[11px] text-[var(--mid)] mt-0.5 block">baseline 36.6 °C</span>
              <div className="mt-2">
                <SparklineCanvas data={[36.6, 36.6, currentScenario.temp]} color="#12A06A" height={32} />
              </div>
            </div>
          </div>

          {/* Phase 9 Single-Lead Live Waveform Monitor */}
          <LiveWaveformMonitor
            isBackendConnected={IS_REAL_BACKEND_ENABLED}
            wsUrl={IS_REAL_BACKEND_ENABLED ? getWebSocketTelemetryUrl() : undefined}
          />

          {/* Urgent Trigger Card if Arrhythmia */}
          {activeScenarioId === "arrhythmia" && (
            <div className="rounded-2xl border-l-4 border-l-[var(--red)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-2)] animate-pulse">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-block rounded bg-[var(--red-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--red)]">
                    Level 3 Escalation Criteria Met (Simulated Scenario)
                  </span>
                  <h3 className="font-heading text-base font-bold text-[var(--hi)] mt-1">
                    Two of four urgent criteria satisfied simultaneously
                  </h3>
                  <p className="text-xs text-[var(--mid)] mt-1">
                    HR ≥ 30% above baseline at rest (141 bpm), HRV loss (19 ms), motion ruled out. Simulated prototype logic only · Not a clinically validated diagnosis or triage dispatch.
                  </p>
                </div>
                <button
                  onClick={() => showToast("Simulated escalation logged: Prototype demonstration only. Not transmitted to emergency services.", "warn")}
                  className="rounded-xl bg-[var(--red)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--red)]/90 transition-colors shrink-0"
                >
                  Simulate escalation review
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Decision Gates Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
              Real-time decision gates
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Signal quality</strong>
                  <span className="text-[var(--muted)]">ECG + PPG optical coherence</span>
                </div>
                <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-semibold text-[var(--green)]">
                  {currentScenario.decisionGates.quality}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Motion ruled out</strong>
                  <span className="text-[var(--muted)]">Posture and accelerometry</span>
                </div>
                <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-semibold text-[var(--green)]">
                  {currentScenario.decisionGates.motion}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Persistence</strong>
                  <span className="text-[var(--muted)]">≥ 8 minutes continuous</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-semibold ${
                    currentScenario.decisionGates.persistence === "escalated"
                      ? "bg-[var(--red-soft)] text-[var(--red)]"
                      : "bg-[var(--tint)] text-[var(--mid)]"
                  }`}
                >
                  {currentScenario.decisionGates.persistence}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Multi-signal agreement</strong>
                  <span className="text-[var(--muted)]">HR, HRV, SpO₂, temp</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-semibold ${
                    currentScenario.decisionGates.multiSignal.includes("Criteria")
                      ? "bg-[var(--red-soft)] text-[var(--red)]"
                      : "bg-[var(--tint)] text-[var(--mid)]"
                  }`}
                >
                  {currentScenario.decisionGates.multiSignal}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[var(--muted)]">
              All four decision gates must validate before an actionable alert is dispatched.
            </p>
          </div>

          {/* Real-time Simulator Log */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
              Simulator evaluation log
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
              {logEntries.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] border-b border-[var(--border)]/40 pb-1.5">
                  <span className="text-[var(--muted)] shrink-0">[{entry.time}]</span>
                  <span className={entry.kind === "warn" ? "text-[var(--red)] font-semibold" : "text-[var(--mid)]"}>
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
