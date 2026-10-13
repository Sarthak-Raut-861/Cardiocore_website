"use client";

import React, { useState, useEffect } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { EcgStripCanvas } from "./ecg-strip-canvas";
import { IS_MULTILEAD_ENABLED, IS_REAL_BACKEND_ENABLED } from "@/lib/api/backend-config";
import { MultiLeadWaveformReview } from "@/features/telemetry/components/multi-lead-waveform-review";

export function PatientEcgView() {
  const { formatUnit, showToast } = usePatientDashboard();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(18);
  const [activeTab, setActiveTab] = useState<"single-lead" | "multi-lead">("single-lead");
  const [customRecordingId, setCustomRecordingId] = useState<string>("rec_synth_01");

  const hrFmt = formatUnit("hr", 76);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 30) {
            setIsRecording(false);
            showToast("30-second ECG recording completed and saved.", "ok");
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, showToast]);

  const startRecording = () => {
    setSeconds(0);
    setIsRecording(true);
    showToast("Starting 30-second single-lead ECG recording...", "info");
  };

  const stopRecording = () => {
    setIsRecording(false);
    showToast("ECG recording paused.", "warn");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            ECG lab
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            {IS_MULTILEAD_ENABLED && activeTab === "multi-lead"
              ? "Synchronized Multi-Lead ECG Review at 250 Hz (Protocol v2 Planar Transport)."
              : "Single-lead ECG at 250 Hz. Strips are for review — never auto-diagnosed."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {IS_MULTILEAD_ENABLED && (
            <div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)] text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setActiveTab("single-lead")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeTab === "single-lead"
                    ? "bg-[var(--teal)] text-white shadow-sm"
                    : "text-[var(--mid)] hover:text-[var(--hi)]"
                }`}
              >
                Lead-I Live
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("multi-lead")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeTab === "multi-lead"
                    ? "bg-[var(--teal)] text-white shadow-sm"
                    : "text-[var(--mid)] hover:text-[var(--hi)]"
                }`}
              >
                Multi-Lead Review
              </button>
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            Good signal quality
          </span>
          <span className="rounded-full bg-[var(--tint)] px-3 py-1 text-xs font-medium text-[var(--mid)]">
            {IS_MULTILEAD_ENABLED && activeTab === "multi-lead"
              ? "Multi-Channel · Planar v2"
              : "Lead I · 25 mm/s · 10 mm/mV"}
          </span>
        </div>
      </div>

      {/* Feature Flagged Multi-Lead ECG View (Unmounted when disabled) */}
      {IS_MULTILEAD_ENABLED && activeTab === "multi-lead" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <div className="text-xs">
              <span className="font-semibold text-[var(--hi)] block">Recording Session Identifier</span>
              <span className="text-[var(--muted)]">
                {IS_REAL_BACKEND_ENABLED
                  ? "Connected to FastAPI Backend · Authenticated retrieval"
                  : "Demonstration mode: requires NEXT_PUBLIC_ENABLE_REAL_BACKEND=true for live server data"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="recording-id-input" className="text-[var(--muted)]">
                Recording ID:
              </label>
              <input
                id="recording-id-input"
                type="text"
                value={customRecordingId}
                onChange={(e) => setCustomRecordingId(e.target.value)}
                placeholder="Enter recording ID..."
                className="bg-[var(--surface-2)] text-[var(--hi)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--teal)]"
              />
            </div>
          </div>

          <MultiLeadWaveformReview recordingId={customRecordingId} />
        </div>
      ) : (
        /* Standard Single-Lead Grid (Default Experience) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Capture Bench (7 cols) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Live capture (Lead I)
            </span>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--mid)]">
              <span>
                Recording <strong className="font-mono text-[var(--hi)]">00:{String(seconds).padStart(2, "0")}</strong> of 00:30
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? "bg-[var(--red)] animate-ping" : "bg-[var(--green)]"}`} />
            </div>
          </div>

          {/* ECG Strip Canvas */}
          <EcgStripCanvas hr={76} height={180} isRecording={isRecording} />

          {/* Real-time stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs border border-[var(--border)]">
              <span className="text-[var(--muted)] block">Live heart rate</span>
              <div className="mt-1 flex items-baseline gap-1 font-heading text-xl font-bold text-[var(--hi)]">
                {hrFmt.value} <span className="text-xs font-normal text-[var(--muted)]">{hrFmt.unit}</span>
              </div>
              <span className="text-[var(--green)] font-semibold text-[11px] block mt-0.5">rhythm: regular</span>
            </div>

            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs border border-[var(--border)]">
              <span className="text-[var(--muted)] block">Detected beats</span>
              <div className="mt-1 font-heading text-xl font-bold text-[var(--hi)]">
                {Math.round((seconds / 30) * 38) || 23}
              </div>
              <span className="text-[var(--mid)] text-[11px] block mt-0.5">ectopics: none</span>
            </div>

            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs border border-[var(--border)]">
              <span className="text-[var(--muted)] block">Signal quality</span>
              <div className="mt-1 font-heading text-xl font-bold text-[var(--green)]">
                96%
              </div>
              <span className="text-[var(--mid)] text-[11px] block mt-0.5">impedance OK</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-[var(--border)]">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] disabled:opacity-50 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M2 12h4l2-5 3 10 3-8 2 3h6" />
              </svg>
              Record ECG — 30 sec
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] disabled:opacity-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={() => showToast("Simulated sharing: ECG strips are not transmitted to clinicians without active backend integration.", "info")}
              className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
            >
              Share with clinician
            </button>
          </div>

          <p className="mt-4 text-[11px] text-[var(--muted)]">
            ECG strips are not automatically interpreted as a diagnosis. Share with your clinician for review.
          </p>
        </div>

        {/* Right Column: History & Guidance (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Previous Recordings */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Previous recordings
              </span>
              <span className="rounded-full bg-[var(--tint)] px-2 py-0.5 text-xs text-[var(--mid)]">
                3 this week
              </span>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => showToast("Loaded strip from 25 Sep 07:12 · 72 BPM · good quality", "ok")}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-2)] cursor-pointer transition-colors border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--teal-soft)] text-[var(--teal-700)]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M2 12h4l2-5 3 10 3-8 2 3h6" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--hi)] block">25 Sep · 07:12</span>
                    <span className="text-[var(--muted)]">72 BPM · good quality · 30 s</span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">→</span>
              </div>

              <div
                onClick={() => showToast("Loaded strip from 23 Sep 22:40 · 69 BPM · fair quality", "ok")}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-2)] cursor-pointer transition-colors border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--teal-soft)] text-[var(--teal-700)]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M2 12h4l2-5 3 10 3-8 2 3h6" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--hi)] block">23 Sep · 22:40</span>
                    <span className="text-[var(--muted)]">69 BPM · fair quality · 30 s</span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">→</span>
              </div>

              <div
                onClick={() => showToast("Loaded strip from 21 Sep 06:55 · shared with Dr Raghavan", "ok")}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-2)] cursor-pointer transition-colors border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--violet-soft)] text-[var(--violet)]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M2 12h4l2-5 3 10 3-8 2 3h6" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-[var(--hi)] block">21 Sep · 06:55</span>
                    <span className="text-[var(--muted)]">71 BPM · good · shared with Dr Raghavan</span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">→</span>
              </div>
            </div>
          </div>

          {/* Analysis Notes & Warning */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 block">
              Analysis notes
            </span>
            <p className="text-xs text-[var(--mid)] leading-relaxed">
              CardioCore measures intervals and quality automatically, and flags rhythm irregularity. It does not name clinical diagnoses. Interpretation and treatment decisions belong solely to your clinician.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-3 text-xs text-[var(--hi)]">
              <strong className="text-[var(--amber)] font-bold">Clinical Safety Notice: </strong>
              Never change or stop a prescribed medication based on app data. Always discuss any changes with your prescribing doctor.
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
