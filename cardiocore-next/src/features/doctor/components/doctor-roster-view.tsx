"use client";

import React from "react";
import { useDoctorDashboard, CohortFilterId } from "../context/doctor-dashboard-context";
import { EcgStripCanvas } from "@/features/patient/components/ecg-strip-canvas";

export function DoctorRosterView() {
  const {
    filteredPatients,
    cohortFilter,
    setCohortFilter,
    setSelectedPatientId,
    setActiveView,
    showToast,
  } = useDoctorDashboard();

  const tabs: Array<{ id: CohortFilterId; label: string }> = [
    { id: "all", label: "All" },
    { id: "highrisk", label: "Urgent & High Risk" },
    { id: "newconsent", label: "New Consents" },
    { id: "adherence", label: "Adherence < 80%" },
    { id: "baseline", label: "Building Baseline" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Triage roster
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Saturday, 4 October · ranked by validated alert level, then duration persistence. Access is consent-scoped and fully audited.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast("Triage roster exported as CSV (6 rows).", "ok")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => setSelectedPatientId("aarav")}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--red)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--sh-2)] hover:bg-[var(--red)]/90 transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M15 3h6v6M21 3l-9 9" />
              <path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
            </svg>
            Open urgent case (Menon)
          </button>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border-l-4 border-l-[var(--red)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Urgent · L3</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--red)]">1</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">awaiting review · 11:24</span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--amber)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Attention · L2</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--amber)]">2</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">monitoring · no action yet</span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--green)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Stable · L1</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--green)]">3</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">routine review due</span>
        </div>

        <div className="rounded-2xl border-l-4 border-l-[var(--cyan)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Data coverage</span>
          <div className="mt-1 font-heading text-3xl font-bold text-[var(--cyan)]">94%</div>
          <span className="mt-1 text-xs text-[var(--mid)] block">valid signal hours, 7 days</span>
        </div>
      </div>

      {/* Patient Queue Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="font-heading text-base font-bold text-[var(--hi)]">
              Consented patient triage queue
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Click any patient to inspect consented trends, medications, and Lead-I ECG waveforms.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] text-xs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCohortFilter(tab.id)}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  cohortFilter === tab.id
                    ? "bg-[var(--teal)] text-white shadow-sm"
                    : "text-[var(--mid)] hover:text-[var(--hi)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
              <tr>
                <th className="pb-3">Patient</th>
                <th className="pb-3">Level</th>
                <th className="pb-3">Primary signal</th>
                <th className="pb-3">Baseline delta</th>
                <th className="pb-3">Persistence</th>
                <th className="pb-3">Signal quality</th>
                <th className="pb-3">Last sync</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60 text-[var(--hi)]">
              {filteredPatients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className="hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                >
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                          p.level === "Urgent"
                            ? "bg-[var(--red-soft)] text-[var(--red)]"
                            : p.level === "Attention"
                            ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                            : "bg-[var(--teal-soft)] text-[var(--teal-700)]"
                        }`}
                      >
                        {p.initials}
                      </div>
                      <div>
                        <strong className="block font-bold text-xs text-[var(--hi)]">{p.name}</strong>
                        <span className="text-[11px] text-[var(--muted)]">{p.age} y · {p.gender} · MRN {p.mrn}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        p.level === "Urgent"
                          ? "bg-[var(--red-soft)] text-[var(--red)]"
                          : p.level === "Attention"
                          ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                          : "bg-[var(--green-soft)] text-[var(--green)]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.level === "Urgent"
                            ? "bg-[var(--red)] animate-ping"
                            : p.level === "Attention"
                            ? "bg-[var(--amber)]"
                            : "bg-[var(--green)]"
                        }`}
                      />
                      {p.level}
                    </span>
                  </td>
                  <td className="py-3.5 font-medium">{p.primarySignal}</td>
                  <td className="py-3.5 font-bold">
                    <span className={p.baselineDelta.includes("+92") ? "text-[var(--red)]" : p.baselineDelta.includes("+") ? "text-[var(--amber)]" : "text-[var(--green)]"}>
                      {p.baselineDelta}
                    </span>
                  </td>
                  <td className="py-3.5 text-[var(--mid)]">{p.persistence}</td>
                  <td className="py-3.5 font-semibold text-[var(--green)]">{p.signalQuality}</td>
                  <td className="py-3.5 text-[var(--muted)]">{p.lastSync}</td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatientId(p.id);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        p.level === "Urgent"
                          ? "bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
                          : "border border-[var(--border)] text-[var(--teal-700)] hover:bg-[var(--tint)]"
                      }`}
                    >
                      {p.level === "Urgent" ? "Review" : "Open"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Bottom Grid: Urgent Case Workspace (7 cols) + Practice Sidebar (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Urgent Assessment Card (7 cols) */}
        <div className="rounded-2xl border-l-4 border-l-[var(--red)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div>
              <span className="inline-block rounded bg-[var(--red-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--red)]">
                Level 3 · Urgent Case (Sample Triage)
              </span>
              <h3 className="font-heading text-lg font-bold text-[var(--hi)] mt-1">
                Open urgent assessment — Aarav Menon
              </h3>
            </div>
            <span className="text-xs text-[var(--muted)]">raised 28 Sep, 11:24</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--red-soft)] p-3 text-xs border border-[var(--red)]/30">
              <span className="text-[var(--muted)] block">Heart rate</span>
              <span className="font-heading text-2xl font-bold text-[var(--red)]">138 bpm</span>
              <span className="text-[11px] text-[var(--mid)] block mt-0.5">at rest · baseline 72</span>
            </div>
            <div className="rounded-xl bg-[var(--red-soft)] p-3 text-xs border border-[var(--red)]/30">
              <span className="text-[var(--muted)] block">HRV</span>
              <span className="font-heading text-2xl font-bold text-[var(--red)]">19 ms</span>
              <span className="text-[11px] text-[var(--mid)] block mt-0.5">baseline 52 ms</span>
            </div>
            <div className="rounded-xl bg-[var(--amber-soft)] p-3 text-xs border border-[var(--amber)]/30">
              <span className="text-[var(--muted)] block">SpO₂</span>
              <span className="font-heading text-2xl font-bold text-[var(--amber)]">94%</span>
              <span className="text-[11px] text-[var(--mid)] block mt-0.5">baseline 98%</span>
            </div>
          </div>

          {/* ECG Strip */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-2 font-medium">
              <span>Lead-I Strip (30s at 250 Hz)</span>
              <span>Quality 0.94 · Impedance verified</span>
            </div>
            <EcgStripCanvas hr={138} height={140} isRecording={true} />
          </div>

          {/* Assessment Criteria Checklist */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block">
              Multi-signal decision validation
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--tint)]/50 p-2.5 border border-[var(--border)]">
                <span className="text-[var(--green)] font-bold">✓</span>
                <span>Signal quality verified good across ECG and PPG</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[var(--tint)]/50 p-2.5 border border-[var(--border)]">
                <span className="text-[var(--green)] font-bold">✓</span>
                <span>Persisted 9 continuous minutes at rest</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[var(--tint)]/50 p-2.5 border border-[var(--border)]">
                <span className="text-[var(--green)] font-bold">✓</span>
                <span>Motion and posture ruled out via accelerometry</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[var(--tint)]/50 p-2.5 border border-[var(--border)]">
                <span className="text-[var(--green)] font-bold">✓</span>
                <span>Multi-signal cross-check agreement (HR, HRV, SpO₂)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
            <button
              onClick={() => showToast("Simulated note saved to local demonstration state. No live patient EMR updated.", "info")}
              className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
            >
              Save interpretation
            </button>
            <button
              onClick={() => showToast("Urgent follow-up requested (demonstration state only). Simulated slot offered at 16:00.", "info")}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            >
              Request follow-up
            </button>
            <button
              onClick={() => setActiveView("messages")}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
            >
              Message patient
            </button>
            <button
              onClick={() => showToast("Strip downloaded with anonymised clinical header.", "ok")}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
            >
              Download strip
            </button>
          </div>

          <p className="text-[11px] text-[var(--muted)]">
            CardioCore surfaces statistical patterns with quality gating. Interpretation and clinical decisions belong exclusively to the attending physician.
          </p>
        </div>

        {/* Right Column: Schedule & Pending (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Today's Schedule */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Today&apos;s clinic schedule
              </span>
              <button
                onClick={() => setActiveView("appts")}
                className="text-xs font-semibold text-[var(--teal-700)] hover:underline"
              >
                All consults →
              </button>
            </div>

            <div className="space-y-3 border-l-2 border-[var(--border)] pl-4 text-xs">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--green)] ring-4 ring-[var(--surface)]" />
                <span className="font-bold text-[var(--hi)]">09:15 · Rohit Sharma</span>
                <p className="text-[var(--muted)]">In-person · resting HR drift follow-up</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--red)] ring-4 ring-[var(--surface)] animate-ping" />
                <span className="font-bold text-[var(--red)]">10:30 · Aarav Menon (Urgent)</span>
                <p className="text-[var(--mid)]">In-person · urgent triage review</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--teal)] ring-4 ring-[var(--surface)]" />
                <span className="font-bold text-[var(--hi)]">11:45 · Meera Iyer</span>
                <p className="text-[var(--muted)]">Video consultation · HRV decline review</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--mid)] ring-4 ring-[var(--surface)]" />
                <span className="font-bold text-[var(--hi)]">16:00 · Open Urgent Slot</span>
                <p className="text-[var(--muted)]">Reserved for validated L3 escalations</p>
              </div>
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Pending clinician reviews
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">3 ECG strips to interpret</strong>
                  <span className="text-[11px] text-[var(--muted)]">Menon (2) · Iyer (1)</span>
                </div>
                <button
                  onClick={() => setActiveView("review")}
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)]"
                >
                  Open lab
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Consent expiring soon</strong>
                  <span className="text-[11px] text-[var(--amber)]">Leela Nair · 6 days left</span>
                </div>
                <button
                  onClick={() => showToast("Consent renewal request sent to Leela Nair (demonstration).", "ok")}
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
                >
                  Renew
                </button>
              </div>
            </div>
          </div>

          {/* Clinical Guardrails Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--tint)]/50 p-5 shadow-[var(--sh-1)] text-xs text-[var(--mid)] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal-700)] block">
              Clinical Guardrails
            </span>
            <p>
              Emergency services are never contacted automatically without direct clinician or patient action. Automatic urgent booking is an operational convenience, not an emergency dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
