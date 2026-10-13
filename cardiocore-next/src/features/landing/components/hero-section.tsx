"use client";

import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { HeroHeartStage } from "./hero-heart-stage";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:py-20">
      {/* Background Ambient Blobs */}
      <div
        className="absolute top-[-100px] left-[-80px] w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full blur-[70px] bg-[#C5EFEA] dark:bg-[#12575C] opacity-45 dark:opacity-20 pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-140px] right-[-60px] w-[360px] sm:w-[460px] h-[360px] sm:h-[460px] rounded-full blur-[70px] bg-[#C9EEFB] dark:bg-[#0E4A5C] opacity-40 dark:opacity-20 pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-[35%] left-[35%] w-[300px] sm:w-[380px] h-[300px] sm:h-[380px] rounded-full blur-[70px] bg-[#D9F7E4] dark:bg-[#124A3A] opacity-35 dark:opacity-15 pointer-events-none -z-10"
        aria-hidden="true"
      />

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text Content */}
          <div className="lg:col-span-6 flex flex-col items-start z-10">
            {/* Clinical Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-1)] text-xs font-bold text-[var(--teal-700)] dark:text-[var(--teal)] mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
              Personal Heart Health &bull; Clinical Fidelity
            </div>

            {/* Main Headline */}
            <h1 className="display text-[var(--hi)] mb-6">
              Know your <span className="grad">normal</span>.
              <br />
              Act when it changes.
            </h1>

            {/* Lead Narrative */}
            <p className="lead text-[var(--mid)] mb-8 max-w-xl">
              Continuous bio-sensing and adaptive baseline intelligence — for patients
              and clinicians on one connected, privacy-first record.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8 w-full sm:w-auto">
              <Link href="/login?role=patient" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="shrink-0"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Patient sign in
                </Button>
              </Link>

              <Link href="/login?role=doctor" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="shrink-0 text-[var(--teal)]"
                  >
                    <path d="M9 3v4a3 3 0 0 0 3 3 3 3 0 0 0 3-3V3" />
                    <path d="M12 10v3a5 5 0 0 0 5 5h1" />
                    <circle cx="19" cy="18" r="3" />
                  </svg>
                  Clinician portal
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-[var(--mid)]">
              <div className="flex items-center gap-2">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className="shrink-0"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                250 Hz Continuous ECG
              </div>
              <div className="flex items-center gap-2">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className="shrink-0"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Consent-Led Sharing
              </div>
              <div className="flex items-center gap-2">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className="shrink-0"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Offline-Ready
              </div>
            </div>

            {/* Clinical Regulatory Disclaimer */}
            <p className="mt-6 text-xs text-[var(--muted)] border-l-2 border-[var(--teal)]/40 pl-3 max-w-lg leading-relaxed">
              Monitoring support — not a diagnostic device. CardioCore does not diagnose conditions.
            </p>
          </div>

          {/* Right Column: Hero Stage with Heart Figure */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <HeroHeartStage />
          </div>
        </div>
      </Container>
    </section>
  );
};
