"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SAMPLE_PATIENT, SAMPLE_LIPIDS, SAMPLE_MEDICAL_CONDITIONS, SAMPLE_FAMILY_HISTORY } from "../data/sample-patient";

export function PatientRecordsView() {
  const { setActiveView, showToast, patient, userBaseline, setOnboardingOpen } = usePatientDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Health record
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Everything CardioCore knows about you — patient-governed, exportable, and consent-gated.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Update Baseline</span>
          </button>
          <button
            onClick={() => showToast("Exporting clinical health summary (PDF / FHIR bundle)...", "ok")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Export record
          </button>
          <button
            onClick={() => setActiveView("profile")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
          >
            Privacy &amp; consent
          </button>
        </div>
      </div>

      {/* Top 2 Cards: Demographics & Lipid Panel */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Demographics Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)]">
              Personal information
            </h3>
            <span className="rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-700)]">
              verified
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Full name</span>
              <span className="font-semibold text-[var(--hi)]">{patient.name}</span>
            </div>
            {patient.email && (
              <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
                <span className="text-[var(--mid)]">Email</span>
                <span className="font-semibold text-[var(--teal-700)] dark:text-[var(--teal)]">{patient.email}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Date of birth</span>
              <span className="font-semibold text-[var(--hi)]">{patient.dob} ({patient.age} y)</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Sex at birth</span>
              <span className="font-semibold text-[var(--hi)]">{patient.gender} · clinical reference</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Height / weight</span>
              <span className="font-semibold text-[var(--hi)]">{patient.heightCm} cm · {patient.weightKg} kg</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Calculated BMI</span>
              <span className="font-semibold text-[var(--amber)]">{patient.bmi} · slightly above target</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-[var(--mid)]">Blood group</span>
              <span className="font-semibold text-[var(--hi)]">{patient.bloodGroup}</span>
            </div>
          </div>
        </div>

        {/* Lipid Profile Lab Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)]">
              Lipid profile
            </h3>
            <span className="rounded-full bg-[var(--amber-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--amber)]">
              lab data · 24 Sep 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <tr>
                  <th className="pb-2">Marker</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2 text-right">Vs last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[var(--hi)]">
                {SAMPLE_LIPIDS.map((lipid, idx) => (
                  <tr key={idx}>
                    <td className="py-2">
                      <span className="font-semibold block">{lipid.marker}</span>
                      <span className="text-[11px] text-[var(--muted)]">{lipid.target}</span>
                    </td>
                    <td className="py-2">
                      <strong className={lipid.status === "above target" || lipid.status === "borderline" ? "text-[var(--amber)]" : "text-[var(--hi)]"}>
                        {lipid.value}
                      </strong>{" "}
                      <span className="text-[11px] text-[var(--muted)]">{lipid.unit}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={lipid.delta.includes("↓") ? "text-[var(--green)] font-semibold" : lipid.delta.includes("↑") ? "text-[var(--amber)] font-semibold" : "text-[var(--mid)]"}>
                        {lipid.delta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--border)] flex justify-between items-center text-[11px] text-[var(--muted)]">
            <span>Source: Apollo Diagnostics</span>
            <button
              onClick={() => setActiveView("health")}
              className="text-[var(--teal-700)] font-semibold hover:underline"
            >
              Historical trends →
            </button>
          </div>
        </div>
      </div>

      {/* Medical & Family History Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Medical History */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
            Diagnosed medical conditions
          </h3>
          <div className="space-y-2.5">
            {userBaseline?.primaryCondition && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--teal-soft)] border border-[var(--teal)]/30">
                <div>
                  <strong className="block text-xs text-[var(--hi)]">{userBaseline.primaryCondition}</strong>
                  <span className="text-[11px] text-[var(--teal-700)] dark:text-[var(--teal)] font-medium">Active User Intake Baseline · Primary Corridor Monitoring</span>
                </div>
                <span className="rounded bg-[var(--teal)] px-2 py-0.5 text-[11px] font-bold text-white">
                  Intake Profile
                </span>
              </div>
            )}
            {SAMPLE_MEDICAL_CONDITIONS.map((cond, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-xs text-[var(--hi)]">{cond.condition}</strong>
                  <span className="text-[11px] text-[var(--muted)]">{cond.note}</span>
                </div>
                <span className="rounded bg-[var(--amber-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--amber)]">
                  diagnosed {cond.diagnosed}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)]">
            CardioCore records only clinician-diagnosed conditions. The platform does not diagnose medical conditions independently.
          </p>
        </div>

        {/* Family History */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
            Family history
          </h3>
          <div className="space-y-2.5">
            {SAMPLE_FAMILY_HISTORY.map((rel, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal-soft)] text-[var(--teal-700)] font-bold text-xs shrink-0">
                  {rel.initials}
                </div>
                <div>
                  <strong className="block text-[var(--hi)]">{rel.relation}</strong>
                  <span className="text-[11px] text-[var(--mid)]">{rel.details}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)]">
            Family history provides statistical baseline context only; it is never treated as a diagnosis for you.
          </p>
        </div>
      </div>
    </div>
  );
}
