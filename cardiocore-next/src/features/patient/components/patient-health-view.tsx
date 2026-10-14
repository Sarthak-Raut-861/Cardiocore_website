"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

interface LabEntry {
  name: string;
  conv: string;
  si: string;
  refConv: string;
  refSi: string;
  status: string;
}

export function PatientHealthView() {
  const { formatUnit, showToast } = usePatientDashboard();
  const [unitSystem, setUnitSystem] = useState<"CONV" | "SI">("CONV");
  const [modalOpen, setModalOpen] = useState(false);
  const [labName, setLabName] = useState("NT-proBNP");
  const [labConv, setLabConv] = useState("95 pg/mL");
  const [labSi, setLabSi] = useState("11.2 pmol/L");
  const [labs, setLabs] = useState<LabEntry[]>([
    { name: "LDL Cholesterol", conv: "94 mg/dL", si: "2.43 mmol/L", refConv: "< 100 mg/dL", refSi: "< 2.59 mmol/L", status: "Optimal" },
    { name: "Fasting Glucose", conv: "92 mg/dL", si: "5.11 mmol/L", refConv: "70–99 mg/dL", refSi: "3.9–5.5 mmol/L", status: "Normal" },
    { name: "Serum Potassium", conv: "4.3 mEq/L", si: "4.3 mmol/L", refConv: "3.5–5.0 mEq/L", refSi: "3.5–5.0 mmol/L", status: "Stable" },
  ]);

  const handleAddLab = (e: React.FormEvent) => {
    e.preventDefault();
    setLabs((prev) => [
      {
        name: labName,
        conv: labConv,
        si: labSi,
        refConv: "Standard Reference",
        refSi: "SI Reference",
        status: "Logged",
      },
      ...prev,
    ]);
    setModalOpen(false);
    showToast(`Added ${labName} to your longitudinal lab record.`, "ok");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[var(--hi)]">Health Metrics &amp; Lab Biomarkers</h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Switch between Conventional (mg/dL) and SI (mmol/L) clinical units
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => setUnitSystem("CONV")}
              title="Conventional Units (mg/dL, pg/mL)"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                unitSystem === "CONV" ? "bg-[var(--teal)] text-white" : "text-[var(--mid)] hover:text-[var(--hi)]"
              }`}
            >
              Conv (mg/dL)
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem("SI")}
              title="International System of Units (mmol/L, pmol/L)"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                unitSystem === "SI" ? "bg-[var(--teal)] text-white" : "text-[var(--mid)] hover:text-[var(--hi)]"
              }`}
            >
              SI (mmol/L)
            </button>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-[var(--teal)] text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            + Add Lab Result
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <span className="text-xs font-semibold text-[var(--muted)]">Resting Heart Rate</span>
          <p className="text-2xl font-bold text-[var(--hi)] mt-1">{formatUnit("hr", 68)}</p>
          <span className="text-[11px] text-[var(--green)] font-medium">Sinus Rhythm Baseline</span>
        </div>
        {labs.map((lab, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted)]">{lab.name}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--green-soft)] text-[var(--green)]">
                {lab.status}
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--hi)] my-2">
              {unitSystem === "CONV" ? lab.conv : lab.si}
            </p>
            <span className="text-[11px] text-[var(--muted)]">
              Ref: {unitSystem === "CONV" ? lab.refConv : lab.refSi}
            </span>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--hi)]">Add Lab Result</h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--hi)] hover:bg-[var(--tint)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddLab} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Biomarker Name</label>
                <input
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Value (Conventional)</label>
                <input
                  value={labConv}
                  onChange={(e) => setLabConv(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--mid)] mb-1">Value (SI Equivalent)</label>
                <input
                  value={labSi}
                  onChange={(e) => setLabSi(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--mid)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--teal)] text-white text-xs font-semibold"
                >
                  Save Lab Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
