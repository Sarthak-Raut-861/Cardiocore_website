"use client";

import React from "react";
import Link from "next/link";
import { LiveEcgCanvas } from "@/features/landing/components/ecg-mini-canvas";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export interface AuthLayoutProps {
  children: React.ReactNode;
  activeRole: "patient" | "doctor";
  onRoleChange?: (role: "patient" | "doctor") => void;
  showRoleTabs?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  activeRole,
  onRoleChange,
  showRoleTabs = true,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--hi)] transition-colors duration-200">
      {/* Left Column: Form & Interaction */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 max-w-xl mx-auto lg:max-w-none">
        <div>
          {/* Header Bar: Brand Link + Theme Toggle */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group select-none cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.3)] transition-transform duration-200 group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
                  <path
                    d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8"
                    stroke="#C9FBEF"
                  />
                </svg>
              </span>
              <span className="font-bold text-lg tracking-tight font-display text-[var(--hi)] group-hover:text-[var(--teal-700)] dark:group-hover:text-[var(--teal)] transition-colors">
                CardioCore
              </span>
              {activeRole === "doctor" && (
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--cyan-soft)] text-[var(--cyan)] border border-[var(--cyan)]/20 font-bold ml-1">
                  Clinician
                </span>
              )}
            </Link>

            <ThemeToggle />
          </div>

          {/* Role Segmented Switch */}
          {showRoleTabs && onRoleChange && (
            <div className="inline-flex p-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-7">
              <button
                type="button"
                onClick={() => onRoleChange("patient")}
                className={`px-5 py-2 rounded-full text-xs font-semibold font-display transition-all cursor-pointer ${
                  activeRole === "patient"
                    ? "bg-[var(--surface)] text-[var(--hi)] shadow-[var(--sh-1)]"
                    : "text-[var(--mid)] hover:text-[var(--hi)]"
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => onRoleChange("doctor")}
                className={`px-5 py-2 rounded-full text-xs font-semibold font-display transition-all cursor-pointer ${
                  activeRole === "doctor"
                    ? "bg-[var(--surface)] text-[var(--hi)] shadow-[var(--sh-1)]"
                    : "text-[var(--mid)] hover:text-[var(--hi)]"
                }`}
              >
                Clinician
              </button>
            </div>
          )}

          {/* Form Content */}
          <div className="max-w-md w-full">{children}</div>
        </div>

        {/* Regulatory Safe Harbor */}
        <p className="mt-8 text-[11px] text-[var(--muted)] leading-relaxed max-w-md border-t border-[var(--border)] pt-4">
          By signing in you acknowledge that CardioCore provides personal monitoring support
          and does not provide clinical diagnosis. All health record access is encrypted and
          audit-logged.
        </p>
      </div>

      {/* Right Column: Clean Biomedical Telemetry & Baseline Showcase (No anatomical heart) */}
      <div
        className={`hidden lg:flex w-full lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-14 text-white ${
          activeRole === "doctor"
            ? "bg-gradient-to-br from-[#052831] via-[#084852] to-[#0C636F]"
            : "bg-gradient-to-br from-[#06242B] via-[#093A43] to-[#0B505A]"
        }`}
      >
        {/* Subtle Ambient Glow */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[380px] h-[380px] rounded-full blur-[90px] bg-[#7FE3DA]/15 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-100px] left-[-60px] w-[340px] h-[340px] rounded-full blur-[90px] bg-[#4FC7E8]/15 pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Status Header */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            {activeRole === "doctor" ? "Roster synced · 6 patients" : "Telemetry connected · Lead-II (250 Hz)"}
          </span>
          <span className="text-xs font-mono text-teal-100/70">
            {activeRole === "doctor" ? "Meridian Clinical Network" : "Real-Time Baseline"}
          </span>
        </div>

        {/* Center Minimalist Telemetry Showcase Card */}
        <div className="relative z-10 my-auto py-6 max-w-lg w-full mx-auto">
          {activeRole === "doctor" ? (
            /* Clinician Triage Overview Card */
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/15 mb-4">
                <div>
                  <h3 className="text-sm font-bold font-display text-white">
                    Clinical Triage Queue
                  </h3>
                  <p className="text-[11px] text-teal-100/70">
                    Prioritized by validated drift duration &amp; severity
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/25 border border-red-400/30 text-[10px] font-bold text-red-200">
                  1 Urgent
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0 animate-ping" />
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">Aarav Menon, 44</div>
                      <div className="text-[11px] text-teal-100/70">
                        Resting HR 138 &bull; HRV 19 ms &bull; 9 min persistence
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white shrink-0">
                    Level 3
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">Rohit Sharma, 61</div>
                      <div className="text-[11px] text-teal-100/70">
                        Resting HR above usual range &bull; 2 days
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-teal-200 shrink-0">
                    Review
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Patient Minimalist Telemetry & Baseline Card */
            <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/15 mb-4">
                <div>
                  <h3 className="text-sm font-bold font-display text-white">
                    Personal Cardiac Baseline
                  </h3>
                  <p className="text-[11px] text-teal-100/70">
                    Adaptive physiological baseline model
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 border border-teal-300/30 text-[10px] font-mono font-bold text-teal-200">
                  Stable
                </span>
              </div>

              {/* Waveform Strip */}
              <div className="rounded-xl overflow-hidden bg-black/25 border border-white/10 p-2.5 mb-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-teal-200/80 mb-1.5 px-1">
                  <span>Lead-II Continuous Stream</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                    250 Hz
                  </span>
                </div>
                <div className="h-[52px] rounded-lg overflow-hidden bg-black/30">
                  <LiveEcgCanvas width={380} height={52} />
                </div>
              </div>

              {/* Minimal Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-[10px] font-medium text-teal-100/70 uppercase">Resting HR</div>
                  <div className="text-base font-bold font-display text-white mt-0.5">68 <span className="text-[10px] font-normal text-teal-200">BPM</span></div>
                  <div className="text-[9px] text-emerald-300 font-medium">Normal range</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-[10px] font-medium text-teal-100/70 uppercase">HRV (SDNN)</div>
                  <div className="text-base font-bold font-display text-white mt-0.5">52 <span className="text-[10px] font-normal text-teal-200">ms</span></div>
                  <div className="text-[9px] text-emerald-300 font-medium">Optimal</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-[10px] font-medium text-teal-100/70 uppercase">Blood Oxygen</div>
                  <div className="text-base font-bold font-display text-white mt-0.5">99 <span className="text-[10px] font-normal text-teal-200">%</span></div>
                  <div className="text-[9px] text-emerald-300 font-medium">SpO₂ stable</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Feature Highlights / Quote */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-teal-100/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-teal-300"><path d="M20 6 9 17l-5-5"/></svg>
              Encrypted In-Transit
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-teal-300"><path d="M20 6 9 17l-5-5"/></svg>
              Consent-First Sharing
            </span>
          </div>
          <span className="text-[11px] font-mono text-teal-200/60 hidden sm:inline">
            CardioCore v2.0
          </span>
        </div>
      </div>
    </div>
  );
};
