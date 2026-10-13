"use client";

import React from "react";
import { useDoctorDashboard, CohortFilterId } from "../context/doctor-dashboard-context";

const COHORT_TABS: { id: CohortFilterId; label: string }[] = [
  { id: "all", label: "All patients" },
  { id: "highrisk", label: "High risk" },
  { id: "newconsent", label: "New consents" },
  { id: "adherence", label: "Adherence < 80%" },
  { id: "baseline", label: "Baseline building" },
];

export function DoctorPatientsView() {
  const {
    cohortFilter,
    setCohortFilter,
    searchQuery,
    setSearchQuery,
    filteredPatients,
    setSelectedPatientId,
    showToast,
  } = useDoctorDashboard();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Patients
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Directory
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            128 consented patients · only records with an active consent are visible, and every access is logged in the clinical audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              showToast(
                "Cohort filter builder is a demonstration prototype. In production, cohorts are defined via server-validated clinical SQL predicates with IRB approval.",
                "info"
              )
            }
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 transition-colors text-foreground cursor-pointer"
          >
            Build cohort
          </button>
          <button
            type="button"
            onClick={() =>
              showToast(
                "Patient list exported (sample cohort with de-identified mock data). No live records were accessed.",
                "ok"
              )
            }
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 transition-colors text-foreground cursor-pointer"
          >
            Export list
          </button>
        </div>
      </div>

      {/* Cohort Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active patients
          </div>
          <div className="text-3xl font-bold font-sora text-foreground mt-1">128</div>
          <div className="text-xs text-muted-foreground mt-1">+9 enrolled this month</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Twin coverage
          </div>
          <div className="text-3xl font-bold font-sora text-foreground mt-1">112</div>
          <div className="text-xs text-muted-foreground mt-1">16 building initial baseline</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mean adherence
          </div>
          <div className="text-3xl font-bold font-sora text-emerald-400 mt-1">91%</div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: "91%" }} />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Consent renewals due
          </div>
          <div className="text-3xl font-bold font-sora text-amber-400 mt-1">7</div>
          <div className="text-xs text-muted-foreground mt-1">Within next 14 days</div>
        </div>
      </div>

      {/* Patients Filter & Table Card */}
      <div className="rounded-xl border border-border/60 bg-surface/40 backdrop-blur-md overflow-hidden">
        {/* Card Header with Tabs and Search */}
        <div className="p-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {COHORT_TABS.map((tab) => {
              const active = cohortFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCohortFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    active
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patient, MRN, condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 md:w-64 px-3 py-1.5 text-xs bg-surface-2/80 border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-muted-foreground border border-border/40 whitespace-nowrap">
              {filteredPatients.length} shown
            </span>
          </div>
        </div>

        {/* Patients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-surface-2/60 text-muted-foreground border-b border-border/50 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th scope="col" className="py-3 px-4">Level</th>
                <th scope="col" className="py-3 px-4">Patient</th>
                <th scope="col" className="py-3 px-4">Conditions</th>
                <th scope="col" className="py-3 px-4">Adherence</th>
                <th scope="col" className="py-3 px-4">Resting HR</th>
                <th scope="col" className="py-3 px-4">HRV</th>
                <th scope="col" className="py-3 px-4">LDL</th>
                <th scope="col" className="py-3 px-4">Consent Status</th>
                <th scope="col" className="py-3 px-4">Last Review</th>
                <th scope="col" className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    No sample patients match the current filter and search query.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const levelChip =
                    patient.levelCode === "L3"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : patient.levelCode === "L2"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : patient.levelCode === "L1"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-white/5 text-muted-foreground border-white/10";

                  const consentChip =
                    patient.consentStatus === "active"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : patient.consentStatus === "expiring"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${levelChip}`}
                        >
                          {patient.levelCode || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground group-hover:text-cyan-300 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {patient.age} y · {patient.gender} · MRN {patient.mrn}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {patient.conditions.join(" · ")}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {patient.adherencePct !== null ? (
                          <span
                            className={
                              patient.adherencePct < 80
                                ? "text-amber-400 font-semibold"
                                : "text-emerald-400 font-medium"
                            }
                          >
                            {patient.adherencePct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {patient.restingHr ? (
                          <span
                            className={
                              patient.restingHr > 100
                                ? "text-rose-400 font-bold"
                                : patient.restingHr > 85
                                ? "text-amber-400"
                                : "text-foreground"
                            }
                          >
                            {patient.restingHr} bpm
                          </span>
                        ) : (
                          <span className="text-muted-foreground">building</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {patient.hrvMs ? (
                          <span
                            className={
                              patient.hrvMs < 25
                                ? "text-rose-400 font-bold"
                                : patient.hrvMs < 40
                                ? "text-amber-400"
                                : "text-foreground"
                            }
                          >
                            {patient.hrvMs} ms
                          </span>
                        ) : (
                          <span className="text-muted-foreground">building</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {patient.ldlMgDl ? (
                          <span
                            className={
                              patient.ldlMgDl > 120 ? "text-amber-400" : "text-foreground"
                            }
                          >
                            {patient.ldlMgDl}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${consentChip}`}
                        >
                          {patient.consentDetail}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {patient.lastReviewDate}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatientId(patient.id);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-border/70 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          Open record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Guardrail Disclaimer Footer on Table */}
        <div className="p-3 bg-surface-2/40 border-t border-border/40 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-foreground">Demonstration Notice:</span> All patients, telemetry metrics, and MRNs shown are synthetic demonstration fixtures.
          </div>
          <div className="text-cyan-400/80">
            Consent status is client-simulated and does not grant access to external EMRs.
          </div>
        </div>
      </div>
    </div>
  );
}
