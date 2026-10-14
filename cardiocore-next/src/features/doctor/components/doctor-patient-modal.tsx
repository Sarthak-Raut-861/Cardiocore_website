"use client";

import React from "react";

interface DoctorPatientModalProps {
  patient: any;
  onClose: () => void;
}

export function DoctorPatientModal({ patient, onClose }: DoctorPatientModalProps) {
  if (!patient) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--hi)]">{patient.name}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              ID: {patient.id || "PT-4802"} • DOB: {patient.dob || "12 Aug 1971"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close patient chart modal"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Heart Rate</span>
            <strong className="text-base text-[var(--hi)]">{patient.hr || "72 BPM · SR"}</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Blood Pressure</span>
            <strong className="text-base text-[var(--hi)]">{patient.bp || "124/78 mmHg"}</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[var(--muted)] block">Triage Status</span>
            <strong className="text-base text-[var(--teal)]">{patient.status || "Reviewed"}</strong>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--muted)]">
            Diagnostic Overview &amp; 250 Hz Telemetry Notes
          </h3>
          <p className="text-sm text-[var(--mid)] leading-relaxed">
            {patient.notes ||
              "Continuous single-lead waveform capture shows stable sinus rhythm with normal PR (156 ms) and QTc (412 ms) intervals."}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
