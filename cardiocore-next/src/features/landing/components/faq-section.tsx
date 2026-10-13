"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FAQ_ITEMS } from "../data/faq-data";

export const FaqSection: React.FC = () => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    "faq-1": true,
  });

  const toggle = (id: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section
      id="faq"
      className="py-20 scroll-mt-16 bg-gradient-to-b from-[var(--bg)] via-[var(--surface-2)]/50 to-[var(--bg)]"
    >
      <Container size="sm">
        {/* Section Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3">
            Questions
          </div>
          <h2 className="h1 text-[var(--hi)]">Common questions</h2>
        </div>

        {/* FAQ Accordion Items */}
        <div className="space-y-4 mb-16">
          {FAQ_ITEMS.map((item) => {
            const isOpen = !!openMap[item.id];
            return (
              <Card
                key={item.id}
                variant="default"
                className="p-0 overflow-hidden transition-colors"
              >
                <div className="group">
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center justify-between p-5 font-bold text-sm sm:text-base text-left text-[var(--hi)] select-none hover:text-[var(--teal-700)] dark:hover:text-[var(--teal)] transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span
                      className={`w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 ml-3 text-[var(--mid)] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        width="12"
                        height="12"
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
                    <div className="px-5 pb-5 text-sm text-[var(--mid)] leading-relaxed border-t border-[var(--border)] pt-4 animate-in fade-in duration-150">
                      {item.answer}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Ready to Explore CTA Box */}
        <div className="text-center p-8 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-2)]">
          <h3 className="h2 text-[var(--hi)] mb-3">Ready to explore CardioCore?</h3>
          <p className="text-sm text-[var(--mid)] mb-6 max-w-md mx-auto">
            Take control of your personal cardiac baseline or join as a verified clinician.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?role=patient">
              <Button variant="primary" size="lg">
                Patient sign in
              </Button>
            </Link>
            <Link href="/login?role=doctor">
              <Button variant="outline" size="lg">
                Clinician portal
              </Button>
            </Link>
            <Button variant="ghost" size="lg">
              Read our story
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};
