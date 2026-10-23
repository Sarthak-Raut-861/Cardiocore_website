"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePatientDashboard, PatientViewId } from "../context/patient-dashboard-context";
import { PatientHomeView } from "./patient-home-view";
import { PatientHealthView } from "./patient-health-view";
import { PatientEcgView } from "./patient-ecg-view";
import { PatientTwinView } from "./patient-twin-view";
import { PatientAlertsView } from "./patient-alerts-view";
import { PatientLiveView } from "./patient-live-view";
import { PatientDayView } from "./patient-day-view";
import { PatientRecordsView } from "./patient-records-view";
import { PatientProfileView } from "./patient-profile-view";
import { PatientMedsView } from "./patient-meds-view";
import { PatientApptsView } from "./patient-appts-view";
import { PatientMessagesView } from "./patient-messages-view";

export function PatientShell() {
  const {
    activeView,
    setActiveView,
    units,
    setUnits,
    toastMessage,
    toastType,
    showToast,
    patient, engineMode, setEngineMode, twinState, runTwinSimulation, labModalOpen, setLabModalOpen, addLabResult } = usePatientDashboard();
  const [labName, setLabName] = useState('NT-proBNP');
  const [labConv, setLabConv] = useState('95 pg/mL');
  const [labSi, setLabSi] = useState('11.2 pmol/L');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const monitoringItems: Array<{ id: PatientViewId; label: string; icon: string; badge?: string | number; badgeColor?: string }> = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "health", label: "Health & trends", icon: "📈" },
    { id: "ecg", label: "ECG lab", icon: "⚡" },
    { id: "live", label: "Live monitor", icon: "🎯" },
    { id: "day", label: "Day in review", icon: "📅" },
    { id: "twin", label: "Digital Twin", icon: "🧬", badge: engineMode === "live" ? String(twinState.score) : "82", badgeColor: "bg-[var(--teal-soft)] text-[var(--teal-700)]" },
    { id: "messages", label: "Messages", icon: "💬" },
    { id: "alerts", label: "Alerts", icon: "🔔", badge: "3", badgeColor: "bg-[var(--amber-soft)] text-[var(--amber)]" },
  ];

  const careItems: Array<{ id: PatientViewId; label: string; icon: string }> = [
    { id: "appts", label: "Appointments", icon: "🩺" },
    { id: "meds", label: "Medications", icon: "💊" },
    { id: "records", label: "Health record", icon: "📋" },
    { id: "profile", label: "Profile & settings", icon: "👤" },
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case "home":
        return <PatientHomeView />;
      case "health":
        return <PatientHealthView />;
      case "ecg":
        return <PatientEcgView />;
      case "twin":
        return <PatientTwinView />;
      case "alerts":
        return <PatientAlertsView />;
      case "live":
        return <PatientLiveView />;
      case "day":
        return <PatientDayView />;
      case "records":
        return <PatientRecordsView />;
      case "profile":
        return <PatientProfileView />;
      case "meds":
        return <PatientMedsView />;
      case "appts":
        return <PatientApptsView />;
      case "messages":
        return <PatientMessagesView />;
      default:
        return <PatientHomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--hi)] flex flex-col antialiased">
            {/* 1. Interactive Engine Mode Switcher Bar (Live 72-Factor Twin vs Demo Mode) */}
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
                Connected to <strong>{twinState.source}</strong> for <strong>{patient.name}</strong> · 10-Yr CVD Risk:{" "}
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
                ✕
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

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 2. Navigation Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand header */}
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--teal)] text-white shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
                  <path d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8" stroke="#C9FBEF" />
                </svg>
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-[var(--hi)]">
                CardioCore
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[var(--muted)] hover:text-[var(--hi)] p-1"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links Scroll Area */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {/* Monitoring Section */}
            <div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Monitoring
              </span>
              <div className="mt-2 space-y-1">
                {monitoringItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeView === item.id
                        ? "bg-[var(--tint)] text-[var(--teal-700)] shadow-sm"
                        : "text-[var(--mid)] hover:bg-[var(--surface-2)] hover:text-[var(--hi)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badgeColor || "bg-[var(--tint)] text-[var(--mid)]"}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Care Section */}
            <div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Care &amp; Records
              </span>
              <div className="mt-2 space-y-1">
                {careItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeView === item.id
                        ? "bg-[var(--tint)] text-[var(--teal-700)] shadow-sm"
                        : "text-[var(--mid)] hover:bg-[var(--surface-2)] hover:text-[var(--hi)]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer: Patient Avatar & Exit */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
            <div
              onClick={() => setActiveView("profile")}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--tint)] cursor-pointer transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft)] text-xs font-bold text-[var(--teal-700)]">
                {patient.initials}
              </div>
              <div className="text-left overflow-hidden">
                <strong className="block text-xs font-bold text-[var(--hi)] truncate">
                  {patient.name}
                </strong>
                <span className="text-[11px] text-[var(--muted)] block truncate">
                  {patient.email || `${patient.age} y · Model active`}
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            >
              ← Exit to sign in
            </Link>
          </div>
        </aside>

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/90 px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-[var(--border)] text-[var(--hi)]"
                aria-label="Toggle navigation menu"
              >
                ☰
              </button>
              {/* Search Bar Placeholder */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--muted)] w-72">
                <span>🔍</span>
                <span>Search telemetry, ECG, doctors... ⌘K</span>
              </div>
            </div>

            {/* Topbar Actions */}
            <div className="flex items-center gap-2.5">
              {/* Device Status */}
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Band connected {patient.wearableBattery}%
              </span>

              {/* Unit Toggle */}
              <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] text-xs font-semibold">
                <button
                  onClick={() => {
                    setUnits("si");
                    showToast("Switched to SI units (min⁻¹, ms, °C, mmol/L).", "ok");
                  }}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    units === "si" ? "bg-[var(--teal)] text-white" : "text-[var(--mid)]"
                  }`}
                >
                  SI
                </button>
                <button
                  onClick={() => {
                    setUnits("conv");
                    showToast("Switched to conventional units (BPM, °F, mg/dL).", "ok");
                  }}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    units === "conv" ? "bg-[var(--teal)] text-white" : "text-[var(--mid)]"
                  }`}
                >
                  Conv
                </button>
              </div>

              {/* Alerts Shortcut */}
              <button
                onClick={() => setActiveView("alerts")}
                className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2 text-xs hover:bg-[var(--tint)] transition-colors"
                title="Alert centre"
              >
                🔔
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--amber)] text-[10px] font-bold text-white">
                  3
                </span>
              </button>

              {/* Emergency Panic Button */}
              <button
                onClick={() => showToast("Emergency notice: In a production build, this initiates an urgent review triage. For immediate acute symptoms, call local emergency services.", "warn")}
                className="rounded-xl border border-[var(--red)] bg-[var(--red-soft)] px-3 py-1.5 text-xs font-bold text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-all"
                title="Emergency review"
              >
                SOS Emergency
              </button>
            </div>
          </header>

          {/* Active View Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActiveView()}
          </main>

          {/* 4. Non-Diagnostic Disclaimer Footer */}
          <footer className="border-t border-[var(--border)] bg-[var(--surface)] p-5 text-center text-xs text-[var(--muted)]">
            <p className="max-w-3xl mx-auto">
              <strong>Non-Diagnostic Notice: </strong>
              CardioCoreEdge is an investigational decision-support interface. Telemetry curves, variability envelopes, and baseline indicators are illustrative and must not be used as clinical diagnostic criteria or as a substitute for professional medical advice.
            </p>
          </footer>
        </div>
      </div>

      {/* Interactive Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md rounded-2xl p-4 shadow-xl text-xs font-semibold border flex items-center gap-3 animate-fade-in ${
            toastType === "warn"
              ? "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]"
              : toastType === "info"
              ? "bg-[var(--cyan-soft)] text-[var(--cyan)] border-[var(--cyan)]"
              : "bg-[var(--surface)] text-[var(--hi)] border-[var(--teal)] shadow-[var(--sh-2)]"
          }`}
          role="status"
        >
          <span>{toastType === "warn" ? "⚠️" : toastType === "info" ? "ℹ️" : "✓"}</span>
          <span className="flex-1">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
