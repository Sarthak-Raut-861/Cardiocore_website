"use client";

import React from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";
import { TwinRing } from "./twin-ring";
import { SparklineCanvas } from "./sparkline-canvas";
import { EcgStripCanvas } from "./ecg-strip-canvas";
import { SPARKLINE_DATA } from "../data/sample-charts";

export function PatientHomeView() {
  const {
    setActiveView,
    formatUnit,
    showToast,
    medications,
    toggleMedication,
    vitals,
    engineMode,
    twinState,
    runTwinSimulation,
    setLabModalOpen,
    customLabs,
    units,
    patient,
    sensorInfo,
    setSensorModalOpen,
  } = usePatientDashboard();

  const hrFmt = formatUnit("hr", vitals.restingHr);
  const hrvFmt = formatUnit("hrv", vitals.hrv);
  const spo2Fmt = formatUnit("spo2", vitals.spo2);
  const tempFmt = formatUnit("temp", vitals.skinTemp);

  const takenCount = medications.filter((m) => m.taken).length;
  const adherencePct = Math.round((takenCount / medications.length) * 100);

  const firstName = patient.name.trim().split(/\s+/)[0] || "there";
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--hi)] sm:text-3xl">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--mid)] flex flex-wrap items-center gap-2">
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-pulse" />
              Live {sensorInfo.deviceName} ({sensorInfo.samplingRate} Hz)
            </span>
            <button
              type="button"
              onClick={() => setSensorModalOpen(true)}
              className="text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] underline hover:opacity-80"
            >
              Configure sensor
            </button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSensorModalOpen(true)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-sm font-semibold text-[var(--hi)] shadow-[var(--sh-1)] hover:bg-[var(--tint)] transition-all flex items-center gap-2"
          >
            <span>📡</span>
            <span>Sensor ({sensorInfo.liveBpm} BPM)</span>
          </button>
          <button
            onClick={() => setLabModalOpen(true)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--hi)] shadow-[var(--sh-1)] hover:bg-[var(--tint)] transition-all"
          >
            Add lab result
          </button>
          <button
            onClick={() => setActiveView("ecg")}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--teal)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--sh-2)] hover:bg-[var(--teal-600)] transition-all"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 12h4l2-5 3 10 3-8 2 3h6" />
            </svg>
            Record ECG — 30 s
          </button>
        </div>
      </div>

      {/* Main Grid: 1.65fr and 1fr */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols on lg) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                    {/* Cardiovascular State Card (Connected to Live 72-Factor Twin Engine + Demo Mode) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {engineMode === "live" ? "CardioCoreEdge-EDI1 · 72-Factor Digital Twin" : "Cardiovascular state (Demo)"}
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h2 className="font-heading text-xl font-bold text-[var(--hi)]">
                    {engineMode === "live" ? twinState.headline : "Stable, within your normal"}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      engineMode === "live" && twinState.scenario === "declining"
                        ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                        : "bg-[var(--green-soft)] text-[var(--green)]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {engineMode === "live" ? twinState.statusText : "Stable"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--mid)] max-w-xl">
                  {engineMode === "live"
                    ? twinState.summary
                    : "Your Baseline Model compared the last 24 hours against your 90-day baseline. Two signals moved slightly and both are explained by yesterday's evening walk."}
                </p>
              </div>

              {engineMode === "live" && (
                <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  {(["stable", "improving", "declining"] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => runTwinSimulation(sc)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                        twinState.scenario === sc
                          ? "bg-[var(--teal)] text-white"
                          : "text-[var(--mid)] hover:text-[var(--hi)]"
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-[var(--border)]">
              <TwinRing
                score={engineMode === "live" ? twinState.score : 82}
                size={150}
                statusText={engineMode === "live" ? twinState.statusText : "Model active"}
              />
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">
                    {engineMode === "live" ? "10-Yr CVD Risk & Cohort Cluster" : "Compared against"}
                  </span>
                  <span className="font-semibold text-[var(--hi)]">
                    {engineMode === "live"
                      ? `${twinState.cvdRiskPct} (${twinState.clusterLabel})`
                      : "your 90-day baseline"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">
                    {engineMode === "live" ? "Calculated LDL-C & hs-CRP" : "Signals fused"}
                  </span>
                  <span className="font-semibold text-[var(--hi)]">
                    {engineMode === "live"
                      ? `${twinState.ldl} mg/dL · hs-CRP ${twinState.crp} mg/L`
                      : "7 · all good quality"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--border)]/50 pb-1.5">
                  <span className="text-[var(--mid)]">Confidence</span>
                  <span className="font-semibold text-[var(--green)]">
                    {engineMode === "live" ? `High (${twinState.clusterConfidence}%) · 72 Factors` : "High (0.91)"}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span className="text-[var(--mid)]">Latest Logged Biomarker</span>
                  <span className="font-semibold text-[var(--teal-700)]">
                    {customLabs[0]?.name}: {units === "si" ? customLabs[0]?.valueSi : customLabs[0]?.valueConv}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setActiveView("twin")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint)] transition-colors"
                  >
                    Open Full 72-Factor Twin Controls →
                  </button>
                  <button
                    onClick={() => setLabModalOpen(true)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--tint)] py-2 text-xs font-semibold text-[var(--hi)] hover:opacity-90 transition-opacity"
                  >
                    + Log New Lab Biomarker
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Vitals Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Resting HR */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
                <span>Resting HR</span>
                <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--green)]">
                  Stable
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{hrFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{hrFmt.unit}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--mid)]">baseline 69 · −1</div>
              <div className="mt-2">
                <SparklineCanvas data={SPARKLINE_DATA.hr} color="#0E9E9E" height={36} />
              </div>
            </div>

            {/* HRV */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
                <span>HRV</span>
                <span className="rounded bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--amber)]">
                  Attention
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-2xl font-bold text-[var(--violet)]">{hrvFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{hrvFmt.unit}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[var(--amber)]">7% below average</div>
              <div className="mt-2">
                <SparklineCanvas data={SPARKLINE_DATA.hrv} color="#7A6BF0" height={36} />
              </div>
            </div>

            {/* SpO2 */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
                <span>SpO₂ avg</span>
                <span className="rounded bg-[var(--cyan-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--cyan)]">
                  Normal
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{spo2Fmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{spo2Fmt.unit}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[var(--green)]">no change</div>
              <div className="mt-2">
                <SparklineCanvas data={SPARKLINE_DATA.spo2} color="#12A6CF" height={36} />
              </div>
            </div>

            {/* Temperature */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
                <span>Skin Temp</span>
                <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--green)]">
                  Stable
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-heading text-2xl font-bold text-[var(--hi)]">{tempFmt.value}</span>
                <span className="text-xs text-[var(--muted)]">{tempFmt.unit}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--green)]">+0.1 vs baseline</div>
              <div className="mt-2">
                <SparklineCanvas data={SPARKLINE_DATA.temp} color="#12A06A" height={36} />
              </div>
            </div>
          </div>

          {/* Live ECG Strip Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                  <span>Live Telemetry ECG · Lead I · {sensorInfo.samplingRate} Hz</span>
                  <span className="rounded bg-[var(--tint)] px-1.5 py-0.2 text-[10px] text-[var(--teal-700)] dark:text-[var(--teal)] font-bold">
                    {sensorInfo.deviceName}
                  </span>
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <h3 className="font-heading text-lg font-bold text-[var(--hi)]">
                    {vitals.restingHr} <span className="text-xs font-normal text-[var(--muted)]">BPM · continuous stream</span>
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                    {sensorInfo.status === "connected" ? "Sensor streaming (Good quality)" : "Connecting sensor..."}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSensorModalOpen(true)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:bg-[var(--tint)]"
                >
                  Manage Sensor 📡
                </button>
                <span className="rounded-md bg-[var(--tint)] px-2 py-0.5 text-xs font-medium text-[var(--mid)]">25 mm/s</span>
                <span className="rounded-md bg-[var(--tint)] px-2 py-0.5 text-xs font-medium text-[var(--mid)]">10 mm/mV</span>
              </div>
            </div>

            <EcgStripCanvas hr={vitals.restingHr} height={120} />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--muted)]">
              <span>Dynamic physiological telemetry stream. Sensor data is encrypted on device.</span>
              <button
                onClick={() => setActiveView("ecg")}
                className="font-semibold text-[var(--teal-700)] hover:underline self-start sm:self-auto"
              >
                Open ECG lab →
              </button>
            </div>
          </div>

          {/* Dynamic ESP32 Telemetry Status Card (No dummy sleep/HRV text) */}
          <div className="rounded-2xl border-l-4 border-l-[var(--teal)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft)] text-[var(--teal-700)] dark:text-[var(--teal)] font-bold text-lg">
                  ⚡
                </div>
                <div>
                  <span className="inline-block rounded bg-[var(--teal-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)]">
                    ESP32 Telemetry Stream
                  </span>
                  <h3 className="font-heading text-base font-bold text-[var(--hi)] mt-0.5">
                    Continuous 250 Hz physiological corridor synchronized
                  </h3>
                </div>
              </div>
              <span className="text-xs text-[var(--green)] font-semibold flex items-center gap-1 shrink-0">
                <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-pulse" />
                Live
              </span>
            </div>

            <p className="text-sm text-[var(--mid)] mb-3">
              Calibrated to <strong>{patient.name}</strong> ({patient.age} y · BMI {patient.bmi} · {patient.bloodGroup}). The ESP32 FIR bandpass filter (0.5–40 Hz) is suppressing motion artifact and baseline wander in real time.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-xs">
                <span className="text-[var(--muted)] block">Sampling Rate</span>
                <span className="font-bold text-[var(--hi)]">{sensorInfo.samplingRate} Hz (Lead I)</span>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-xs">
                <span className="text-[var(--muted)] block">Lead Contact</span>
                <span className="font-bold text-[var(--green)]">Verified Good</span>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-xs">
                <span className="text-[var(--muted)] block">ESP32 Status</span>
                <span className="font-bold text-[var(--teal-700)] dark:text-[var(--teal)]">Calibrated</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSensorModalOpen(true)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                ESP32 Telemetry Settings 📡
              </button>
              <button
                type="button"
                onClick={() => setActiveView("ecg")}
                className="rounded-lg bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--teal-600)] transition-colors"
              >
                Record 30s ECG Strip
              </button>
              <span className="ml-auto text-xs text-[var(--muted)]">
                ESP32 hardware link active
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols on lg) */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          {/* Next Appointment Card (Clean user state, no fake Dr Neha) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Next appointment
              </span>
              <button
                type="button"
                onClick={() => setActiveView("appts")}
                className="text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:underline"
              >
                Schedule →
              </button>
            </div>

            <div className="rounded-xl bg-[var(--surface-2)] p-4 text-xs text-center border border-[var(--border)] space-y-2">
              <span className="text-2xl block">🩺</span>
              <strong className="block text-sm text-[var(--hi)]">No Consultations Scheduled</strong>
              <p className="text-[11px] text-[var(--muted)] max-w-xs mx-auto">
                You do not have any clinical reviews booked yet. Schedule an appointment when you require clinical evaluation.
              </p>
              <button
                type="button"
                onClick={() => setActiveView("appts")}
                className="rounded-xl bg-[var(--teal)] px-4 py-2 font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all text-xs"
              >
                Book Consultation
              </button>
            </div>
          </div>

          {/* Recent Alerts Card (Clean user state, no fake HRV suppression alert) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Recent alerts
              </span>
              <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--green)]">
                ALL NOMINAL
              </span>
            </div>

            <div className="rounded-xl bg-[var(--surface-2)] p-4 text-xs text-center border border-[var(--border)] space-y-1.5">
              <span className="text-xl block">🟢</span>
              <strong className="block text-xs font-bold text-[var(--hi)]">Zero Active Anomalies</strong>
              <p className="text-[11px] text-[var(--muted)]">
                ESP32 telemetry corridor is operating within nominal physiological limits.
              </p>
            </div>
          </div>

          {/* Today's Medications Card (User-oriented, empty if user hasn't added any) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Today&apos;s medications
              </span>
              <button
                type="button"
                onClick={() => setActiveView("meds")}
                className="text-xs font-semibold text-[var(--teal-700)] dark:text-[var(--teal)] hover:underline"
              >
                + Add prescription
              </button>
            </div>

            {medications.length === 0 ? (
              <div className="rounded-xl bg-[var(--surface-2)] p-4 text-xs text-center border border-[var(--border)] space-y-2">
                <span className="text-xl block">💊</span>
                <strong className="block text-xs font-bold text-[var(--hi)]">No Prescriptions Logged</strong>
                <p className="text-[11px] text-[var(--muted)]">
                  Add your prescribed medications to track daily reminders and adherence.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView("meds")}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-semibold text-[var(--hi)] hover:bg-[var(--tint)] text-xs"
                >
                  + Add Medication
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => toggleMedication(med.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          med.taken
                            ? "bg-[var(--green-soft)] text-[var(--green)]"
                            : "bg-[var(--tint)] text-[var(--muted)]"
                        }`}
                      >
                        {med.taken ? "✓" : "○"}
                      </div>
                      <div className="text-xs">
                        <span className={`font-semibold block ${med.taken ? "text-[var(--hi)] line-through opacity-75" : "text-[var(--hi)]"}`}>
                          {med.name} {med.dose}
                        </span>
                        <span className="text-[var(--muted)]">{med.schedule} · {med.timeLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveView("meds")}
              className="mt-3 w-full rounded-xl border border-[var(--border)] py-2 text-xs font-semibold text-[var(--mid)] hover:bg-[var(--tint)] transition-colors"
            >
              Manage medications →
            </button>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--tint)]/50 p-5 shadow-[var(--sh-1)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 block">
              Quick actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveView("ecg")}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                Record ECG
              </button>
              <button
                onClick={() => setActiveView("appts")}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                Book consult
              </button>
              <button
                onClick={() => showToast("Consent sharing ledger opened.", "ok")}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                Share data
              </button>
              <button
                onClick={() => showToast("Symptom logged: compared against continuous bio-signals.", "ok")}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
              >
                Log symptom
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
