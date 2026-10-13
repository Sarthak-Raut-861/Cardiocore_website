"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useDoctorDashboard,
  DoctorViewId,
} from "../context/doctor-dashboard-context";
import { DoctorRosterView } from "./doctor-roster-view";
import { DoctorApptsView } from "./doctor-appts-view";
import { DoctorPatientsView } from "./doctor-patients-view";
import { DoctorReviewView } from "./doctor-review-view";
import { DoctorMessagesView } from "./doctor-messages-view";
import { DoctorAnalyticsView } from "./doctor-analytics-view";
import { DoctorScheduleView } from "./doctor-schedule-view";
import { DoctorProfileView } from "./doctor-profile-view";
import { DoctorHandoverView } from "./doctor-handover-view";
import { DoctorPatientModal } from "./doctor-patient-modal";

interface NavItem {
  id: DoctorViewId;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

export function DoctorShell() {
  const {
    activeView,
    setActiveView,
    doctor,
    units,
    setUnits,
    toastMessage,
    toastType,
    showToast,
    searchQuery,
    setSearchQuery,
    selectedPatientId,
  } = useDoctorDashboard();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_ITEMS: NavItem[] = [
    {
      id: "roster",
      label: "Clinical Queue",
      badge: "1 Urgent",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "appts",
      label: "Appointments",
      badge: "4 Today",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "patients",
      label: "Patients Directory",
      badge: "128",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "review",
      label: "ECG Review Lab",
      badge: "3 Pending",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "messages",
      label: "Messages",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Practice Analytics",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "schedule",
      label: "Availability & Rules",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "dprofile",
      label: "Profile & Audit",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "handover",
      label: "Handover & Referral",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const handleNavClick = (viewId: DoctorViewId) => {
    setActiveView(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-navy-950 text-foreground flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Prominent Demonstration Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-navy-900 to-cyan-950 border-b border-cyan-500/30 px-4 py-2 text-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-cyan-200">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase tracking-wider border border-cyan-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Demonstration Environment
        </span>
        <span className="text-muted-foreground">
          Simulated clinical decision support prototype · All patients, MRNs, ECG strips, and consent states are synthetic demo fixtures · No live EMR or hospital connection.
        </span>
      </div>

      {/* Main Body with Sidebar + Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-navy-900/60 backdrop-blur-md p-4 shrink-0 justify-between">
          <div className="space-y-6">
            {/* Brand Logo & Back link */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold font-sora">
                  CC
                </div>
                <div>
                  <div className="text-sm font-bold font-sora tracking-tight text-foreground group-hover:text-cyan-300 transition-colors">
                    CardioCore<span className="text-cyan-400">Edge</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Clinician Portal</div>
                </div>
              </Link>
            </div>

            {/* Doctor Persona Info Card */}
            <div className="p-3 rounded-xl bg-surface-2/40 border border-border/40 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-xs font-sora shrink-0">
                  {doctor.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {doctor.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {doctor.specialty}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono text-cyan-400/90 pt-1 border-t border-border/30">
                {doctor.registrationNumber} · {doctor.institution}
              </div>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                Clinical Modules
              </div>
              {NAV_ITEMS.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-cyan-400" : "text-muted-foreground"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          item.badge.includes("Urgent")
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-surface-2 text-muted-foreground border border-border/40"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick links & Sign out */}
          <div className="pt-4 border-t border-border/40 space-y-2">
            <Link
              href="/patient"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-cyan-300 rounded-lg border border-border/40 hover:border-cyan-500/30 transition-colors"
            >
              <span>Switch to Patient Demo</span>
              <span>→</span>
            </Link>
            <Link
              href="/login?role=doctor"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
            >
              <span>Sign out</span>
            </Link>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-navy-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
              CC
            </div>
            <span className="text-sm font-bold font-sora">
              CardioCore<span className="text-cyan-400">Edge</span> Clinician
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border/60"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-navy-900 border-b border-border/50 p-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                  activeView === item.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar (Search, Units, Notifications) */}
          <header className="h-14 border-b border-border/40 bg-navy-900/30 backdrop-blur-md px-6 flex items-center justify-between gap-4">
            {/* Quick Filter/Search input */}
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="Quick search across patient roster, MRN, or ECG rhythm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (activeView !== "patients" && activeView !== "roster") {
                    setActiveView("roster");
                  }
                }}
                className="w-full px-3 py-1.5 pl-8 text-xs bg-surface-2/60 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cyan-500/50"
              />
              <svg
                className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Right Tools (Unit toggle, alerts indicator) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-surface-2/60 border border-border/50 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setUnits("si")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    units === "si"
                      ? "bg-cyan-500 text-navy-950 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  SI
                </button>
                <button
                  type="button"
                  onClick={() => setUnits("conv")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    units === "conv"
                      ? "bg-cyan-500 text-navy-950 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Conv
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  showToast(
                    "All clinical notifications delivered to demonstration session. No push alerts dispatched.",
                    "info"
                  )
                }
                className="relative p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-white/5 cursor-pointer"
                aria-label="Notifications"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1" />
              </button>
            </div>
          </header>

          {/* Active View Container */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {activeView === "roster" && <DoctorRosterView />}
            {activeView === "appts" && <DoctorApptsView />}
            {activeView === "patients" && <DoctorPatientsView />}
            {activeView === "review" && <DoctorReviewView />}
            {activeView === "messages" && <DoctorMessagesView />}
            {activeView === "analytics" && <DoctorAnalyticsView />}
            {activeView === "schedule" && <DoctorScheduleView />}
            {activeView === "dprofile" && <DoctorProfileView />}
            {activeView === "handover" && <DoctorHandoverView />}
          </main>

          {/* Non-Diagnostic Disclaimer Footer */}
          <footer className="border-t border-border/40 bg-navy-950/80 px-6 py-4 text-center text-xs text-muted-foreground">
            <p className="max-w-4xl mx-auto leading-relaxed">
              <strong className="text-foreground">Clinical Demonstration Disclaimer:</strong> CardioCoreEdge is an investigational clinical decision-support prototype. It does not provide automated diagnostic validation or real-time emergency triage. Telemetry waveforms and patient risk strata are synthetic illustrative fixtures. Treatment decisions remain the clinical responsibility of the attending physician.
            </p>
          </footer>
        </div>
      </div>

      {/* Patient Detail Modal (if a patient is clicked) */}
      {selectedPatientId && <DoctorPatientModal />}

      {/* Demonstration Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp max-w-md">
          <div
            className={`p-3.5 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
              toastType === "ok"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
                : toastType === "warn"
                ? "bg-amber-950/90 border-amber-500/50 text-amber-200"
                : "bg-cyan-950/90 border-cyan-500/50 text-cyan-200"
            }`}
          >
            <div className="text-xs font-semibold leading-relaxed flex-1">
              {toastMessage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
