import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/features/landing/components/hero-section";
import { PartnerLogos } from "@/features/landing/components/partner-logos";
import { FeaturesSection } from "@/features/landing/components/features-section";
import { SpecialistsSection } from "@/features/landing/components/specialists-section";
import { StatsBand } from "@/features/landing/components/stats-band";
import { SecuritySection } from "@/features/landing/components/security-section";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--hi)] transition-colors duration-200">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PartnerLogos />
        <FeaturesSection />
        <SpecialistsSection />
        <StatsBand />
        <SecuritySection />
      </main>
      <Footer />
    </div>
  );
}
