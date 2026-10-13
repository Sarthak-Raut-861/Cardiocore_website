"use client";

import React, { useState } from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";
import { EcgStripCanvas } from "../../patient/components/ecg-strip-canvas";

interface StripQueueItem {
  id: string;
  name: string;
  age: number;
  initials: string;
  avatarColor: string;
  date: string;
  hr: number;
  level: "L3" | "L2" | "L1";
  quality: number;
  rhythm: string;
  note: string;
}

const SAMPLE_QUEUE: StripQueueItem[] = [
  {
    id: "aarav",
    name: "Aarav Menon",
    age: 44,
    initials: "AM",
    avatarColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    date: "28 Sep 2026, 11:24",
    hr: 138,
    level: "L3",
    quality: 0.94,
    rhythm: "Lead I · 250 Hz · 25 mm/s · 30 s duration",
    note: "The elevated rate recorded on 28 September was sustained at rest with reduced HRV. This is not a diagnosis. Please continue current medications unchanged and attend the scheduled clinic review on 6 October.",
  },
  {
    id: "rohit",
    name: "Rohit Sharma",
    age: 61,
    initials: "RS",
    avatarColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    date: "27 Sep 2026, 09:12",
    hr: 74,
    level: "L2",
    quality: 0.91,
    rhythm: "Lead I · 250 Hz · 25 mm/s · 30 s duration",
    note: "Resting heart rate drift noted over previous 7 days with stable SpO2. Correlation with medication schedule recommended.",
  },
  {
    id: "meera",
    name: "Meera Iyer",
    age: 52,
    initials: "MI",
    avatarColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    date: "26 Sep 2026, 14:05",
    hr: 72,
    level: "L2",
    quality: 0.89,
    rhythm: "Lead I · 250 Hz · 25 mm/s · 30 s duration",
    note: "Gradual HRV decline over 5 days. Blood pressure log requested prior to follow-up.",
  },
];

export function DoctorReviewView() {
  const { setActiveView, setSelectedPatientId, showToast } = useDoctorDashboard();
  const [selectedStripId, setSelectedStripId] = useState<string>("aarav");
  const [calipersActive, setCalipersActive] = useState(false);
  const [annotationActive, setAnnotationActive] = useState(false);
  const [selectedImpression, setSelectedImpression] = useState(
    "Sinus tachycardia — clinical correlation required"
  );

  const activeStrip = SAMPLE_QUEUE.find((s) => s.id === selectedStripId) || SAMPLE_QUEUE[0];
  const [patientNote, setPatientNote] = useState(activeStrip.note);

  const handleSelectStrip = (strip: StripQueueItem) => {
    setSelectedStripId(strip.id);
    setPatientNote(strip.note);
    setCalipersActive(false);
    setAnnotationActive(false);
  };

  const handleSaveInterpretation = () => {
    showToast(
      `Interpretation saved for ${activeStrip.name}. Prototype demonstration only: no server mutation or EMR transmission occurred.`,
      "ok"
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              ECG Review Lab
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Waveforms
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Synthetic validated strips with algorithmic signal-quality scores. Annotate, log impressions, and return to patient chart.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
            3 pending review
          </span>
          <span className="px-2.5 py-1 text-xs rounded-md bg-white/5 text-muted-foreground border border-border/50">
            Median triage: 42 s
          </span>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pending Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Queue
              </span>
              <span className="text-[11px] text-muted-foreground">Oldest first</span>
            </div>

            <div className="space-y-2">
              {SAMPLE_QUEUE.map((strip) => {
                const isSelected = strip.id === selectedStripId;
                return (
                  <button
                    key={strip.id}
                    type="button"
                    onClick={() => handleSelectStrip(strip)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/50 shadow-sm shadow-cyan-500/10"
                        : "bg-surface-2/40 border-border/50 hover:bg-white/5 hover:border-border/80"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border ${strip.avatarColor}`}
                    >
                      {strip.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {strip.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {strip.date} · {strip.hr} bpm
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                        strip.level === "L3"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {strip.level}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="my-4 border-t border-border/40" />

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recently Interpreted
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/5 border border-border/30 flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Kabir Sethi · 38 y</div>
                  <div className="text-[11px] text-muted-foreground">Interpreted by you · 2 d ago</div>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Done
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-border/30 flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Leela Nair · 67 y</div>
                  <div className="text-[11px] text-muted-foreground">Interpreted by Dr Okafor · 5 d ago</div>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Strip & Interpretation Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Strip Card */}
          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border ${activeStrip.avatarColor}`}
                >
                  {activeStrip.initials}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground font-sora">
                    {activeStrip.name} · {activeStrip.age} y
                  </h2>
                  <div className="text-xs text-muted-foreground">
                    Strip {activeStrip.date} · {activeStrip.rhythm}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-md border ${
                    activeStrip.level === "L3"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {activeStrip.level === "L3" ? "Level 3 · Urgent" : "Level 2 · Attention"}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Quality {activeStrip.quality}
                </span>
              </div>
            </div>

            {/* ECG Canvas Area */}
            <div className="relative rounded-lg overflow-hidden border border-border/60 shadow-inner">
              <EcgStripCanvas hr={activeStrip.hr} height={200} interactive={true} />

              {calipersActive && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-navy-900 text-[10px] font-bold rounded shadow">
                  Calipers Active: Drag or click to measure interval
                </div>
              )}
              {annotationActive && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-cyan-500/90 text-navy-900 text-[10px] font-bold rounded shadow">
                  Annotation Layer Active
                </div>
              )}
            </div>

            {/* Time labels */}
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono mt-1 px-1">
              <span>0 s</span>
              <span>5 s</span>
              <span>10 s</span>
              <span>15 s</span>
              <span>20 s</span>
              <span>25 s</span>
              <span>30 s</span>
            </div>

            {/* Signal Properties Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Measured Rate
                </div>
                <div
                  className={`text-xl font-bold font-sora mt-0.5 ${
                    activeStrip.hr > 100 ? "text-rose-400" : "text-foreground"
                  }`}
                >
                  {activeStrip.hr}{" "}
                  <span className="text-xs font-normal text-muted-foreground">bpm</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  RR Variability
                </div>
                <div className="text-xl font-bold font-sora text-foreground mt-0.5">
                  High <span className="text-xs font-normal text-muted-foreground">index</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ectopics
                </div>
                <div className="text-xl font-bold font-sora text-foreground mt-0.5">
                  4 <span className="text-xs font-normal text-muted-foreground">detected</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-2/60 border border-border/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Motion Artifact
                </div>
                <div className="text-xl font-bold font-sora text-emerald-400 mt-0.5">
                  Minimal
                </div>
              </div>
            </div>

            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setCalipersActive(!calipersActive);
                  showToast(
                    calipersActive
                      ? "Caliper measurement closed."
                      : "Caliper tool active — click two points on the strip to measure interval.",
                    "ok"
                  );
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  calipersActive
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "border-border/70 hover:bg-white/5 text-foreground"
                }`}
              >
                {calipersActive ? "Disable calipers" : "Calipers"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnnotationActive(!annotationActive);
                  showToast(
                    annotationActive
                      ? "Annotation layer removed."
                      : "Rhythm annotation layer added to review canvas.",
                    "ok"
                  );
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  annotationActive
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "border-border/70 hover:bg-white/5 text-foreground"
                }`}
              >
                {annotationActive ? "Hide annotations" : "Annotate"}
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Strip compared against 90-day baseline; 3 similar patterns found, none flagged as acute.",
                    "ok"
                  )
                }
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground cursor-pointer"
              >
                Compare to baseline
              </button>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Second opinion request queued for Dr Samuel Okafor (electrophysiology team).",
                    "ok"
                  )
                }
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground cursor-pointer"
              >
                Second opinion
              </button>
            </div>
          </div>

          {/* Clinical Interpretation Input Card */}
          <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-sm font-bold text-foreground font-sora">
                Clinical Interpretation
              </span>
              <span className="text-[11px] text-muted-foreground">
                Timestamped and visible to patient upon authorization
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Impression Category
              </label>
              <select
                value={selectedImpression}
                onChange={(e) => setSelectedImpression(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2/90 border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option>No acute abnormality identified</option>
                <option>Sinus tachycardia — clinical correlation required</option>
                <option>Irregular rhythm — recommend ambulatory monitoring</option>
                <option>Artifact-limited — repeat recording advised</option>
                <option>Refer to electrophysiology</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Note to Patient (plain language)
              </label>
              <textarea
                rows={3}
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2/90 border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-cyan-500/50 leading-relaxed resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveInterpretation}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 shadow-md shadow-cyan-500/20 transition-colors cursor-pointer"
              >
                Save &amp; return to patient
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("messages");
                  showToast("Switched to clinician inbox.", "info");
                }}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
              >
                Message instead
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatientId(activeStrip.id)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
              >
                View full patient record
              </button>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Demonstration Audit Note:</span>{" "}
              Interpretation is linked to mock registration <span className="text-cyan-400 font-mono">MMC-2010-44821</span> and timestamped. CardioCore does not make automated diagnoses — interpretation and treatment remain human clinical decisions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
