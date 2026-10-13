"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { SAMPLE_APPOINTMENTS } from "../data/sample-patient";

export function PatientApptsView() {
  const { showToast } = usePatientDashboard();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Clinical consultations
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Scheduled clinical appointments, past cardiology consultations, and telemetry data sharing.
          </p>
        </div>
        <button
          onClick={() => showToast("Booking workflow requires active provider scheduling integration.", "info")}
          className="rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
        >
          Book new consultation
        </button>
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {SAMPLE_APPOINTMENTS.map((apt) => (
          <div
            key={apt.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal-soft)] font-heading text-lg font-bold text-[var(--teal-700)] shrink-0">
                  {apt.doctorInitials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                      {apt.doctorName}
                    </h3>
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                        apt.status === "Confirmed"
                          ? "bg-[var(--green-soft)] text-[var(--green)]"
                          : "bg-[var(--tint)] text-[var(--mid)]"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mid)] mt-0.5">
                    {apt.specialty} · {apt.institution}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--hi)] font-medium">
                    <span className="flex items-center gap-1.5">
                      📅 {apt.datetime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      🏥 {apt.type} · {apt.room}
                    </span>
                    <span className="text-[var(--muted)] font-mono text-[11px]">
                      Ref: {apt.bookingRef}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                {apt.status === "Confirmed" ? (
                  <>
                    <button
                      onClick={() => showToast("Telehealth video session requires live integration.", "info")}
                      className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
                    >
                      Join video
                    </button>
                    <button
                      onClick={() => showToast("Appointment details opened.", "ok")}
                      className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Manage
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => showToast("Downloading consultation summary...", "ok")}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
                  >
                    View clinical notes
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              Shared data scope: Baseline summary and 3 recent ECG strips shared under your active consent settings.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
