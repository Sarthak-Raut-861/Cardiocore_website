"use client";

import React, { useRef, useEffect } from "react";
import { SAMPLE_DAY_POINTS } from "../data/sample-charts";

interface DayChartCanvasProps {
  height?: number;
  className?: string;
}

export function DayChartCanvas({
  height = 240,
  className = "",
}: DayChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;

    const minHr = 45;
    const maxHr = 130;

    const getX = (hourFraction: number) => pad.l + (hourFraction / 24) * chartW;
    const getY = (val: number) => pad.t + ((maxHr - val) / (maxHr - minHr)) * chartH;

    // Draw Shaded Period Bands
    // 1. Sleep: 00:00 to 06:30 and 23:00 to 24:00
    ctx.fillStyle = "rgba(122, 107, 240, 0.08)";
    ctx.fillRect(getX(0), pad.t, getX(6.5) - getX(0), chartH);
    ctx.fillRect(getX(23), pad.t, getX(24) - getX(23), chartH);

    // 2. Activity: 07:10 to 07:45
    ctx.fillStyle = "rgba(217, 131, 20, 0.12)";
    ctx.fillRect(getX(7.15), pad.t, getX(7.75) - getX(7.15), chartH);

    // Horizontal grid lines
    ctx.strokeStyle = "#E8F3F1";
    ctx.lineWidth = 1;
    [50, 70, 90, 110].forEach((rate) => {
      const y = getY(rate);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();

      ctx.fillStyle = "#6E9A9E";
      ctx.font = "10px Manrope, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${rate}`, pad.l - 6, y + 3);
    });

    // Baseline 69 bpm dashed line
    const baselineY = getY(69);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#0E9E9E";
    ctx.lineWidth = 1.2;
    ctx.moveTo(pad.l, baselineY);
    ctx.lineTo(w - pad.r, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve interpolation of 24h points
    const points = SAMPLE_DAY_POINTS.map((pt) => {
      const [hh, mm] = pt.time.split(":").map(Number);
      const frac = hh + mm / 60;
      return { x: getX(frac), y: getY(pt.hr), ...pt };
    });

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = "#0E9E9E";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Draw markers & annotated events
    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.activity === "walk" ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = pt.activity === "walk" ? "#D98314" : pt.activity === "sleep" ? "#7A6BF0" : "#0E9E9E";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // X-axis time marks
    ctx.fillStyle = "#6E9A9E";
    ctx.font = "11px Manrope, sans-serif";
    ctx.textAlign = "center";
    [0, 4, 8, 12, 16, 20, 24].forEach((hour) => {
      const x = getX(hour);
      ctx.fillText(`${String(hour).padStart(2, "0")}:00`, x, h - 8);
    });
  }, [height]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
        aria-label="24-hour heart rate timeline across the day showing sleep periods, activity peak, and return to baseline."
      />
    </div>
  );
}
