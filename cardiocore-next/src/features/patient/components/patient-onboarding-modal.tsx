"use client";

import React, { useState, useId } from "react";
import { UserHealthBaseline } from "../context/patient-dashboard-context";

interface PatientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (baseline: UserHealthBaseline, preferredSensor: "ble" | "patch" | "simulated") => void;
  initialData?: Partial<UserHealthBaseline>;
  userName?: string;
  userEmail?: string;
}

export function PatientOnboardingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  userName = "Patient",
  userEmail = "",
}: PatientOnboardingModalProps) {
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

  // Wizard step: 1 (Demographics & Biometrics), 2 (Clinical & Emergency), 3 (Sensor Selection)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [age, setAge] = useState<number>(initialData?.age || 38);
  const [dob, setDob] = useState<string>(initialData?.dob || "1988-06-15");
  const [gender, setGender] = useState<string>(initialData?.gender || "Male");
  const [heightCm, setHeightCm] = useState<number>(initialData?.heightCm || 174);
  const [weightKg, setWeightKg] = useState<number>(initialData?.weightKg || 72);
  const [bloodGroup, setBloodGroup] = useState<string>(initialData?.bloodGroup || "O+");
  const [primaryCondition, setPrimaryCondition] = useState<string>(
    initialData?.primaryCondition || "Healthy Baseline / Preventive Monitoring"
  );
  const [emergencyContact, setEmergencyContact] = useState<string>(
    initialData?.emergencyContact || ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState<string>(
    initialData?.emergencyPhone || ""
  );
  const [hospital, setHospital] = useState<string>(
    initialData?.hospital || "Meridian Heart Institute"
  );
  const [preferredSensor, setPreferredSensor] = useState<"ble" | "patch" | "simulated">(
    "patch"
  );

  if (!isOpen) return null;

  // Calculate live BMI
  const heightM = heightCm > 0 ? heightCm / 100 : 1.7;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Number(rawBmi.toFixed(1));
  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: "Underweight", color: "text-[var(--cyan)] bg-[var(--cyan-soft)]" };
    if (val < 25) return { label: "Normal weight", color: "text-[var(--green)] bg-[var(--green-soft)]" };
    if (val < 30) return { label: "Overweight", color: "text-[var(--amber)] bg-[var(--amber-soft)]" };
    return { label: "High BMI", color: "text-[var(--red)] bg-[var(--red-soft)]" };
  };
  const bmiStatus = getBmiStatus(bmi);

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDob = dob ? new Date(dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "15 Jun 1988";
    
    const baseline: UserHealthBaseline = {
      age: Number(age) || 35,
      dob: formattedDob,
      gender,
      heightCm: Number(heightCm) || 170,
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

    onSave(baseline, preferredSensor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[var(--teal-soft)] via-[var(--surface-2)] to-[var(--surface)] p-6 border-b border-[var(--border)] relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal)] text-white shadow-lg shadow-[var(--teal)]/20 text-xl font-bold">
              ❤️
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--teal-700)] dark:text-[var(--teal)]">
                First-Time Setup · Patient Baseline Intake
              </span>
              <h2 className="font-heading text-xl font-bold text-[var(--hi)]">
                Welcome, {userName}
              </h2>
              <p className="text-xs text-[var(--mid)]">
                Initialize your personal cardiovascular corridor &amp; sensor telemetry
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 1 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 2 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 3 ? "bg-[var(--teal)]" : "bg-[var(--border)]"
              }`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-[var(--muted)] mt-1.5">
            <span className={step === 1 ? "text-[var(--teal-700)] font-bold" : ""}>1. Demographics &amp; Body</span>
            <span className={step === 2 ? "text-[var(--teal-700)] font-bold" : ""}>2. Clinical &amp; Emergency</span>
            <span className={step === 3 ? "text-[var(--teal-700)] font-bold" : ""}>3. Sensor Connection</span>
          </div>
        </div>

        {/* Modal Body / Steps */}
        <form onSubmit={handleFinish} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* STEP 1: Demographics & Physical Biometrics */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl bg-[var(--tint)] p-3 text-[12px] text-[var(--mid)] border border-[var(--border)]">
                💡 <strong>Why we ask:</strong> Your age, height, and weight configure the <strong>72-factor Digital Twin baseline</strong>, calibrated specifically to your metabolic body surface area.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={ageId} className="block font-semibold text-[var(--mid)] mb-1">
                    Age (Years)
                  </label>
                  <input
                    id={ageId}
                    type="number"
                    min="12"
                    max="110"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={dobId} className="block font-semibold text-[var(--mid)] mb-1">
                    Date of Birth
                  </label>
                  <input
                    id={dobId}
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor={genderId} className="block font-semibold text-[var(--mid)] mb-1">
                  Biological Sex (Clinical Reference)
                </label>
                <select
                  id={genderId}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Non-Binary</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={heightId} className="block font-semibold text-[var(--mid)] mb-1">
                    Height (cm)
                  </label>
                  <input
                    id={heightId}
                    type="number"
                    min="100"
                    max="240"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={weightId} className="block font-semibold text-[var(--mid)] mb-1">
                    Weight (kg)
                  </label>
                  <input
                    id={weightId}
                    type="number"
                    min="30"
                    max="250"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic BMI pill */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--muted)] block">Calculated Body Mass Index (BMI)</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-heading text-lg font-bold text-[var(--hi)]">{bmi}</span>
                    <span className="text-[11px] text-[var(--muted)]">kg/m²</span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bmiStatus.color}`}>
                  {bmiStatus.label}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Clinical Baseline & Emergency Contacts */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={bloodGroupId} className="block font-semibold text-[var(--mid)] mb-1">
                    Blood Group
                  </label>
                  <select
                    id={bloodGroupId}
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={conditionId} className="block font-semibold text-[var(--mid)] mb-1">
                    Primary Clinical Focus
                  </label>
                  <select
                    id={conditionId}
                    value={primaryCondition}
                    onChange={(e) => setPrimaryCondition(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                  >
                    <option value="Healthy Baseline / Preventive Monitoring">Healthy Baseline / Preventive</option>
                    <option value="Hypertension (Blood Pressure Monitoring)">Hypertension</option>
                    <option value="Arrhythmia / Palpitation Surveillance">Arrhythmia / Palpitations</option>
                    <option value="Post-MI / Post-PCI Cardiac Recovery">Post-MI / Cardiac Recovery</option>
                    <option value="Type 2 Diabetes & Cardiometabolic">Type 2 Diabetes &amp; Metabolic</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-3 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal-700)] dark:text-[var(--teal)]">
                  Emergency Escalation Protocol
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={emergencyNameId} className="block font-semibold text-[var(--mid)] mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      id={emergencyNameId}
                      type="text"
                      placeholder="e.g. Maya Sharma (Spouse)"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor={emergencyPhoneId} className="block font-semibold text-[var(--mid)] mb-1">
                      Emergency Phone Number
                    </label>
                    <input
                      id={emergencyPhoneId}
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={hospitalId} className="block font-semibold text-[var(--mid)] mb-1">
                    Preferred Cardiac Hospital / Care Center
                  </label>
                  <input
                    id={hospitalId}
                    type="text"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--hi)] focus:ring-2 focus:ring-[var(--teal)] outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Sensor & Telemetry Source Selection */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="font-heading text-sm font-bold text-[var(--hi)] mb-1">
                  Select Your Telemetry Data Source
                </h3>
                <p className="text-xs text-[var(--mid)]">
                  CardioCore streams live vitals directly from medical hardware, Bluetooth Low Energy (BLE) monitors, or edge telemetry engines.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Option A: CardioCore IoT Patch */}
                <label
                  onClick={() => setPreferredSensor("patch")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    preferredSensor === "patch"
                      ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--mid)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sensorSource"
                    checked={preferredSensor === "patch"}
                    onChange={() => setPreferredSensor("patch")}
                    className="mt-1 accent-[var(--teal)] h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[var(--hi)]">CardioCore Patch 2 (250 Hz IoT Stream)</strong>
                      <span className="rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--mid)] mt-0.5">
                      High-precision single-lead clinical telemetry with 250 Hz continuous sampling, live P-Q-R-S-T wave capture, and hardware battery gauge.
                    </p>
                  </div>
                </label>

                {/* Option B: Web Bluetooth BLE */}
                <label
                  onClick={() => setPreferredSensor("ble")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    preferredSensor === "ble"
                      ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--mid)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sensorSource"
                    checked={preferredSensor === "ble"}
                    onChange={() => setPreferredSensor("ble")}
                    className="mt-1 accent-[var(--teal)] h-4 w-4"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[var(--hi)]">Bluetooth Low Energy (BLE) Monitor</strong>
                      <span className="rounded-full bg-[var(--cyan-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--cyan)]">
                        WEB BLUETOOTH
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--mid)] mt-0.5">
                      Pairs directly with your Polar H10, Garmin HRM, Apple Watch BLE broadcast, or Bluetooth smart chest strap in Chrome/Edge browsers.
                    </p>
                  </div>
                </label>

                {/* Option C: Live Physiological Stream Emulation */}
                <label
                  onClick={() => setPreferredSensor("simulated")}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    preferredSensor === "simulated"
                      ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--mid)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sensorSource"
                    checked={preferredSensor === "simulated"}
                    onChange={() => setPreferredSensor("simulated")}
                    className="mt-1 accent-[var(--teal)] h-4 w-4"
                  />
                  <div>
                    <strong className="text-sm text-[var(--hi)]">Simulated Real-Time Sensor Stream</strong>
                    <p className="text-[11px] text-[var(--mid)] mt-0.5">
                      Generates continuous dynamic physiological sensor fluctuations (HR micro-variability, SpO2, skin temp) inside your calibrated corridor.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-xl bg-[var(--surface-2)] p-3 text-[11px] text-[var(--muted)] border border-[var(--border)]">
                🔒 All telemetry is encrypted on device before streaming. You can re-pair or change sensor sources anytime from the dashboard top bar.
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-all"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--hi)]"
              >
                Skip for now
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                className="rounded-xl bg-[var(--teal)] px-5 py-2.5 font-semibold text-white shadow-md shadow-[var(--teal)]/20 hover:bg-[var(--teal-600)] transition-all flex items-center gap-1.5"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[var(--teal)] to-[var(--teal-700)] px-6 py-2.5 font-bold text-white shadow-lg shadow-[var(--teal)]/30 hover:opacity-95 transition-all flex items-center gap-2"
              >
                <span>Save &amp; Start Live Stream</span>
                <span>⚡</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
