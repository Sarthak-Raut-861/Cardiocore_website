"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDoctorDashboard } from "../context/doctor-dashboard-context";

type RangeId = "7D" | "30D" | "90D" | "1Y";

export function DoctorAnalyticsView() {
  const { showToast } = useDoctorDashboard();
  const [selectedRange, setSelectedRange] = useState<RangeId>("30D");

  const alertMixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Alert Mix Chart (Weekly stacked bins)
  useEffect(() => {
    const canvas = alertMixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width));
    const h = 200;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Data for 4 weekly bars [L1, L2, L3]
    const weeks = [
      { label: "W1", l1: 8, l2: 3, l3: 1 },
      { label: "W2", l1: 11, l2: 4, l3: 0 },
      { label: "W3", l1: 7, l2: 2, l3: 1 },
      { label: "W4", l1: 6, l2: 2, l3: 1 },
    ];

    const paddingX = 40;
    const paddingY = 30;
    const plotW = w - paddingX * 2;
    const plotH = h - paddingY * 2;
    const barW = Math.min(48, plotW / weeks.length - 24);
    const maxVal = 18;

    // Gridlines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = paddingY + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(w - paddingX, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(maxVal - (maxVal / 3) * i)), paddingX - 6, y + 3);
    }

    // Stacked Bars
    weeks.forEach((wk, i) => {
      const step = plotW / weeks.length;
      const x = paddingX + step * i + (step - barW) / 2;
      let curY = paddingY + plotH;

      // L1 (Informational - Emerald)
      const h1 = (wk.l1 / maxVal) * plotH;
      ctx.fillStyle = "#10B981";
      ctx.fillRect(x, curY - h1, barW, h1);
      curY -= h1;

      // L2 (Attention - Amber)
      const h2 = (wk.l2 / maxVal) * plotH;
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(x, curY - h2, barW, h2);
      curY -= h2;

      // L3 (Urgent - Rose)
      const h3 = (wk.l3 / maxVal) * plotH;
      ctx.fillStyle = "#F43F5E";
      ctx.fillRect(x, curY - h3, barW, h3);

      // Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(wk.label, x + barW / 2, paddingY + plotH + 16);
    });
  }, [selectedRange]);

  // Render Quality vs Load Correlation Chart
  useEffect(() => {
    const canvas = qualityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width));
    const h = 200;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const paddingX = 40;
    const paddingY = 30;
    const plotW = w - paddingX * 2;
    const plotH = h - paddingY * 2;

    // Gridlines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = paddingY + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(w - paddingX, y);
      ctx.stroke();
    }

    // Points: Normalized quality index vs alerts
    const points = [
      { q: 0.94, alerts: 12 },
      { q: 0.91, alerts: 14 },
      { q: 0.88, alerts: 10 },
      { q: 0.95, alerts: 10 },
    ];

    // Plot Quality line (Cyan)
    ctx.strokeStyle = "#06B6D4";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = paddingX + (plotW / (points.length - 1)) * i;
      const y = paddingY + plotH - ((pt.q - 0.8) / 0.2) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot Alert Load line (Amber dashed)
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = paddingX + (plotW / (points.length - 1)) * i;
      const y = paddingY + plotH - (pt.alerts / 20) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [selectedRange]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sora">
              Clinical Practice Analytics
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Demo Metrics
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cohort-level view. Aggregated and de-identified — no patient identifiers leave the local boundary.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-surface-2/60 border border-border/60 rounded-lg">
          {(["7D", "30D", "90D", "1Y"] as RangeId[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedRange === range
                  ? "bg-cyan-500 text-navy-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Alerts raised ({selectedRange})
          </div>
          <div className="text-3xl font-bold font-sora text-foreground mt-1">46</div>
          <div className="text-xs text-emerald-400 font-medium mt-1">
            −18% vs previous period
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Urgent (Level 3)
          </div>
          <div className="text-3xl font-bold font-sora text-rose-400 mt-1">3</div>
          <div className="text-xs text-muted-foreground mt-1">All reviewed &lt; 60 min</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            False-positive review
          </div>
          <div className="text-3xl font-bold font-sora text-emerald-400 mt-1">4.2%</div>
          <div className="text-xs text-muted-foreground mt-1">Quality-gated before raising</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mean adherence
          </div>
          <div className="text-3xl font-bold font-sora text-foreground mt-1">91%</div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: "91%" }} />
          </div>
        </div>
      </div>

      {/* 2 Middle Canvas Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground font-sora">
              Alerts by Level ({selectedRange})
            </span>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> L3 Urgent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> L2 Attention
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> L1 Info
              </span>
            </div>
          </div>
          <div className="w-full h-[200px]">
            <canvas ref={alertMixCanvasRef} className="w-full h-full block" />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Weekly stacked alert distributions show decreasing total alert load as baseline models mature.
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground font-sora">
              Signal Quality vs Alert Load
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Inverse correlation
            </span>
          </div>
          <div className="w-full h-[200px]">
            <canvas ref={qualityCanvasRef} className="w-full h-full block" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Periods with lower average signal quality suppress alert generation — the system excludes uninterpretable data rather than guessing.
          </p>
        </div>
      </div>

      {/* Bottom 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Consults
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-semibold text-foreground">26</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Video share</span>
            <span className="font-semibold text-foreground">38%</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">No-show rate</span>
            <span className="font-semibold text-emerald-400">2.1%</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-muted-foreground">Median triage time</span>
            <span className="font-semibold text-foreground">42 s</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Outcomes Tracked
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Resting HR normalised</span>
            <span className="font-semibold text-emerald-400">7 patients</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">HRV recovered</span>
            <span className="font-semibold text-emerald-400">5 patients</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Medication adjusted</span>
            <span className="font-semibold text-foreground">4 patients</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-muted-foreground">Escalated to admission</span>
            <span className="font-semibold text-rose-400">1 patient</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/50 p-4 backdrop-blur-sm space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Data Governance &amp; Audit
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Record accesses logged</span>
            <span className="font-semibold text-foreground">1,284</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Consent withdrawals</span>
            <span className="font-semibold text-foreground">2</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-border/30">
            <span className="text-muted-foreground">Export requests</span>
            <span className="font-semibold text-foreground">6</span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-muted-foreground">Security breaches</span>
            <span className="font-semibold text-emerald-400">None</span>
          </div>
          <button
            type="button"
            onClick={() =>
              showToast(
                "Access audit for the last 30 days exported (sample mock log with de-identified hashes).",
                "ok"
              )
            }
            className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-white/5 text-foreground transition-colors cursor-pointer"
          >
            Export access audit
          </button>
        </div>
      </div>
    </div>
  );
}
