"use client";

import React, { useState } from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";

interface WeeklyRow {
  day: string;
  morning: string;
  afternoon: string;
  urgentReserve: string;
  mode: string;
}

const WEEKLY_SCHEDULE: WeeklyRow[] = [
  { day: "Mon", morning: "09:00 – 12:30", afternoon: "14:00 – 17:00", urgentReserve: "—", mode: "In-person" },
  { day: "Tue", morning: "09:00 – 12:30", afternoon: "14:00 – 17:00", urgentReserve: "16:00 – 17:00", mode: "Both" },
  { day: "Wed", morning: "10:00 – 13:00", afternoon: "—", urgentReserve: "16:00 – 17:00", mode: "Video" },
  { day: "Thu", morning: "09:00 – 12:30", afternoon: "14:00 – 18:00", urgentReserve: "16:00 – 17:00", mode: "In-person" },
  { day: "Fri", morning: "09:00 – 12:00", afternoon: "14:00 – 16:00", urgentReserve: "—", mode: "Both" },
  { day: "Sat", morning: "09:00 – 12:00", afternoon: "—", urgentReserve: "16:00 – 17:00", mode: "In-person" },
  { day: "Sun", morning: "Not available · On-call rota", afternoon: "—", urgentReserve: "—", mode: "—" },
];

export function DoctorScheduleView() {
  const { showToast } = useDoctorDashboard();
  const [autoUrgent, setAutoUrgent] = useState(true);
  const [allowVideo, setAllowVideo] = useState(true);
  const [autoSummary, setAutoSummary] = useState(true);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Clinical Availability
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Schedule
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage consult capacity and urgent reserve buffers. Urgent slots are ring-fenced for validated Level 3 escalations.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            showToast(
              "Availability template published to demo calendar. No live scheduling service was updated.",
              "ok"
            )
          }
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 transition-colors shadow-sm shadow-cyan-500/20 cursor-pointer"
        >
          Publish changes
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Weekly Template & Rules (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-sm font-bold text-foreground font-sora">
                Weekly Template
              </span>
              <span className="text-[11px] text-muted-foreground">Times in IST (+05:30)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-surface-2/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Morning</th>
                    <th className="py-2.5 px-3">Afternoon</th>
                    <th className="py-2.5 px-3">Urgent Reserve</th>
                    <th className="py-2.5 px-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {WEEKLY_SCHEDULE.map((row) => (
                    <tr key={row.day} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-foreground">{row.day}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.morning}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.afternoon}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {row.urgentReserve !== "—" ? (
                          <span className="text-amber-400 font-medium">
                            {row.urgentReserve}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-border/40">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Booking Rules &amp; Guardrails
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUrgent}
                    onChange={(e) => setAutoUrgent(e.target.checked)}
                    className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Accept automatic urgent bookings
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Requires prior patient opt-in and validated hospital integration.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowVideo}
                    onChange={(e) => setAllowVideo(e.target.checked)}
                    className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Allow telehealth video for routine reviews
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      First-time consultations default to in-person physical examination.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/40 border border-border/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSummary}
                    onChange={(e) => setAutoSummary(e.target.checked)}
                    className="mt-0.5 accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Auto-attach pre-arrival telemetry digest
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Packages baseline, 7-day vitals deltas, and flagged ECG strips per consent.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Capacity & Delegation (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Capacity This Month
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Routine Booked</span>
                <span className="font-semibold text-foreground">26 of 34</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: "76%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Urgent Reserve Used</span>
                <span className="font-semibold text-amber-400">2 of 5</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: "40%" }} />
              </div>
            </div>

            <div className="pt-2 border-t border-border/30 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg wait (routine)</span>
                <span className="font-semibold text-foreground">4 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg wait (urgent L3)</span>
                <span className="font-semibold text-emerald-400">42 min</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clinical Delegation
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Forward validated strips to an electrophysiology colleague or on-call team when a second opinion or cross-cover is warranted.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-1 text-[11px] rounded bg-white/5 border border-border/40 text-foreground">
                Dr Samuel Okafor · EP
              </span>
              <span className="px-2 py-1 text-[11px] rounded bg-white/5 border border-border/40 text-foreground">
                Dr Amara Khan · Prev
              </span>
              <span className="px-2 py-1 text-[11px] rounded bg-white/5 border border-border/40 text-foreground">
                Dr Luca Moretti · Gen
              </span>
            </div>
            <button
              type="button"
              onClick={() => showToast("Delegation preferences updated.", "ok")}
              className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
            >
              Manage delegation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
