"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SAMPLE_ALERTS } from "../data/sample-patient";

export function PatientAlertsView() {
  const { setActiveView, showToast } = usePatientDashboard();
  const [activeTab, setActiveTab] = useState<string>("All");

  const tabs = ["All", "Daily", "Weekly", "Device", "Marked read"];

  const filteredAlerts = SAMPLE_ALERTS.filter((a) => {
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
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--red)]">1</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">last 7 days · requires review</span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--amber)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Level 2 · Attention</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--amber)]">2</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">last 7 days · keep monitoring</span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--cyan)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Level 1 · Informational</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--cyan)]">6</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">last 7 days · context only</span>
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
                  </div>
                  <p className="mt-2 text-xs text-[var(--mid)] leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/60">
                    {alert.level === 3 ? (
                      <>
                        <button
                          onClick={() => showToast("Opening assessment log (simulated incident review)...", "info")}
                          className="rounded-lg bg-[var(--red)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--red)]/90 transition-colors"
                        >
                          Open the assessment
                        </button>
                        <button
                          onClick={() => showToast("Downloaded alert summary as PDF with timestamps.", "ok")}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
                        >
                          Export PDF
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveView("health")}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
                        >
                          See trend
                        </button>
                        <button
                          onClick={() => showToast("Simulated sharing: alerts are not transmitted to clinicians without active backend integration.", "info")}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                        >
                          Share with doctor
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)] shrink-0">{alert.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-[var(--tint)]/60 p-4 text-xs text-[var(--mid)]">
        <strong>Multi-signal safety policy: </strong>
        Alerts require concurrent signal verification, duration persistence, and artifact rejection. A single out-of-range sensor sample will not wake you up.
      </div>
    </div>
  );
}
