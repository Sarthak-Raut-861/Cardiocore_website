"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";

export function DoctorProfileView() {
  const { doctor, showToast } = useDoctorDashboard();
  const [l3Notify, setL3Notify] = useState(true);
  const [l2Notify, setL2Notify] = useState(true);
  const [l1Notify, setL1Notify] = useState(false);
  const [consentReminder, setConsentReminder] = useState(true);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Profile &amp; Credentials
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Persona
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Medical council registration, clinical affiliate institution, and data protection boundaries.
          </p>
        </div>
        <Link
          href="/login?role=doctor"
          className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <span>Sign out of demo</span>
        </Link>
      </div>

      {/* Main Profile Summary Card */}
      <div className="rounded-xl border border-border/60 bg-surface/50 p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-18 h-18 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-2xl font-sora shrink-0">
            {doctor.initials}
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-bold text-foreground font-sora">
              {doctor.name}
            </h2>
            <div className="text-xs text-muted-foreground">
              {doctor.degrees} · {doctor.specialty} · {doctor.experienceYears} years practice
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Council Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 text-muted-foreground border border-border/50">
                {doctor.registrationNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/5 text-muted-foreground border border-border/50">
                {doctor.institution}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {doctor.consentedPatientsCount} Consented Patients
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              showToast(
                "Credential update requires official re-verification with state medical council.",
                "warn"
              )
            }
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer self-start sm:self-center"
          >
            Update credentials
          </button>
        </div>
      </div>

      {/* 3 Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Access & Audit */}
        <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Access &amp; Audit Trail
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Records Accessible</span>
              <span className="font-semibold text-foreground">128 (consent-scoped)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Chart Opens This Month</span>
              <span className="font-semibold text-foreground">1,284 logged</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Two-Factor Auth</span>
              <span className="font-semibold text-emerald-400">Hardware / App</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Session Inactivity Timeout</span>
              <span className="font-semibold text-foreground">15 minutes</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Data Residency</span>
              <span className="font-semibold text-foreground">India (Mumbai DC)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() =>
                showToast(
                  "Personal access log for last 90 days downloaded (synthetic log entries).",
                  "ok"
                )
              }
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
            >
              Download log
            </button>
            <button
              type="button"
              onClick={() =>
                showToast(
                  "System check: Client crypto enclave operational. Zero key breaches.",
                  "ok"
                )
              }
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
            >
              System checks
            </button>
          </div>
        </div>

        {/* Card 2: Notification Rules */}
        <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Notification Rules
          </div>
          <p className="text-xs text-muted-foreground">
            Configure interrupt criteria. Routine observations collect silently in the clinical roster.
          </p>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={l3Notify}
                onChange={(e) => setL3Notify(e.target.checked)}
                className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Level 3 urgent — Push + SMS
                </div>
                <div className="text-[11px] text-muted-foreground">Immediate 24/7 paging</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={l2Notify}
                onChange={(e) => setL2Notify(e.target.checked)}
                className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Level 2 attention — Daily digest
                </div>
                <div className="text-[11px] text-muted-foreground">Aggregated at 08:00 IST</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={l1Notify}
                onChange={(e) => setL1Notify(e.target.checked)}
                className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Level 1 informational — In-app
                </div>
                <div className="text-[11px] text-muted-foreground">Silent roster update</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={consentReminder}
                onChange={(e) => setConsentReminder(e.target.checked)}
                className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <div className="text-xs font-semibold text-foreground">
                  Consent renewal reminders
                </div>
                <div className="text-[11px] text-muted-foreground">14 days prior to expiry</div>
              </div>
            </label>
          </div>
        </div>

        {/* Card 3: Clinical Guardrails */}
        <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Clinical Guardrails &amp; Ethics
          </div>

          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-foreground leading-relaxed">
            <span className="font-semibold text-cyan-300">Non-Diagnostic Support:</span> CardioCore provides decision support only. The platform never outputs automated diagnoses or validates clinical efficacy independently.
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-foreground leading-relaxed">
            <span className="font-semibold text-amber-300">Medication Safety:</span> Never advise patients to alter or discontinue prescription medications based on telemetry alone. All dose adjustments require formal clinical consultation.
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Emergency guidance must direct patients to local emergency departments. Automatic urgent slots provide accelerated triage, not critical life-support dispatch.
          </p>

          <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Governance Policy v3.1</span>
            <span>Reviewed 12 Aug 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
