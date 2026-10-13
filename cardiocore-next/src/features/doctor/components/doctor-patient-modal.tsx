"use client";

import React from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";
import { EcgStripCanvas } from "@/features/patient/components/ecg-strip-canvas";

export function DoctorPatientModal() {
  const { selectedPatient, setSelectedPatientId, showToast } = useDoctorDashboard();

  if (!selectedPatient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--teal-soft)] font-heading text-xl font-bold text-[var(--teal-700)] shrink-0">
              {selectedPatient.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-bold text-[var(--hi)]">
                  {selectedPatient.name}
                </h2>
                <span className="font-mono text-xs text-[var(--muted)]">MRN: {selectedPatient.mrn}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    selectedPatient.level === "Urgent"
                      ? "bg-[var(--red-soft)] text-[var(--red)]"
                      : selectedPatient.level === "Attention"
                      ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                      : "bg-[var(--green-soft)] text-[var(--green)]"
                  }`}
                >
                  {selectedPatient.level}
                </span>
              </div>
              <p className="text-xs text-[var(--mid)] mt-1">
                {selectedPatient.age} y · {selectedPatient.gender} · Diagnoses: {selectedPatient.conditions.join(", ")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedPatientId(null)}
            className="rounded-xl border border-[var(--border)] p-2 text-sm text-[var(--muted)] hover:text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Consent & Access Scope Banner */}
        <div className="rounded-xl bg-[var(--tint)]/70 p-3.5 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[var(--mid)] font-medium">
            <strong>Consent Scope: </strong>{selectedPatient.consentDetail} · Access logged in demo audit ledger.
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--teal-700)] font-semibold shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Consent State: Demonstration Only
          </span>
        </div>

        {/* 4 Multi-Signal Vitals Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <span className="text-[var(--muted)] block">Heart rate</span>
            <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
              {selectedPatient.vitals.hr} <span className="text-xs font-normal text-[var(--muted)]">bpm</span>
            </div>
            <span className="text-[11px] text-[var(--mid)] mt-0.5 block">
              baseline {selectedPatient.vitals.baselineHr} ({selectedPatient.baselineDelta})
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <span className="text-[var(--muted)] block">HRV</span>
            <div className="mt-1 font-heading text-2xl font-bold text-[var(--violet)]">
              {selectedPatient.vitals.hrv} <span className="text-xs font-normal text-[var(--muted)]">ms</span>
            </div>
            <span className="text-[11px] text-[var(--mid)] mt-0.5 block">
              baseline {selectedPatient.vitals.baselineHrv} ms
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <span className="text-[var(--muted)] block">SpO₂</span>
            <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
              {selectedPatient.vitals.spo2} <span className="text-xs font-normal text-[var(--muted)]">%</span>
            </div>
            <span className="text-[11px] text-[var(--mid)] mt-0.5 block">continuous PPG</span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <span className="text-[var(--muted)] block">Signal quality</span>
            <div className="mt-1 font-heading text-2xl font-bold text-[var(--green)]">
              {Math.round(selectedPatient.qualityScore * 100)}%
            </div>
            <span className="text-[11px] text-[var(--mid)] mt-0.5 block">verified good</span>
          </div>
        </div>

        {/* Lead I ECG Strip */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Simulated Lead-I ECG Strip · 250 Hz · 25 mm/s
            </span>
            <span className="rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs text-[var(--mid)]">
              Synced: {selectedPatient.lastSync}
            </span>
          </div>
          <EcgStripCanvas hr={selectedPatient.vitals.hr} height={140} />
        </div>

        {/* Clinical Summary & Actions */}
        <div className="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)] text-xs text-[var(--mid)] leading-relaxed space-y-2">
          <strong className="block text-[var(--hi)] font-bold">Clinical Case Note:</strong>
          <p>{selectedPatient.clinicalSummary}</p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => showToast(`Consultation note drafted for ${selectedPatient.name} (demonstration state only; not sent to backend).`, "ok")}
              className="rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
            >
              Write consult note
            </button>
            <button
              onClick={() => showToast(`Message composer opened for ${selectedPatient.name} (demonstration session).`, "ok")}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            >
              Message patient
            </button>
            <button
              onClick={() => showToast(`Exported clinical telemetry report for ${selectedPatient.name} (synthetic demonstration data).`, "ok")}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
            >
              Export PDF
            </button>
          </div>

          <button
            onClick={() => setSelectedPatientId(null)}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Non-Diagnostic Disclaimer */}
        <p className="text-[11px] text-[var(--muted)] text-center">
          Demonstration Case View — Telemetry and clinical records shown are synthetic. No live patient record or HIPAA/DISHA protected entity is connected.
        </p>
      </div>
    </div>
  );
}
