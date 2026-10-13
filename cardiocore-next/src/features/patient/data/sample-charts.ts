/**
 * CardioCoreEdge — Deterministic Telemetry Series & Sparkline Data
 * 
 * Recreates the mathematical models from legacy 60_core.js and 81_charts.js.
 * All data is synthetic and marked as illustrative for dashboard demonstration.
 */

export type TrendRange = "24H" | "7D" | "30D" | "3M" | "1Y";

export interface ChartSeries {
  kind: "hr" | "hrv" | "spo2" | "temp";
  name: string;
  labels: string[];
  vals: number[];
  base: number;
  unitSi: string;
  unitConv: string;
  color: string;
}

export const SPARKLINE_DATA = {
  hr: [70, 69, 71, 68, 70, 69, 68, 70, 69, 68, 69, 68],
  hrv: [54, 53, 52, 51, 53, 50, 49, 50, 49, 48, 48, 48],
  spo2: [98, 98, 97, 98, 98, 98, 99, 98, 98, 98, 98, 98],
  temp: [36.6, 36.6, 36.5, 36.7, 36.6, 36.6, 36.6, 36.5, 36.6, 36.6, 36.7, 36.6],
};

const RANGE_LABELS: Record<TrendRange, string[]> = {
  "24H": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
  "7D": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30D": ["1 Oct", "5 Oct", "10 Oct", "15 Oct", "20 Oct", "25 Oct", "30 Oct"],
  "3M": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  "1Y": ["Q1", "Q2", "Q3", "Q4"],
};

// Deterministic seed random generator matching 60_core.js
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function getTrendData(kind: "hr" | "hrv" | "spo2" | "temp", range: TrendRange): ChartSeries {
  const configs = {
    hr: {
      name: "Resting Heart Rate",
      base: 70,
      unitSi: "min⁻¹",
      unitConv: "BPM",
      color: "#0E9E9E",
      seedBase: 101,
      amp: 2.2,
      baseVals7D: [70, 68, 69, 71, 68, 67, 68],
    },
    hrv: {
      name: "Heart Rate Variability",
      base: 52,
      unitSi: "ms",
      unitConv: "ms",
      color: "#7A6BF0",
      seedBase: 202,
      amp: 3.5,
      baseVals7D: [52, 51, 50, 49, 49, 48, 48],
    },
    spo2: {
      name: "SpO₂ Average",
      base: 98,
      unitSi: "%",
      unitConv: "%",
      color: "#12A6CF",
      seedBase: 303,
      amp: 0.6,
      baseVals7D: [98, 98, 97, 98, 98, 99, 98],
    },
    temp: {
      name: "Skin Temperature",
      base: 36.5,
      unitSi: "°C",
      unitConv: "°F",
      color: "#12A06A",
      seedBase: 404,
      amp: 0.15,
      baseVals7D: [36.5, 36.6, 36.6, 36.7, 36.6, 36.5, 36.6],
    },
  };

  const cfg = configs[kind];
  const labels = RANGE_LABELS[range];

  if (range === "7D") {
    return {
      kind,
      name: cfg.name,
      labels,
      vals: cfg.baseVals7D,
      base: cfg.base,
      unitSi: cfg.unitSi,
      unitConv: cfg.unitConv,
      color: cfg.color,
    };
  }

  const rand = pseudoRandom(cfg.seedBase + range.charCodeAt(0) * 17);
  const count = labels.length;
  const vals: number[] = [];

  for (let i = 0; i < count; i++) {
    const jitter = (rand() - 0.48) * cfg.amp;
    const v = cfg.base + jitter;
    vals.push(kind === "temp" ? Math.round(v * 10) / 10 : Math.round(v));
  }

  return {
    kind,
    name: cfg.name,
    labels,
    vals,
    base: cfg.base,
    unitSi: cfg.unitSi,
    unitConv: cfg.unitConv,
    color: cfg.color,
  };
}

export interface DayReviewPoint {
  time: string;
  hr: number;
  activity: "sleep" | "rest" | "walk" | "sedentary";
  note?: string;
}

export const SAMPLE_DAY_POINTS: DayReviewPoint[] = [
  { time: "00:00", hr: 53, activity: "sleep" },
  { time: "02:00", hr: 51, activity: "sleep" },
  { time: "04:00", hr: 52, activity: "sleep" },
  { time: "06:00", hr: 56, activity: "sleep" },
  { time: "07:00", hr: 72, activity: "rest", note: "Woke up · morning meds taken" },
  { time: "07:18", hr: 114, activity: "walk", note: "Brisk morning walk · 24 min" },
  { time: "08:00", hr: 76, activity: "rest", note: "HRV dip noted · 48 ms" },
  { time: "10:00", hr: 68, activity: "sedentary" },
  { time: "12:00", hr: 70, activity: "sedentary" },
  { time: "14:00", hr: 69, activity: "sedentary" },
  { time: "16:00", hr: 71, activity: "sedentary" },
  { time: "18:00", hr: 75, activity: "rest" },
  { time: "20:00", hr: 68, activity: "rest" },
  { time: "22:00", hr: 64, activity: "rest" },
  { time: "24:00", hr: 55, activity: "sleep" },
];
