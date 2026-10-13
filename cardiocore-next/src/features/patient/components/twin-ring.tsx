"use client";

import React from "react";

interface TwinRingProps {
  score?: number;
  size?: number;
  label?: string;
  statusText?: string;
  className?: string;
}

export function TwinRing({
  score = 82,
  size = 200,
  label = "State index",
  statusText = "Stable",
  className = "",
}: TwinRingProps) {
  // SVG circular arc calculations
  const radius = (size / 2) - 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="rotate-[-90deg] transform"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="twinRingGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0E9E9E" />
              <stop offset="100%" stop-color="#2CC0A8" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--tint)"
            strokeWidth="12"
          />
          {/* Active Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#twinRingGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-4xl font-bold tracking-tight text-[var(--hi)]">
            {score}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            {label}
          </span>
        </div>
      </div>

      {statusText && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
          {statusText}
        </div>
      )}
    </div>
  );
}
