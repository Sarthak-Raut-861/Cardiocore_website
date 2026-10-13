import React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 scroll-mt-16">
      <Container>
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div
            id="clinical"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3 scroll-mt-20"
          >
            Clinical Platform
          </div>
          <h2 className="h1 text-[var(--hi)] mb-4">
            Seven signals. One personal model.
          </h2>
          <p className="lead text-[var(--mid)]">
            Every measurement is explainable. Every clinical action stays a human clinical decision.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Continuous Telemetry */}
          <Card variant="interactive" className="flex flex-col justify-between">
            <div>
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-[14px] bg-[var(--teal-soft)] border border-[var(--teal)]/20 flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <CardTitle>Continuous Telemetry</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-[var(--mid)] leading-relaxed">
                  ECG, HR, HRV, SpO₂, skin temperature, and motion fused in real time
                  with noise-rejection gating so false alarms don&apos;t disrupt your day.
                </p>
              </CardContent>
            </div>
          </Card>

          {/* Card 2: Digital Twin Baseline */}
          <Card variant="interactive" className="flex flex-col justify-between">
            <div>
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-[14px] bg-[var(--violet-soft)] border border-[var(--violet)]/20 flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--violet)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                </div>
                <CardTitle>Digital Twin Baseline</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-[var(--mid)] leading-relaxed">
                  Your personal physiology, not a population average. Learns your diurnal
                  rhythms and medication regimen to flag meaningful drift.
                </p>
              </CardContent>
            </div>
          </Card>

          {/* Card 3: Consent-Led Care */}
          <Card variant="interactive" className="flex flex-col justify-between">
            <div>
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-[14px] bg-[var(--green-soft)] border border-[var(--green)]/20 flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--green)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <CardTitle>Consent-Led Care</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-sm text-[var(--mid)] leading-relaxed">
                  Granular sharing with verified cardiologists. You decide who sees your
                  trends and for how long. Revocable anytime with a single tap.
                </p>
              </CardContent>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
};
