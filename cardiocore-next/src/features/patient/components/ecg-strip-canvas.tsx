"use client";

import React, { useRef, useEffect, useState } from "react";

interface EcgStripCanvasProps {
  hr?: number;
  height?: number;
  interactive?: boolean;
  isRecording?: boolean;
  className?: string;
}

export function EcgStripCanvas({
  hr = 76,
  height = 130,
  interactive = true,
  isRecording = false,
  className = "",
}: EcgStripCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let sweepX = 0;

    // IntersectionObserver to pause off-screen rendering
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    // Compute dimensions
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = height;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };
    updateSize();

    // Draw ECG Medical Grid
    const drawGrid = (w: number, h: number) => {
      ctx.fillStyle = "#F7FDFA";
      ctx.fillRect(0, 0, w, h);

      // Minor grid (1 mm ~ 4 px)
      ctx.beginPath();
      ctx.strokeStyle = "#E2F2EE";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 10) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 10) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Major grid (5 mm ~ 20 px)
      ctx.beginPath();
      ctx.strokeStyle = "#CBE6DF";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    };

    // Mathematical P-QRS-T complex generator
    // Returns normalized amplitude [-1.5 to 1.5] for beat cycle phase t in [0, 1)
    const getPqrsT = (t: number): number => {
      // P wave
      if (t >= 0.1 && t < 0.2) {
        return 0.15 * Math.sin(((t - 0.1) / 0.1) * Math.PI);
      }
      // Q wave
      if (t >= 0.24 && t < 0.27) {
        return -0.15 * Math.sin(((t - 0.24) / 0.03) * Math.PI);
      }
      // R peak
      if (t >= 0.27 && t < 0.33) {
        return 1.4 * Math.sin(((t - 0.27) / 0.06) * Math.PI);
      }
      // S wave
      if (t >= 0.33 && t < 0.38) {
        return -0.35 * Math.sin(((t - 0.33) / 0.05) * Math.PI);
      }
      // T wave
      if (t >= 0.46 && t < 0.65) {
        return 0.28 * Math.sin(((t - 0.46) / 0.19) * Math.PI);
      }
      // Baseline with tiny realistic micro-wander
      return 0.01 * Math.sin(t * Math.PI * 4);
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = height;

    // Initial grid render
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGrid(w, h);

    // Keep historical buffer for smooth sweep
    const points: number[] = new Array(w).fill(h / 2);
    let time = 0;
    const speed = 2.4; // px per frame
    const beatPeriod = (60 / hr) * 60; // frames per beat at 60fps

    const renderLoop = () => {
      if (!isVisible || !isPlaying) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      const rectNow = canvas.getBoundingClientRect();
      const currentWidth = Math.max(300, Math.floor(rectNow.width));

      // Advance sweep
      const prevX = sweepX;
      sweepX = (sweepX + speed) % currentWidth;

      // Calculate current voltage
      time += 1;
      const beatPhase = (time % beatPeriod) / beatPeriod;
      const voltage = getPqrsT(beatPhase);
      const baselineY = h * 0.52;
      const scale = h * 0.32;
      const newY = baselineY - voltage * scale;

      // Update point in buffer
      const currentIdx = Math.floor(sweepX);
      points[currentIdx] = newY;

      // Redraw grid segment in front of sweep head (clear head gap)
      const clearWidth = 24;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sweepX, 0, clearWidth, h);
      ctx.clip();
      drawGrid(currentWidth, h);
      ctx.restore();

      // Draw active segment
      ctx.beginPath();
      ctx.strokeStyle = isRecording ? "#E0453F" : "#0E9E9E";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const startIdx = Math.max(0, Math.floor(prevX) - 2);
      const endIdx = Math.min(currentWidth - 1, Math.floor(sweepX) + 1);

      if (startIdx < endIdx) {
        ctx.moveTo(startIdx, points[startIdx]);
        for (let i = startIdx + 1; i <= endIdx; i++) {
          ctx.lineTo(i, points[i]);
        }
        ctx.stroke();
      }

      // Draw lead indicator bar
      ctx.fillStyle = isRecording ? "#E0453F" : "#0E9E9E";
      ctx.fillRect(sweepX, newY - 4, 3, 8);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [hr, height, isPlaying, isRecording]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
        aria-label={`Live ECG Lead I at 250 Hz showing rhythm at ${hr} beats per minute. Synthetic waveform for interface demonstration.`}
      />
      {interactive && (
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute bottom-2 right-2 rounded-md bg-[var(--surface)]/90 px-2 py-1 text-xs font-medium text-[var(--mid)] backdrop-blur-sm border border-[var(--border)] hover:text-[var(--hi)] transition-colors"
          title={isPlaying ? "Pause sweep animation" : "Resume sweep animation"}
        >
          {isPlaying ? "Pause trace" : "Resume trace"}
        </button>
      )}
    </div>
  );
}
