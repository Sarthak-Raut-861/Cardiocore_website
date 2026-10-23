"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { useCardioCoreSync, SyncedAppointment } from "@/lib/sync/cardiocore-sync";
import { DOCTORS } from "@/features/landing/data/doctors-data";

export function PatientApptsView() {
  const { showToast, twinState } = usePatientDashboard();
  const { shared, addAppointment, updateAppointmentStatus } = useCardioCoreSync();

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(DOCTORS[0].id);
  const [slotInput, setSlotInput] = useState("Tomorrow · 11:00");
  const [modeInput, setModeInput] = useState("Video Consult");
  const [reasonInput, setReasonInput] = useState("72-Factor Digital Twin & 250 Hz ECG review");

  const [activeVideoApt, setActiveVideoApt] = useState<SyncedAppointment | null>(null);
  const [manageApt, setManageApt] = useState<SyncedAppointment | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState("");

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = DOCTORS.find((d) => d.id === selectedDocId) || DOCTORS[0];
    const created = addAppointment({
      doctorName: doc.name,
      doctorInitials: doc.initials,
      specialty: doc.specialty.split("·")[0].trim(),
      institution: doc.hospital.split("·")[0].trim(),
      datetime: slotInput,
      type: modeInput,
      room: modeInput === "Video Consult" ? "Encrypted WebRTC Room" : "Clinic Room 3A",
      patientName: "Aarav Menon",
      reason: reasonInput,
    });
    setBookModalOpen(false);
    showToast(`Booked ${created.type} with ${created.doctorName} (${created.bookingRef}). Synced to Clinician Portal.`, "ok");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            Live Cross-Portal Scheduling Sync Active
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            Clinical consultations
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)]">
            Scheduled clinical appointments, encrypted video rooms, and real-time synchronization with the Clinician Portal.
          </p>
        </div>
        <button
          onClick={() => setBookModalOpen(true)}
          className="rounded-xl bg-[var(--teal)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all"
        >
          + Book new consultation
        </button>
      </div>

      <div className="space-y-4">
        {shared.appointments.map((apt) => (
          <div
            key={apt.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] transition-all hover:border-[var(--teal)]/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal-soft)] font-heading text-lg font-bold text-[var(--teal-700)] shrink-0">
                  {apt.doctorInitials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                      {apt.doctorName}
                    </h3>
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-semibold ${
                        apt.status === "Confirmed"
                          ? "bg-[var(--green-soft)] text-[var(--green)]"
                          : apt.status === "Rescheduled"
                          ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                          : "bg-[var(--tint)] text-[var(--mid)]"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mid)] mt-0.5">
                    {apt.specialty} · {apt.institution}
                  </p>
                  {apt.reason && (
                    <p className="text-xs text-[var(--teal-700)] font-medium mt-1">
                      Reason: {apt.reason}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--hi)] font-medium">
                    <span className="flex items-center gap-1.5">
                      📅 {apt.datetime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      🏥 {apt.type} · {apt.room}
                    </span>
                    <span className="text-[var(--muted)] font-mono text-[11px]">
                      Ref: {apt.bookingRef}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                {apt.status !== "Completed" ? (
                  <>
                    <button
                      onClick={() => setActiveVideoApt(apt)}
                      className="rounded-xl bg-[var(--teal)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
                    >
                      Join video
                    </button>
                    <button
                      onClick={() => {
                        setManageApt(apt);
                        setRescheduleSlot(apt.datetime);
                      }}
                      className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
                    >
                      Manage
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => showToast(`Clinical summary for ${apt.bookingRef} downloaded.`, "ok")}
                    className="rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
                  >
                    View clinical notes
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)] flex flex-wrap items-center justify-between gap-2">
              <span>
                Shared data scope: 72-Factor Twin Index (<strong>{twinState.score}</strong> · {twinState.cvdRiskPct} risk) and{" "}
                <strong>{shared.ecgStrips.length}</strong> recent 250 Hz ECG strip(s) attached.
              </span>
              <span className="font-mono text-[11px] text-[var(--teal-700)]">Synced with Clinician Roster</span>
            </div>
          </div>
        ))}
      </div>

      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--hi)]">Book New Consultation</h3>
                <p className="text-xs text-[var(--muted)]">Syncs immediately to your Appointments &amp; Clinician Portal</p>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBookSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--mid)] mb-1">Select Cardiologist</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                >
                  {DOCTORS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty} (★ {d.rating})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Mode</label>
                  <select
                    value={modeInput}
                    onChange={(e) => setModeInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  >
                    <option value="Video Consult">Video Consult</option>
                    <option value="In-person">In-Person Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--mid)] mb-1">Preferred Date &amp; Time</label>
                  <input
                    value={slotInput}
                    onChange={(e) => setSlotInput(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[var(--mid)] mb-1">Clinical Reason / Notes</label>
                <input
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--teal)] px-4 py-2 font-semibold text-white"
                >
                  Confirm &amp; Sync Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeVideoApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--green)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-ping" />
                  ENCRYPTED WEBRTC TELE-CARDIOLOGY ROOM
                </span>
                <h3 className="font-heading text-base font-bold text-[var(--hi)] mt-1">
                  {activeVideoApt.doctorName} · {activeVideoApt.institution}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoApt(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)]"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-[#06181A] text-white p-5 space-y-3 border border-teal-500/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-teal-300">LIVE 250 HZ TELEMETRY STREAMING TO CLINICIAN</span>
                <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-bold text-teal-200">
                  AES-256-GCM Verified
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">72-Factor Twin Index</span>
                  <strong className="text-sm">{twinState.score} ({twinState.statusText})</strong>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">10-Yr CVD Risk</span>
                  <strong className="text-sm">{twinState.cvdRiskPct}</strong>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5">
                  <span className="text-teal-200/70 block text-[10px]">Shared ECG Strips</span>
                  <strong className="text-sm">{shared.ecgStrips.length} Verified</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  updateAppointmentStatus(activeVideoApt.id, "Completed");
                  setActiveVideoApt(null);
                  showToast("Consultation marked as Completed and synced to records.", "ok");
                }}
                className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)] hover:bg-[var(--tint)]"
              >
                Complete Session
              </button>
              <button
                type="button"
                onClick={() => setActiveVideoApt(null)}
                className="rounded-xl bg-[var(--red)] px-4 py-2 font-semibold text-white"
              >
                Leave Video Room
              </button>
            </div>
          </div>
        </div>
      )}

      {manageApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-heading text-base font-bold text-[var(--hi)]">
                Manage Appointment · {manageApt.bookingRef}
              </h3>
              <button
                type="button"
                onClick={() => setManageApt(null)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--tint)]"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="block font-semibold text-[var(--mid)] mb-1">Reschedule Date &amp; Time</label>
              <input
                value={rescheduleSlot}
                onChange={(e) => setRescheduleSlot(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--hi)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManageApt(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateAppointmentStatus(manageApt.id, "Rescheduled", rescheduleSlot);
                  setManageApt(null);
                  showToast("Appointment rescheduled and synced to Clinician Portal.", "ok");
                }}
                className="rounded-xl bg-[var(--teal)] px-4 py-2 font-semibold text-white"
              >
                Save New Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
