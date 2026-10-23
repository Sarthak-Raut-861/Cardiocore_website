"use client";

import React, { useState } from "react";
import { usePatientDashboard } from "../context/patient-dashboard-context";

interface SensorConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SensorConnectionModal({ isOpen, onClose }: SensorConnectionModalProps) {
  const {
    sensorInfo,
    connectBluetoothSensor,
    connectPatchSensor,
    connectSimulatedSensor,
    disconnectSensor,
    showToast,
  } = usePatientDashboard();

  const [patchSerial, setPatchSerial] = useState("CC-PATCH-9820-A");
  const [isScanningBle, setIsScanningBle] = useState(false);

  if (!isOpen) return null;

  const handleBleConnect = async () => {
    setIsScanningBle(true);
    try {
      await connectBluetoothSensor();
    } finally {
      setIsScanningBle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--teal-soft)] text-xl font-bold text-[var(--teal-700)] dark:text-[var(--teal)]">
              📡
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[var(--hi)]">
                Telemetry Sensor Manager
              </h3>
              <p className="text-xs text-[var(--mid)]">
                Stream real-time vitals from medical hardware, Bluetooth LE, or edge telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--muted)] hover:bg-[var(--tint)] hover:text-[var(--hi)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Active Sensor Status Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Active Sensor Link
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                sensorInfo.status === "connected"
                  ? "bg-[var(--green-soft)] text-[var(--green)]"
                  : sensorInfo.status === "connecting"
                  ? "bg-[var(--cyan-soft)] text-[var(--cyan)]"
                  : "bg-[var(--amber-soft)] text-[var(--amber)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sensorInfo.status === "connected"
                    ? "bg-[var(--green)] animate-pulse"
                    : sensorInfo.status === "connecting"
                    ? "bg-[var(--cyan)] animate-ping"
                    : "bg-[var(--amber)]"
                }`}
              />
              {sensorInfo.status === "connected"
                ? "CONNECTED & STREAMING"
                : sensorInfo.status === "connecting"
                ? "SEARCHING / CONNECTING..."
                : "DISCONNECTED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] block">Hardware Device</span>
              <strong className="text-[var(--hi)] truncate block mt-0.5">{sensorInfo.deviceName}</strong>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] block">Sampling Rate</span>
              <strong className="text-[var(--teal-700)] dark:text-[var(--teal)] block mt-0.5">
                {sensorInfo.samplingRate} Hz
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] block">Battery Status</span>
              <strong className="text-[var(--green)] block mt-0.5">{sensorInfo.battery}%</strong>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-2.5 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted)] block">Live HR</span>
              <strong className="text-[var(--hi)] block mt-0.5">{sensorInfo.liveBpm} BPM</strong>
            </div>
          </div>
        </div>

        {/* Sensor Connection Options */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--mid)]">
            Connect New Telemetry Source
          </span>

          {/* Option 1: Web Bluetooth API */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[var(--teal)] transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <strong className="text-sm text-[var(--hi)]">Bluetooth Low Energy (BLE)</strong>
                <span className="rounded bg-[var(--cyan-soft)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--cyan)]">
                  NATIVE BROWSER API
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] max-w-sm">
                Pairs with any Polar H10, Garmin HRM-Pro, Wahoo TICKR, or Bluetooth heart rate monitor.
              </p>
            </div>
            <button
              type="button"
              disabled={isScanningBle}
              onClick={handleBleConnect}
              className="w-full sm:w-auto rounded-xl bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--teal-600)] transition-all disabled:opacity-50 shrink-0"
            >
              {isScanningBle ? "Searching..." : "Pair BLE Device"}
            </button>
          </div>

          {/* Option 2: CardioCore IoT Patch 2 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[var(--teal)] transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <strong className="text-sm text-[var(--hi)]">CardioCore Patch 2 (250 Hz IoT)</strong>
                <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--green)]">
                  HIGH RESOLUTION
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] max-w-sm">
                Direct WebSocket stream from CardioCore chest patch with 16-bit ADC single-lead ECG.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                connectPatchSensor(patchSerial);
                showToast("Connected to CardioCore Patch 2 (250 Hz stream active).", "ok");
                onClose();
              }}
              className="w-full sm:w-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold text-[var(--hi)] hover:bg-[var(--tint)] transition-all shrink-0"
            >
              Connect Patch
            </button>
          </div>

          {/* Option 3: Continuous Calibrated Stream */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[var(--teal)] transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <strong className="text-sm text-[var(--hi)]">Simulated Real-Time Corridor</strong>
              </div>
              <p className="text-xs text-[var(--muted)] max-w-sm">
                Generates continuous physiological respiratory sinus arrhythmia and dynamic ECG.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                connectSimulatedSensor();
                showToast("Switched to dynamic simulated telemetry corridor.", "ok");
                onClose();
              }}
              className="w-full sm:w-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-bold text-[var(--hi)] hover:bg-[var(--tint)] transition-all shrink-0"
            >
              Start Stream
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          {sensorInfo.status === "connected" && (
            <button
              type="button"
              onClick={() => {
                disconnectSensor();
                showToast("Sensor disconnected.", "info");
              }}
              className="rounded-xl border border-[var(--red)]/40 px-3.5 py-1.5 text-xs font-semibold text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors"
            >
              Disconnect Sensor
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
