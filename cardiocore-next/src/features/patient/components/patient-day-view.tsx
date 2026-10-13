"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { DayChartCanvas } from "./day-chart-canvas";

export function PatientDayView() {
  const { showToast } = usePatientDashboard();
  const [dayOffset, setDayOffset] = useState(0);

  const days = [
    "Thu 2 Oct 2026",
    "Fri 3 Oct 2026",
    "Sat 4 Oct 2026",
    "Sun 5 Oct 2026",
  ];
  const currentDayLabel = days[2 + dayOffset] || "Sat 4 Oct 2026";

  return (
    <div className="space-y-6">
      {/* Header with Day Scrubber */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Day in review
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Twenty-four hours of continuous cardiovascular telemetry, annotated with activity, sleep, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDayOffset((prev) => Math.max(-2, prev - 1))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            aria-label="Previous day"
          >
            ←
          </button>
          <span className="rounded-xl bg-[var(--tint)] px-3 py-1.5 text-xs font-semibold text-[var(--hi)]">
            {currentDayLabel}
          </span>
          <button
            onClick={() => setDayOffset((prev) => Math.min(1, prev + 1))}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            aria-label="Next day"
          >
            →
          </button>
          <button
            onClick={() => showToast("Exporting 24-hour day report as PDF...", "ok")}
            className="ml-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
          >
            Export day report
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <span className="text-xs text-[var(--muted)] block">Resting HR</span>
          <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
            68 <span className="text-xs font-normal text-[var(--muted)]">bpm</span>
          </div>
          <span className="text-[11px] text-[var(--mid)] mt-0.5 block">compared with 69 baseline</span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <span className="text-xs text-[var(--muted)] block">Time in range</span>
          <div className="mt-1 font-heading text-2xl font-bold text-[var(--green)]">
            96<span className="text-xs font-normal text-[var(--muted)]">%</span>
          </div>
          <span className="text-[11px] text-[var(--mid)] mt-0.5 block">within ±4.5% of baseline</span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <span className="text-xs text-[var(--muted)] block">Peak HR</span>
          <div className="mt-1 font-heading text-2xl font-bold text-[var(--hi)]">
            114 <span className="text-xs font-normal text-[var(--muted)]">bpm</span>
          </div>
          <span className="text-[11px] text-[var(--amber)] mt-0.5 block">07:18 · during a walk</span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <span className="text-xs text-[var(--muted)] block">Excluded data</span>
          <div className="mt-1 font-heading text-2xl font-bold text-[var(--amber)]">
            6 <span className="text-xs font-normal text-[var(--muted)]">min</span>
          </div>
          <span className="text-[11px] text-[var(--mid)] mt-0.5 block">quality too low to interpret</span>
        </div>
      </div>

      {/* 24h Diurnal Canvas */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-heading text-base font-bold text-[var(--hi)]">
            Heart rate across the 24-hour cycle
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--violet-soft)] px-2.5 py-0.5 text-[var(--violet)] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet)]" /> sleep
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--amber-soft)] px-2.5 py-0.5 text-[var(--amber)] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" /> activity
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[var(--green)] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> ECG recorded
            </span>
          </div>
        </div>

        <DayChartCanvas height={220} />
      </div>

      {/* Timeline & Explanatory Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Annotated Timeline (7 cols) */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)] lg:col-span-7">
          <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
            Chronological day timeline
          </h3>

          <div className="space-y-3.5 border-l-2 border-[var(--border)] pl-4 text-xs">
            <div className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--violet)] ring-4 ring-[var(--surface)]" />
              <span className="font-bold text-[var(--hi)]">06:28 · Sleep cycle concluded</span>
              <p className="text-[var(--mid)] mt-0.5">Total restorative duration: 6 h 05 m. Lowest overnight rate: 51 bpm at 02:40.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--green)] ring-4 ring-[var(--surface)]" />
              <span className="font-bold text-[var(--hi)]">07:10 · Ramipril 5mg logged</span>
              <p className="text-[var(--mid)] mt-0.5">Morning dose taken as prescribed. Model compensatory shift active.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--amber)] ring-4 ring-[var(--surface)]" />
              <span className="font-bold text-[var(--hi)]">07:18 · Brisk outdoor walk</span>
              <p className="text-[var(--mid)] mt-0.5">Heart rate peaked at 114 bpm over 24 active minutes. Normal physiological excursion.</p>
            </div>

            <div className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--teal)] ring-4 ring-[var(--surface)]" />
              <span className="font-bold text-[var(--hi)]">08:02 · Level 2 insight flagged</span>
              <p className="text-[var(--mid)] mt-0.5">HRV remained 7% below 90-day baseline following consecutive shortened sleep nights.</p>
            </div>
          </div>
        </div>

        {/* Guidance Card (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              How to interpret 24-hour telemetry
            </span>
            <ul className="space-y-2 text-xs text-[var(--mid)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold">✓</span>
                A rise during activity is expected; the same rise at rest is not.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold">✓</span>
                Shaded bands identify periods where motion is accounted for.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold">✓</span>
                Exclusions are made automatically when skin contact impedance degrades.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--tint)]/50 p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block">
              Sleep &amp; posture summary
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Sleep window</span>
                <span className="font-semibold text-[var(--hi)]">23:12 – 06:28 (6 h 05 m)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Overnight HR span</span>
                <span className="font-semibold text-[var(--hi)]">51 – 58 bpm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Sedentary posture</span>
                <span className="font-semibold text-[var(--hi)]">9 h 20 m seated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
