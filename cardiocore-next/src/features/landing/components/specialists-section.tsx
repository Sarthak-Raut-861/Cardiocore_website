"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCTORS, Doctor } from "@/features/landing/data/doctors-data";

export const SpecialistsSection: React.FC = () => {
  const [filter, setFilter] = useState<"All" | "In-person" | "Video">("All");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingSlot, setBookingSlot] = useState("Tomorrow · 10:30 AM");
  const [bookingMode, setBookingMode] = useState<"Video" | "In-person">("Video");
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const filteredDoctors = DOCTORS.filter((doc) => {
    if (filter === "All") return true;
    if (filter === "In-person") return doc.mode === "In-person" || doc.mode === "Both";
    if (filter === "Video") return doc.mode === "Video" || doc.mode === "Both";
    return true;
  });

  const handleOpenBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setBookingSlot(doc.when);
    setBookingMode(doc.mode === "In-person" ? "In-person" : "Video");
    setBookingSuccess(null);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setBookingSuccess(
      `Confirmed ${bookingMode} consultation with ${selectedDoctor.name} for ${bookingSlot}.`
    );
    setTimeout(() => {
      setSelectedDoctor(null);
      setBookingSuccess(null);
    }, 1800);
  };

  return (
    <section
      id="specialists"
      className="py-20 bg-[var(--surface-2)]/60 border-y border-[var(--border)] scroll-mt-24"
    >
      <div id="doctors" className="scroll-mt-24" />
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <Badge variant="teal" size="sm" className="mb-3">
              Verified Medical Network
            </Badge>
            <h2 className="h1 text-[var(--hi)]">
              Consult Board-Certified Cardiologists
            </h2>
            <p className="lead text-[var(--mid)] mt-2 max-w-xl">
              Connect directly with electrophysiologists and heart failure specialists for remote telemetry review and urgent consultations.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface)] p-1.5 rounded-2xl border border-[var(--border)] self-start md:self-auto">
            {(["All", "Video", "In-person"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  filter === mode
                    ? "bg-[var(--teal)] text-white shadow-sm"
                    : "text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)]"
                }`}
              >
                {mode === "All" ? "All Specialists" : mode === "Video" ? "Video Consult" : "In-Person"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredDoctors.map((doc) => (
            <Card key={doc.id} variant="hover" className="flex flex-col justify-between h-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-sm shrink-0 ${doc.avatarClass}`}
                    >
                      {doc.initials}
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.name}</CardTitle>
                      <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                        {doc.specialty}
                      </p>
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--amber)] bg-[var(--amber-soft)] px-2.5 py-1 rounded-lg shrink-0"
                    aria-label={`Rated ${doc.rating} out of 5 stars`}
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{doc.rating}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                <div className="text-xs text-[var(--mid)] space-y-2 pt-3 border-t border-[var(--border)]/60">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{doc.hospital}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Next slot: <strong className="text-[var(--hi)]">{doc.when}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/50">
                  <Badge
                    variant={doc.mode === "Video" ? "purple" : doc.mode === "In-person" ? "teal" : "cyan"}
                    size="sm"
                  >
                    {doc.mode}
                  </Badge>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenBooking(doc)}
                    className="text-xs font-semibold"
                  >
                    Book Consultation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--hi)]">Book Consultation</h3>
                <p className="text-xs text-[var(--muted)]">
                  {selectedDoctor.name} · {selectedDoctor.specialty}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                aria-label="Close booking modal"
                className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-4 rounded-2xl bg-[var(--green-soft)] text-[var(--green)] text-sm font-semibold">
                ✓ {bookingSuccess}
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--mid)] mb-1.5">
                    Consultation Mode
                  </label>
                  <select
                    value={bookingMode}
                    onChange={(e) => setBookingMode(e.target.value as "Video" | "In-person")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--hi)]"
                  >
                    <option value="Video">Video Consultation (Encrypted Telemetry Link)</option>
                    <option value="In-person">In-Person Clinic Visit ({selectedDoctor.hospital})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--mid)] mb-1.5">
                    Preferred Slot
                  </label>
                  <input
                    type="text"
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--hi)]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Confirm Appointment
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
