/**
 * CardioCoreEdge — Demonstrative Patient Profile Data
 * 
 * IMPORTANT: This data is strictly demonstrative and isolated for previewing the
 * reconstructed patient dashboard in Phase 4. It does not represent live clinical
 * records, real patients, or verified sensor transmissions.
 */

export interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  email?: string;
  age: number;
  dob: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bloodGroup: string;
  monitoredDays: number;
  memberSince: string;
  wearableBattery: number;
  wearableModel: string;
  firmwareVersion: string;
  syncInterval: string;
  twinStatus: {
    stateIndex: number;
    status: "Stable" | "Attention" | "Urgent";
    confidence: number;
    modelVersion: string;
    baselineDays: number;
    beatsProcessed: string;
    ecgStripsCount: number;
    recalibrationsCount: number;
    activeMedsCount: number;
  };
}

export interface VitalOverview {
  restingHr: number;
  baselineHr: number;
  hrv: number;
  baselineHrv: number;
  spo2: number;
  baselineSpo2: number;
  skinTemp: number;
  baselineTemp: number;
}

export interface PatientAppointment {
  id: string;
  doctorName: string;
  doctorInitials: string;
  specialty: string;
  institution: string;
  datetime: string;
  type: string;
  room: string;
  status: "Confirmed" | "Completed" | "Pending";
  bookingRef: string;
}

export interface PatientAlert {
  id: string;
  level: 1 | 2 | 3;
  levelLabel: string;
  title: string;
  time: string;
  category: "Attention" | "Urgent" | "Informational" | "Device";
  description: string;
  details?: string;
  read: boolean;
}

export interface PatientMedication {
  id: string;
  name: string;
  dose: string;
  schedule: "morning" | "evening" | "night";
  timeLabel: string;
  taken: boolean;
  takenAt?: string;
  instructions: string;
}

export interface LipidMarker {
  marker: string;
  value: number;
  unit: string;
  target: string;
  status: "desirable" | "borderline" | "above target";
  trend: string;
  delta: string;
}

export const SAMPLE_PATIENT: PatientProfile = {
  id: "CC-DEMO-9821",
  name: "Aarav Menon",
  initials: "AM",
  age: 44,
  dob: "14 Mar 1982",
  gender: "Male",
  heightCm: 176,
  weightKg: 78,
  bmi: 25.2,
  bloodGroup: "B+",
  monitoredDays: 138,
  memberSince: "Mar 2024",
  wearableBattery: 78,
  wearableModel: "CardioCore Band 2",
  firmwareVersion: "fw 2.4.1",
  syncInterval: "every 15 minutes",
  twinStatus: {
    stateIndex: 82,
    status: "Stable",
    confidence: 0.91,
    modelVersion: "v4.2 (Personal Baseline)",
    baselineDays: 90,
    beatsProcessed: "1.42 M",
    ecgStripsCount: 124,
    recalibrationsCount: 3,
    activeMedsCount: 3,
  },
};

export const SAMPLE_VITALS: VitalOverview = {
  restingHr: 68,
  baselineHr: 69,
  hrv: 48,
  baselineHrv: 52,
  spo2: 98,
  baselineSpo2: 98,
  skinTemp: 36.6,
  baselineTemp: 36.5,
};

export const SAMPLE_APPOINTMENTS: PatientAppointment[] = [
  {
    id: "apt-01",
    doctorName: "Dr Neha Raghavan",
    doctorInitials: "NR",
    specialty: "Interventional Cardiology",
    institution: "Meridian Heart Institute",
    datetime: "Tue 6 Oct 2026 · 10:30",
    type: "In-person consultation",
    room: "Room 4B",
    status: "Confirmed",
    bookingRef: "CC-48120",
  },
  {
    id: "apt-02",
    doctorName: "Dr Neha Raghavan",
    doctorInitials: "NR",
    specialty: "Interventional Cardiology",
    institution: "Meridian Heart Institute",
    datetime: "12 Jun 2026 · 11:00",
    type: "Routine cardiology review",
    room: "Room 4B",
    status: "Completed",
    bookingRef: "CC-39042",
  },
];

export const SAMPLE_ALERTS: PatientAlert[] = [
  {
    id: "alt-01",
    level: 3,
    levelLabel: "Level 3 · Urgent (Sample)",
    title: "Urgent pattern detected — 28 Sep, 11:24",
    time: "28 Sep, 11:24",
    category: "Urgent",
    description: "HR 138 at rest (baseline 72), HRV 19 ms (baseline 52), SpO₂ 94%. Signal quality verified good; persisted 9 minutes at rest; motion ruled out. Assessment concluded after clinical review.",
    read: false,
  },
  {
    id: "alt-02",
    level: 2,
    levelLabel: "Level 2 · Attention",
    title: "HRV below usual range",
    time: "Today 08:02",
    category: "Attention",
    description: "Your HRV averaged 48 ms over the last 48 hours (personal baseline 52 ms). Associated with shortened sleep. Consider medical review if it persists.",
    read: false,
  },
  {
    id: "alt-03",
    level: 2,
    levelLabel: "Level 2 · Attention",
    title: "Resting HR above usual range",
    time: "Today",
    category: "Attention",
    description: "Your resting heart rate has stayed slightly above your usual range for two days — 76 BPM against a baseline of 69 BPM. No arrhythmia pattern detected.",
    read: false,
  },
  {
    id: "alt-04",
    level: 1,
    levelLabel: "Level 1 · Informational",
    title: "Back within baseline",
    time: "Yesterday",
    category: "Informational",
    description: "Cardiovascular state returned to baseline after yesterday's evening walk. No action needed.",
    read: true,
  },
  {
    id: "alt-05",
    level: 1,
    levelLabel: "Level 1 · Informational",
    title: "Signal quality too low",
    time: "2 days ago",
    category: "Device",
    description: "A 4-minute measurement period was excluded due to loose band contact. No clinical inference was made.",
    read: true,
  },
];

export const SAMPLE_MEDICATIONS: PatientMedication[] = [
  {
    id: "med-01",
    name: "Ramipril",
    dose: "5 mg",
    schedule: "morning",
    timeLabel: "taken 07:10",
    taken: true,
    takenAt: "07:10",
    instructions: "Once daily in the morning with water. For blood pressure control.",
  },
  {
    id: "med-02",
    name: "Metformin",
    dose: "500 mg",
    schedule: "morning",
    timeLabel: "taken 07:40",
    taken: true,
    takenAt: "07:40",
    instructions: "With breakfast. For glycaemic regulation.",
  },
  {
    id: "med-03",
    name: "Metformin",
    dose: "500 mg",
    schedule: "evening",
    timeLabel: "due 19:30",
    taken: false,
    instructions: "With evening dinner. For glycaemic regulation.",
  },
  {
    id: "med-04",
    name: "Atorvastatin",
    dose: "20 mg",
    schedule: "night",
    timeLabel: "due 21:00",
    taken: false,
    instructions: "At bedtime. For lipid management.",
  },
];

export const SAMPLE_LIPIDS: LipidMarker[] = [
  { marker: "Total cholesterol", value: 192, unit: "mg/dL", target: "desirable < 200", status: "desirable", trend: "down", delta: "↓ 6" },
  { marker: "LDL cholesterol", value: 112, unit: "mg/dL", target: "target < 100", status: "above target", trend: "up", delta: "↑ 4" },
  { marker: "HDL cholesterol", value: 46, unit: "mg/dL", target: "adequate > 40", status: "desirable", trend: "steady", delta: "no change" },
  { marker: "Triglycerides", value: 168, unit: "mg/dL", target: "borderline < 150", status: "borderline", trend: "up", delta: "↑ 12" },
  { marker: "VLDL", value: 34, unit: "mg/dL", target: "reference 2–30", status: "borderline", trend: "steady", delta: "—" },
];

export const SAMPLE_MEDICAL_CONDITIONS = [
  { condition: "Hypertension", diagnosed: "2019", note: "Controlled with Ramipril 5mg" },
  { condition: "Type 2 Diabetes", diagnosed: "2021", note: "HbA1c 6.8% at last review" },
];

export const SAMPLE_FAMILY_HISTORY = [
  { relation: "Father", initials: "Fa", color: "cyan", details: "Coronary artery disease at 58 · hypertension · high LDL" },
  { relation: "Mother", initials: "Mo", color: "violet", details: "Type 2 diabetes · no known cardiovascular events" },
  { relation: "Sibling", initials: "Si", color: "neutral", details: "Not yet documented in family history" },
];
