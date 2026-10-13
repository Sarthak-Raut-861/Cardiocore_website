"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ChartSeries } from "../data/sample-charts";

interface TrendChartCanvasProps {
  series: ChartSeries;
  height?: number;
  className?: string;
}

export function TrendChartCanvas({
  series,
  height = 170,
  className = "",
}: TrendChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compute normal variability envelope bounds matching 81_charts.js
  const computeEnvelope = useCallback((vals: number[]) => {
    const n = vals.length;
    const lo: number[] = [];
    const hi: number[] = [];
    const trend: number[] = [];
    let e = vals[0];

    for (let i = 0; i < n; i++) {
      e = e + (vals[i] - e) * 0.35; // EWMA trend
      trend.push(e);

      const a = Math.max(0, i - 2);
      const b = Math.min(n - 1, i + 2);
      const window = vals.slice(a, b + 1);
      const mean = window.reduce((acc, v) => acc + v, 0) / window.length;
      const sd = Math.sqrt(window.reduce((acc, v) => acc + (v - mean) ** 2, 0) / window.length) || 1;

      lo.push(mean - sd * 1.5);
      hi.push(mean + sd * 1.5);
    }

    return { lo, hi, trend };
  }, []);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series.vals.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width));
    const h = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { vals, labels, color, base } = series;
    const n = vals.length;
    const pad = { l: 36, r: 16, t: 16, b: 28 };
    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;

    const minVal = Math.min(...vals, base ? base - 2 : Infinity);
    const maxVal = Math.max(...vals, base ? base + 2 : -Infinity);
    const span = maxVal - minVal || 1;
    const lo = minVal - span * 0.25;
    const hi = maxVal + span * 0.25;

    const getX = (i: number) => pad.l + (i * chartW) / Math.max(1, n - 1);
    const getY = (v: number) => pad.t + ((hi - v) / (hi - lo)) * chartH;

    // Background horizontal grid lines
    ctx.strokeStyle = "#E8F3F1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = 0; s <= 3; s++) {
      const yVal = lo + (s * (hi - lo)) / 3;
      const yPos = getY(yVal);
      ctx.moveTo(pad.l, yPos);
      ctx.lineTo(w - pad.r, yPos);

      // Y-axis label
      ctx.fillStyle = "#6E9A9E";
      ctx.font = "10px Manrope, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(yVal).toString(), pad.l - 6, yPos + 3);
    }
    ctx.stroke();

    // Baseline reference line
    if (typeof base === "number") {
      const baseY = getY(base);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#6E9A9E";
      ctx.lineWidth = 1.2;
      ctx.moveTo(pad.l, baseY);
      ctx.lineTo(w - pad.r, baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#6E9A9E";
      ctx.font = "9px Manrope, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`baseline ${base}`, pad.l + 4, baseY - 4);
    }

    // Normal variability envelope
    const env = computeEnvelope(vals);
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(env.hi[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(getX(i), getY(env.hi[i]));
    }
    for (let i = n - 1; i >= 0; i--) {
      ctx.lineTo(getX(i), getY(env.lo[i]));
    }
    ctx.closePath();
    ctx.fillStyle = `${color}14`; // ~8% opacity
    ctx.fill();

    // Data line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(vals[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(getX(i), getY(vals[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Data points & X labels
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const x = getX(i);
      const y = getY(vals[i]);

      // Draw point circle
      ctx.beginPath();
      ctx.arc(x, y, hoverIndex === i ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = hoverIndex === i ? "#FFFFFF" : color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      if (labels[i]) {
        ctx.fillStyle = "#6E9A9E";
        ctx.font = "11px Manrope, sans-serif";
        ctx.fillText(labels[i], x, h - 8);
      }
    }

    // Interactive Hover Crosshair
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
      const hX = getX(hoverIndex);
      const hY = getY(vals[hoverIndex]);

      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#37646A";
      ctx.lineWidth = 1;
      ctx.moveTo(hX, pad.t);
      ctx.lineTo(hX, h - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip pill
      const text = `${vals[hoverIndex]} ${series.unitSi}`;
      ctx.font = "bold 11px Manrope, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 16;
      const boxH = 22;
      const boxX = Math.min(Math.max(pad.l, hX - boxW / 2), w - pad.r - boxW);
      const boxY = Math.max(4, hY - 30);

      ctx.fillStyle = "#0A2B2F";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(text, boxX + boxW / 2, boxY + 15);
    }
  }, [series, height, hoverIndex, computeEnvelope]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !series.vals.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { l: 36, r: 16 };
    const chartW = rect.width - pad.l - pad.r;
    const idx = Math.round(((x - pad.l) / chartW) * (series.vals.length - 1));

    if (idx >= 0 && idx < series.vals.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block cursor-crosshair"
      />
      {/* Screen Reader Table */}
      <table className="sr-only">
        <caption>{series.name} Historical Trend</caption>
        <thead>
          <tr>
            <th>Time / Day</th>
            <th>Value ({series.unitSi})</th>
          </tr>
        </thead>
        <tbody>
          {series.vals.map((v, i) => (
            <tr key={i}>
              <td>{series.labels[i] || `Point ${i + 1}`}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
