"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SAMPLE_ALERTS } from "../data/sample-patient";

export function PatientAlertsView() {
  const { setActiveView, showToast, engineMode } = usePatientDashboard();
  const [activeTab, setActiveTab] = useState<string>("All");

  const tabs = ["All", "Daily", "Weekly", "Device", "Marked read"];

  // In live mode (real user), real alerts start empty until an anomalous telemetry excursion occurs
  const alertsList = engineMode === "demo" ? SAMPLE_ALERTS : [];

  const filteredAlerts = alertsList.filter((a) => {
    if (activeTab === "All") return true;
    if (activeTab === "Device") return a.category === "Device";
    if (activeTab === "Marked read") return a.read;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Alert centre
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Alerts evaluate multi-signal coherence, persistence, and signal quality before triggering an escalation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast("All alerts marked as read.", "ok")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Mark all read
          </button>
          <button
            onClick={() => setActiveView("profile")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
          >
            Alert settings
          </button>
        </div>
      </div>

      {/* 3 Level Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-l-4 border-l-[var(--red)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Level 3 · Urgent</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--red)]">
            {engineMode === "demo" ? 1 : 0}
          </div>
          <span className="mt-1 text-xs text-[var(--mid)] block">
            {engineMode === "demo" ? "last 7 days · requires review" : "zero active urgent flags"}
          </span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--amber)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Level 2 · Attention</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--amber)]">
            {engineMode === "demo" ? 2 : 0}
          </div>
          <span className="mt-1 text-xs text-[var(--mid)] block">
            {engineMode === "demo" ? "last 7 days · keep monitoring" : "corridor operating normally"}
          </span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--cyan)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Level 1 · Informational</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--cyan)]">
            {engineMode === "demo" ? 6 : 0}
          </div>
          <span className="mt-1 text-xs text-[var(--mid)] block">
            {engineMode === "demo" ? "last 7 days · context only" : "telemetry verified clean"}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] shadow-[var(--sh-1)]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === tab
                ? "bg-[var(--teal)] text-white shadow-sm"
                : "text-[var(--mid)] hover:text-[var(--hi)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center space-y-3 shadow-[var(--sh-1)]">
          <span className="text-4xl block">🟢</span>
          <h3 className="font-heading text-lg font-bold text-[var(--hi)]">Zero Active Anomalies</h3>
          <p className="text-xs text-[var(--mid)] max-w-md mx-auto">
            ESP32 single-lead ECG telemetry and all 72 BiomarkerTwin parameters remain securely inside your calibrated personal corridor.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 shadow-[var(--sh-1)] transition-all ${
                alert.level === 3
                  ? "border-l-4 border-l-[var(--red)] border-[var(--border)] bg-[var(--surface)]"
                  : alert.level === 2
                  ? "border-l-4 border-l-[var(--amber)] border-[var(--border)] bg-[var(--surface)]"
                  : "border-l-4 border-l-[var(--cyan)] border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      alert.level === 3
                        ? "bg-[var(--red-soft)] text-[var(--red)]"
                        : alert.level === 2
                        ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                        : "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                    }`}
                  >
                    {alert.level === 3 ? "!" : alert.level === 2 ? "▲" : "i"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                        {alert.title}
                      </h3>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                          alert.level === 3
                            ? "bg-[var(--red-soft)] text-[var(--red)]"
                            : alert.level === 2
                            ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                            : "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                        }`}
                      >
                        {alert.levelLabel}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{alert.time}</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--mid)] leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => showToast(`Alert ${alert.id} marked as reviewed.`, "ok")}
                    className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
