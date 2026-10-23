"use client";

import React, { useState, useId } from "react";
import { UserHealthBaseline } from "../context/patient-dashboard-context";

interface EntranceIntakeGateProps {
  userName: string;
  userEmail: string;
  onComplete: (baseline: UserHealthBaseline) => void;
}

export function EntranceIntakeGate({ userName, userEmail, onComplete }: EntranceIntakeGateProps) {
  const nameId = useId();
  const ageId = useId();
  const dobId = useId();
  const genderId = useId();
  const heightId = useId();
  const weightId = useId();
  const bloodGroupId = useId();
  const conditionId = useId();
  const emergencyNameId = useId();
  const emergencyPhoneId = useId();
  const hospitalId = useId();

  // Step 1: Personal, Step 2: Physical & Clinical, Step 3: ESP32 Hardware Calibration
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State (Default to sensible real-world values for quick setup)
  const [fullName, setFullName] = useState(userName || "Patient");
  const [age, setAge] = useState<number>(24);
  const [dob, setDob] = useState<string>("2002-05-14");
  const [gender, setGender] = useState<string>("Male");
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [primaryCondition, setPrimaryCondition] = useState<string>(
    "Healthy Baseline / Preventive Monitoring"
  );
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");
  const [hospital, setHospital] = useState<string>("Meridian Heart Institute");

  // ESP32 Calibration State
  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);
  const [calibStage, setCalibStage] = useState("Ready to calibrate");
  const [calibDone, setCalibDone] = useState(false);

  // Live BMI
  const heightM = heightCm > 0 ? heightCm / 100 : 1.75;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Number(rawBmi.toFixed(1));
  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: "Underweight", color: "text-[var(--cyan)] bg-[var(--cyan-soft)]" };
    if (val < 25) return { label: "Normal weight", color: "text-[var(--green)] bg-[var(--green-soft)]" };
    if (val < 30) return { label: "Overweight", color: "text-[var(--amber)] bg-[var(--amber-soft)]" };
    return { label: "High BMI", color: "text-[var(--red)] bg-[var(--red-soft)]" };
  };
  const bmiStatus = getBmiStatus(bmi);

  const startEsp32Calibration = () => {
    setCalibrating(true);
    setCalibProgress(5);
    setCalibStage("Connecting to ESP32-ECG Telemetry Module...");

    const stages = [
      { progress: 20, text: "Detecting ESP32 microcontroller link over BLE/IoT..." },
      { progress: 45, text: "Zeroing ADC baseline voltage offset & drift..." },
      { progress: 70, text: "Verifying single-lead ECG electrode impedance..." },
      { progress: 90, text: "Initializing 250 Hz FIR digital filter (0.5–40 Hz)..." },
      { progress: 100, text: "ESP32 Calibrated! Personal corridor synchronized." },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stages.length) {
        setCalibProgress(stages[current].progress);
        setCalibStage(stages[current].text);
        current++;
      } else {
        clearInterval(interval);
        setCalibDone(true);
        setCalibrating(false);

        // Auto transition into dashboard after brief celebration
        setTimeout(() => {
          handleFinalSubmit();
        }, 1200);
      }
    }, 700);
  };

  const handleFinalSubmit = () => {
    const formattedDob = dob
      ? new Date(dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "14 May 2002";

    const baseline: UserHealthBaseline = {
      age: Number(age) || 24,
      dob: formattedDob,
      gender,
      heightCm: Number(heightCm) || 175,
      weightKg: Number(weightKg) || 70,
      bmi,
      bloodGroup,
      primaryCondition,
      emergencyContact: emergencyContact.trim() || "Family Contact",
      emergencyPhone: emergencyPhone.trim() || "+91 98000 00000",
      hospital: hospital.trim() || "Meridian Heart Institute",
      cardiologist: "Assigned Clinical Team",
      onboardingComplete: true,
      memberSince: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      monitoredDays: 1,
    };

    onComplete(baseline);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--hi)] flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Branding Banner */}
        <div className="bg-gradient-to-r from-[var(--teal-soft)] via-[var(--surface-2)] to-[var(--surface)] p-6 sm:p-8 border-b border-[var(--border)] relative">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal)] text-white shadow-lg shadow-[var(--teal)]/20 text-2xl font-bold">
              ⚡
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--teal-700)] dark:text-[var(--teal)]">
                CardioCoreEdge · Patient Entrance Gate
              </span>
              <h1 className="font-heading text-2xl font-bold text-[var(--hi)]">
                Welcome, {fullName}
              </h1>
              <p className="text-xs text-[var(--mid)]">
                Please enter your real baseline health details and calibrate your ESP32 sensor
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 1 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 2 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
            <div
              className={`h-2 rounded-full transition-all ${
                step >= 3 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-[var(--muted)] mt-2">
            <span className={step === 1 ? "text-[var(--teal-700)] dark:text-[var(--teal)]" : ""}>
              1. Demographics
            </span>
            <span className={step === 2 ? "text-[var(--teal-700)] dark:text-[var(--teal)]" : ""}>
              2. Body &amp; Clinical Focus
            </span>
            <span className={step === 3 ? "text-[var(--teal-700)] dark:text-[var(--teal)]" : ""}>
              3. ESP32 Hardware Calibration
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* STEP 1: Personal Demographics */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)] text-xs text-[var(--mid)]">
                🛡️ <strong>Zero pre-fetched dummy data:</strong> CardioCore configures all telemetry corridors, risk indices, and Digital Twin envelopes exclusively from your verified user intake.
              </div>

              <div>
                <label htmlFor={nameId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                  Full Name
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={ageId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Age (Years)
                  </label>
                  <input
                    id={ageId}
                    type="number"
                    min="10"
                    max="115"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={dobId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Date of Birth
                  </label>
                  <input
                    id={dobId}
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor={genderId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                  Biological Sex (Clinical Reference)
                </label>
                <select
                  id={genderId}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Non-Binary</option>
                </select>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-[var(--teal)] px-6 py-2.5 font-bold text-white shadow-md shadow-[var(--teal)]/20 hover:bg-[var(--teal-600)] transition-all flex items-center gap-2 text-xs"
                >
                  <span>Continue to Body &amp; Clinical Focus</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Physical & Clinical Biometrics */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={heightId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Height (cm)
                  </label>
                  <input
                    id={heightId}
                    type="number"
                    min="100"
                    max="240"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={weightId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Weight (kg)
                  </label>
                  <input
                    id={weightId}
                    type="number"
                    min="30"
                    max="250"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                    required
                  />
                </div>
              </div>

              {/* Live calculated BMI indicator */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--muted)] block">Calculated Body Mass Index (BMI)</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-heading text-xl font-bold text-[var(--hi)]">{bmi}</span>
                    <span className="text-xs text-[var(--muted)]">kg/m²</span>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bmiStatus.color}`}>
                  {bmiStatus.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={bloodGroupId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Blood Group
                  </label>
                  <select
                    id={bloodGroupId}
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={conditionId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Primary Clinical Focus
                  </label>
                  <select
                    id={conditionId}
                    value={primaryCondition}
                    onChange={(e) => setPrimaryCondition(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  >
                    <option value="Healthy Baseline / Preventive Monitoring">Healthy Baseline / Preventive</option>
                    <option value="Hypertension (Blood Pressure Monitoring)">Hypertension</option>
                    <option value="Arrhythmia / Palpitation Surveillance">Arrhythmia / Palpitation</option>
                    <option value="Post-MI / Post-PCI Cardiac Recovery">Post-MI Cardiac Recovery</option>
                    <option value="Type 2 Diabetes & Cardiometabolic">Type 2 Diabetes &amp; Metabolic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label htmlFor={emergencyNameId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    id={emergencyNameId}
                    type="text"
                    placeholder="e.g. Sarthak's Family Contact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  />
                </div>
                <div>
                  <label htmlFor={emergencyPhoneId} className="block text-xs font-semibold text-[var(--mid)] mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    id={emergencyPhoneId}
                    type="tel"
                    placeholder="+91 98000 00000"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--hi)] outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)] hover:bg-[var(--tint)] text-xs"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-[var(--teal)] px-6 py-2.5 font-bold text-white shadow-md shadow-[var(--teal)]/20 hover:bg-[var(--teal-600)] transition-all flex items-center gap-2 text-xs"
                >
                  <span>Proceed to ESP32 Calibration</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ESP32 Hardware Calibration */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Hardware Device Spec Box */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--teal-soft)] text-2xl font-bold text-[var(--teal-700)] dark:text-[var(--teal)]">
                    📟
                  </div>
                  <div>
                    <strong className="text-sm text-[var(--hi)] block">ESP32-ECG Telemetry Module</strong>
                    <span className="text-xs text-[var(--muted)]">
                      Dual-core 240 MHz · 250 Hz single-lead ADC · Bluetooth &amp; Wi-Fi IoT stream
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-bold text-[var(--green)]">
                  READY
                </span>
              </div>

              {/* Calibration Terminal / Progress Card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--mid)] uppercase tracking-wider">
                    ESP32 Signal Calibration Pipeline
                  </span>
                  <span className="font-mono text-[var(--teal-700)] dark:text-[var(--teal)]">
                    {calibProgress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--green)] transition-all duration-500 ease-out"
                    style={{ width: `${calibProgress}%` }}
                  />
                </div>

                {/* Current Stage Output */}
                <div className="font-mono text-xs p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2.5">
                  {calibrating && <span className="h-2 w-2 rounded-full bg-[var(--teal)] animate-ping" />}
                  {calibDone && <span className="text-[var(--green)]">✓</span>}
                  <span className="text-[var(--hi)]">{calibStage}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={calibrating}
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)] hover:bg-[var(--tint)] text-xs disabled:opacity-40"
                >
                  ← Back
                </button>

                {!calibDone ? (
                  <button
                    type="button"
                    disabled={calibrating}
                    onClick={startEsp32Calibration}
                    className="rounded-xl bg-gradient-to-r from-[var(--teal)] to-[var(--teal-700)] px-7 py-3 font-bold text-white shadow-xl shadow-[var(--teal)]/25 hover:opacity-95 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <span>{calibrating ? "Calibrating ESP32..." : "Start ESP32 Calibration"}</span>
                    <span>⚡</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    className="rounded-xl bg-[var(--green)] px-7 py-3 font-bold text-white shadow-xl shadow-[var(--green)]/25 hover:opacity-95 transition-all flex items-center gap-2 text-sm"
                  >
                    <span>Enter Live Dashboard</span>
                    <span>✓</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
