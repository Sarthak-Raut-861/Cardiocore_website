"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

export function PatientRecordsView() {
  const { setActiveView, showToast, patient, userBaseline, setOnboardingOpen, setLabModalOpen, customLabs } = usePatientDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Health record
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Verified patient clinical record — patient-governed, exportable, and consent-gated.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Update Baseline Details</span>
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
            <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
              Intake verified
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
              <span className="font-semibold text-[var(--teal-700)] dark:text-[var(--teal)]">{patient.bmi} (Verified)</span>
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
              Lipid &amp; Biomarker Labs
            </h3>
            <button
              type="button"
              onClick={() => setLabModalOpen(true)}
              className="text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:underline"
            >
              + Add lab report
            </button>
          </div>

          {customLabs.length === 0 ? (
            <div className="rounded-xl bg-[var(--surface-2)] p-6 text-center border border-[var(--border)] space-y-2 mt-4">
              <span className="text-xl block">🧪</span>
              <strong className="block text-xs font-bold text-[var(--hi)]">No Blood Panels Logged</strong>
              <p className="text-[11px] text-[var(--muted)] max-w-xs mx-auto">
                No external laboratory results (Lipids, hs-CRP, HbA1c) have been imported for this profile.
              </p>
              <button
                type="button"
                onClick={() => setLabModalOpen(true)}
                className="mt-2 rounded-xl bg-[var(--teal)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)]"
              >
                Log First Lab Result
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="pb-2">Marker</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 text-[var(--hi)]">
                  {customLabs.map((lab) => (
                    <tr key={lab.id}>
                      <td className="py-2">
                        <span className="font-semibold block">{lab.name}</span>
                        <span className="text-[11px] text-[var(--muted)]">{lab.date}</span>
                      </td>
                      <td className="py-2">
                        <strong>{lab.valueConv}</strong>
                      </td>
                      <td className="py-2 text-right">
                        <span className="rounded bg-[var(--teal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--teal-700)] capitalize">
                          {lab.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-2 border-t border-[var(--border)] flex justify-between items-center text-[11px] text-[var(--muted)]">
            <span>Direct patient intake data</span>
            <button
              onClick={() => setActiveView("health")}
              className="text-[var(--teal-700)] dark:text-[var(--teal)] font-semibold hover:underline"
            >
              Corridor trends →
            </button>
          </div>
        </div>
      </div>

      {/* Medical & Family History Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Medical History */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)]">
              Diagnosed medical conditions
            </h3>
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:underline"
            >
              Edit condition
            </button>
          </div>

          <div className="space-y-2.5">
            {userBaseline?.primaryCondition ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--teal-soft)] border border-[var(--teal)]/30">
                <div>
                  <strong className="block text-xs text-[var(--hi)] font-bold">{userBaseline.primaryCondition}</strong>
                  <span className="text-[11px] text-[var(--teal-700)] dark:text-[var(--teal)] font-medium">
                    Active Intake Baseline · Synchronized with ESP32 Telemetry
                  </span>
                </div>
                <span className="rounded bg-[var(--teal)] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Monitored
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--surface-2)] p-4 text-center border border-[var(--border)] space-y-1">
                <span className="text-base block">🩺</span>
                <strong className="text-xs text-[var(--hi)] block">Preventive Cardiovascular Baseline</strong>
                <p className="text-[11px] text-[var(--muted)]">
                  No pre-existing cardiovascular diagnoses reported during entrance intake.
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)]">
            CardioCore records only patient-reported or clinician-confirmed conditions. The platform does not synthesize diagnoses independently.
          </p>
        </div>

        {/* Family History */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
            Family history
          </h3>
          <div className="space-y-2.5">
            <div className="rounded-xl bg-[var(--surface-2)] p-4 text-center border border-[var(--border)] space-y-1">
              <span className="text-base block">🧬</span>
              <strong className="text-xs text-[var(--hi)] block">No Hereditary Risk Factors Logged</strong>
              <p className="text-[11px] text-[var(--muted)]">
                No immediate family history of premature coronary artery disease or arrhythmia recorded. You can add family predispositions by re-opening your clinical baseline settings.
              </p>
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="mt-2 text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] underline hover:opacity-80"
              >
                Add Family Context
              </button>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)]">
            Family history provides statistical baseline context only; it is never treated as a diagnostic determination.
          </p>
        </div>
      </div>
    </div>
  );
}
