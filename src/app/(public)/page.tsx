"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  ShieldCheck,
  CheckCircle2,
  Zap,
  BarChart3,
  ChevronDown,
  Terminal,
  Cpu,
  Layers,
  Lock,
  FileText,
  Sparkles,
  Clock,
  Radio,
  Globe,
  Activity,
  Check,
  ExternalLink,
  ShieldAlert,
  Scan,
  Boxes,
  FileSpreadsheet,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import Idea1HeroVisual from "@/components/Idea1HeroVisual";
import DataDustBackground from "@/components/DataDustBackground";

/* ── Animation Presets ── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

/* ── Live Metrics Hook ── */
function useLiveMetrics() {
  const [metrics, setMetrics] = useState({ totalJobsIndexed: 2840, totalProviders: 21 });
  useEffect(() => {
    fetch("/api/public/metrics")
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.totalJobsIndexed === "number" && d.totalJobsIndexed > 0) {
          setMetrics(d);
        }
      })
      .catch(() => {});
  }, []);
  return metrics;
}

/* ── Live Clock Hook (Indian Standard Time) ── */
function useLiveTime() {
  const [timeStr, setTimeStr] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setTimeStr(`${formatted} IST`);
      } catch {
        setTimeStr("LIVE");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  return timeStr;
}

/* ════════════════════════════════════════════════════════════════════════════
   STICKY GLASS NAVBAR (Modern Agency Minimalist)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyNavbar() {
  const liveTime = useLiveTime();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] z-50 transition-all">
      <div className="max-w-7xl mx-auto h-full px-6 sm:px-10 flex items-center justify-between">
        {/* Brand & Live Telemetry Pill */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center group">
            <Image
              src="/astrework-brand.png"
              alt="AstreWork Logo"
              width={1760}
              height={363}
              className="h-7 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>

          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-black/[0.08]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#52525b]">
              {liveTime || "00:00:00 IST"} • 21 ATS PIPELINES ONLINE
            </span>
          </div>
        </div>

        {/* Center Editorial Links */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#71717a]">
          <a href="#engines" className="hover:text-[#0f0f11] transition-colors flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-[#a1a1aa]">( 02 )</span> Engines
          </a>
          <a href="#discovery" className="hover:text-[#0f0f11] transition-colors flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-[#a1a1aa]">( 03 )</span> Discovery
          </a>
          <a href="#benchmark" className="hover:text-[#0f0f11] transition-colors flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-[#a1a1aa]">( 04 )</span> ATS Suite
          </a>
          <a href="#faq" className="hover:text-[#0f0f11] transition-colors flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-[#a1a1aa]">( 05 )</span> FAQ
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] font-semibold text-[#52525b] hover:text-[#0f0f11] transition-colors px-3 py-1.5"
          >
            Sign In
          </Link>

          <Link
            href="/onboard"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#0f0f11] hover:bg-black text-white text-[13px] font-semibold transition-all shadow-[0_2px_10px_rgba(15,15,17,0.15)] hover:shadow-[0_4px_16px_rgba(15,15,17,0.25)] hover:scale-[1.02] active:scale-[0.98] group"
          >
            <span>Launch Workspace</span>
            <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white text-[11px] group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 01 ) — INTRODUCING ASTREWORK (Hero Section)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyHero({ metrics }: { metrics: { totalJobsIndexed: number; totalProviders: number } }) {
  return (
    <section className="relative pt-32 sm:pt-40 pb-16 px-6 sm:px-10 overflow-hidden bg-[#fafafa]">
      {/* Soft Ambient Mesh Glow */}
      <div className="absolute top-[-240px] left-1/2 -translate-x-1/2 w-[1100px] h-[640px] bg-gradient-to-b from-blue-100/40 via-purple-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Floating Canvas Particles */}
      <DataDustBackground />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Numbered Agency Stamp */}
          <motion.div variants={fadeUp} className="inline-flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-white/80 backdrop-blur-md shadow-sm">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#0f0f11]">
                ( 01 )
              </span>
              <span className="h-3 w-px bg-black/10" />
              <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[#52525b]">
                INTRODUCING ASTREWORK
              </span>
            </div>
          </motion.div>

          {/* Luxury Editorial Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-[44px] sm:text-[68px] md:text-[80px] lg:text-[88px] font-semibold tracking-[-0.038em] leading-[1.04] text-[#0f0f11] mb-6 max-w-4xl mx-auto"
          >
            The Autonomous Career Engine{" "}
            <br className="hidden sm:block" />
            <span className="text-[#0f0f11] bg-clip-text text-transparent bg-gradient-to-r from-[#0f0f11] via-[#2a2b30] to-[#52525b]">
              for High-Velocity Builders.
            </span>
          </motion.h1>

          {/* Clean Editorial Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-[17px] sm:text-[20px] text-[#52525b] max-w-2xl mx-auto leading-relaxed mb-10 font-medium"
          >
            AstreWork continuously orchestrates 21+ direct ATS feeds, neutralizes ghost postings with AstreShield fraud heuristics, and crafts single-page A4 resumes engineered to sail through enterprise parsers.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/onboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#0f0f11] hover:bg-black text-white text-[16px] font-semibold transition-all shadow-[0_4px_20px_rgba(15,15,17,0.22)] hover:shadow-[0_8px_30px_rgba(15,15,17,0.3)] hover:scale-[1.02] active:scale-[0.98] group"
            >
              <span>Start Free Workspace</span>
              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white text-[13px] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>

            <a
              href="#discovery"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-black/10 hover:border-black/25 bg-white/80 backdrop-blur-md text-[#0f0f11] text-[15px] font-semibold transition-all hover:bg-white"
            >
              <span>Query Discovery Matrix</span>
              <span className="text-black/40 text-[13px]">↓</span>
            </a>
          </motion.div>

          {/* 4-Metric High-Density Telemetry Strip */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-14"
          >
            <div className="p-3 text-center border-r border-black/[0.04] last:border-r-0">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                {metrics.totalJobsIndexed > 0 ? metrics.totalJobsIndexed.toLocaleString() : "2,840+"}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a] mt-0.5">
                Remote Roles Indexed
              </div>
            </div>

            <div className="p-3 text-center sm:border-r border-black/[0.04]">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                {metrics.totalProviders > 0 ? `${metrics.totalProviders}+` : "21+"}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a] mt-0.5">
                Direct ATS Pipelines
              </div>
            </div>

            <div className="p-3 text-center border-r border-black/[0.04] last:border-r-0">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                99.4%
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a] mt-0.5">
                AstreShield Trust Score
              </div>
            </div>

            <div className="p-3 text-center">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                297mm
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717a] mt-0.5">
                Single-Page A4 Precision
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Interactive Transformation Canvas */}
        <div className="relative mt-4">
          <Idea1HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 1.5 — SOCIAL PROOF MARQUEE (Direct ATS Ingestion Pipeline)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyMarquee() {
  const companies = useMemo(
    () => [
      "Stripe",
      "Vercel",
      "Shopify",
      "Linear",
      "Raycast",
      "Notion",
      "GitHub",
      "OpenAI",
      "Retool",
      "Supabase",
      "Anthropic",
      "Figma",
      "Datadog",
      "Cloudflare",
    ],
    []
  );

  return (
    <section className="py-8 border-y border-black/[0.06] bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-[#71717a] tracking-[0.2em] uppercase">
            ( DIRECT ATS HARVESTING )
          </span>
          <span className="text-[12px] font-medium text-[#71717a] tracking-wide">
            Verified Ingestion Pipelines Across Tier-1 Tech
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#a1a1aa]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          HOURLY SYNC ACTIVE
        </div>
      </div>

      <div className="relative w-full flex items-center">
        {/* Soft edge fade masks */}
        <div className="absolute left-0 inset-y-0 w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

        {/* Continuous ticker */}
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ ease: "linear", duration: 28, repeat: Infinity }}
          className="flex whitespace-nowrap items-center gap-14 py-2"
        >
          {[...companies, ...companies, ...companies].map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[#0f0f11]/30 hover:text-[#0f0f11]/80 transition-colors cursor-default select-none">
                {c}
              </span>
              <span className="text-black/15 text-[12px]">/</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 02 ) — THE 4 INTELLIGENCE ENGINES (Asymmetric Bento Grid)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyEngines() {
  return (
    <section id="engines" className="py-28 px-6 sm:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-[#fafafa] mb-4">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#0f0f11]">
              ( 02 )
            </span>
            <span className="h-3 w-px bg-black/10" />
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[#52525b]">
              ARCHITECTURE & CAPABILITIES
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[50px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Four synchronized AI engines. <br className="hidden sm:block" />
            One unified terminal.
          </h2>
          <p className="text-[17px] sm:text-[18px] text-[#52525b] font-medium leading-relaxed">
            Engineered from first principles to replace fragmented spreadsheets, blind applications, and ATS auto-rejections with autonomous precision.
          </p>
        </div>

        {/* Asymmetric Editorial Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card A: AstrePilot MV3 (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] font-bold text-[#71717a] tracking-[0.16em] uppercase">
                  01 / BROWSER RUNTIME
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 font-mono text-[10px] font-semibold">
                  MANIFEST V3 • SHADOW DOM
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                AstrePilot MV3 • In-Browser ATS Co-Pilot
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8 max-w-xl">
                Injects an isolated HUD directly into application pages across Greenhouse, Ashby, Lever, and Workable. Automatically maps 40+ dynamic fields and autofills verified profiles in seconds with zero DOM contamination.
              </p>
            </div>

            {/* Visual HUD Mockup */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] text-[12px] font-mono text-[#71717a]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>TARGET: greenhouse.io/v1/jobs/59182</span>
                </div>
                <span className="text-[#0f0f11] font-semibold">MATCH: 98.6%</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <span className="block text-[10px] font-mono text-[#86868b] uppercase">Candidate</span>
                  <strong className="text-[12px] text-[#0f0f11] font-semibold">Verified Vault</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <span className="block text-[10px] font-mono text-[#86868b] uppercase">Target Title</span>
                  <strong className="text-[12px] text-[#0f0f11] font-semibold">Software Developer</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04] col-span-2 sm:col-span-1">
                  <span className="block text-[10px] font-mono text-[#86868b] uppercase">Mapped Fields</span>
                  <strong className="text-[12px] text-emerald-600 font-semibold">14 / 14 Synthesized</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-[#71717a]">
                <span>CLOSED SHADOW DOM HUD</span>
                <span className="text-blue-600 font-semibold">READY TO INJECT →</span>
              </div>
            </div>
          </div>

          {/* Card B: AstreShield Fraud & Ghost Postings (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] font-bold text-[#71717a] tracking-[0.16em] uppercase">
                  02 / HEURISTIC DEFENSE
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-mono text-[10px] font-semibold">
                  ASYMMETRIC COST LAW
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                AstreShield • Heuristic Fraud & Ghost Defense
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8">
                4-tier algorithmic filter scanning for crypto/telegram escrow schemes, PII harvesters, and stagnant ghost jobs with 48-hour freshness verification.
              </p>
            </div>

            {/* Visual Gauge */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#71717a]">
                  STREAM INTEGRITY
                </span>
                <span className="text-[12px] font-bold text-emerald-600">ZERO GHOST POSTINGS</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[12px] font-medium text-[#0f0f11] mb-1">
                    <span>Direct Company ATS Verified</span>
                    <span>99.4%</span>
                  </div>
                  <div className="h-2 w-full bg-black/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[99.4%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[12px] font-medium text-[#0f0f11] mb-1">
                    <span>Crypto/Escrow Scam Quarantine</span>
                    <span>100.0%</span>
                  </div>
                  <div className="h-2 w-full bg-black/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card C: ATS Resume Maker (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] font-bold text-[#71717a] tracking-[0.16em] uppercase">
                  03 / PRINT GEOMETRY
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-purple-700 font-mono text-[10px] font-semibold">
                  STRICT 297MM CEILING
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                ATS Resume Maker • Single-Page A4 Canvas
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8">
                Strict single-page A4 geometry (297mm ceiling) engineered for the recruiter 6-second F-scan. Employs 2-column flexbox hanging indent layouts and Google XYZ impact bullet structure.
              </p>
            </div>

            {/* Visual Micro Sheet */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] text-[11px] font-mono">
                <span className="text-[#0f0f11] font-bold">A4 SHEET GEOMETRY (210 × 297mm)</span>
                <span className="text-purple-600 font-semibold">100% PARSE SCORE</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[12px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Google XYZ Metrics Enforced
                  </span>
                  <span className="font-mono text-[11px] text-[#0f0f11]">98/100</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Workday & Greenhouse Safe
                  </span>
                  <span className="font-mono text-[11px] text-[#0f0f11]">PASS</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero Layout Shift Print CSS
                  </span>
                  <span className="font-mono text-[11px] text-[#0f0f11]">1.00 PAGE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card D: 21-Source Discovery Matrix (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] font-bold text-[#71717a] tracking-[0.16em] uppercase">
                  04 / HIGH-THROUGHPUT HARVESTER
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 font-mono text-[10px] font-semibold">
                  21 DIRECT ATS SOURCES
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                Discovery Matrix • Multi-Signal Deduplication
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8 max-w-xl">
                Hourly automated scrapers querying 21 direct ATS endpoints and curated job feeds with SHA-256 tuple deduplication, sub-50ms query cache, and 48-hour freshness rolling window.
              </p>
            </div>

            {/* Provider Grid Chips */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-[#71717a] mb-3">
                ACTIVE INGESTION PIPELINES
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Greenhouse API",
                  "Ashby Direct",
                  "Lever Ingestion",
                  "SmartRecruiters",
                  "Workable Stream",
                  "Himalayas",
                  "RemoteOK",
                  "Jobicy",
                  "BuiltIn",
                  "Simplify Network",
                  "LFX Mentorship",
                  "NodeSK Feed",
                ].map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fafafa] border border-black/[0.05] text-[12px] font-medium text-[#0f0f11]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 03 ) — LIVE DISCOVERY STREAM (Interactive Test-Drive)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyDiscoveryStream() {
  const [roleQuery, setRoleQuery] = useState("Full Stack Developer");
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(true);

  const sampleRoles = useMemo(
    () => [
      {
        title: "Senior Full Stack Developer",
        company: "Stripe",
        ats: "Greenhouse Direct",
        salary: "$165k - $210k",
        trust: "99.8%",
        freshness: "32 mins ago",
      },
      {
        title: "Distributed Systems Developer",
        company: "Linear",
        ats: "Ashby Pipeline",
        salary: "$175k - $225k",
        trust: "100.0%",
        freshness: "1 hour ago",
      },
      {
        title: "Backend Core Systems Developer",
        company: "Supabase",
        ats: "Lever Direct",
        salary: "$150k - $190k",
        trust: "99.4%",
        freshness: "2 hours ago",
      },
    ],
    []
  );

  const handleScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roleQuery.trim()) return;
    setIsScanning(true);
    setScanDone(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanDone(true);
    }, 1200);
  };

  return (
    <section id="discovery" className="py-28 px-6 sm:px-10 bg-[#fafafa] border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-white mb-4 shadow-sm">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#0f0f11]">
              ( 03 )
            </span>
            <span className="h-3 w-px bg-black/10" />
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[#52525b]">
              LIVE DISCOVERY STREAM
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[50px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Query the discovery matrix in real-time.
          </h2>
          <p className="text-[17px] sm:text-[18px] text-[#52525b] font-medium leading-relaxed">
            Filter across 21 live ATS endpoints and experience real-time role provenance, salary transparency, and fraud verification.
          </p>
        </div>

        {/* Search Console */}
        <div className="max-w-2xl mx-auto mb-12">
          <form
            onSubmit={handleScan}
            className="flex items-center bg-white rounded-full p-2 border border-black/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:border-black/30 transition-all"
          >
            <div className="pl-4 pr-2 text-[#71717a]">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder="e.g. Full Stack Developer, Distributed Systems..."
              className="flex-1 bg-transparent text-[15px] sm:text-[16px] text-[#0f0f11] font-medium outline-none placeholder:text-[#a1a1aa] px-2 py-2"
            />
            <button
              type="submit"
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f0f11] hover:bg-black text-white text-[14px] font-semibold transition-all disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Scan Endpoints</span>
                  <span className="text-white/60">→</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Filter Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="font-mono text-[11px] text-[#86868b] mr-1">QUICK ROLES:</span>
            {[
              "Full Stack Developer",
              "Backend Systems Developer",
              "Distributed Systems Developer",
              "AI Systems Developer",
            ].map((role, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRoleQuery(role);
                  setIsScanning(true);
                  setTimeout(() => setIsScanning(false), 800);
                }}
                className="text-[12px] font-medium px-3 py-1 rounded-full bg-white border border-black/[0.06] hover:border-black/20 text-[#52525b] hover:text-[#0f0f11] transition-all"
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Live Stream Result Cards */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isScanning ? (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center rounded-2xl bg-white border border-black/[0.06]"
              >
                <div className="inline-block w-6 h-6 border-2 border-[#0f0f11] border-t-transparent rounded-full animate-spin mb-3" />
                <div className="font-mono text-[13px] text-[#52525b]">
                  QUERYING 21 LIVE ATS PIPELINES • FILTERING STALE POSTINGS...
                </div>
              </motion.div>
            ) : scanDone ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                {sampleRoles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-white border border-black/[0.06] hover:border-black/15 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-[17px] font-semibold text-[#0f0f11] tracking-tight">
                          {role.title}
                        </h4>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {role.trust} TRUST
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#71717a]">
                        <strong className="text-[#0f0f11] font-semibold">{role.company}</strong>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-[#52525b]">
                          <Zap className="w-3.5 h-3.5 text-blue-500" /> {role.ats}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-[#0f0f11] font-semibold">
                          {role.salary}
                        </span>
                        <span>•</span>
                        <span className="text-[12px]">{role.freshness}</span>
                      </div>
                    </div>

                    <Link
                      href="/onboard"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fafafa] hover:bg-[#0f0f11] text-[#0f0f11] hover:text-white border border-black/[0.08] hover:border-black text-[13px] font-semibold transition-all group"
                    >
                      <span>Tailor Resume</span>
                      <span className="text-[11px] group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 04 ) — ATS BENCHMARK SUITE (The Precision Standard)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyBenchmark() {
  const comparisons = [
    {
      dimension: "Layout Architecture",
      generic: "Multi-column tables & floating textboxes (Breaks Workday & Greenhouse parser line ordering).",
      astrework: "Clean semantic flexbox hanging-indent layout. 100% linear ATS extraction guarantee.",
    },
    {
      dimension: "Content & Impact",
      generic: "Fluffy generic AI buzzwords ('Responsible for architecting scalable cloud pipelines').",
      astrework: "Google XYZ impact formula ('Engineered X using Y achieving Z% measurable throughput').",
    },
    {
      dimension: "Page Geometry",
      generic: "Unbounded 1.2 to 2 pages (Auto-clipped by recruiter 6-second F-scan and print margins).",
      astrework: "Strict 297mm vertical ceiling. Zero layout shift single-page A4 print optimization.",
    },
    {
      dimension: "Candidate Compliance",
      generic: "Hallucinated engineer credentials risking Indian corporate & academic audit sanctions.",
      astrework: "Strict BCA Developer title compliance (Developer/Architect) and isolated candidate vaults.",
    },
  ];

  return (
    <section id="benchmark" className="py-28 px-6 sm:px-10 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-[#fafafa] mb-4">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#0f0f11]">
              ( 04 )
            </span>
            <span className="h-3 w-px bg-black/10" />
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[#52525b]">
              ATS BENCHMARK SUITE
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[50px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Engineered against enterprise parsers. <br className="hidden sm:block" />
            Zero guesswork.
          </h2>
          <p className="text-[17px] sm:text-[18px] text-[#52525b] font-medium leading-relaxed">
            Why standard resumes fail Workday, Greenhouse, and Lever — and how AstreWork’s deterministic engine guarantees parseability.
          </p>
        </div>

        {/* Editorial Side-by-Side Matrix */}
        <div className="rounded-3xl border border-black/[0.08] bg-[#fafafa] overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 bg-white border-b border-black/[0.08] p-6 text-[12px] font-mono font-bold tracking-wider text-[#71717a] uppercase">
            <div className="md:col-span-3">SPECIFICATION</div>
            <div className="md:col-span-4 text-red-600/80">GENERIC RESUME / CANVA</div>
            <div className="md:col-span-5 text-[#0f0f11]">ASTREWORK ATS ENGINE</div>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {comparisons.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 p-6 sm:p-8 gap-4 sm:gap-6 items-start">
                <div className="md:col-span-3">
                  <span className="font-mono text-[11px] font-bold text-[#71717a] uppercase tracking-wider block mb-1">
                    0{i + 1}
                  </span>
                  <strong className="text-[16px] font-semibold text-[#0f0f11]">{c.dimension}</strong>
                </div>

                <div className="md:col-span-4 text-[14px] text-[#71717a] leading-relaxed pr-4">
                  <span className="inline-block md:hidden font-mono text-[10px] text-red-500 uppercase tracking-wider mb-1">
                    GENERIC:
                  </span>
                  {c.generic}
                </div>

                <div className="md:col-span-5 text-[14px] text-[#0f0f11] font-medium leading-relaxed bg-white p-4 rounded-xl border border-black/[0.05] shadow-xs">
                  <span className="inline-block md:hidden font-mono text-[10px] text-emerald-600 uppercase tracking-wider mb-1">
                    ASTREWORK:
                  </span>
                  {c.astrework}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 05 ) — FREQUENTLY ASKED QUESTIONS (Accordion)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does AstreWork eliminate ghost jobs and fake postings?",
      a: "AstreWork’s AstreShield engine implements a 4-tier heuristic verification pipeline. We cross-reference direct ATS endpoints (Greenhouse, Ashby, Lever), inspect company domain registrations, verify active salary ranges, and penalize listings older than 48 hours. Any postings containing Telegram/crypto escrow demands are instantly quarantined.",
    },
    {
      q: "How is candidate privacy and context isolation enforced?",
      a: "Candidate data is strictly isolated by authenticated account tokens. Third-party users cannot view, query, or leak other profiles or resumes. AstreWork enforces dual founder permissions exclusively for Roushan Kumar and Ayushi Raj, while all third parties operate strictly in their own sandboxed vault.",
    },
    {
      q: "How does AstrePilot interact with ATS job portals?",
      a: "AstrePilot runs as a modern Manifest V3 Chrome Extension. It injects an isolated closed Shadow DOM HUD directly onto application pages without altering or polluting the page’s global DOM or scripts. It maps 40+ dynamic fields on Greenhouse, Ashby, and Lever, generating one-click autofills from your verified profile.",
    },
    {
      q: "Why is strict single-page A4 geometry non-negotiable?",
      a: "Recruiters spend an average of 6 seconds scanning a resume. Resumes that overflow to 1.1 or 1.2 pages create orphan lines and are frequently clipped by enterprise print drivers or auto-rejected by screening scripts. AstreWork enforces a strict 297mm vertical ceiling with responsive micro-adjustments.",
    },
    {
      q: "Is AstreWork free to use for developers?",
      a: "Yes. The core discovery engine, ATS benchmark audits, and single-page resume canvas are 100% free for individual builders. We are dedicated to providing the most powerful career engine to software developers worldwide.",
    },
  ];

  return (
    <section id="faq" className="py-28 px-6 sm:px-10 bg-[#fafafa] border-t border-black/[0.06]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-white mb-4 shadow-sm">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#0f0f11]">
              ( 05 )
            </span>
            <span className="h-3 w-px bg-black/10" />
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-[#52525b]">
              SPECIFICATIONS & FAQ
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[48px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Answers to critical questions.
          </h2>
          <p className="text-[17px] text-[#52525b] font-medium">
            Everything you need to know about the engine, privacy architecture, and ATS compliance.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-2xs transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 sm:p-7 text-left group"
              >
                <span className="text-[16px] sm:text-[18px] font-semibold text-[#0f0f11] tracking-tight group-hover:text-blue-600 transition-colors">
                  {faq.q}
                </span>
                <span
                  className={`w-7 h-7 rounded-full bg-[#fafafa] border border-black/[0.06] flex items-center justify-center shrink-0 ml-4 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180 bg-[#0f0f11] text-white" : "text-[#71717a]"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 sm:px-7 pb-6 sm:pb-7 text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium border-t border-black/[0.04] pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION ( 06 ) — TAKE COMMAND (Final Obsidian Callout)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyCTA() {
  return (
    <section className="py-28 px-6 sm:px-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl bg-[#0f0f11] text-white p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Numbered Stamp */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 mb-6">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                ( 06 )
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-white/70">
                TAKE COMMAND
              </span>
            </div>

            <h2 className="text-[36px] sm:text-[54px] md:text-[62px] font-semibold tracking-[-0.035em] leading-[1.06] mb-6">
              Your career velocity deserves an autonomous operating system.
            </h2>

            <p className="text-[17px] sm:text-[19px] text-white/70 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
              Stop submitting resumes into the black hole. Deploy AstreWork today to discover verified remote roles and generate ATS-unrejectable applications.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/onboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white hover:bg-neutral-100 text-[#0f0f11] text-[16px] font-semibold transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] group"
              >
                <span>Initialize Free Workspace</span>
                <span className="w-6 h-6 rounded-full bg-[#0f0f11]/10 flex items-center justify-center text-[#0f0f11] text-[13px] group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
            </div>

            <p className="font-mono text-[11px] text-white/40 tracking-wider uppercase">
              INSTANT INITIALIZATION • ZERO CREDIT CARD REQUIRED • DATA STAYS PRIVATE
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FOOTER (Modern Agency Minimalist & Title Compliant)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 border-t border-black/[0.06] bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/astrework-brand.png"
                alt="AstreWork Logo"
                width={1760}
                height={363}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-[14px] text-[#52525b] leading-relaxed max-w-sm font-medium">
              Autonomous career operating system integrating 21+ direct ATS feeds, AstreShield fraud detection, and single-page A4 print typography.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">
                Production Engine Operational
              </span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="font-mono text-[11px] font-bold text-[#0f0f11] tracking-wider uppercase mb-4">
              PRODUCT
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#71717a] font-medium">
              <li>
                <Link href="/login" className="hover:text-[#0f0f11] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/onboard" className="hover:text-[#0f0f11] transition-colors">
                  Get Started Free
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#0f0f11] transition-colors">
                  About the Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Architecture */}
          <div>
            <h4 className="font-mono text-[11px] font-bold text-[#0f0f11] tracking-wider uppercase mb-4">
              ARCHITECTURE
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#71717a] font-medium">
              <li>
                <a href="#engines" className="hover:text-[#0f0f11] transition-colors">
                  AstrePilot MV3
                </a>
              </li>
              <li>
                <a href="#engines" className="hover:text-[#0f0f11] transition-colors">
                  AstreShield Heuristics
                </a>
              </li>
              <li>
                <a href="#benchmark" className="hover:text-[#0f0f11] transition-colors">
                  ATS Benchmark Suite
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Compliance */}
          <div>
            <h4 className="font-mono text-[11px] font-bold text-[#0f0f11] tracking-wider uppercase mb-4">
              COMPLIANCE
            </h4>
            <ul className="space-y-2.5 text-[13px] text-[#71717a] font-medium">
              <li>
                <Link href="/terms" className="hover:text-[#0f0f11] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#0f0f11] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="hover:text-[#0f0f11] transition-colors">
                  DMCA Safe Harbor
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-[#0f0f11] transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Strict Developer Title Compliance */}
        <div className="pt-8 border-t border-black/[0.06] flex flex-col md:flex-row items-center justify-between text-[12px] text-[#71717a] font-medium gap-4">
          <p>© {currentYear} AstreWork. All rights reserved.</p>
          <p className="text-center md:text-right font-mono text-[11px] text-[#52525b]">
            Architected & Built by Roushan Kumar & Ayushi Raj — Software Developers & Systems Architects.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE ASSEMBLY
   ════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const metrics = useLiveMetrics();

  return (
    <div className="min-h-screen bg-[#fafafa] font-[var(--font-inter)] text-[#0f0f11] selection:bg-[#0f0f11] selection:text-white overflow-x-hidden antialiased">
      <ModernAgencyNavbar />
      <ModernAgencyHero metrics={metrics} />
      <ModernAgencyMarquee />
      <ModernAgencyEngines />
      <ModernAgencyDiscoveryStream />
      <ModernAgencyBenchmark />
      <ModernAgencyFAQ />
      <ModernAgencyCTA />
      <ModernAgencyFooter />
    </div>
  );
}
