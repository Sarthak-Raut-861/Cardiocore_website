"use client";

import React from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";

export function DoctorApptsView() {
  const { setSelectedPatientId, setActiveView, showToast } = useDoctorDashboard();

  const schedule = [
    { time: "09:15", patient: "Rohit Sharma", patientId: "rohit", type: "In-person", focus: "HR drift follow-up", status: "Checked in", statusColor: "bg-[var(--green-soft)] text-[var(--green)]" },
    { time: "10:30", patient: "Aarav Menon", patientId: "aarav", type: "In-person", focus: "Urgent review", status: "Urgent", statusColor: "bg-[var(--red-soft)] text-[var(--red)]" },
    { time: "11:45", patient: "Meera Iyer", patientId: "meera", type: "Video", focus: "HRV trend review", status: "Confirmed", statusColor: "bg-[var(--teal-soft)] text-[var(--teal-700)]" },
    { time: "14:00", patient: "Kabir Sethi", patientId: "kabir", type: "In-person", focus: "Annual review", status: "Unconfirmed", statusColor: "bg-[var(--amber-soft)] text-[var(--amber)]" },
    { time: "15:15", patient: "Leela Nair", patientId: "leela", type: "Video", focus: "Adherence support", status: "Confirmed", statusColor: "bg-[var(--teal-soft)] text-[var(--teal-700)]" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Clinical consultations
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Pre-arrival biometric summaries arrive before the patient. Video consults run in-browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-semibold text-[var(--mid)]">
            Today · 6 slots
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            2 confirmed
          </span>
        </div>
      </div>

      {/* 2 Columns Grid: Schedule Table + Booking Requests & Week Load */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Schedule Table (7 cols) */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)] lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-bold text-[var(--hi)]">
              Saturday 4 Oct · Today&apos;s appointments
            </h3>
            <span className="text-xs text-[var(--muted)]">All times IST</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <tr>
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Focus</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[var(--hi)]">
                {schedule.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="py-3.5 font-bold font-mono">{item.time}</td>
                    <td className="py-3.5 font-semibold text-[var(--hi)]">{item.patient}</td>
                    <td className="py-3.5 text-[var(--mid)]">{item.type}</td>
                    <td className={`py-3.5 ${item.status === "Urgent" ? "font-bold text-[var(--red)]" : "text-[var(--mid)]"}`}>
                      {item.focus}
                    </td>
                    <td className="py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedPatientId(item.patientId)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3.5 font-bold font-mono text-[var(--red)]">16:00</td>
                  <td colSpan={5} className="py-3.5 text-[var(--muted)] italic">
                    Reserved slot — validated Level 3 escalations only
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking Requests & Week Load (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Booking Requests */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Booking requests
              </span>
              <span className="rounded-full bg-[var(--tint)] px-2 py-0.5 text-xs font-semibold text-[var(--teal-700)]">
                3 new
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Dev Patel · Video</strong>
                  <span className="text-[11px] text-[var(--muted)]">Requests Tue afternoon · baseline day 4</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => showToast("Appointment confirmed with Dev Patel (demonstration).", "ok")}
                    className="rounded-lg bg-[var(--teal)] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[var(--teal-600)]"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => showToast("Request declined with alternative slot (demonstration).", "warn")}
                    className="rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
                  >
                    Decline
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <div>
                  <strong className="block text-[var(--hi)]">Leela Nair · Reschedule</strong>
                  <span className="text-[11px] text-[var(--muted)]">Move 15:15 → 18:00 today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => showToast("Rescheduled Leela Nair to 18:00 (demonstration).", "ok")}
                    className="rounded-lg bg-[var(--teal)] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[var(--teal-600)]"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => showToast("Declined reschedule request.", "warn")}
                    className="rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Week Load Metrics */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)] text-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Consultation capacity &amp; load
            </span>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Total weekly consults</span>
                <span className="font-bold text-[var(--hi)]">26</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Video consultation share</span>
                <span className="font-bold text-[var(--teal-700)]">38%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--mid)]">Urgent same-day escalations</span>
                <span className="font-bold text-[var(--red)]">2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consult Workspace — Pre-Arrival Summary Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-heading text-base font-bold text-[var(--hi)]">
            Consult workspace — pre-arrival summary: Aarav Menon
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-700)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Consented Data (Demonstration Sample)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs mb-4">
          <div className="rounded-xl bg-[var(--surface-2)] p-3 border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Patient</span>
            <strong className="block text-[var(--hi)] mt-0.5">Aarav Menon · 44 y</strong>
            <span className="text-[11px] text-[var(--mid)]">10:30 · Room 4B</span>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] p-3 border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Baseline model</span>
            <strong className="block text-[var(--hi)] mt-0.5">90 days · 1.42 M beats</strong>
            <span className="text-[11px] text-[var(--green)] font-semibold">Confidence 0.91</span>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] p-3 border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Open triage issues</span>
            <strong className="block text-[var(--red)] mt-0.5">1 urgent · 2 attention</strong>
            <span className="text-[11px] text-[var(--mid)]">3 strips to interpret</span>
          </div>

          <div className="rounded-xl bg-[var(--surface-2)] p-3 border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Lab lipid panel</span>
            <strong className="block text-[var(--amber)] mt-0.5">LDL 112 · above target</strong>
            <span className="text-[11px] text-[var(--mid)]">24 Sep · Apollo</span>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block">
            Consented data items shared for this visit
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-semibold text-[var(--teal-700)]">✓ 90-day baseline summary</span>
            <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-semibold text-[var(--teal-700)]">✓ 7-day ambulatory trends</span>
            <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-semibold text-[var(--teal-700)]">✓ 3 Lead-I ECG recordings</span>
            <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-semibold text-[var(--teal-700)]">✓ Medication adherence log (96%)</span>
            <span className="rounded-full bg-[var(--tint)] px-3 py-1 font-semibold text-[var(--teal-700)]">✓ Lipid laboratory history</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => showToast("Consultation note editor opened (demonstration mode).", "ok")}
            className="rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
          >
            Write consult note
          </button>
          <button
            onClick={() => setActiveView("messages")}
            className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Message patient
          </button>
          <button
            onClick={() => showToast("Referral letter drafted in demonstration mode with mock baseline summary attached (not saved to backend).", "ok")}
            className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
          >
            Draft referral letter
          </button>
        </div>
      </div>
    </div>
  );
}
