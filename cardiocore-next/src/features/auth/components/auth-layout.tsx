"use client";

import React from "react";
import Link from "next/link";
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[var(--bg)] text-[var(--hi)] relative overflow-hidden transition-colors duration-200">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] bg-[var(--teal)]/5 dark:bg-[var(--teal)]/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Centered Content */}
      <div className="w-full max-w-md sm:max-w-lg relative z-10 flex flex-col my-auto py-8">
        {/* Top Header Bar: Brand Logo + Role Tag + Theme Toggle */}
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
          <div className="inline-flex p-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-6 self-start">
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
        <div className="w-full">{children}</div>

        {/* Regulatory Safe Harbor */}
        <p className="mt-8 text-[11px] text-[var(--muted)] text-center leading-relaxed max-w-md mx-auto">
          By signing in you acknowledge that CardioCore provides personal monitoring support
          and does not provide clinical diagnosis. All health record access is encrypted and audit-logged.
        </p>
      </div>
    </div>
  );
};
