"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { TwinRing } from "./twin-ring";

export function PatientTwinView() {
  const { showToast } = usePatientDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Digital Twin · Personal Baseline
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            A personalised statistical baseline of your cardiovascular dynamics. Retrained on 90 days of continuous telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--violet-soft)] px-3 py-1 text-xs font-semibold text-[var(--violet)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet)] animate-pulse" />
            Baseline Model Active
          </span>
          <span className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-medium text-[var(--mid)]">
            Model v4.2
          </span>
        </div>
      </div>

      {/* Main Grid: 1fr and 1.25fr */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: State Ring & Parameters (5 cols) */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] lg:col-span-5 flex flex-col items-center text-center">
          <TwinRing score={82} size={170} label="State index" statusText="Stable" />

          <p className="mt-4 text-xs text-[var(--mid)] max-w-xs leading-relaxed">
            Model confidence <strong>0.91</strong>. Your personal baseline has processed <strong>1.42 M</strong> beats and <strong>124</strong> verified ECG strips.
          </p>

          <div className="w-full mt-6 space-y-2.5 text-xs text-left border-t border-[var(--border)] pt-4">
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Baseline window</span>
              <span className="font-semibold text-[var(--hi)]">90 continuous days</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Recalibrations</span>
              <span className="font-semibold text-[var(--hi)]">3 this year</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)]/50 pb-2">
              <span className="text-[var(--mid)]">Medication-aware</span>
              <span className="font-semibold text-[var(--teal-700)]">3 active prescriptions</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-[var(--mid)]">Signal quality filter</span>
              <span className="font-semibold text-[var(--green)]">Rigid gating (passes &gt; 90%)</span>
            </div>
          </div>

          <button
            onClick={() => showToast("Retraining runs automatically every 24 hours. Last pass: today 04:12.", "ok")}
            className="mt-6 w-full rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
          >
            How the Personal Baseline learns →
          </button>
        </div>

        {/* Right Column: Contributing Weights & Timeline (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Signal Weight Contribution */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-bold text-[var(--hi)]">
                What is contributing right now
              </h3>
              <span className="text-xs text-[var(--muted)]">weights sum to 100%</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">Resting heart rate</span>
                  <span className="font-semibold text-[var(--green)]">steady · 34%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--green)] w-[34%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">Heart rate variability</span>
                  <span className="font-semibold text-[var(--amber)]">below usual · 27%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--amber)] w-[27%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">SpO₂ saturation</span>
                  <span className="font-semibold text-[var(--green)]">within range · 18%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--green)] w-[18%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">Skin temperature</span>
                  <span className="font-semibold text-[var(--cyan)]">within range · 11%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--cyan)] w-[11%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">Activity &amp; posture</span>
                  <span className="font-semibold text-[var(--violet)]">normal · 10%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--violet)] w-[10%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline of Recalibrations */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
              Baseline calibration timeline
            </h3>

            <div className="space-y-3.5 border-l-2 border-[var(--border)] pl-4 text-xs">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--teal)] ring-4 ring-[var(--surface)]" />
                <h4 className="font-bold text-[var(--hi)]">HRV weighting updated</h4>
                <p className="text-[var(--muted)] mt-0.5">Today 04:12 · the model attributes slightly more of your daily variance to restorative sleep.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--mid)] ring-4 ring-[var(--surface)]" />
                <h4 className="font-bold text-[var(--hi)]">Activity compensation added</h4>
                <p className="text-[var(--muted)] mt-0.5">18 Sep · evening walks automatically separated from resting-rate baseline calculations.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--mid)] ring-4 ring-[var(--surface)]" />
                <h4 className="font-bold text-[var(--hi)]">Ramipril pharmacodynamics modeled</h4>
                <p className="text-[var(--muted)] mt-0.5">02 Sep · expected resting rate lowered by 2 BPM in the post-dose morning window.</p>
              </div>
            </div>
          </div>

          {/* Decision Gates Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--tint)]/50 p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block">
              What would trigger an urgent alert
            </span>
            <p className="text-xs text-[var(--mid)] mb-3 leading-relaxed">
              CardioCore raises an urgent escalation only if at least two of the following criteria hold simultaneously, with good signal quality:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)] text-[var(--hi)] font-medium">
                HR ≥ 30% above baseline at rest
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)] text-[var(--hi)] font-medium">
                HRV ≥ 25% below baseline
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)] text-[var(--hi)] font-medium">
                SpO₂ ≤ 94% sustained
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)] text-[var(--hi)] font-medium">
                Persistence ≥ 8 continuous min
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
