"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FAQItem {
  id: string;
  category: "clinical" | "telemetry" | "privacy";
  categoryLabel: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "faq-1",
    category: "clinical",
    categoryLabel: "Clinical & Diagnostics",
    question: "Is CardioCore a diagnostic medical device?",
    answer:
      "No. CardioCore is monitoring support and research software. It surfaces personal physiological patterns and context, but does not diagnose medical conditions or replace a doctor. ECG strips and telemetry data are intended for you and your clinician to interpret collaboratively.",
  },
  {
    id: "faq-2",
    category: "clinical",
    categoryLabel: "Clinical & Diagnostics",
    question: "How does urgent alert escalation work?",
    answer:
      "CardioCore validates signal quality, verifies resting persistence, and rules out motion artifacts. If sustained threshold criteria are met, a Level-3 alert highlights contributing biometric metrics and enables immediate clinician review or emergency escalation pathways.",
  },
  {
    id: "faq-3",
    category: "telemetry",
    categoryLabel: "Device & Telemetry",
    question: "What leads and sampling rates does CardioCore support?",
    answer:
      "CardioCore supports continuous single-lead Lead-II at 250 Hz (Protocol v1 binary frames) as well as synchronized multi-lead configurations (1, 3, 6, and 12 leads at 250 Hz under Protocol v2 delta-encoded frames) for clinical waveform review.",
  },
  {
    id: "faq-4",
    category: "telemetry",
    categoryLabel: "Device & Telemetry",
    question: "Does the device work without an internet connection?",
    answer:
      "Yes. The wearable device buffers raw telemetry locally in non-volatile flash storage. Trends and recordings remain viewable in local-first mode and synchronize securely when network connectivity is restored.",
  },
  {
    id: "faq-5",
    category: "clinical",
    categoryLabel: "Clinical & Diagnostics",
    question: "What is the Personal Digital Twin?",
    answer:
      "The Personal Digital Twin is an adaptive mathematical model that learns your individual baseline cardiovascular patterns (resting HR, HRV, SpO₂, skin temperature) over time, alerting you only to meaningful deviations relative to your personal normal rather than generic population averages.",
  },
  {
    id: "faq-6",
    category: "privacy",
    categoryLabel: "Privacy & Consent",
    question: "Who has access to my health measurements?",
    answer:
      "Only you by default. Clinicians receive only the specific telemetry layers and timeframes you explicitly consent to, strictly bounded to the duration of your booked consultation or triage evaluation.",
  },
  {
    id: "faq-7",
    category: "privacy",
    categoryLabel: "Privacy & Consent",
    question: "Can I export my ECG strips and health records?",
    answer:
      "Yes. You can export complete consented sessions including raw P-QRS-T waveform data, heart rate variability distributions, and timestamped clinician interpretation notes in standard PDF, JSON, and CSV formats.",
  },
  {
    id: "faq-8",
    category: "privacy",
    categoryLabel: "Privacy & Consent",
    question: "How is telemetry data encrypted and protected?",
    answer:
      "All telemetry streams utilize authenticated encryption in transit (TLS 1.3 / WebSocket Secure with CRC integrity verification) and AES-256 encryption at rest with isolated session tokens, CSRF protection, and audit logging.",
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    "faq-1": true,
    "faq-3": true,
  });

  const toggle = (id: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems =
    activeCategory === "all"
      ? FAQ_DATA
      : FAQ_DATA.filter((item) => item.category === activeCategory);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--hi)] transition-colors duration-200">
      <Header />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        <Container size="default">
          {/* Breadcrumb & Hero */}
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] uppercase tracking-wider mb-4">
              Knowledge Base &amp; FAQ
            </div>
            <h1 className="h1 text-[var(--hi)] text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight font-display mb-4">
              Frequently asked questions
            </h1>
            <p className="text-sm sm:text-base text-[var(--mid)] leading-relaxed">
              Find answers on continuous wearable biosensing, clinical baseline intelligence,
              synchronized multi-lead ECG review, and data privacy.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-center flex-wrap gap-2 mb-10">
            {[
              { id: "all", label: "All Questions" },
              { id: "clinical", label: "Clinical & Diagnostics" },
              { id: "telemetry", label: "Device & Telemetry" },
              { id: "privacy", label: "Privacy & Consent" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-[var(--teal)] text-white shadow-md shadow-[var(--teal)]/20"
                    : "bg-[var(--surface-2)] text-[var(--mid)] border border-[var(--border)] hover:text-[var(--hi)] hover:bg-[var(--tint)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accordion FAQ Items */}
          <div className="space-y-4 mb-16">
            {filteredItems.map((item) => {
              const isOpen = !!openMap[item.id];
              return (
                <Card
                  key={item.id}
                  variant="default"
                  className="p-0 overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 font-bold text-sm sm:text-base text-left text-[var(--hi)] select-none hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-mono font-medium text-[var(--teal-700)] dark:text-[var(--teal)] uppercase tracking-wider">
                        {item.categoryLabel}
                      </span>
                      <span className="font-display">{item.question}</span>
                    </div>
                    <span
                      className={`w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 ml-3 text-[var(--mid)] transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[var(--teal)]" : ""
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-sm text-[var(--mid)] leading-relaxed border-t border-[var(--border)]/60 pt-4 animate-in fade-in duration-200">
                      {item.answer}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Still Have Questions Box */}
          <div className="text-center p-8 sm:p-10 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-lg shadow-black/5 dark:shadow-black/20">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--hi)] mb-3">
              Still have questions?
            </h2>
            <p className="text-sm text-[var(--mid)] mb-6 max-w-lg mx-auto leading-relaxed">
              Our engineering and clinical research teams are here to help. Reach out with any protocol,
              integration, or telemetry inquiries.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/">
                <Button variant="outline" size="md">
                  Return to Home
                </Button>
              </Link>
              <a href="mailto:care@cardiocore.app">
                <Button variant="primary" size="md">
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
