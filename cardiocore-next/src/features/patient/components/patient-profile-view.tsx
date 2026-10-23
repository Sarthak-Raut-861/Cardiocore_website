"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SAMPLE_PATIENT } from "../data/sample-patient";

export function PatientProfileView() {
  const { showToast, patient, userBaseline, setOnboardingOpen, setSensorModalOpen } = usePatientDashboard();
  const [consentBaseline, setConsentBaseline] = useState(true);
  const [consentEcg, setConsentEcg] = useState(true);
  const [consentResearch, setConsentResearch] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Profile &amp; security
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Consent permissions, emergency preferences, wearable device sync, and account governance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Edit Clinical Baseline</span>
          </button>
          <button
            type="button"
            onClick={() => setSensorModalOpen(true)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-all flex items-center gap-1.5"
          >
            <span>📡</span>
            <span>Configure Sensors</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--teal-soft)] font-heading text-2xl font-bold text-[var(--teal-700)] shrink-0">
            {patient.initials}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-bold text-[var(--hi)]">{patient.name}</h2>
              {patient.email && (
                <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--teal-700)]">
                  {patient.email}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--mid)] mt-0.5">
              {patient.age} y · {patient.heightCm} cm · {patient.weightKg} kg · BMI {patient.bmi} · {patient.bloodGroup} · {userBaseline?.primaryCondition || "Preventive Monitoring"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                Baseline active ({patient.monitoredDays}d)
              </span>
              <span className="rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs font-medium text-[var(--mid)]">
                Wearable battery {patient.wearableBattery}%
              </span>
              <span className="rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs font-medium text-[var(--mid)]">
                Member since {patient.memberSince}
              </span>
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:bg-[var(--tint)] transition-colors"
              >
                ✏️ Re-calibrate Baseline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Emergency Care Preferences */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
            Emergency preferences
          </span>
          <div className="space-y-2.5 text-xs">
            <div className="border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)] block text-[11px]">Emergency contact</span>
              <strong className="text-[var(--hi)]">
                {userBaseline?.emergencyContact ? `${userBaseline.emergencyContact} · ${userBaseline.emergencyPhone}` : "Not configured during intake"}
              </strong>
            </div>
            <div className="border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)] block text-[11px]">Preferred hospital</span>
              <strong className="text-[var(--hi)]">
                {userBaseline?.hospital || "Not assigned · Local Emergency Services"}
              </strong>
            </div>
            <div className="border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)] block text-[11px]">Attending cardiologist</span>
              <strong className="text-[var(--hi)]">
                {userBaseline?.cardiologist || "Direct Patient Monitoring (Self-directed)"}
              </strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[var(--mid)]">Automatic urgent escalation</span>
              <span className="font-bold text-[var(--green)]">ENABLED</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[var(--mid)]">Emergency telemetry share</span>
              <span className="font-bold text-[var(--green)]">ENABLED</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)] leading-relaxed">
            CardioCore never contacts emergency services on your behalf without your explicit action or verified hospital integration.
          </p>
        </div>

        {/* Privacy & Consent Controls */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
            Privacy &amp; consent ledger
          </span>
          <div className="space-y-3 text-xs">
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <strong className="text-[var(--hi)] block">Share baseline with care team</strong>
                <span className="text-[11px] text-[var(--muted)]">2 clinicians · expires after consultation</span>
              </div>
              <input
                type="checkbox"
                checked={consentBaseline}
                onChange={(e) => {
                  setConsentBaseline(e.target.checked);
                  showToast(e.target.checked ? "Consent granted (demonstration state). Server enforcement pending FastAPI backend." : "Consent revoked (demonstration state). Server enforcement pending FastAPI backend.", "info");
                }}
                className="h-4 w-4 rounded accent-[var(--teal)] mt-0.5"
              />
            </label>

            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <strong className="text-[var(--hi)] block">Share ECG strips</strong>
                <span className="text-[11px] text-[var(--muted)]">3 strips shared this month</span>
              </div>
              <input
                type="checkbox"
                checked={consentEcg}
                onChange={(e) => {
                  setConsentEcg(e.target.checked);
                  showToast(e.target.checked ? "ECG sharing enabled (demonstration state)." : "ECG sharing disabled (demonstration state).", "info");
                }}
                className="h-4 w-4 rounded accent-[var(--teal)] mt-0.5"
              />
            </label>

            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <strong className="text-[var(--hi)] block">Anonymous research telemetry</strong>
                <span className="text-[11px] text-[var(--muted)]">De-identified &amp; aggregated only</span>
              </div>
              <input
                type="checkbox"
                checked={consentResearch}
                onChange={(e) => {
                  setConsentResearch(e.target.checked);
                  showToast(e.target.checked ? "Opted in to de-identified research." : "Opted out of research.", "ok");
                }}
                className="h-4 w-4 rounded accent-[var(--teal)] mt-0.5"
              />
            </label>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <div>
                <strong className="text-[var(--hi)] block">Two-factor auth (2FA)</strong>
                <span className="text-[11px] text-[var(--muted)]">Authenticator app</span>
              </div>
              <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-semibold text-[var(--green)]">
                Active
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--tint)]/50 p-2.5 text-[11px] text-[var(--muted)]">
            * Note: Frontend consent toggles are illustrative. True cryptographic access revocation is enforced server-side once the FastAPI backend is operational.
          </div>
        </div>

        {/* Device & Account Details */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
            Device &amp; account
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⌚</span>
                <div>
                  <strong className="block text-[var(--hi)]">{patient.wearableModel}</strong>
                  <span className="text-[11px] text-[var(--green)]">Connected · {patient.wearableBattery}% battery · {patient.firmwareVersion}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSensorModalOpen(true)}
                className="rounded-lg bg-[var(--tint)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:opacity-80"
              >
                Change
              </button>
            </div>

            {patient.email && (
              <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                <span className="text-[var(--mid)]">Linked Account</span>
                <strong className="text-[var(--teal-700)] dark:text-[var(--teal)] truncate max-w-[170px]">{patient.email}</strong>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
              <span className="text-[var(--mid)]">Sync cadence</span>
              <strong className="text-[var(--hi)]">{patient.syncInterval}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
              <span className="text-[var(--mid)]">Offline cache</span>
              <strong className="text-[var(--hi)]">12 measurements queued</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
              <span className="text-[var(--mid)]">Data residency</span>
              <strong className="text-[var(--hi)]">India (Mumbai)</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--mid)]">Export formats</span>
              <strong className="text-[var(--hi)]">CSV · PDF · FHIR JSON</strong>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => showToast("Export initiated — a secure download link will be prepared.", "ok")}
              className="flex-1 rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            >
              Export my data
            </button>
            <button
              onClick={() => showToast("Account deletion requires re-authentication.", "warn")}
              className="flex-1 rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
