"use client";

import React, { useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { HrSparkline, LiveEcgCanvas } from "./ecg-mini-canvas";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    () => false
  );
}

export const HeroHeartStage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 0, py: 0 });
  const reducedMotion = usePrefersReducedMotion();

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    // Restrained, subtle clinical rotation (max ~6 deg yaw, ~4 deg pitch)
    setTilt({
      ry: nx * 9,
      rx: -ny * 6,
      px: nx * 10,
      py: ny * 8,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, px: 0, py: 0 });
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-[380px] sm:h-[480px] lg:h-[540px] flex items-center justify-center select-none perspective-[1200px]"
      aria-label="Interactive anatomical heart visualization and real-time clinical indicators"
    >
      {/* Background Orbit Ring */}
      <div
        className="absolute w-[80%] sm:w-[74%] aspect-square rounded-full border border-dashed border-[var(--border-2)]/60 animate-orbit pointer-events-none"
        aria-hidden="true"
      />

      {/* Concentric Pulse Rings */}
      <div
        className="absolute w-[44%] aspect-square rounded-full border-2 border-[var(--teal)]/30 animate-beatring pointer-events-none z-[1]"
        aria-hidden="true"
      />
      <div
        className="absolute w-[44%] aspect-square rounded-full border-2 border-[var(--teal)]/20 animate-beatring-delayed pointer-events-none z-[1]"
        aria-hidden="true"
      />

      {/* Soft Ambient Bloom Glow */}
      <div
        className="absolute w-[68%] aspect-square rounded-full pointer-events-none z-0 blur-[36px] opacity-40 dark:opacity-25 bg-[radial-gradient(circle_at_50%_46%,rgba(14,158,158,0.5),rgba(18,166,207,0.2)_45%,transparent_70%)] animate-bloombeat"
        aria-hidden="true"
      />

      {/* Heart Floor Shadow */}
      <div
        className="absolute bottom-[6%] w-[46%] h-[24px] rounded-full pointer-events-none z-0 blur-[8px] bg-[radial-gradient(ellipse_at_center,rgba(9,95,99,0.35),transparent_72%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.6),transparent_72%)]"
        aria-hidden="true"
      />

      {/* Inverted Reflection */}
      <div
        className="absolute bottom-[3%] w-[58%] max-w-[280px] sm:max-w-[310px] pointer-events-none z-[1] opacity-25 blur-[2.5px] scale-y-[-1] [mask-image:linear-gradient(to_top,rgba(0,0,0,0.6),transparent_65%)]"
        style={{
          transform: reducedMotion
            ? "scaleY(-1)"
            : `scaleY(-1) translate3d(${tilt.px * 0.5}px, 0, 0) rotateY(${-tilt.ry}deg)`,
          transition: "transform 0.15s ease-out",
        }}
        aria-hidden="true"
      >
        <Image
          src="/assets/heart-q.png"
          alt=""
          width={330}
          height={468}
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Preserved Original Heart Graphic */}
      <div
        className="relative z-[2] w-[62%] max-w-[280px] sm:max-w-[330px] filter drop-shadow-[0_24px_44px_rgba(9,95,99,0.26)] dark:drop-shadow-[0_28px_48px_rgba(0,0,0,0.7)]"
        style={{
          transform: reducedMotion
            ? "none"
            : `translate3d(${tilt.px}px, ${tilt.py}px, 0) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.15s ease-out",
          transformStyle: "preserve-3d",
        }}
      >
        <Image
          src="/assets/heart-q.png"
          alt="Anatomical heart rendered in CardioCore teal palette"
          width={330}
          height={468}
          priority
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Floating Card 1: Resting Heart Rate */}
      <div
        className="absolute top-[4%] sm:top-[6%] left-[-2%] sm:left-[0%] z-[3] p-3 sm:p-3.5 rounded-[16px] bg-[var(--surface)]/95 dark:bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] shadow-[var(--sh-2)] animate-float-1 max-w-[175px] sm:max-w-[190px]"
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-0.5">
          <span>Resting HR</span>
          <span className="text-[8.5px] font-mono text-[var(--muted)] uppercase font-medium">Demo</span>
        </div>
        <div className="font-display font-bold text-lg sm:text-xl text-[var(--hi)] flex items-baseline gap-1">
          68 <span className="text-xs font-mono font-medium text-[var(--muted)]">BPM</span>
        </div>
        <div className="mt-1 w-full h-[32px]">
          <HrSparkline width={160} height={32} />
        </div>
      </div>

      {/* Floating Card 2: Live ECG Lead I */}
      <div
        className="absolute bottom-[4%] sm:bottom-[6%] right-[-2%] sm:right-[2%] z-[3] p-3 sm:p-3.5 rounded-[16px] bg-[var(--surface)]/95 dark:bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] shadow-[var(--sh-2)] animate-float-2 min-w-[190px] sm:min-w-[240px]"
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
          <span>ECG &bull; Lead I (Simulated)</span>
          <span className="flex items-center gap-1 text-[var(--green)] font-semibold lowercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            live
          </span>
        </div>
        <div className="w-full h-[46px] rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
          <LiveEcgCanvas width={240} height={46} />
        </div>
      </div>
    </div>
  );
};
