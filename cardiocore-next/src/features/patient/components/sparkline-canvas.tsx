"use client";

import React, { useRef, useEffect } from "react";

interface SparklineCanvasProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}

export function SparklineCanvas({
  data,
  color,
  width = 240,
  height = 40,
  className = "",
}: SparklineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;

    const pad = 4;
    const drawWidth = width - pad * 2;
    const drawHeight = height - pad * 2;

    const getX = (i: number) => pad + (i * drawWidth) / (data.length - 1);
    const getY = (val: number) => pad + drawHeight - ((val - min) / span) * drawHeight;

    // Draw gradient fill under curve
    ctx.beginPath();
    ctx.moveTo(getX(0), height);
    ctx.lineTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.lineTo(getX(data.length - 1), height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}33`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw latest point dot
    const lastX = getX(data.length - 1);
    const lastY = getY(data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
  }, [data, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px` }}
      className={`block ${className}`}
      aria-hidden="true"
    />
  );
}
