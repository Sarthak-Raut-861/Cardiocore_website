/**
 * CardioCoreEdge — Demonstrative Clinician Roster & Patient Cases
 * 
 * All patient entries, MRNs, physiological parameters, and consent records
 * are synthetic and isolated for the Phase 5 Doctor Dashboard prototype.
 */

export interface RosterPatient {
  id: string;
  mrn: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  level: "Urgent" | "Attention" | "Stable" | "New consent";
  levelCode: "L3" | "L2" | "L1" | "NEW";
  primarySignal: string;
  baselineDelta: string;
  persistence: string;
  signalQuality: string;
  qualityScore: number;
  lastSync: string;
  conditions: string[];
  adherencePct: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  ldlMgDl: number | null;
  consentStatus: "active" | "expiring" | "building";
  consentDetail: string;
  lastReviewDate: string;
  cohortTags: string[];
  clinicalSummary: string;
  vitals: {
    hr: number;
    baselineHr: number;
    hrv: number;
    baselineHrv: number;
    spo2: number;
    temp: number;
  };
}

export const SAMPLE_ROSTER_PATIENTS: RosterPatient[] = [
  {
    id: "aarav",
    mrn: "44821",
    name: "Aarav Menon",
    initials: "AM",
    age: 44,
    gender: "M",
    level: "Urgent",
    levelCode: "L3",
    primarySignal: "HR 138 at rest",
    baselineDelta: "+92 bpm",
    persistence: "9 min · at rest",
    signalQuality: "good · 0.94",
    qualityScore: 0.94,
    lastSync: "2 min ago",
    conditions: ["Hypertension", "Type 2 Diabetes"],
    adherencePct: 96,
    restingHr: 68,
    hrvMs: 48,
    ldlMgDl: 112,
    consentStatus: "active",
    consentDetail: "Active · expires after consultation",
    lastReviewDate: "12 Jun 2026",
    cohortTags: ["all", "highrisk", "urgent"],
    clinicalSummary: "Sustained tachycardia episode detected at rest on 28 Sep with reduced HRV (19 ms). Good signal quality across ECG/PPG, motion ruled out. Patient is on Ramipril 5mg and Metformin 500mg.",
    vitals: {
      hr: 138,
      baselineHr: 69,
      hrv: 19,
      baselineHrv: 52,
      spo2: 94,
      temp: 36.8,
    },
  },
  {
    id: "rohit",
    mrn: "11204",
    name: "Rohit Sharma",
    initials: "RS",
    age: 61,
    gender: "M",
    level: "Attention",
    levelCode: "L2",
    primarySignal: "Resting HR drift",
    baselineDelta: "+7 bpm · 2 days",
    persistence: "48 h · sustained",
    signalQuality: "good · 0.91",
    qualityScore: 0.91,
    lastSync: "6 min ago",
    conditions: ["Coronary Artery Disease", "Previous MI (2022)"],
    adherencePct: 84,
    restingHr: 74,
    hrvMs: 31,
    ldlMgDl: 128,
    consentStatus: "active",
    consentDetail: "Active consent grant",
    lastReviewDate: "09:15 today",
    cohortTags: ["all", "highrisk"],
    clinicalSummary: "Gradual upward drift in resting heart rate over 48 hours without rhythm irregularity. Adherence slightly down to 84%. In-person review scheduled today at 09:15.",
    vitals: {
      hr: 74,
      baselineHr: 67,
      hrv: 31,
      baselineHrv: 40,
      spo2: 97,
      temp: 36.7,
    },
  },
  {
    id: "meera",
    mrn: "77310",
    name: "Meera Iyer",
    initials: "MI",
    age: 52,
    gender: "F",
    level: "Attention",
    levelCode: "L2",
    primarySignal: "HRV decline",
    baselineDelta: "−8 ms · 5 days",
    persistence: "5 days · gradual",
    signalQuality: "good · 0.89",
    qualityScore: 0.89,
    lastSync: "14 min ago",
    conditions: ["Paroxysmal Arrhythmia (treated)"],
    adherencePct: 93,
    restingHr: 72,
    hrvMs: 38,
    ldlMgDl: 104,
    consentStatus: "active",
    consentDetail: "Active consent grant",
    lastReviewDate: "18 Jul 2026",
    cohortTags: ["all", "highrisk"],
    clinicalSummary: "Gradual 5-day decline in resting HRV. 3 Lead-I strips recorded, none showing sustained ectopy. Video consultation scheduled at 11:45.",
    vitals: {
      hr: 72,
      baselineHr: 70,
      hrv: 38,
      baselineHrv: 46,
      spo2: 98,
      temp: 36.6,
    },
  },
  {
    id: "kabir",
    mrn: "90114",
    name: "Kabir Sethi",
    initials: "KS",
    age: 38,
    gender: "M",
    level: "Stable",
    levelCode: "L1",
    primarySignal: "All within baseline",
    baselineDelta: "no change",
    persistence: "—",
    signalQuality: "good · 0.96",
    qualityScore: 0.96,
    lastSync: "1 min ago",
    conditions: ["None recorded · Annual screening"],
    adherencePct: 98,
    restingHr: 61,
    hrvMs: 58,
    ldlMgDl: 88,
    consentStatus: "active",
    consentDetail: "Active consent grant",
    lastReviewDate: "15 Mar 2026",
    cohortTags: ["all", "stable"],
    clinicalSummary: "All signals tightly bound within 90-day baseline envelope. High adherence and normal biometric telemetry.",
    vitals: {
      hr: 61,
      baselineHr: 62,
      hrv: 58,
      baselineHrv: 56,
      spo2: 99,
      temp: 36.5,
    },
  },
  {
    id: "leela",
    mrn: "20338",
    name: "Leela Nair",
    initials: "LN",
    age: 67,
    gender: "F",
    level: "Stable",
    levelCode: "L1",
    primarySignal: "Adherence 79%",
    baselineDelta: "within range",
    persistence: "—",
    signalQuality: "fair · 0.78",
    qualityScore: 0.78,
    lastSync: "22 min ago",
    conditions: ["Heart Failure (preserved EF)"],
    adherencePct: 79,
    restingHr: 76,
    hrvMs: 42,
    ldlMgDl: 96,
    consentStatus: "expiring",
    consentDetail: "Expiring in 6 days",
    lastReviewDate: "02 Aug 2026",
    cohortTags: ["all", "adherence", "stable"],
    clinicalSummary: "Vitals stable; medication adherence has dropped below 80% (diuretic timing issue). Consent grant expires in 6 days.",
    vitals: {
      hr: 76,
      baselineHr: 75,
      hrv: 42,
      baselineHrv: 44,
      spo2: 96,
      temp: 36.5,
    },
  },
  {
    id: "dev",
    mrn: "55021",
    name: "Dev Patel",
    initials: "DP",
    age: 55,
    gender: "M",
    level: "New consent",
    levelCode: "NEW",
    primarySignal: "Baseline building",
    baselineDelta: "day 4 of 14",
    persistence: "—",
    signalQuality: "good · 0.90",
    qualityScore: 0.90,
    lastSync: "3 min ago",
    conditions: ["Hypertension (newly diagnosed)"],
    adherencePct: null,
    restingHr: null,
    hrvMs: null,
    ldlMgDl: 142,
    consentStatus: "building",
    consentDetail: "Baseline initialization phase",
    lastReviewDate: "New onboarding",
    cohortTags: ["all", "newconsent", "baseline"],
    clinicalSummary: "Recently granted consent; baseline model building on day 4 of 14. Awaiting initial 14-day calibration before computing variance envelopes.",
    vitals: {
      hr: 78,
      baselineHr: 78,
      hrv: 45,
      baselineHrv: 45,
      spo2: 98,
      temp: 36.6,
    },
  },
];
