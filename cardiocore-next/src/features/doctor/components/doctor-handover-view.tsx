"use client";

import React, { useState } from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";
import { SAMPLE_ROSTER_PATIENTS } from "../data/sample-roster";
import { SAMPLE_HANDOVER_RECIPIENTS } from "../data/sample-handover";

export function DoctorHandoverView() {
  const { doctor, showToast } = useDoctorDashboard();
  const [selectedPatientId, setSelectedPatientId] = useState<string>("aarav");

  const activePatient =
    SAMPLE_ROSTER_PATIENTS.find((p) => p.id === selectedPatientId) ||
    SAMPLE_ROSTER_PATIENTS[0];

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleRouteHandover = (recipientName: string) => {
    showToast(
      `Handover summary routed to ${recipientName}. Demonstration only: no network packets or EMR records transmitted.`,
      "ok"
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Clinical Handover &amp; Referral
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Document
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate printable, structured summaries for colleagues, on-call teams, or the patient&apos;s next appointment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-surface-2/90 border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-[200px]"
          >
            {SAMPLE_ROSTER_PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.age} y · {p.levelCode || "Routine"}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
          >
            Export / Print
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Printable Sheet Preview (8 cols) */}
        <div className="lg:col-span-8">
          <div
            id="clinical-handover-sheet"
            className="rounded-xl border border-border/70 bg-surface/70 p-6 md:p-8 backdrop-blur-sm space-y-6 shadow-lg print:border-none print:bg-white print:text-black print:p-0"
          >
            {/* Sheet Institutional Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border/50">
              <div>
                <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold font-sora">
                  CardioCoreEdge Clinical Network
                </div>
                <h2 className="text-lg font-bold text-foreground font-sora mt-0.5">
                  Inter-Provider Handover &amp; Summary
                </h2>
                <div className="text-xs text-muted-foreground">
                  Referring: {doctor.name} ({doctor.registrationNumber}) · {doctor.institution}
                </div>
              </div>
              <div className="text-left sm:text-right text-xs text-muted-foreground">
                <div>Document Ref: CC-HO-{activePatient.mrn}-2026</div>
                <div>Generated: 28 Sep 2026, 12:00 IST</div>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Consent Verified Active
                </span>
              </div>
            </div>

            {/* Patient Header Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-surface-2/50 border border-border/40">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Patient</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{activePatient.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">MRN / Demographics</div>
                <div className="text-sm font-mono text-foreground mt-0.5">{activePatient.mrn} · {activePatient.age}y/{activePatient.gender}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Primary Conditions</div>
                <div className="text-xs text-foreground mt-0.5">{activePatient.conditions.join(", ")}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Current State</div>
                <div className="text-xs font-bold text-rose-400 mt-0.5">
                  {activePatient.levelCode ? `${activePatient.levelCode} · ${activePatient.level}` : activePatient.level}
                </div>
              </div>
            </div>

            {/* Current Measurements & Delta against baseline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-sora">
                Telemetry &amp; Physiological Trajectory
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface-2/30 border border-border/30">
                  <span className="text-muted-foreground block text-[11px]">Resting HR</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {activePatient.restingHr ? `${activePatient.restingHr} bpm` : "Building"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Baseline: {activePatient.vitals.baselineHr || 72} bpm
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2/30 border border-border/30">
                  <span className="text-muted-foreground block text-[11px]">HRV (rMSSD)</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {activePatient.hrvMs ? `${activePatient.hrvMs} ms` : "Building"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Baseline: {activePatient.vitals.baselineHrv || 50} ms
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2/30 border border-border/30">
                  <span className="text-muted-foreground block text-[11px]">Blood Pressure</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {activePatient.conditions.includes("Hypertension") ? "138/88" : "120/80"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Target: &lt;130/80 mmHg</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-2/30 border border-border/30">
                  <span className="text-muted-foreground block text-[11px]">Adherence Rate</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {activePatient.adherencePct ? `${activePatient.adherencePct}%` : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">7-day verified</span>
                </div>
              </div>
            </div>

            {/* Medications */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 font-sora">
                Current Prescribed Pharmacotherapy
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {(activePatient.conditions.includes("Hypertension")
                  ? ["Metoprolol Succinate 50mg OD", "Telmisartan 40mg OD", "Atorvastatin 20mg HS"]
                  : activePatient.conditions.includes("Arrhythmia")
                  ? ["Bisoprolol 2.5mg OD", "Apixaban 5mg BD"]
                  : ["Aspirin 75mg OD", "Rosuvastatin 10mg HS"]
                ).map((med) => (
                  <span
                    key={med}
                    className="px-3 py-1.5 rounded-lg bg-surface-2/60 border border-border/50 text-foreground"
                  >
                    {med}
                  </span>
                ))}
              </div>
            </div>

            {/* Referring Clinician Impression & Plan */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sora">
                Reason for Handover &amp; Clinical Recommendation
              </h3>
              <div className="p-4 rounded-lg bg-surface-2/40 border border-border/40 text-xs leading-relaxed text-foreground space-y-2">
                <p>
                  Patient presented with sustained nocturnal tachycardia and concurrent HRV depression ruled out for posture or motion artifact. 30-second strip (Lead I, 250 Hz) demonstrates regular narrow-complex tachycardia at 138 bpm without gross ischemic ST deviation.
                </p>
                <p>
                  Requested electrophysiology correlation to rule out paroxysmal supraventricular tachycardia vs sinus tachycardia secondary to autonomic dysregulation. Patient instructed to maintain current medication regimen pending consultation.
                </p>
              </div>
            </div>

            {/* Digital Stamp & Disclaimers */}
            <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <div>
                Digitally authenticated by <span className="text-foreground font-semibold">{doctor.name}</span>
                <div className="font-mono text-[10px]">Hash: 8bfa923e · Non-diagnostic prototype handover</div>
              </div>
              <div className="sm:text-right text-[10px] max-w-xs">
                This document contains confidential patient health data transmitted under explicit patient consent. Unauthorized redistribution is prohibited.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Routing & Instructions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Route This Handover
            </div>

            <div className="space-y-3">
              {SAMPLE_HANDOVER_RECIPIENTS.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-surface-2/40 border border-border/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                      {rec.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {rec.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {rec.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRouteHandover(rec.name)}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-border/70 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                  >
                    Route
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clinical Guardrail
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Includes current state, alert tier, and triggering physiological deltas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Embeds current active prescriptions and 7-day verified adherence.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Restricted strictly to the data types authorized in the active patient consent directive.</span>
              </li>
            </ul>
            <div className="pt-2 text-[11px] text-muted-foreground border-t border-border/30">
              Handovers are logged in the cryptographic audit trail, and the patient receives a notification of the referral.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
