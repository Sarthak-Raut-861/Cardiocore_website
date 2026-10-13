import React from "react";
import { Container } from "@/components/ui/container";

export const PartnerLogos: React.FC = () => {
  return (
    <div className="w-full border-y border-[var(--border)] bg-[var(--surface-2)]/60 py-6 transition-colors duration-200">
      <Container>
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-6 sm:gap-8 opacity-75">
          <div className="flex items-center gap-2.5 font-display font-bold text-sm text-[var(--mid)] tracking-tight">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h4l3 7 4-14 3 7h4" />
            </svg>
            Meridian Heart Institute
          </div>

          <div className="flex items-center gap-2.5 font-display font-bold text-sm text-[var(--mid)] tracking-tight">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M7 12h10" />
            </svg>
            Northbridge Clinic
          </div>

          <div className="flex items-center gap-2.5 font-display font-bold text-sm text-[var(--mid)] tracking-tight">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M8 12h8" />
            </svg>
            City Care Hospital
          </div>

          <div className="flex items-center gap-2.5 font-display font-bold text-sm text-[var(--mid)] tracking-tight">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--mid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l3 2" />
            </svg>
            Apollo Diagnostics
          </div>
        </div>
      </Container>
    </div>
  );
};
