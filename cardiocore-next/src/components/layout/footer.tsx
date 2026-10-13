import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 py-8 mt-auto">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3 select-none">
            <span className="w-7 h-7 rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.25)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
                <path
                  d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8"
                  stroke="#C9FBEF"
                />
              </svg>
            </span>
            <span className="font-bold text-base tracking-tight font-display text-[var(--hi)]">
              CardioCore
            </span>
            <span className="hidden sm:inline text-xs text-[var(--muted)] border-l border-[var(--border)] pl-3">
              Monitoring support — not a diagnostic device.
            </span>
          </div>

          {/* Minimal Navigation & Portal Links */}
          <nav className="flex items-center flex-wrap justify-center gap-5 sm:gap-6 text-xs font-medium text-[var(--mid)]">
            <a
              href="#features"
              className="hover:text-[var(--hi)] transition-colors"
            >
              Features
            </a>
            <a
              href="#clinical"
              className="hover:text-[var(--hi)] transition-colors"
            >
              Clinical
            </a>
            <a
              href="#doctors"
              className="hover:text-[var(--hi)] transition-colors"
            >
              Specialists
            </a>
            <a
              href="#security"
              className="hover:text-[var(--hi)] transition-colors"
            >
              Privacy
            </a>
            <Link
              href="/login?role=patient"
              className="hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] font-semibold transition-colors"
            >
              Patient sign in
            </Link>
            <Link
              href="/login?role=doctor"
              className="hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] font-semibold transition-colors"
            >
              Doctor portal
            </Link>
          </nav>
        </div>

        {/* Bottom Minimal Copyright */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
          <span>
            &copy; {new Date().getFullYear()} CardioCore Systems. Interface prototype for demonstration.
          </span>
          <span>
            Continuous single &amp; multi-lead synthetic telemetry.
          </span>
        </div>
      </Container>
    </footer>
  );
};
