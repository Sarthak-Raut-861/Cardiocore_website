"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useTelemetryStream } from "@/lib/telemetry/use-telemetry-stream";

interface LiveWaveformMonitorProps {
  wsUrl?: string;
  isBackendConnected?: boolean;
  className?: string;
}

// Generate static resting 250 Hz baseline synthetic samples (5s = 1250 samples)
function generateDemoSamples(): number[] {
  const totalSamples = 1250;
  const s: number[] = [];
  const rr = (250 * 60) / 72; // ~72 bpm
  for (let i = 0; i < totalSamples; i++) {
    const phase = (i % rr) / rr;
    let val = 0;
    if (phase >= 0.1 && phase <= 0.2) val += 150 * Math.sin((Math.PI * (phase - 0.1)) / 0.1);
    else if (phase >= 0.28 && phase <= 0.3) val -= 200 * Math.sin((Math.PI * (phase - 0.28)) / 0.02);
    else if (phase >= 0.3 && phase <= 0.34) val += 1600 * Math.sin((Math.PI * (phase - 0.3)) / 0.04);
    else if (phase >= 0.34 && phase <= 0.37) val -= 350 * Math.sin((Math.PI * (phase - 0.34)) / 0.03);
    else if (phase >= 0.5 && phase <= 0.65) val += 300 * Math.sin((Math.PI * (phase - 0.5)) / 0.15);
    s.push(Math.round(val));
  }
  return s;
}

const DEFAULT_DEMO_SAMPLES = generateDemoSamples();

export function LiveWaveformMonitor({
  wsUrl,
  isBackendConnected = false,
  className = "",
}: LiveWaveformMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Hook into telemetry binary stream
  const {
    connectionState,
    errorMessage,
    stats,
    qualityFlags,
    samples,
    reconnect,
    resetBuffer,
  } = useTelemetryStream({
    wsUrl,
    enabled: isBackendConnected && Boolean(wsUrl),
    bufferCapacity: 1250, // 5 seconds at 250 Hz
  });

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Active samples to render: real stream if connected, else demo baseline
  const activeSamples = useMemo(() => {
    if (isBackendConnected) {
      return samples;
    }
    return DEFAULT_DEMO_SAMPLES;
  }, [isBackendConnected, samples]);

  // Canvas Waveform Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepOffset = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(160, Math.floor(rect.height || 200));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Draw Medical Standard ECG Grid
      ctx.fillStyle = "#0c1514"; // Sleek clinical dark-slate canvas
      ctx.fillRect(0, 0, w, h);

      // Minor grid (1mm ~ 4px)
      ctx.strokeStyle = "rgba(42, 157, 143, 0.08)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 10) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 10) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Major grid (5mm ~ 20px)
      ctx.strokeStyle = "rgba(42, 157, 143, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Calibration indicator (1 mV = 10 mm ~ 40px)
      ctx.strokeStyle = "rgba(42, 157, 143, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, h / 2);
      ctx.lineTo(15, h / 2);
      ctx.lineTo(15, h / 2 - 30);
      ctx.lineTo(25, h / 2 - 30);
      ctx.lineTo(25, h / 2);
      ctx.lineTo(30, h / 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "9px monospace";
      ctx.fillText("1 mV", 12, h / 2 - 34);

      // 2. Draw Physiological Waveform
      const centerY = h / 2;
      const data = activeSamples;
      const count = data.length;

      if (count > 1) {
        ctx.beginPath();
        ctx.strokeStyle = qualityFlags.isLeadOff
          ? "#e76f51" // Warning amber/coral on lead off
          : qualityFlags.isClipped
          ? "#f43f5e" // Rose on clipping
          : "#2dd4bf"; // CardioCore Teal
        ctx.lineWidth = 1.8;
        ctx.lineJoin = "round";

        const stepX = (w - 40) / Math.max(1, count - 1);
        const startX = 35;

        for (let i = 0; i < count; i++) {
          const raw = data[i];
          // Scale raw int16 (±2000 ADC units ~ ±1 mV) to pixels
          const ampY = (raw / 2000) * 35;
          const px = startX + i * stepX;
          const py = Math.max(5, Math.min(h - 5, centerY - ampY));

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        // Sweep / Playhead marker
        if (!isPaused && !prefersReducedMotion) {
          const sweepX = startX + ((sweepOffset % count) / count) * (w - 40);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sweepX, 0);
          ctx.lineTo(sweepX, h);
          ctx.stroke();
          sweepOffset += 2;
        }
      } else {
        // Flatline / Waiting state
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(35, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
      }

      ctx.restore();

      if (!isPaused && !prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeSamples, isPaused, prefersReducedMotion, qualityFlags]);

  const statusBadge = useMemo(() => {
    if (!isBackendConnected) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-800/40">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Demonstration Mode
        </span>
      );
    }

    switch (connectionState) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800/40">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Connected (250 Hz)
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-800/40">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            Connecting...
          </span>
        );
      case "reconnecting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-800/40">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Reconnecting (Backoff Active)...
          </span>
        );
      case "unavailable":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-800/40">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Server Unavailable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-400 border border-slate-700">
            Disconnected
          </span>
        );
    }
  }, [isBackendConnected, connectionState]);

  return (
    <section
      role="region"
      aria-label="Live Single-Lead Synthetic ECG Waveform Monitor"
      className={`space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-2)] ${className}`}
    >
      {/* 1. Mandatory Persistent Data-Provenance Banner */}
      <div
        role="alert"
        aria-live="polite"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">⚠️</span>
            <div>
              <p className="font-mono text-xs font-bold tracking-wider uppercase text-amber-300">
                SYNTHETIC TELEMETRY — NOT REAL PATIENT DATA
              </p>
              <p className="text-[11px] text-amber-200/80">
                Single-Lead physiological stream (Lead-II · 250 Hz) for bench validation and edge testing only. Not clinically validated.
              </p>
            </div>
          </div>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
            PHASE 9 SYNTHETIC BENCH
          </span>
        </div>
      </div>

      {/* 2. Monitor Header & Status Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-bold text-[var(--hi)]">
            Single-Lead Live Monitor (Lead-II)
          </h2>
          {statusBadge}
        </div>

        {/* Quality Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium font-mono">
          <span
            className={`rounded-md px-2 py-1 border ${
              qualityFlags.isLeadOff
                ? "bg-rose-950/50 text-rose-300 border-rose-800"
                : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
            }`}
          >
            {qualityFlags.isLeadOff ? "⚡ LEAD-OFF WARNING" : "✓ Lead Contact OK"}
          </span>

          <span
            className={`rounded-md px-2 py-1 border ${
              qualityFlags.isClipped
                ? "bg-rose-950/50 text-rose-300 border-rose-800"
                : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
            }`}
          >
            {qualityFlags.isClipped ? "⚠️ ADC Clipping" : "✓ Dynamic Range OK"}
          </span>

          <span
            className={`rounded-md px-2 py-1 border ${
              qualityFlags.isClockUnsync
                ? "bg-amber-950/50 text-amber-300 border-amber-800"
                : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
            }`}
          >
            {qualityFlags.isClockUnsync ? "⏱ Clock Drift" : "✓ Clock Sync"}
          </span>

          {stats.isStale && (
            <span className="rounded-md bg-amber-950/50 px-2 py-1 text-amber-300 border border-amber-800 animate-pulse">
              ⏳ Stale Telemetry (&gt;3s)
            </span>
          )}
        </div>
      </div>

      {/* 3. Server Unavailable or Error Banner (NO silent demo fallback) */}
      {isBackendConnected && connectionState === "unavailable" && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-rose-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-sm text-rose-100">
                Real Backend Telemetry Stream Unavailable
              </p>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {errorMessage || "Connection dropped and cannot be reached."} Silent demonstration fallback is disabled per safety requirements.
              </p>
            </div>
            <button
              onClick={reconnect}
              className="rounded-xl bg-rose-800/60 hover:bg-rose-700/60 px-3.5 py-1.5 text-xs font-semibold text-rose-100 border border-rose-600/40 transition-colors self-start sm:self-auto"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* 4. Canvas Waveform Strip */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[#0c1514]">
        <canvas
          ref={canvasRef}
          className="h-44 w-full block cursor-crosshair"
          height={180}
          aria-label="Lead-II live ECG waveform strip running at 25 mm per second"
        />

        {/* Paper Speed & Gain Overlay */}
        <div className="absolute bottom-2 right-3 flex items-center gap-2 font-mono text-[10px] text-emerald-400/70 bg-black/50 backdrop-blur px-2 py-1 rounded">
          <span>25 mm/s</span>
          <span>•</span>
          <span>10 mm/mV</span>
          <span>•</span>
          <span>Lead-II (250 Hz)</span>
        </div>
      </div>

      {/* 5. Stream Statistics & Bounded Buffer Telemetry Readout */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs text-[var(--mid)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[10px] text-[var(--muted)] uppercase block font-sans font-semibold">
            Sequence Counter
          </span>
          <span className="text-sm font-bold text-[var(--hi)]">
            #{stats.lastSequence || (isBackendConnected ? "—" : "SIM-01")}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[10px] text-[var(--muted)] uppercase block font-sans font-semibold">
            Packets / Frames
          </span>
          <span className="text-sm font-bold text-[var(--hi)]">
            {stats.framesReceived} received
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[10px] text-[var(--muted)] uppercase block font-sans font-semibold">
            Sequence Gaps / Dropped
          </span>
          <span
            className={`text-sm font-bold ${
              stats.missingGaps > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {stats.missingGaps} gaps ({stats.duplicates} dups)
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <span className="text-[10px] text-[var(--muted)] uppercase block font-sans font-semibold">
            Bounded Buffer Depth
          </span>
          <span className="text-sm font-bold text-[var(--hi)]">
            {activeSamples.length} / 1250 samples
          </span>
        </div>
      </div>

      {/* 6. Accessible Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
          >
            {isPaused ? "▶ Resume Sweep" : "⏸ Pause Sweep"}
          </button>
          <button
            onClick={resetBuffer}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--mid)] hover:text-[var(--hi)] transition-colors"
          >
            Clear Buffer
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>Provenance:</span>
          <span className="font-semibold text-[var(--hi)]">
            {isBackendConnected
              ? "FastAPI Real-Backend WebSocket (mode=monitor)"
              : "Isolated Demonstration Bench"}
          </span>
        </div>
      </div>
    </section>
  );
}
