"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function HeroInteractiveBackground() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse coordinate motion values for smooth spotlight & parallax
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Smooth springs for floating parallax badges (physics based)
  const springX = useSpring(mouseX, { stiffness: 45, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 45, damping: 25 });

  // Parallax offsets for floating badges
  const badge1X = useTransform(springX, [0, 1], [-25, 25]);
  const badge1Y = useTransform(springY, [0, 1], [-20, 20]);

  const badge2X = useTransform(springX, [0, 1], [30, -30]);
  const badge2Y = useTransform(springY, [0, 1], [-18, 18]);

  const badge3X = useTransform(springX, [0, 1], [-35, 35]);
  const badge3Y = useTransform(springY, [0, 1], [22, -22]);

  const badge4X = useTransform(springX, [0, 1], [28, -28]);
  const badge4Y = useTransform(springY, [0, 1], [25, -25]);

  // Pixel coordinates for spotlight
  const [pixelCoords, setPixelCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = (e.clientY - rect.top) / rect.height;

      mouseX.set(relativeX);
      mouseY.set(relativeY);

      setPixelCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* ══════════════════════════════════════════════════════════════
          LAYER 1: FLUID MULTI-COLOR AURORA MESH
          3 Large breathing atmospheric orbs with GPU transforms
          ══════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orb 1: Electric Cobalt (Top Left) */}
        <motion.div
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[180px] -left-[140px] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-blue-500/20 via-sky-400/15 to-transparent blur-[120px] will-change-transform"
        />

        {/* Orb 2: Vivid Cyan & Sky (Top Right / Center) */}
        <motion.div
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 35, -45, 0],
            scale: [1, 0.92, 1.18, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[160px] right-[5%] w-[680px] h-[680px] rounded-full bg-gradient-to-bl from-cyan-400/20 via-blue-400/10 to-transparent blur-[130px] will-change-transform"
        />

        {/* Orb 3: Luminous Emerald & Indigo (Center Below Headline) */}
        <motion.div
          animate={{
            x: [0, 35, -25, 0],
            y: [0, -25, 30, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[220px] left-1/2 -translate-x-1/2 w-[720px] h-[550px] rounded-full bg-gradient-to-tr from-emerald-400/12 via-indigo-500/10 to-transparent blur-[140px] will-change-transform"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LAYER 2: INTERACTIVE SPOTLIGHT & ARCHITECTURAL GRID
          Fine coordinate grid with dynamic mouse spotlight illumination
          ══════════════════════════════════════════════════════════════ */}
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 65% at 50% 30%, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 65% at 50% 30%, black 40%, transparent 85%)",
        }}
      />

      {/* Interactive Mouse Spotlight (Reveals energetic radiant glow under cursor) */}
      {pixelCoords && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(650px circle at ${pixelCoords.x}px ${pixelCoords.y}px, rgba(0, 113, 227, 0.12), rgba(6, 182, 212, 0.06) 45%, transparent 75%)`,
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          LAYER 3: ANIMATED HIGH-SPEED DATA BEAMS (21 Ingestion Feeds)
          Glowing curved SVG laser tracks traveling across the canvas
          ══════════════════════════════════════════════════════════════ */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Laser beam gradients */}
          <linearGradient id="laser-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0071e3" stopOpacity="0" />
            <stop offset="50%" stopColor="#0071e3" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="laser-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="1" />
          </linearGradient>

          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Track A: Top Left to Right Arc */}
        <path
          d="M -100 120 Q 300 40 700 130 T 1500 100"
          fill="none"
          stroke="rgba(0, 113, 227, 0.08)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />

        {/* Pulsing Light Beam A */}
        <motion.path
          d="M -100 120 Q 300 40 700 130 T 1500 100"
          fill="none"
          stroke="url(#laser-blue)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#laser-glow)"
          initial={{ strokeDasharray: "120 1800", strokeDashoffset: 1800 }}
          animate={{ strokeDashoffset: -1800 }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Track B: Lower Sweep across behind showcase */}
        <path
          d="M -50 380 Q 400 440 900 360 T 1800 410"
          fill="none"
          stroke="rgba(16, 185, 129, 0.07)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
        />

        {/* Pulsing Light Beam B */}
        <motion.path
          d="M -50 380 Q 400 440 900 360 T 1800 410"
          fill="none"
          stroke="url(#laser-emerald)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#laser-glow)"
          initial={{ strokeDasharray: "160 2200", strokeDashoffset: 2200 }}
          animate={{ strokeDashoffset: -2200 }}
          transition={{
            duration: 9.5,
            repeat: Infinity,
            ease: "linear",
            delay: 1.5,
          }}
        />
      </svg>

      {/* ══════════════════════════════════════════════════════════════
          LAYER 4: FLOATING 3D PARALLAX CAREER CONSTELLATION BADGES
          Realistic glassmorphic signal chips drifting with mouse parallax
          (Positioned safely on outer edges with wide margins)
          ══════════════════════════════════════════════════════════════ */}
      <div className="hidden 2xl:block absolute inset-0 w-full px-8 pointer-events-none">
        {/* Floating Chip 1: Top Left (Stripe Greenhouse) */}
        <motion.div
          style={{ x: badge1X, y: badge1Y }}
          animate={{
            y: [-6, 6, -6],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-28 left-8 2xl:left-12 px-3.5 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-2.5 text-[12px] font-semibold text-[#0f0f11]"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-blue-600 font-bold">Stripe</span>
          <span className="text-[#86868b]">•</span>
          <span>$190k</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
            Greenhouse Direct
          </span>
        </motion.div>

        {/* Floating Chip 2: Top Right (ATS 98% Pass) */}
        <motion.div
          style={{ x: badge2X, y: badge2Y }}
          animate={{
            y: [7, -7, 7],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
          className="absolute top-24 right-8 2xl:right-12 px-3.5 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-emerald-200/80 shadow-[0_8px_30px_rgba(16,185,129,0.08)] flex items-center gap-2.5 text-[12px] font-semibold text-[#0f0f11]"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span>98% ATS Pass</span>
          <span className="text-[#86868b]">•</span>
          <span className="text-emerald-700 font-mono text-[11px]">Workday Safe</span>
        </motion.div>

        {/* Floating Chip 3: Mid-Left (AstreShield Ghost Defense) */}
        <motion.div
          style={{ x: badge3X, y: badge3Y }}
          animate={{
            y: [-8, 8, -8],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
          className="absolute top-[440px] left-8 2xl:left-12 px-3.5 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-2 text-[12px] font-semibold text-[#0f0f11]"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ghost Postings Quarantined</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
            0% Scams
          </span>
        </motion.div>

        {/* Floating Chip 4: Mid-Right (Linear Ashby Pipeline) */}
        <motion.div
          style={{ x: badge4X, y: badge4Y }}
          animate={{
            y: [8, -8, 8],
          }}
          transition={{
            duration: 7.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute top-[460px] right-8 2xl:right-12 px-3.5 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-purple-200/70 shadow-[0_8px_30px_rgba(168,85,247,0.08)] flex items-center gap-2.5 text-[12px] font-semibold text-[#0f0f11]"
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-[#0f0f11] font-bold">Linear</span>
          <span className="text-[#86868b]">•</span>
          <span className="text-emerald-600 font-semibold">$210k</span>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono">
            Ashby
          </span>
        </motion.div>
      </div>

      {/* Soft Vignette Mask (Guarantees zero sharp cutoffs at edges) */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#fafafa] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#fafafa] to-transparent pointer-events-none" />
    </div>
  );
}
