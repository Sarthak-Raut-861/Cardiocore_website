/**
 * CardioCoreEdge — Demonstrative Clinician Profile Data
 * 
 * IMPORTANT: This profile is strictly demonstrative for the Phase 5 Doctor Dashboard
 * reconstruction. It does not represent an authenticated clinician session or verified
 * medical credentials.
 */

export interface DoctorProfile {
  id: string;
  name: string;
  initials: string;
  degrees: string;
  specialty: string;
  experienceYears: number;
  medicalCouncil: string;
  registrationNumber: string;
  institution: string;
  consentedPatientsCount: number;
  activeTriageCount: number;
  pendingReviewsCount: number;
}

export const SAMPLE_DOCTOR: DoctorProfile = {
  id: "DOC-DEMO-4482",
  name: "Dr Neha Raghavan",
  initials: "NR",
  degrees: "MD, DM Cardiology",
  specialty: "Interventional Cardiology",
  experienceYears: 14,
  medicalCouncil: "Maharashtra Medical Council",
  registrationNumber: "MMC-2010-44821",
  institution: "Meridian Heart Institute",
  consentedPatientsCount: 128,
  activeTriageCount: 6,
  pendingReviewsCount: 3,
};
