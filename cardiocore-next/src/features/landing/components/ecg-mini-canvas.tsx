"use client";

import React, { useEffect, useRef } from "react";

/**
 * P-QRS-T mathematical Gaussian mixture model from original CardioCore engine (src/60_core.js).
 * Preserves the exact physiological waveform shape.
 */
function beat(t: number, hr = 76): number {
  const period = 60 / hr;
  const p = (((t % period) + period) % period) / period;
  const g = (c: number, wd: number, amp: number) =>
    amp * Math.exp(-Math.pow((p - c) / wd, 2));

  return (
    g(0.14, 0.028, 0.14) - // P wave
    g(0.205, 0.008, 0.1) + // Q wave
    g(0.225, 0.0075, 1.0) - // R peak
    g(0.25, 0.011, 0.26) + // S dip
    g(0.42, 0.055, 0.28) // T wave
  );
}

export interface LiveEcgCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const LiveEcgCanvas: React.FC<LiveEcgCanvasProps> = ({
  width = 360,
  height = 64,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let isVisible = true;
    let animFrame: number | null = null;
    let lastTime = 0;
    let ecgT = 0;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const drawGrid = (w: number, h: number, isDark: boolean) => {
      ctx.save();
      ctx.strokeStyle = isDark ? "#123238" : "#EDF7F6";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = isDark ? "#173E46" : "#DCEFEE";
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawTrace = (w: number, h: number, t0: number, isDark: boolean) => {
      const mid = h * 0.56;
      const A = h * 0.34 * 0.85;
      const pxPerSec = 155;

      ctx.beginPath();
      let prevY: number | null = null;

      for (let x = 0; x <= w; x += 1.5) {
        const t = t0 + x / pxPerSec;
        let v = beat(t, 76);
        v +=
          Math.sin(t * 57.3) * 0.012 +
          Math.sin(t * 23.7) * 0.01 +
          (Math.random() - 0.5) * 0.005;

        const y = mid - v * A;
        if (prevY === null) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        prevY = y;
      }

      ctx.strokeStyle = isDark ? "rgba(7, 28, 33, 0.9)" : "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.strokeStyle = isDark ? "#2FD3C0" : "#0E9E9E";
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    };

    const render = (time: number) => {
      if (!isVisible) return;

      if (time - lastTime >= 33) {
        lastTime = time;
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";

        ctx.clearRect(0, 0, width, height);
        drawGrid(width, height, isDark);
        drawTrace(width, height, prefersReduced ? 0 : ecgT, isDark);

        if (!prefersReduced) {
          ecgT += 0.02;
        }
      }

      if (!prefersReduced) {
        animFrame = requestAnimationFrame(render);
      }
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !prefersReduced && animFrame === null) {
          animFrame = requestAnimationFrame(render);
        }
      });
      observer.observe(canvas);

      if (!prefersReduced) {
        animFrame = requestAnimationFrame(render);
      } else {
        render(0);
      }

      return () => {
        observer.disconnect();
        if (animFrame) cancelAnimationFrame(animFrame);
      };
    } else {
      if (!prefersReduced) {
        animFrame = requestAnimationFrame(render);
      } else {
        render(0);
      }
      return () => {
        if (animFrame) cancelAnimationFrame(animFrame);
      };
    }
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px` }}
      className={className}
      aria-label="Live continuous Lead I ECG waveform"
    />
  );
};

export const HrSparkline: React.FC<{ width?: number; height?: number; className?: string }> = ({
  width = 170,
  height = 38,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const data = [70, 69, 71, 68, 70, 69, 68, 70, 69, 68, 69, 68];
    const min = 66;
    const max = 73;

    ctx.clearRect(0, 0, width, height);

    const step = width / (data.length - 1);
    const getY = (val: number) => height - ((val - min) / (max - min)) * (height - 8) - 4;

    ctx.beginPath();
    ctx.moveTo(0, getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      const prevX = (i - 1) * step;
      const prevY = getY(data[i - 1]);
      const curX = i * step;
      const curY = getY(data[i]);
      const midX = (prevX + curX) / 2;
      ctx.bezierCurveTo(midX, prevY, midX, curY, curX, curY);
    }

    ctx.strokeStyle = isDark ? "#2FD3C0" : "#0E9E9E";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Area fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, isDark ? "rgba(47, 211, 192, 0.25)" : "rgba(14, 158, 158, 0.2)");
    grad.addColorStop(1, "rgba(14, 158, 158, 0)");
    ctx.fillStyle = grad;
    ctx.fill();
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px` }}
      className={className}
      aria-label="24-hour resting heart rate trend sparkline"
    />
  );
};
