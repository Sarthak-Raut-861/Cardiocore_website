"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { TrendRange, getTrendData } from "../data/sample-charts";
import { TrendChartCanvas } from "./trend-chart-canvas";

export function PatientHealthView() {
  const { setActiveView, formatUnit, showToast } = usePatientDashboard();
  const [range, setRange] = useState<TrendRange>("7D");

  const hrSeries = getTrendData("hr", range);
  const hrvSeries = getTrendData("hrv", range);
  const spo2Series = getTrendData("spo2", range);
  const tempSeries = getTrendData("temp", range);

  const ranges: TrendRange[] = ["24H", "7D", "30D", "3M", "1Y"];

  const hrFmt = formatUnit("hr", 68);
  const hrvFmt = formatUnit("hrv", 48);
  const spo2Fmt = formatUnit("spo2", 98);
  const tempFmt = formatUnit("temp", 36.6);

  return (
    <div className="space-y-6">
      {/* Header with Range Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Health &amp; trends
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Every value evaluated against your own 90-day baseline — not a population average.
          </p>
        </div>
        {/* Range Buttons */}
        <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] shadow-[var(--sh-1)]">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                range === r
                  ? "bg-[var(--teal)] text-white shadow-sm"
                  : "text-[var(--mid)] hover:text-[var(--hi)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Multi-Signal Trend Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Resting Heart Rate */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Resting heart rate
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{hrFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{hrFmt.unit}</span>
              </div>
              <p className="text-xs text-[var(--mid)] mt-0.5">
                Avg <strong>69</strong> · baseline <strong>70</strong> ·{" "}
                <span className="text-[var(--green)] font-semibold">steady</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
              Stable
            </span>
          </div>
          <TrendChartCanvas series={hrSeries} height={160} />
        </div>

        {/* HRV */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Heart rate variability
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-[var(--violet)]">{hrvFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{hrvFmt.unit}</span>
              </div>
              <p className="text-xs text-[var(--amber)] mt-0.5 font-semibold">
                7% below your personal average
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--amber-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--amber)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
              Attention
            </span>
          </div>
          <TrendChartCanvas series={hrvSeries} height={160} />
        </div>

        {/* SpO2 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                SpO₂ average
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{spo2Fmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{spo2Fmt.unit}</span>
              </div>
              <p className="text-xs text-[var(--mid)] mt-0.5">
                Overnight dips: <strong>none beyond 94%</strong>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cyan-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--cyan)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
              No change
            </span>
          </div>
          <TrendChartCanvas series={spo2Series} height={160} />
        </div>

        {/* Skin Temperature */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Skin temperature
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{tempFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{tempFmt.unit}</span>
              </div>
              <p className="text-xs text-[var(--green)] mt-0.5 font-semibold">
                +0.1 vs baseline
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
              Stable
            </span>
          </div>
          <TrendChartCanvas series={tempSeries} height={160} />
        </div>
      </div>

      {/* Bottom Section: ECG Events & Context */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ECG Events Table (7 cols) */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)] lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-bold text-[var(--hi)]">
              ECG events this week
            </h3>
            <span className="rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-700)]">
              3 recordings · none flagged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <tr>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Duration</th>
                  <th className="pb-2.5">Rate</th>
                  <th className="pb-2.5">Quality</th>
                  <th className="pb-2.5">Review</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[var(--hi)]">
                <tr>
                  <td className="py-3 font-semibold">25 Sep · 07:12</td>
                  <td className="py-3">30 s</td>
                  <td className="py-3">72 BPM</td>
                  <td className="py-3">
                    <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-semibold text-[var(--green)]">good</span>
                  </td>
                  <td className="py-3 text-[var(--mid)]">not flagged</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setActiveView("ecg")}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold">23 Sep · 22:40</td>
                  <td className="py-3">30 s</td>
                  <td className="py-3">69 BPM</td>
                  <td className="py-3">
                    <span className="rounded bg-[var(--amber-soft)] px-2 py-0.5 font-semibold text-[var(--amber)]">fair</span>
                  </td>
                  <td className="py-3 text-[var(--mid)]">not flagged</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setActiveView("ecg")}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold">21 Sep · 06:55</td>
                  <td className="py-3">30 s</td>
                  <td className="py-3">71 BPM</td>
                  <td className="py-3">
                    <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-semibold text-[var(--green)]">good</span>
                  </td>
                  <td className="py-3 text-[var(--mid)]">shared with Dr Raghavan</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setActiveView("ecg")}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity & Quality Columns (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Activity Context */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Activity &amp; sleep context
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                <span className="text-[var(--mid)]">Steps (avg)</span>
                <span className="font-semibold text-[var(--hi)]">7 420 / day</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                <span className="text-[var(--mid)]">Active minutes</span>
                <span className="font-semibold text-[var(--hi)]">38 min / day</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                <span className="text-[var(--mid)]">Sleep (avg)</span>
                <span className="font-semibold text-[var(--amber)]">6 h 05 m</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-[var(--mid)]">Posture hours</span>
                <span className="font-semibold text-[var(--hi)]">9 h 20 m</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              Activity and sleep are used to interpret heart signals — a physiological rise during exercise is expected, the same rise at rest is not.
            </p>
          </div>

          {/* Data Quality */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Signal quality audit
            </span>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">ECG signal quality</span>
                  <span className="font-semibold text-[var(--green)]">96% good</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--green)] w-[96%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">PPG optical quality</span>
                  <span className="font-semibold text-[var(--green)]">92% good</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--green)] w-[92%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[var(--mid)]">Skin impedance contact</span>
                  <span className="font-semibold text-[var(--hi)]">88% good</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--tint)] overflow-hidden">
                  <div className="h-full bg-[var(--teal)] w-[88%]" />
                </div>
              </div>
            </div>

            <button
              onClick={() => showToast("Exporting 7-day trend report as PDF (pending backend)...", "info")}
              className="mt-4 w-full rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
            >
              Export 7-day trend report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
