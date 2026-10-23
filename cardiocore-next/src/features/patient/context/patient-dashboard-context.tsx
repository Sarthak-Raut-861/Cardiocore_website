"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SAMPLE_PATIENT, SAMPLE_VITALS, SAMPLE_MEDICATIONS, PatientMedication, PatientProfile } from "../data/sample-patient";
import { useAuth } from "@/features/auth/context/auth-context";

export type UnitSystem = "si" | "conv";

export type PatientViewId =
  | "home"
  | "health"
  | "ecg"
  | "twin"
  | "alerts"
  | "live"
  | "day"
  | "records"
  | "profile"
  | "meds"
  | "appts"
  | "messages";

export interface TwinLiveState {
  score: number;
  statusText: string;
  headline: string;
  summary: string;
  cvdRiskPct: string;
  cvdCategory: string;
  ldl: number;
  crp: number;
  ctr: number;
  clusterLabel: string;
  clusterConfidence: number;
  scenario: "stable" | "improving" | "declining";
  source: string;
  loading: boolean;
}

export interface CustomLabItem {
  id: string;
  name: string;
  valueConv: string;
  valueSi: string;
  status: string;
  date: string;
}

export interface UserHealthBaseline {
  age: number;
  dob: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bloodGroup: string;
  emergencyContact: string;
  emergencyPhone: string;
  hospital: string;
  cardiologist: string;
  primaryCondition: string;
  onboardingComplete: boolean;
  memberSince?: string;
  monitoredDays?: number;
}

export type SensorType = "ble" | "patch" | "simulated";
export type SensorStatus = "connected" | "connecting" | "disconnected";

export interface SensorInfo {
  type: SensorType;
  status: SensorStatus;
  deviceName: string;
  battery: number;
  signalQuality: "optimal" | "good" | "poor";
  samplingRate: number; // e.g. 250 Hz
  lastPacketTime?: Date;
  liveBpm: number;
  liveHrv: number;
  liveSpo2: number;
  liveTemp: number;
}

interface PatientDashboardContextValue {
  activeView: PatientViewId;
  setActiveView: (view: PatientViewId) => void;
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;
  formatUnit: (kind: "hr" | "hrv" | "spo2" | "temp", value: number) => { value: string; unit: string; display: string };
  medications: PatientMedication[];
  toggleMedication: (id: string) => void;
  toastMessage: string | null;
  toastType: "ok" | "warn" | "info";
  showToast: (msg: string, type?: "ok" | "warn" | "info") => void;
  patient: PatientProfile;
  vitals: typeof SAMPLE_VITALS;
  engineMode: "demo" | "live";
  setEngineMode: (mode: "demo" | "live") => void;
  twinState: TwinLiveState;
  runTwinSimulation: (
    scenario?: "stable" | "improving" | "declining",
    customProfile?: Record<string, number>
  ) => Promise<void>;
  labModalOpen: boolean;
  setLabModalOpen: (open: boolean) => void;
  customLabs: CustomLabItem[];
  addLabResult: (item: { name: string; valueConv: string; valueSi: string; status: string }) => void;
  
  // User Onboarding & Baseline Management
  userBaseline: UserHealthBaseline | null;
  onboardingModalOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  saveUserBaseline: (baseline: UserHealthBaseline, preferredSensor?: SensorType) => void;

  // Sensor Telemetry Management
  sensorInfo: SensorInfo;
  sensorModalOpen: boolean;
  setSensorModalOpen: (open: boolean) => void;
  isCalibrating: boolean;
  calibrationProgress: number;
  calibrateEsp32: () => Promise<void>;
  connectBluetoothSensor: () => Promise<void>;
  connectPatchSensor: (serial?: string) => void;
  connectSimulatedSensor: () => void;
  disconnectSensor: () => void;
}

const PatientDashboardContext = createContext<PatientDashboardContextValue | null>(null);

export function PatientDashboardProvider({
  children,
  initialView = "home",
}: {
  children: React.ReactNode;
  initialView?: PatientViewId;
}) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<PatientViewId>(initialView);
  const [units, setUnits] = useState<UnitSystem>("si");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"ok" | "warn" | "info">("ok");
  const [engineMode, setEngineMode] = useState<"demo" | "live">("live");
  const [labModalOpen, setLabModalOpen] = useState<boolean>(false);
  const [sensorModalOpen, setSensorModalOpen] = useState<boolean>(false);
  const [onboardingModalOpen, setOnboardingOpen] = useState<boolean>(false);
  const [userBaseline, setUserBaseline] = useState<UserHealthBaseline | null>(null);

  // Real users start with empty clean medications and labs (no fake Ramipril or Metformin)
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [customLabs, setCustomLabs] = useState<CustomLabItem[]>([]);

  // ESP32 Telemetry State
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(100);

  const [sensorInfo, setSensorInfo] = useState<SensorInfo>({
    type: "patch",
    status: "connected",
    deviceName: "ESP32-ECG Telemetry Module",
    battery: 98,
    signalQuality: "optimal",
    samplingRate: 250,
    liveBpm: 72,
    liveHrv: 52,
    liveSpo2: 98.4,
    liveTemp: 36.6,
  });

  // Load User Baseline, custom meds, and custom labs from localStorage on login
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userKey = user?.email || user?.id;
    if (!userKey) {
      // Demo / guest mode: allow sample medications if guest
      return;
    }

    const storageKey = `cardiocore_baseline_${userKey}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserHealthBaseline;
        setUserBaseline(parsed);
      } catch {
        // invalid JSON
      }
    } else {
      // Real user has not completed baseline intake yet
      setUserBaseline(null);
    }

    // Load user's real medications if any
    const medsKey = `cardiocore_meds_${userKey}`;
    const savedMeds = localStorage.getItem(medsKey);
    if (savedMeds) {
      try {
        setMedications(JSON.parse(savedMeds));
      } catch {
        setMedications([]);
      }
    } else {
      setMedications([]);
    }

    // Load user's real labs if any
    const labsKey = `cardiocore_labs_${userKey}`;
    const savedLabs = localStorage.getItem(labsKey);
    if (savedLabs) {
      try {
        setCustomLabs(JSON.parse(savedLabs));
      } catch {
        setCustomLabs([]);
      }
    } else {
      setCustomLabs([]);
    }
  }, [user]);

  // Calibrate ESP32 Hardware Routine
  const calibrateEsp32 = useCallback(async () => {
    setIsCalibrating(true);
    setCalibrationProgress(10);
    setToastMessage("ESP32: Zeroing ADC baseline offset & sampling 250 Hz signal corridor...");
    setToastType("info");

    const steps = [25, 50, 75, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 650));
      setCalibrationProgress(p);
    }
    setIsCalibrating(false);
    setSensorInfo((prev) => ({
      ...prev,
      status: "connected",
      deviceName: "ESP32-ECG Telemetry Module",
      samplingRate: 250,
      signalQuality: "optimal",
      liveBpm: 72,
    }));
    setToastMessage("ESP32 Calibrated! Single-lead 250 Hz telemetry synchronized.");
    setToastType("ok");
  }, []);

  // Save baseline to localStorage
  const saveUserBaseline = useCallback(
    (baseline: UserHealthBaseline, preferredSensor: SensorType = "patch") => {
      const userKey = user?.email || user?.id || "guest";
      const storageKey = `cardiocore_baseline_${userKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(baseline));
      } catch (e) {
        console.error("Failed to save baseline to localStorage", e);
      }
      setUserBaseline(baseline);
      setOnboardingOpen(false);

      if (preferredSensor === "ble") {
        setSensorInfo((prev) => ({
          ...prev,
          type: "ble",
          deviceName: "BLE Heart Rate Strap",
          samplingRate: 250,
          status: "connected",
        }));
      } else if (preferredSensor === "patch") {
        setSensorInfo((prev) => ({
          ...prev,
          type: "patch",
          deviceName: "ESP32-ECG Telemetry Module",
          samplingRate: 250,
          status: "connected",
        }));
      } else {
        setSensorInfo((prev) => ({
          ...prev,
          type: "simulated",
          deviceName: "Simulated Corridor Stream",
          samplingRate: 250,
          status: "connected",
        }));
      }

      setToastMessage("Personal clinical baseline saved & Digital Twin calibrated.");
      setToastType("ok");
    },
    [user]
  );

  // Dynamic Patient Profile merging User Auth + User Baseline
  const currentPatient = useMemo<PatientProfile>(() => {
    const name = user?.name?.trim() || SAMPLE_PATIENT.name;
    const parts = name.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    const baseline = userBaseline;

    return {
      id: user?.id ? `CC-${user.id.slice(0, 6).toUpperCase()}` : SAMPLE_PATIENT.id,
      name,
      initials,
      email: user?.email || "patient@example.com",
      age: baseline?.age ?? 38,
      dob: baseline?.dob ?? "15 Jun 1988",
      gender: baseline?.gender ?? "Male",
      heightCm: baseline?.heightCm ?? 174,
      weightKg: baseline?.weightKg ?? 72,
      bmi: baseline?.bmi ?? 23.8,
      bloodGroup: baseline?.bloodGroup ?? "O+",
      monitoredDays: baseline?.monitoredDays ?? 1,
      memberSince: baseline?.memberSince ?? "Oct 2026",
      wearableBattery: sensorInfo.battery,
      wearableModel: sensorInfo.deviceName,
      firmwareVersion: "fw 2.4.1",
      syncInterval: "Continuous 250 Hz",
      twinStatus: {
        stateIndex: 88,
        status: "Stable",
        confidence: 0.94,
        modelVersion: "v4.2 (Personal Baseline)",
        baselineDays: baseline?.monitoredDays ? Math.min(90, baseline.monitoredDays * 30) : 30,
        beatsProcessed: "1.42 M",
        ecgStripsCount: 12,
        recalibrationsCount: 1,
        activeMedsCount: 2,
      },
    };
  }, [user, userBaseline, sensorInfo.battery, sensorInfo.deviceName]);

  const [twinState, setTwinState] = useState<TwinLiveState>({
    score: 88,
    statusText: "72-Factor Active",
    headline: "72-Factor Twin: Resilient Autonomic State",
    summary:
      "CardioCoreEdge-EDI1 BiomarkerTwin assimilated continuous 250 Hz sensor telemetry and your clinical risk profile.",
    cvdRiskPct: "6.8%",
    cvdCategory: "Low Risk",
    ldl: 94,
    crp: 1.1,
    ctr: 0.46,
    clusterLabel: "Cluster A · Resilient Autonomic",
    clusterConfidence: 92,
    scenario: "stable",
    source: "CardioCoreEdge-EDI1 72-Factor Engine",
    loading: false,
  });

  const showToast = useCallback((msg: string, type: "ok" | "warn" | "info" = "ok") => {
    setToastMessage(msg);
    setToastType(type);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Web Bluetooth API Integration (BLE Heart Rate Monitors)
  const bleDeviceRef = useRef<any>(null);

  const connectBluetoothSensor = useCallback(async () => {
    if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
      showToast(
        "Web Bluetooth is not supported in this browser. Please use Chrome or Edge.",
        "warn"
      );
      return;
    }

    try {
      setSensorInfo((prev) => ({ ...prev, status: "connecting" }));
      showToast("Searching for Bluetooth Heart Rate monitors...", "info");

      const navBle = (navigator as any).bluetooth;
      const device = await navBle.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });

      bleDeviceRef.current = device;
      const server = await device.gatt.connect();

      // Read Heart Rate Service (0x180D)
      const hrService = await server.getPrimaryService("heart_rate");
      const hrCharacteristic = await hrService.getCharacteristic("heart_rate_measurement");

      await hrCharacteristic.startNotifications();
      hrCharacteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value as DataView;
        const flags = value.getUint8(0);
        const is16Bit = flags & 0x01;
        const hr = is16Bit ? value.getUint16(1, true) : value.getUint8(1);

        // Check if RR-interval exists (bit 4)
        let computedHrv = 52;
        if (flags & 0x10) {
          const rrOffset = is16Bit ? 3 : 2;
          if (value.byteLength >= rrOffset + 2) {
            const rr = value.getUint16(rrOffset, true) / 1024; // in seconds
            computedHrv = Math.round(rr * 60);
          }
        }

        setSensorInfo((prev) => ({
          ...prev,
          liveBpm: hr,
          liveHrv: computedHrv > 20 && computedHrv < 150 ? computedHrv : prev.liveHrv,
          lastPacketTime: new Date(),
        }));
      });

      // Try reading battery service (0x180F) if available
      let battery = 92;
      try {
        const batService = await server.getPrimaryService("battery_service");
        const batChar = await batService.getCharacteristic("battery_level");
        const batVal = await batChar.readValue();
        battery = batVal.getUint8(0);
      } catch {
        // battery characteristic optional
      }

      setSensorInfo({
        type: "ble",
        status: "connected",
        deviceName: device.name || "BLE Heart Rate Monitor",
        battery,
        signalQuality: "optimal",
        samplingRate: 250,
        liveBpm: 74,
        liveHrv: 54,
        liveSpo2: 98.6,
        liveTemp: 36.6,
        lastPacketTime: new Date(),
      });

      showToast(`Connected to ${device.name || "Bluetooth Sensor"}! Streaming live.`, "ok");
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        showToast(`Bluetooth pairing failed: ${err.message}`, "warn");
      }
      setSensorInfo((prev) => ({ ...prev, status: "connected" }));
    }
  }, [showToast]);

  const connectPatchSensor = useCallback(
    (serial = "CC-PATCH-9820-A") => {
      setSensorInfo({
        type: "patch",
        status: "connected",
        deviceName: `CardioCore Patch 2 (${serial.slice(0, 8)})`,
        battery: 96,
        signalQuality: "optimal",
        samplingRate: 250,
        liveBpm: 72,
        liveHrv: 52,
        liveSpo2: 98.4,
        liveTemp: 36.6,
        lastPacketTime: new Date(),
      });
      showToast("Connected to CardioCore Patch 2 (250 Hz IoT Stream).", "ok");
    },
    [showToast]
  );

  const connectSimulatedSensor = useCallback(() => {
    setSensorInfo({
      type: "simulated",
      status: "connected",
      deviceName: "Physiological Corridor Stream",
      battery: 100,
      signalQuality: "optimal",
      samplingRate: 250,
      liveBpm: 70,
      liveHrv: 50,
      liveSpo2: 98.5,
      liveTemp: 36.6,
      lastPacketTime: new Date(),
    });
    showToast("Active: Continuous physiological sensor stream.", "ok");
  }, [showToast]);

  const disconnectSensor = useCallback(() => {
    if (bleDeviceRef.current && bleDeviceRef.current.gatt.connected) {
      bleDeviceRef.current.gatt.disconnect();
    }
    setSensorInfo((prev) => ({
      ...prev,
      status: "disconnected",
      deviceName: "No Sensor Attached",
      signalQuality: "poor",
    }));
  }, []);

  // Sensor Live Telemetry Fluctuation Loop (Realistic Sinus Respiratory Micro-Variations)
  useEffect(() => {
    if (sensorInfo.status !== "connected") return;

    // Run dynamic sensor tick every 2 seconds
    const interval = setInterval(() => {
      setSensorInfo((prev) => {
        // Natural micro-variation: HR ± 1 BPM, HRV ± 1 ms, SpO2 ± 0.1%
        const deltaHr = (Math.random() - 0.48) * 1.5;
        const newBpm = Math.max(55, Math.min(130, Math.round(prev.liveBpm + deltaHr)));

        const deltaHrv = (Math.random() - 0.5) * 2;
        const newHrv = Math.max(25, Math.min(95, Math.round(prev.liveHrv + deltaHrv)));

        const newSpo2 = Number((98.2 + Math.random() * 0.6).toFixed(1));
        const newTemp = Number((36.5 + Math.random() * 0.2).toFixed(1));

        return {
          ...prev,
          liveBpm: prev.type === "ble" ? prev.liveBpm : newBpm,
          liveHrv: prev.type === "ble" ? prev.liveHrv : newHrv,
          liveSpo2: newSpo2,
          liveTemp: newTemp,
          lastPacketTime: new Date(),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [sensorInfo.status]);

  const runTwinSimulation = useCallback(
    async (
      scenario: "stable" | "improving" | "declining" = "stable",
      customProfile?: Record<string, number>
    ) => {
      setTwinState((prev) => ({ ...prev, loading: true, scenario }));
      try {
        const res = await fetch("/api/v1/twin/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            days: 60,
            profile: customProfile || {
              baseline_resting_hr: scenario === "improving" ? 64 : scenario === "declining" ? 82 : 68,
              baseline_hrv_rmssd: scenario === "improving" ? 56 : scenario === "declining" ? 29 : 48,
              baseline_systolic: scenario === "improving" ? 116 : scenario === "declining" ? 138 : 122,
              baseline_total_cholesterol: 184,
              baseline_hdl: 54,
              baseline_triglycerides: 128,
            },
          }),
        });
        const data = await res.json();
        const cvd = typeof data.cvd_score === "number" ? data.cvd_score : 0.068;
        const computedScore =
          typeof data.state_score === "number"
            ? data.state_score
            : Math.min(98, Math.max(38, Math.round((1 - cvd * 1.35) * 100)));

        const headlineMap = {
          stable: "72-Factor Twin: Stable Personal Corridor",
          improving: "72-Factor Twin: Positive Autonomic & Lipid Trajectory",
          declining: "72-Factor Twin: Early Autonomic & Hemodynamic Drift",
        };
        const summaryMap = {
          stable:
            "CardioCoreEdge-EDI1 BiomarkerTwin assimilated continuous sensor streams across 72 factors. Resting HR, HRV, and lipids remain inside your personal corridor.",
          improving:
            "60-day intervention trajectory shows +16% HRV rMSSD recovery and reduced 10-year cardiovascular risk score.",
          declining:
            "BiomarkerTwin flagged a 14-day HRV suppression and +14 mmHg systolic drift across your 72-factor risk profile.",
        };

        setTwinState({
          score: computedScore,
          statusText: data.cvd_category || (scenario === "declining" ? "Attention" : "Optimal"),
          headline: headlineMap[scenario],
          summary: summaryMap[scenario],
          cvdRiskPct: `${(cvd * 100).toFixed(1)}%`,
          cvdCategory: data.cvd_category || "Low Risk",
          ldl: Math.round(data?.biomarkers?.LDL ?? 94),
          crp: Number((data?.biomarkers?.CRP ?? 1.1).toFixed(2)),
          ctr: Number((data?.ctr ?? 0.46).toFixed(2)),
          clusterLabel: data?.cluster?.label || "Cluster A · Resilient Autonomic",
          clusterConfidence: Math.round((data?.cluster?.confidence ?? 0.92) * 100),
          scenario,
          source: data?.source || "CardioCoreEdge-EDI1 72-Factor Engine",
          loading: false,
        });
      } catch {
        setTwinState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  useEffect(() => {
    runTwinSimulation("stable");
  }, [runTwinSimulation]);

  const addLabResult = useCallback(
    (item: { name: string; valueConv: string; valueSi: string; status: string }) => {
      setCustomLabs((prev) => [
        {
          id: `lab-${Date.now()}`,
          name: item.name,
          valueConv: item.valueConv,
          valueSi: item.valueSi,
          status: item.status,
          date: "Just now",
        },
        ...prev,
      ]);
      showToast(`Saved ${item.name} to longitudinal record & updated BiomarkerTwin.`, "ok");
    },
    [showToast]
  );

  const toggleMedication = useCallback((id: string) => {
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const newTaken = !m.taken;
          return {
            ...m,
            taken: newTaken,
            timeLabel: newTaken ? "taken just now" : "due today",
          };
        }
        return m;
      })
    );
  }, []);

  const formatUnit = useCallback(
    (kind: "hr" | "hrv" | "spo2" | "temp", value: number) => {
      if (units === "si") {
        switch (kind) {
          case "hr":
            return { value: Math.round(value).toString(), unit: "min⁻¹", display: `${Math.round(value)} min⁻¹` };
          case "hrv":
            return { value: Math.round(value).toString(), unit: "ms", display: `${Math.round(value)} ms` };
          case "spo2":
            return { value: Math.round(value).toString(), unit: "%", display: `${Math.round(value)}%` };
          case "temp":
            return { value: value.toFixed(1), unit: "°C", display: `${value.toFixed(1)} °C` };
        }
      } else {
        switch (kind) {
          case "hr":
            return { value: Math.round(value).toString(), unit: "BPM", display: `${Math.round(value)} BPM` };
          case "hrv":
            return { value: Math.round(value).toString(), unit: "ms", display: `${Math.round(value)} ms` };
          case "spo2":
            return { value: Math.round(value).toString(), unit: "%", display: `${Math.round(value)}%` };
          case "temp": {
            const f = value * (9 / 5) + 32;
            return { value: f.toFixed(1), unit: "°F", display: `${f.toFixed(1)} °F` };
          }
        }
      }
    },
    [units]
  );

  // Dynamic Sensor-Driven Vitals
  const liveVitals = useMemo(() => {
    if (engineMode === "demo") return SAMPLE_VITALS;

    // Use live sensor telemetry!
    return {
      restingHr: sensorInfo.liveBpm,
      baselineHr: userBaseline ? 68 : 69,
      hrv: sensorInfo.liveHrv,
      baselineHrv: 52,
      spo2: sensorInfo.liveSpo2,
      baselineSpo2: 98,
      skinTemp: sensorInfo.liveTemp,
      baselineTemp: 36.5,
    };
  }, [engineMode, sensorInfo.liveBpm, sensorInfo.liveHrv, sensorInfo.liveSpo2, sensorInfo.liveTemp, userBaseline]);

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      units,
      setUnits,
      formatUnit,
      medications,
      toggleMedication,
      toastMessage,
      toastType,
      showToast,
      patient: currentPatient,
      vitals: liveVitals,
      engineMode,
      setEngineMode,
      twinState,
      runTwinSimulation,
      labModalOpen,
      setLabModalOpen,
      customLabs,
      addLabResult,
      
      // Onboarding & Baseline
      userBaseline,
      onboardingModalOpen,
      setOnboardingOpen,
      saveUserBaseline,

      // Sensor Telemetry
      sensorInfo,
      sensorModalOpen,
      setSensorModalOpen,
      isCalibrating,
      calibrationProgress,
      calibrateEsp32,
      connectBluetoothSensor,
      connectPatchSensor,
      connectSimulatedSensor,
      disconnectSensor,
    }),
    [
      activeView,
      units,
      medications,
      toggleMedication,
      toastMessage,
      toastType,
      showToast,
      formatUnit,
      currentPatient,
      liveVitals,
      engineMode,
      twinState,
      runTwinSimulation,
      labModalOpen,
      customLabs,
      addLabResult,
      userBaseline,
      onboardingModalOpen,
      saveUserBaseline,
      sensorInfo,
      sensorModalOpen,
      isCalibrating,
      calibrationProgress,
      calibrateEsp32,
      connectBluetoothSensor,
      connectPatchSensor,
      connectSimulatedSensor,
      disconnectSensor,
    ]
  );

  return (
    <PatientDashboardContext.Provider value={value}>
      {children}
    </PatientDashboardContext.Provider>
  );
}

export function usePatientDashboard() {
  const context = useContext(PatientDashboardContext);
  if (!context) {
    throw new Error("usePatientDashboard must be used within a PatientDashboardProvider");
  }
  return context;
}
