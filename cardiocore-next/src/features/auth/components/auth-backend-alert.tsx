import React from "react";

export const AuthBackendAlert: React.FC<{ error?: string | null }> = ({ error }) => {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[var(--hi)] text-xs flex items-start gap-2.5 mb-5 animate-in fade-in duration-150"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-500 shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="leading-relaxed">
        <strong className="text-red-500 dark:text-red-400">Authentication notice:</strong>{" "}
        <span className="text-[var(--mid)]">{error}</span>
      </div>
    </div>
  );
};
