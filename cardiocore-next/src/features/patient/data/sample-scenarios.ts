/**
 * CardioCoreEdge — Live Monitor Simulator Bench Scenarios
 * 
 * Recreates the scenario benchmark models from 84_sim.js.
 * Strictly used to demonstrate how the multi-signal baseline engine reacts to
 * physiological triggers in a controlled client-side environment.
 */

export interface SimulatorScenario {
  id: "rest" | "walk" | "sleep" | "stress" | "arrhythmia" | "recovery";
  label: string;
  hr: number;
  hrv: number;
  spo2: number;
  temp: number;
  motion: string;
  posture: string;
  quality: number;
  note: string;
  decisionGates: {
    quality: "pass" | "marginal" | "fail";
    motion: "pass" | "active" | "flagged";
    persistence: "pass" | "timing" | "escalated";
    multiSignal: "1 of 4" | "2 of 4 (Criteria Met)" | "normal";
  };
}

export const SIMULATOR_SCENARIOS: Record<string, SimulatorScenario> = {
  rest: {
    id: "rest",
    label: "Resting",
    hr: 72,
    hrv: 52,
    spo2: 98,
    temp: 36.6,
    motion: "very low",
    posture: "Seated",
    quality: 0.94,
    note: "Reading, still. Signal quality good across ECG and PPG. Within 90-day personal baseline envelope.",
    decisionGates: {
      quality: "pass",
      motion: "pass",
      persistence: "pass",
      multiSignal: "normal",
    },
  },
  walk: {
    id: "walk",
    label: "Walking",
    hr: 104,
    hrv: 34,
    spo2: 97,
    temp: 36.9,
    motion: "moderate",
    posture: "Upright",
    quality: 0.88,
    note: "Walking — physiological rise during activity is expected and compensated out of resting comparisons.",
    decisionGates: {
      quality: "pass",
      motion: "active",
      persistence: "pass",
      multiSignal: "normal",
    },
  },
  sleep: {
    id: "sleep",
    label: "Asleep",
    hr: 54,
    hrv: 62,
    spo2: 97,
    temp: 36.2,
    motion: "none",
    posture: "Lying down",
    quality: 0.97,
    note: "Asleep. Overnight rate and HRV sit reliably inside your baseline overnight restorative window.",
    decisionGates: {
      quality: "pass",
      motion: "pass",
      persistence: "pass",
      multiSignal: "normal",
    },
  },
  stress: {
    id: "stress",
    label: "Psychological stress",
    hr: 88,
    hrv: 36,
    spo2: 98,
    temp: 36.7,
    motion: "low",
    posture: "Seated",
    quality: 0.92,
    note: "Sympathetic arousal: rate elevated, HRV suppressed. Expected physiology; lack of persistence avoids false alarms.",
    decisionGates: {
      quality: "pass",
      motion: "pass",
      persistence: "timing",
      multiSignal: "1 of 4",
    },
  },
  arrhythmia: {
    id: "arrhythmia",
    label: "Arrhythmia episode",
    hr: 141,
    hrv: 19,
    spo2: 94,
    temp: 36.8,
    motion: "low",
    posture: "Seated",
    quality: 0.91,
    note: "Sustained tachycardia at rest with severe HRV loss. Two of four urgent decision gates satisfied beyond persistence threshold.",
    decisionGates: {
      quality: "pass",
      motion: "pass",
      persistence: "escalated",
      multiSignal: "2 of 4 (Criteria Met)",
    },
  },
  recovery: {
    id: "recovery",
    label: "Recovery",
    hr: 64,
    hrv: 56,
    spo2: 98,
    temp: 36.5,
    motion: "low",
    posture: "Seated",
    quality: 0.95,
    note: "Recovery phase: the baseline model tracks the rate of physiological restoration rather than penalizing the excursion.",
    decisionGates: {
      quality: "pass",
      motion: "pass",
      persistence: "pass",
      multiSignal: "normal",
    },
  },
};
