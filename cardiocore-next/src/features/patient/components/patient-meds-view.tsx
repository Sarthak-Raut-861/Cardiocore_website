"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

export function PatientMedsView() {
  const { medications, toggleMedication, showToast } = usePatientDashboard();

  const takenCount = medications.filter((m) => m.taken).length;
  const adherence = Math.round((takenCount / medications.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Medications &amp; adherence
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Active cardiovascular prescriptions, daily dosage schedule, and adherence tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast("Prescription refill request queued.", "ok")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Request refill
          </button>
        </div>
      </div>

      {/* Adherence Overview */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              7-day adherence rate
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold text-[var(--green)]">96%</span>
              <span className="text-xs text-[var(--mid)]">excellent adherence</span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Your personal baseline adjusts expected morning resting HR by 2 BPM following Ramipril administration.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[var(--mid)]">Today&apos;s progress</span>
              <span className="text-[var(--hi)]">{takenCount} / {medications.length} doses</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
              <div
                className="h-full bg-[var(--green)] transition-all duration-300"
                style={{ width: `${adherence}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Medication List */}
      <div className="space-y-3">
        {medications.map((med) => (
          <div
            key={med.id}
            onClick={() => toggleMedication(med.id)}
            className="flex items-start justify-between p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-1)] cursor-pointer hover:border-[var(--teal)] transition-all"
          >
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                className={`flex h-6 w-6 mt-0.5 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  med.taken
                    ? "bg-[var(--green-soft)] text-[var(--green)]"
                    : "bg-[var(--tint)] text-[var(--muted)]"
                }`}
                aria-label={med.taken ? `Mark ${med.name} as not taken` : `Mark ${med.name} as taken`}
              >
                {med.taken ? "✓" : "○"}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-heading text-base font-bold ${med.taken ? "line-through opacity-70 text-[var(--hi)]" : "text-[var(--hi)]"}`}>
                    {med.name} {med.dose}
                  </h3>
                  <span className="rounded bg-[var(--tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--teal-700)] capitalize">
                    {med.schedule}
                  </span>
                </div>
                <p className="text-xs text-[var(--mid)] mt-1">{med.instructions}</p>
                <span className="text-[11px] text-[var(--muted)] mt-1.5 block">Status: {med.timeLabel}</span>
              </div>
            </div>
            <span className="text-xs text-[var(--muted)] font-mono">
              {med.taken ? "Logged" : "Tap to log"}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-4 text-xs text-[var(--hi)]">
        <strong>Medication safety reminder: </strong>
        CardioCore does not prescribe or adjust drug dosages. Never change or stop prescribed medications without direct consultation with your cardiologist.
      </div>
    </div>
  );
}
