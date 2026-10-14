"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DOCTORS, Doctor } from "../data/doctors-data";
import { useCardioCoreSync } from "@/lib/sync/cardiocore-sync";

export const SpecialistsSection: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "video" | "inperson">("all");
  const { addAppointment } = useCardioCoreSync();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [slotInput, setSlotInput] = useState<string>("");
  const [modeInput, setModeInput] = useState<string>("Video");
  const [bookedMsg, setBookedMsg] = useState<string | null>(null);

  const filteredDoctors = DOCTORS.filter((doc) => {
    if (filter === "video") return doc.mode === "Video" || doc.mode === "Both";
    if (filter === "inperson") return doc.mode === "In-person" || doc.mode === "Both";
    return true;
  });

  const openBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setSlotInput(doc.when);
    setModeInput(doc.mode === "In-person" ? "In-person" : "Video");
    setBookedMsg(null);
  };

  return (
    <section
      id="doctors"
      className="py-20 scroll-mt-24 bg-gradient-to-b from-[var(--bg)] via-[var(--surface-2)]/40 to-[var(--bg)]"
    >
      <div id="specialists" className="scroll-mt-24" />
      <Container>
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)] mb-3">
            Care Network
          </div>
          <h2 className="h1 text-[var(--hi)] mb-4">
            Cardiologists on the same record.
          </h2>
          <p className="lead text-[var(--mid)]">
            Book in-person or video consultations. Your 72-factor baseline summary, vitals, and
            ECG strips travel ahead with your consent.
          </p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12">
          {filteredDoctors.map((doc: Doctor) => (
            <Card
              key={doc.id}
              variant="interactive"
              className="p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${doc.avatarClass}`}
                >
                  {doc.initials}
                </div>

                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--hi)] truncate">
                      {doc.name}
                    </span>
                    <span className="text-xs text-[var(--amber)] font-bold">
                      ★ {doc.rating}
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

              <div className="flex flex-col items-end shrink-0 pl-2">
                <Badge variant="neutral" size="sm" className="mb-1.5">
                  {doc.when}
                </Badge>
                <span className="text-[10px] text-[var(--muted)] font-mono mb-2">
                  {doc.mode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 px-3"
                  onClick={() => openBooking(doc)}
                >
                  Book
                </Button>
              </div>
            </Card>
          ))}
        </div>

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

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                  Book Consultation · {selectedDoctor.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {selectedDoctor.specialty} · {selectedDoctor.hospital}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                ✕
              </button>
            </div>

            {bookedMsg ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--green-soft)] p-4 text-xs font-semibold text-[var(--green)]">
                  ✓ {bookedMsg}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                    Close
                  </Button>
                  <Link href="/patient">
                    <Button variant="primary" size="sm">
                      Open Patient Portal &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addAppointment({
                    doctorName: selectedDoctor.name,
                    doctorInitials: selectedDoctor.initials,
                    specialty: selectedDoctor.specialty.split("·")[0].trim(),
                    institution: selectedDoctor.hospital.split("·")[0].trim(),
                    datetime: slotInput,
                    type: modeInput === "Video" ? "Video Consult" : "In-person",
                    room: modeInput === "Video" ? "Encrypted WebRTC Room" : "Clinic Room 2B",
                    patientName: "Aarav Menon",
                    reason: "72-Factor Digital Twin & 250 Hz ECG review",
                  });
                  setBookedMsg(
                    `Confirmed ${modeInput} appointment with ${selectedDoctor.name} for ${slotInput}. Your 72-Factor Digital Twin baseline and recent 250 Hz ECG strips have been attached.`
                  );
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Consultation Mode</label>
                  <select
                    value={modeInput}
                    onChange={(e) => setModeInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  >
                    <option value="Video">Video Consult (Encrypted WebRTC + Live ECG Share)</option>
                    <option value="In-person">In-Person Visit ({selectedDoctor.hospital})</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Preferred Slot</label>
                  <input
                    value={slotInput}
                    onChange={(e) => setSlotInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Confirm Booking
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
