"use client";

/**
 * CardioCoreEdge Multi-Lead Waveform Review Component
 * 
 * Provides synchronized, stacked multi-channel physiological waveform visualization
 * for persisted or active telemetry recordings.
 * 
 * Clinical Features:
 * - Stacked multi-lead canvas renderer with standard medical ECG grid
 * - Explicit lead labels (Lead-I, Lead-II, Lead-III, aVR, aVL, aVF, V1-V6)
 * - Synchronized shared time axis and sample alignment
 * - Real-time SQI, lead-off, clipping, and stale-data alerts
 * - Screen-reader accessibility and keyboard controls
 * - Persistent synthetic research disclaimer
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  useMultiLeadRecording,
  SENTINEL_MISSING_SAMPLE,
} from "../hooks/use-multilead-recording";

interface MultiLeadWaveformReviewProps {
  recordingId: string | null;
  className?: string;
}

export function MultiLeadWaveformReview({
  recordingId,
  className = "",
}: MultiLeadWaveformReviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [gainMultiplier, setGainMultiplier] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<string>("all");

  const {
    metadata,
    channels,
    activeLeads,
    samplingRateHz,
    latestSequenceNumber,
    sequenceGaps,
    averageSqi,
    leadOffMask,
    clippingMask,
    processedChunkCount,
    isLoading,
    isStale,
    error,
    refresh,
  } = useMultiLeadRecording(recordingId, {
    maxSamplesPerLead: 1250, // 5s at 250 Hz
    autoPoll: false,
  });

  const visibleLeads = useMemo(() => {
    if (selectedLead === "all") return activeLeads;
    return activeLeads.filter((l) => l === selectedLead);
  }, [activeLeads, selectedLead]);

  // Lead-off and Clipping bitmasks checking helpers
  const checkLeadOff = useCallback(
    (leadIndex: number) => Boolean(leadOffMask & (1 << leadIndex)),
    [leadOffMask]
  );
  const checkClipped = useCallback(
    (leadIndex: number) => Boolean(clippingMask & (1 << leadIndex)),
    [clippingMask]
  );

  // Canvas Waveform Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      // Dynamic height based on number of visible leads (min 100px per lead, max 800px)
      const leadCount = visibleLeads.length || 1;
      const targetHeight = Math.max(200, Math.min(800, leadCount * 90));
      const h = Math.max(180, Math.floor(rect.height || targetHeight));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Background: Dark clinical slate
      ctx.fillStyle = "#0a1110";
      ctx.fillRect(0, 0, w, h);

      // 2. Clinical ECG Grid
      // Minor grid: 10px (~1mm)
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

      // Major grid: 50px (~5mm)
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

      // 3. Draw Synchronized Stacked Traces
      if (visibleLeads.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          isLoading ? "Loading multi-lead recording..." : "No active channels to display",
          w / 2,
          h / 2
        );
        ctx.restore();
        return;
      }

      const laneHeight = h / visibleLeads.length;

      visibleLeads.forEach((leadName, laneIdx) => {
        const leadOriginalIndex = activeLeads.indexOf(leadName);
        const laneCenterY = laneIdx * laneHeight + laneHeight / 2;
        const leadSamples = channels[leadName] || [];

        // Channel baseline separator line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, laneIdx * laneHeight);
        ctx.lineTo(w, laneIdx * laneHeight);
        ctx.stroke();

        // Lead identifier label and status badges
        ctx.fillStyle = "rgba(0, 245, 212, 0.85)";
        ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(leadName, 12, laneIdx * laneHeight + 18);

        // Lead-off or Clipping indicators
        if (leadOriginalIndex >= 0 && checkLeadOff(leadOriginalIndex)) {
          ctx.fillStyle = "#f59e0b";
          ctx.font = "10px monospace";
          ctx.fillText("LEAD-OFF", 70, laneIdx * laneHeight + 18);
        }
        if (leadOriginalIndex >= 0 && checkClipped(leadOriginalIndex)) {
          ctx.fillStyle = "#ef4444";
          ctx.font = "10px monospace";
          ctx.fillText("CLIPPED", 130, laneIdx * laneHeight + 18);
        }

        if (leadSamples.length === 0) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
          ctx.font = "italic 11px system-ui";
          ctx.fillText("No samples available", 100, laneCenterY);
          return;
        }

        // Trace rendering: scale samples to lane height
        // Baseline scale: ADC ±2048 corresponds to ~70% of lane height
        const verticalScale = ((laneHeight * 0.35) / 2048) * gainMultiplier;
        const totalSamples = leadSamples.length;
        const xStep = w / Math.max(totalSamples - 1, 1);

        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();

        let isDrawing = false;

        for (let i = 0; i < totalSamples; i++) {
          const sample = leadSamples[i];
          const x = i * xStep;

          // Check for sentinel missing sample
          if (sample === SENTINEL_MISSING_SAMPLE) {
            isDrawing = false;
            continue;
          }

          // Invert Y axis (ECG standard: positive values deflect upwards)
          const y = laneCenterY - sample * verticalScale;

          if (!isDrawing) {
            ctx.moveTo(x, y);
            isDrawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // 4. Time Axis calibration banner (bottom-right)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `25 mm/s | 10 mm/mV | ${samplingRateHz} Hz | Gain: ${gainMultiplier.toFixed(1)}x`,
        w - 12,
        h - 8
      );

      ctx.restore();
    };

    render();

    if (!isPaused) {
      // Re-render periodically for any layout adjustments
      const interval = setInterval(render, 100);
      return () => clearInterval(interval);
    }
  }, [
    visibleLeads,
    channels,
    activeLeads,
    samplingRateHz,
    gainMultiplier,
    isPaused,
    checkLeadOff,
    checkClipped,
    isLoading,
  ]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${className}`}
      role="region"
      aria-label="Multi-Lead ECG Waveform Review"
    >
      {/* Top Header & Telemetry Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-wide flex items-center gap-2">
              Synchronized Multi-Lead Waveform Review
              {metadata && (
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-teal-950/80 text-teal-300 border border-teal-800/60">
                  {metadata.leadConfig} ({metadata.activeLeadsMask.toString(16).toUpperCase().padStart(4, "0")})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Protocol v2 Planar Transport • 250 Hz Synchronized Buffer
            </p>
          </div>
        </div>

        {/* Status Indicators & Quality Badges */}
        <div className="flex items-center gap-2 text-xs">
          {averageSqi !== null ? (
            <div
              className={`px-2.5 py-1 rounded font-mono border ${
                averageSqi >= 0.8
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                  : averageSqi >= 0.5
                  ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                  : "bg-rose-950/60 text-rose-300 border-rose-800/60"
              }`}
              title="Average Signal Quality Index"
            >
              SQI: {(averageSqi * 100).toFixed(0)}%
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
              SQI: Unknown
            </div>
          )}

          {isStale && (
            <div className="px-2 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
              STALE DATA
            </div>
          )}

          {sequenceGaps > 0 && (
            <div className="px-2 py-1 rounded bg-rose-950/80 text-rose-300 border border-rose-700/60 font-mono">
              GAPS: {sequenceGaps}
            </div>
          )}

          {latestSequenceNumber !== null && (
            <div className="text-slate-400 font-mono text-xs">
              Seq: #{latestSequenceNumber}
            </div>
          )}

          <div className="text-slate-400 font-mono text-xs">
            Chunks: {processedChunkCount}
          </div>
        </div>
      </div>

      {/* Control Bar: Lead Selector & Gain Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/40 border-b border-slate-800/50 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <label htmlFor="lead-filter" className="text-slate-400">
            Channel:
          </label>
          <select
            id="lead-filter"
            value={selectedLead}
            onChange={(e) => setSelectedLead(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 focus:ring-1 focus:ring-teal-400 outline-none"
          >
            <option value="all">All Visible Channels ({activeLeads.length})</option>
            {activeLeads.map((lead) => (
              <option key={lead} value={lead}>
                {lead}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Gain Adjuster */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Gain:</span>
            {[0.5, 1.0, 2.0].map((gain) => (
              <button
                key={gain}
                onClick={() => setGainMultiplier(gain)}
                className={`px-2 py-0.5 rounded font-mono text-xs transition-colors ${
                  gainMultiplier === gain
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {gain}x
              </button>
            ))}
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
          >
            {isPaused ? "Resume" : "Freeze"}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => void refresh()}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-teal-600/30 hover:bg-teal-600/40 text-teal-200 border border-teal-500/30 font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Main Waveform Canvas View */}
      <div className="relative w-full overflow-hidden min-h-[220px]">
        {error && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center">
            <div className="text-rose-400 text-sm font-semibold mb-1">
              Telemetry Retrieval Error
            </div>
            <div className="text-slate-400 text-xs max-w-md">{error}</div>
            <button
              onClick={() => void refresh()}
              className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
            >
              Retry
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ height: `${Math.max(200, Math.min(800, visibleLeads.length * 90))}px` }}
          aria-label="Multi-Lead ECG Signal Waveforms"
        />
      </div>

      {/* Mandatory Clinical Research Disclaimer */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 text-center">
        <p className="text-[11px] font-mono text-amber-400/90 tracking-wide">
          Synthetic research prototype. Not clinically validated or intended for diagnosis.
        </p>
      </div>
    </div>
  );
}
