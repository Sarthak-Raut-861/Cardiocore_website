import React from "react";
import { Container } from "@/components/ui/container";

export const StatsBand: React.FC = () => {
  return (
    <section id="clinical" className="py-16 scroll-mt-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 md:p-14 bg-gradient-to-br from-[#062A2E] via-[#073C40] to-[#0A4B50] text-white border border-teal-500/20 shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold max-w-2xl text-white leading-tight mb-10">
              Monitoring support at clinical fidelity — with guardrails written into the product.
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-6 border-t border-white/15">
              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  250 Hz
                </div>
                <div className="text-xs sm:text-sm font-medium text-teal-100/85 mt-1.5">
                  Single-Lead Waveform Sampling Rate
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  100%
                </div>
                <div className="text-xs sm:text-sm font-medium text-teal-100/85 mt-1.5">
                  On-Device Storage Privacy Default
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  &lt; 3 s
                </div>
                <div className="text-xs sm:text-sm font-medium text-teal-100/85 mt-1.5">
                  Triage Signal Dispatch Latency
                </div>
              </div>

              <div>
                <div className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#7FE6D8] tracking-tight">
                  Zero
                </div>
                <div className="text-xs sm:text-sm font-medium text-teal-100/85 mt-1.5">
                  Automatic Data Sharing with Brokers
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
