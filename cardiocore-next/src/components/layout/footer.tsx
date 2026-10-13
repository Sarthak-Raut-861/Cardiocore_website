import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] transition-colors duration-200 pt-16 pb-12 mt-auto">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[var(--border)]">
          {/* Column 1: Brand & Mission (spans 2 columns on lg) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4 select-none">
              <span className="w-8 h-8 rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.3)]">
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
              <span className="font-bold text-lg tracking-tight font-display text-[var(--hi)]">
                CardioCore
              </span>
            </div>
            <p className="text-xs text-[var(--mid)] leading-relaxed max-w-sm mb-4">
              Personalised cardiovascular monitoring support. Continuous telemetry,
              personal digital twin, and consent-first specialist triage.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral" size="sm">
                Data-residency ready
              </Badge>
              <Badge variant="neutral" size="sm">
                Local-first privacy
              </Badge>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div className="flex flex-col space-y-2.5">
            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--hi)] mb-1">
              Platform
            </h5>
            <a
              href="#features"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Features
            </a>
            <a
              href="#clinical"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Clinical telemetry
            </a>
            <a
              href="#doctors"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Care network
            </a>
            <a
              href="#security"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Privacy &amp; Security
            </a>
          </div>

          {/* Column 3: Portals */}
          <div className="flex flex-col space-y-2.5">
            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--hi)] mb-1">
              Portals
            </h5>
            <Link
              href="/login?role=patient"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Patient sign in
            </Link>
            <Link
              href="/login?role=doctor"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Clinician portal
            </Link>
            <a
              href="#faq"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              FAQ
            </a>
          </div>

          {/* Column 4: Privacy & Safety */}
          <div className="flex flex-col space-y-2.5">
            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-[var(--hi)] mb-1">
              Privacy &amp; Safety
            </h5>
            <a
              href="#security"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Trust &amp; Consent
            </a>
            <a
              href="#clinical"
              className="text-xs text-[var(--mid)] hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors"
            >
              Safety guidelines
            </a>
            <a
              href="mailto:care@cardiocore.app"
              className="text-xs font-mono text-[var(--teal-700)] dark:text-[var(--teal)] hover:underline"
            >
              care@cardiocore.app
            </a>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] text-[var(--muted)]">
          <span>
            &copy; 2026 CardioCore Systems. Interface prototype for demonstration. Not for
            clinical diagnostic use.
          </span>
          <span className="font-semibold text-[var(--mid)]">
            Monitoring support — not a diagnostic device.
          </span>
        </div>
      </Container>
    </footer>
  );
};
