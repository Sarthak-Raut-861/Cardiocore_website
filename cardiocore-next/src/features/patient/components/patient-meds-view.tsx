"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

export function PatientMedsView() {
  const { medications, toggleMedication, showToast } = usePatientDashboard();
  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedSchedule, setNewMedSchedule] = useState("Daily");
  const [showAddForm, setShowAddForm] = useState(false);

  const hasMeds = medications.length > 0;
  const takenCount = medications.filter((m) => m.taken).length;
  const adherence = hasMeds ? Math.round((takenCount / medications.length) * 100) : 100;

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
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--teal-600)] transition-colors"
          >
            {showAddForm ? "Cancel" : "+ Add prescription"}
          </button>
          <button
            onClick={() => showToast("Prescription refill request queued.", "ok")}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            Request refill
          </button>
        </div>
      </div>

      {/* Add Medication In-Place Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-[var(--teal)]/40 bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-3">
            Add New Prescription
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Medication Name</label>
              <input
                type="text"
                placeholder="e.g. Atorvastatin"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--hi)] focus:outline-none focus:border-[var(--teal)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Dosage</label>
              <input
                type="text"
                placeholder="e.g. 20 mg"
                value={newMedDose}
                onChange={(e) => setNewMedDose(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--hi)] focus:outline-none focus:border-[var(--teal)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Schedule</label>
              <select
                value={newMedSchedule}
                onChange={(e) => setNewMedSchedule(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--hi)] focus:outline-none focus:border-[var(--teal)]"
              >
                <option value="Daily">Daily (Morning)</option>
                <option value="Evening">Daily (Evening)</option>
                <option value="Twice Daily">Twice Daily</option>
                <option value="As Needed">As Needed (PRN)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!newMedName.trim()) {
                  showToast("Please enter medication name.", "warn");
                  return;
                }
                showToast(`Prescription for ${newMedName} recorded.`, "ok");
                setShowAddForm(false);
                setNewMedName("");
                setNewMedDose("");
              }}
              className="rounded-xl bg-[var(--teal)] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)]"
            >
              Save Medication
            </button>
          </div>
        </div>
      )}

      {/* Adherence Overview */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Daily adherence status
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-bold text-[var(--teal)]">
                {hasMeds ? `${adherence}%` : "100%"}
              </span>
              <span className="text-xs text-[var(--mid)]">
                {hasMeds ? (adherence >= 80 ? "Nominal adherence" : "Review pending") : "No active medication burden"}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              {hasMeds
                ? "Your ESP32 physiological telemetry correlates circadian heart rate response with recorded doses."
                : "Active ESP32 continuous corridor monitoring running without pharmaceutical covariates."}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-[var(--mid)]">Today&apos;s progress</span>
              <span className="text-[var(--hi)]">
                {hasMeds ? `${takenCount} / ${medications.length} doses` : "0 regimens"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--tint)] overflow-hidden">
              <div
                className="h-full bg-[var(--teal)] transition-all duration-300"
                style={{ width: `${hasMeds ? adherence : 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Medication List */}
      <div className="space-y-3">
        {!hasMeds ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--sh-1)] space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal-soft)] text-xl">
              💊
            </div>
            <h3 className="font-heading text-base font-bold text-[var(--hi)]">
              No Active Prescriptions Recorded
            </h3>
            <p className="mx-auto max-w-sm text-xs text-[var(--mid)]">
              Your profile currently has zero pharmaceutical regimens logged. If your physician has prescribed medications, use &quot;+ Add prescription&quot; above to begin tracking.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all"
            >
              <span>+</span>
              <span>Record First Prescription</span>
            </button>
          </div>
        ) : (
          medications.map((med) => (
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
          ))
        )}
      </div>

      <div className="rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-4 text-xs text-[var(--hi)]">
        <strong>Medication safety reminder: </strong>
        CardioCore does not prescribe or adjust drug dosages. Never change or stop prescribed medications without direct consultation with your cardiologist.
      </div>
    </div>
  );
}
