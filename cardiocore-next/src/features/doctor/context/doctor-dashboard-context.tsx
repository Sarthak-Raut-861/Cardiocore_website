"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { SAMPLE_DOCTOR, DoctorProfile } from "../data/sample-doctor";
import { SAMPLE_ROSTER_PATIENTS, RosterPatient } from "../data/sample-roster";

export type DoctorViewId =
  | "roster"
  | "appts"
  | "patients"
  | "review"
  | "messages"
  | "analytics"
  | "schedule"
  | "dprofile"
  | "handover";

export type CohortFilterId = "all" | "highrisk" | "newconsent" | "adherence" | "baseline";

interface DoctorDashboardContextValue {
  activeView: DoctorViewId;
  setActiveView: (view: DoctorViewId) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedPatient: RosterPatient | null;
  cohortFilter: CohortFilterId;
  setCohortFilter: (cohort: CohortFilterId) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredPatients: RosterPatient[];
  doctor: DoctorProfile;
  units: "si" | "conv";
  setUnits: (u: "si" | "conv") => void;
  toastMessage: string | null;
  toastType: "ok" | "warn" | "info";
  showToast: (msg: string, type?: "ok" | "warn" | "info") => void;
}

const DoctorDashboardContext = createContext<DoctorDashboardContextValue | null>(null);

export function DoctorDashboardProvider({
  children,
  initialView = "roster",
}: {
  children: React.ReactNode;
  initialView?: DoctorViewId;
}) {
  const [activeView, setActiveView] = useState<DoctorViewId>(initialView);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [cohortFilter, setCohortFilter] = useState<CohortFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [units, setUnits] = useState<"si" | "conv">("si");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"ok" | "warn" | "info">("ok");

  const showToast = useCallback((msg: string, type: "ok" | "warn" | "info" = "ok") => {
    setToastMessage(msg);
    setToastType(type);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return SAMPLE_ROSTER_PATIENTS.find((p) => p.id === selectedPatientId) || null;
  }, [selectedPatientId]);

  const filteredPatients = useMemo(() => {
    return SAMPLE_ROSTER_PATIENTS.filter((p) => {
      // Cohort match
      if (cohortFilter !== "all" && !p.cohortTags.includes(cohortFilter)) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchMrn = p.mrn.toLowerCase().includes(query);
        const matchCond = p.conditions.some((c) => c.toLowerCase().includes(query));
        if (!matchName && !matchMrn && !matchCond) return false;
      }
      return true;
    });
  }, [cohortFilter, searchQuery]);

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      selectedPatientId,
      setSelectedPatientId,
      selectedPatient,
      cohortFilter,
      setCohortFilter,
      searchQuery,
      setSearchQuery,
      filteredPatients,
      doctor: SAMPLE_DOCTOR,
      units,
      setUnits,
      toastMessage,
      toastType,
      showToast,
    }),
    [
      activeView,
      selectedPatientId,
      selectedPatient,
      cohortFilter,
      searchQuery,
      filteredPatients,
      units,
      toastMessage,
      toastType,
      showToast,
    ]
  );

  return (
    <DoctorDashboardContext.Provider value={value}>
      {children}
    </DoctorDashboardContext.Provider>
  );
}

export function useDoctorDashboard() {
  const context = useContext(DoctorDashboardContext);
  if (!context) {
    throw new Error("useDoctorDashboard must be used within a DoctorDashboardProvider");
  }
  return context;
}
