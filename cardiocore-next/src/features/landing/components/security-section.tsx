import React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 scroll-mt-16">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Security Principles */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3">
              Privacy by Design
            </div>
            <h2 className="h1 text-[var(--hi)] mb-4">
              Data sharing is an active decision.
            </h2>
            <p className="lead text-[var(--mid)] mb-8">
              No third-party trackers, no automatic data brokers. Every byte stays on
              your device until you explicitly grant access.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card variant="default" className="p-5">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Encrypted End-to-End</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[var(--mid)] leading-relaxed">
                    AES-256 local storage, TLS 1.3 in transit, and rotating BLE encryption keys.
                  </p>
                </CardContent>
              </Card>

              <Card variant="default" className="p-5">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Granular Consent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[var(--mid)] leading-relaxed">
                    Choose what clinicians see: baseline only, trends, or raw ECG strips.
                  </p>
                </CardContent>
              </Card>

              <Card variant="default" className="p-5">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Offline Autonomy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[var(--mid)] leading-relaxed">
                    The wearable continues capturing without internet connectivity.
                  </p>
                </CardContent>
              </Card>

              <Card variant="default" className="p-5">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">Instant Revocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[var(--mid)] leading-relaxed">
                    Revoke clinician access anytime. All access attempts are audit-logged.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Consent Ledger Preview */}
          <div className="lg:col-span-5">
            <Card
              variant="elevated"
              className="p-6 bg-gradient-to-br from-[#F4FBFA] to-[#E8F6F5] dark:from-[#0C272D] dark:to-[#0F2E35] border-[var(--border-2)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                <span className="caption">Consent Ledger Preview</span>
                <Badge variant="data" size="sm">
                  Illustrative Prototype
                </Badge>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {/* Row 1 */}
                <div className="p-3 rounded-[14px] bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[var(--teal-soft)] flex items-center justify-center shrink-0 text-[var(--teal-700)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[var(--hi)] truncate">
                      Dr Neha Raghavan
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      Baseline + 7-day trends &bull; Appointment active
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="p-3 rounded-[14px] bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[var(--teal-soft)] flex items-center justify-center shrink-0 text-[var(--teal-700)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[var(--hi)] truncate">
                      Lead I ECG Recording
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      Shared for clinical review &bull; Revocable
                    </div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="p-3 rounded-[14px] bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3 opacity-75">
                  <span className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0 text-[var(--muted)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[var(--hi)] truncate">
                      Research Pool
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      Opted out &bull; Zero sharing
                    </div>
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <p className="mt-5 text-[11.5px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3">
                Nothing is shared without your explicit action. Changes are timestamped in
                your local ledger.
              </p>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
};
