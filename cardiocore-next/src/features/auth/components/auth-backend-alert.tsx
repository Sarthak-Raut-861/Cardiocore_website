import React from "react";

export const AuthBackendAlert: React.FC<{ error?: string | null }> = ({ error }) => {
  return (
    <div
      role="status"
      className="p-3.5 rounded-[14px] bg-[var(--amber-soft)] border border-[var(--amber)]/30 text-[var(--hi)] text-xs flex items-start gap-3 mb-6"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--amber)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="leading-relaxed">
        <strong>Phase 3 Backend Boundary:</strong> The FastAPI authentication service is
        currently offline. Per security rules, fake client-side authentication is prohibited. Form
        submissions attempt genuine network requests to proposed FastAPI contracts.
        {error && (
          <div className="mt-1.5 font-mono text-[11px] text-[var(--red)] font-semibold">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
