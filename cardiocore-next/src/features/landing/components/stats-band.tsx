import React from "react";
import { Container } from "@/components/ui/container";

export const StatsBand: React.FC = () => {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-[24px] p-8 sm:p-12 md:p-14 bg-gradient-to-br from-[#062A31] via-[#0A4A52] to-[#0B5F63] text-white shadow-[var(--sh-3)]">
          {/* Subtle Ambient Light Highlights */}
          <div
            className="absolute top-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full blur-[60px] bg-[var(--teal)]/25 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[-100px] right-[-100px] w-[340px] h-[340px] rounded-full blur-[70px] bg-[var(--cyan)]/25 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold max-w-2xl text-white leading-tight mb-10">
              Monitoring support at clinical fidelity — with guardrails written into
              the product.
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-4 border-t border-white/15">
              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  250 Hz
                </div>
                <div className="text-xs sm:text-sm text-teal-100/75 mt-1 font-medium">
                  Single-lead ECG sampling
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  7
                </div>
                <div className="text-xs sm:text-sm text-teal-100/75 mt-1 font-medium">
                  Fused physiological signals
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  &lt; 60 s
                </div>
                <div className="text-xs sm:text-sm text-teal-100/75 mt-1 font-medium">
                  Time to validated alert
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  3 levels
                </div>
                <div className="text-xs sm:text-sm text-teal-100/75 mt-1 font-medium">
                  Graduated clinical escalation
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
