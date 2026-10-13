"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DOCTORS, Doctor } from "../data/doctors-data";

export const SpecialistsSection: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "video" | "inperson">("all");

  const filteredDoctors = DOCTORS.filter((doc) => {
    if (filter === "video") return doc.mode === "Video" || doc.mode === "Both";
    if (filter === "inperson") return doc.mode === "In-person" || doc.mode === "Both";
    return true;
  });

  return (
    <section
      id="doctors"
      className="py-20 scroll-mt-16 bg-gradient-to-b from-[var(--bg)] via-[var(--surface-2)]/40 to-[var(--bg)]"
    >
      <Container>
        {/* Section Heading */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3">
            Care Network
          </div>
          <h2 className="h1 text-[var(--hi)] mb-4">
            Cardiologists on the same record.
          </h2>
          <p className="lead text-[var(--mid)]">
            Book in-person or video consultations. Your baseline summary, vitals, and
            ECG strips travel ahead with your consent.
          </p>
        </div>

        {/* Filter Controls & Doctor Count */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              All Specialists
            </button>
            <button
              onClick={() => setFilter("video")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "video"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              Video Consult
            </button>
            <button
              onClick={() => setFilter("inperson")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "inperson"
                  ? "bg-[var(--teal)] text-white shadow-[var(--sh-1)]"
                  : "bg-[var(--surface)] text-[var(--mid)] border border-[var(--border)] hover:bg-[var(--tint)]"
              }`}
            >
              In-Person
            </button>
          </div>

          <span className="text-xs font-mono text-[var(--muted)]">
            Showing {filteredDoctors.length} specialist
            {filteredDoctors.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Specialists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12">
          {filteredDoctors.map((doc: Doctor) => (
            <Card
              key={doc.id}
              variant="interactive"
              className="p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Doctor Initials Avatar */}
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${doc.avatarClass}`}
                >
                  {doc.initials}
                </div>

                {/* Details */}
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--hi)] truncate">
                      {doc.name}
                    </span>
                    <span className="text-xs text-[var(--amber)] font-bold">
                      &starf; {doc.rating}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--mid)] truncate mt-0.5">
                    {doc.specialty}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] truncate">
                    {doc.hospital}
                  </span>
                </div>
              </div>

              {/* Slot & Action */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <Badge variant="neutral" size="sm" className="mb-1.5">
                  {doc.when}
                </Badge>
                <span className="text-[10px] text-[var(--muted)] font-mono mb-2">
                  {doc.mode}
                </span>
                <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                  Book
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4">
          <Link href="/login?role=patient">
            <Button variant="primary" size="lg" className="mb-3">
              Sign in to book consultation
            </Button>
          </Link>
          <p className="text-xs text-[var(--muted)]">
            Are you a cardiologist?{" "}
            <Link
              href="/login?role=doctor"
              className="text-[var(--teal-700)] dark:text-[var(--teal)] font-bold hover:underline"
            >
              Open clinician portal &rarr;
            </Link>
          </p>
        </div>
      </Container>
    </section>
  );
};
