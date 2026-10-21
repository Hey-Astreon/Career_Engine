"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Zap, CheckCircle2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import HeroInteractiveShowcase from "@/components/HeroInteractiveShowcase";
import HeroInteractiveBackground from "@/components/HeroInteractiveBackground";

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
   STICKY GLASS NAVBAR (Clean, Professional, Zero Clutter)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyNavbar() {
  const liveTime = useLiveTime();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] z-50 transition-all">
      <div className="max-w-7xl mx-auto h-full px-6 sm:px-10 flex items-center justify-between">
        {/* Brand & Telemetry Pill */}
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
            <span className="text-[12px] font-medium text-[#52525b]">
              21 ATS Pipelines Online • {liveTime || "Sync Active"}
            </span>
          </div>
        </div>

        {/* Center Navigation Links (Clean, No Number Stamps) */}
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#71717a]">
          <a href="#engines" className="hover:text-[#0f0f11] transition-colors">
            Engines
          </a>
          <a href="#discovery" className="hover:text-[#0f0f11] transition-colors">
            Discovery
          </a>
          <a href="#benchmark" className="hover:text-[#0f0f11] transition-colors">
            ATS Benchmark
          </a>
          <a href="#faq" className="hover:text-[#0f0f11] transition-colors">
            FAQ
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
   HERO SECTION (High-Authority Typography, Human & Relatable)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyHero({ metrics }: { metrics: { totalJobsIndexed: number; totalProviders: number } }) {
  return (
    <section className="relative pt-32 sm:pt-40 pb-16 px-6 sm:px-10 overflow-hidden bg-[#fafafa]">
      {/* Next-Gen Living Terminal Hero Background */}
      <HeroInteractiveBackground />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Authentic Status Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-black/[0.08] bg-white/90 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-semibold tracking-wide text-[#0f0f11]">
                Verified Remote Roles • Zero Ghost Postings
              </span>
            </div>
          </motion.div>

          {/* Clean, Human & Relatable Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-[42px] sm:text-[64px] md:text-[76px] lg:text-[84px] font-semibold tracking-[-0.038em] leading-[1.05] text-[#0f0f11] mb-6 max-w-4xl mx-auto"
          >
            Land your next remote role.{" "}
            <br className="hidden sm:block" />
            <span className="text-[#0f0f11] bg-clip-text text-transparent bg-gradient-to-r from-[#0f0f11] via-[#2a2b30] to-[#52525b]">
              Without the endless ghosting.
            </span>
          </motion.h1>

          {/* Simple, Clear Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-[17px] sm:text-[20px] text-[#52525b] max-w-2xl mx-auto leading-relaxed mb-10 font-medium"
          >
            AstreWork searches 21+ direct company job boards, filters out ghost jobs and scams, and tests your resume against real ATS parsers so you actually get interviews.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/onboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#0f0f11] hover:bg-black text-white text-[16px] font-semibold transition-all shadow-[0_4px_20px_rgba(15,15,17,0.22)] hover:shadow-[0_8px_30px_rgba(15,15,17,0.3)] hover:scale-[1.02] active:scale-[0.98] group"
            >
              <span>Find Remote Jobs</span>
              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-white text-[13px] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>

            <a
              href="#discovery"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-black/10 hover:border-black/25 bg-white/80 backdrop-blur-md text-[#0f0f11] text-[15px] font-semibold transition-all hover:bg-white"
            >
              <span>Browse Live Roles</span>
              <span className="text-black/40 text-[13px]">↓</span>
            </a>
          </motion.div>

          {/* 4-Metric Telemetry Strip */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-12"
          >
            <div className="p-3 text-center border-r border-black/[0.04] last:border-r-0">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                {metrics.totalJobsIndexed > 0 ? metrics.totalJobsIndexed.toLocaleString() : "2,840+"}
              </div>
              <div className="text-[12px] font-medium text-[#71717a] mt-0.5">
                Active Remote Roles
              </div>
            </div>

            <div className="p-3 text-center sm:border-r border-black/[0.04]">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                {metrics.totalProviders > 0 ? `${metrics.totalProviders}+` : "21+"}
              </div>
              <div className="text-[12px] font-medium text-[#71717a] mt-0.5">
                Direct Company Boards
              </div>
            </div>

            <div className="p-3 text-center border-r border-black/[0.04] last:border-r-0">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                98%
              </div>
              <div className="text-[12px] font-medium text-[#71717a] mt-0.5">
                ATS Parser Pass Rate
              </div>
            </div>

            <div className="p-3 text-center">
              <div className="text-[26px] sm:text-[32px] font-bold tracking-tight text-[#0f0f11]">
                Zero
              </div>
              <div className="text-[12px] font-medium text-[#71717a] mt-0.5">
                Ghost Postings Allowed
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Interactive Transformation Showcase */}
        <HeroInteractiveShowcase />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SOCIAL PROOF MARQUEE (Direct ATS Ingestion Network)
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
          <span className="text-[12px] font-semibold text-[#0f0f11] tracking-wide">
            Direct Company Boards
          </span>
          <span className="text-[12px] text-[#71717a]">
            — Fresh Remote Roles from High-Growth Tech Teams
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#71717a]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Hourly Pipeline Synchronization Active
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
   ARCHITECTURE BENTO GRID (The 4 Intelligence Engines)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyEngines() {
  return (
    <section id="engines" className="py-28 px-6 sm:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-[#fafafa] mb-4">
            <span className="text-[12px] font-semibold text-[#52525b]">
              Job Search Without The Frustration
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[50px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Everything you need to land interviews. <br className="hidden sm:block" />
            Zero spreadsheets. Zero ghosting.
          </h2>
          <p className="text-[17px] sm:text-[18px] text-[#52525b] font-medium leading-relaxed">
            Built for developers tired of sending resumes into automated black holes, filling out the same application 50 times, and getting zero callbacks.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card A: AstrePilot MV3 (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[12px] font-semibold text-[#0f0f11] tracking-wide">
                  Browser Co-Pilot
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] font-semibold">
                  Manifest V3 Extension
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                1-Click In-Browser Autofill
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8 max-w-xl">
                Automatically detects Greenhouse, Ashby, Lever, and Workable application pages. Fills out all form fields and attaches your tailored resume in seconds so you never re-type your history.
              </p>
            </div>

            {/* Visual HUD Mockup */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] text-[12px] text-[#71717a]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px]">TARGET: greenhouse.io/v1/jobs/59182</span>
                </div>
                <span className="text-[#0f0f11] font-semibold text-[12px]">MATCH: 98.6%</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <span className="block text-[11px] text-[#86868b]">Candidate</span>
                  <strong className="text-[13px] text-[#0f0f11] font-semibold">Verified Vault</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <span className="block text-[11px] text-[#86868b]">Target Title</span>
                  <strong className="text-[13px] text-[#0f0f11] font-semibold">Software Developer</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04] col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-[#86868b]">Mapped Fields</span>
                  <strong className="text-[13px] text-emerald-600 font-semibold">14 / 14 Synthesized</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-[12px] text-[#71717a]">
                <span>AstrePilot In-Browser Assistant</span>
                <span className="text-blue-600 font-semibold">Ready to Autofill →</span>
              </div>
            </div>
          </div>

          {/* Card B: AstreShield (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[12px] font-semibold text-[#0f0f11] tracking-wide">
                  Fraud & Ghost Defense
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-semibold">
                  Zero Fake Jobs
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                Scam & Ghost Job Protection
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8">
                Continuously verifies company domains, checks posting freshness, and blocks fake crypto listings and stagnant reposts. You only apply to companies actively hiring.
              </p>
            </div>

            {/* Visual Gauge */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-[#71717a]">
                  Stream Integrity
                </span>
                <span className="text-[12px] font-bold text-emerald-600">Zero Ghost Postings</span>
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
                <span className="text-[12px] font-semibold text-[#0f0f11] tracking-wide">
                  Single-Page Resume
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-purple-700 text-[11px] font-semibold">
                  A4 Print Precision
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                ATS-Optimized Resumes
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8">
                Strict single-page A4 format engineered for recruiter reading patterns and automated parsers. Enforces clean single-column structure and Google XYZ impact bullet metrics.
              </p>
            </div>

            {/* Visual Micro Sheet */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] text-[12px]">
                <span className="text-[#0f0f11] font-semibold">A4 Sheet Geometry (210 × 297mm)</span>
                <span className="text-purple-600 font-semibold">100% Parse Score</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[13px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Google XYZ Metrics Enforced
                  </span>
                  <span className="font-semibold text-[#0f0f11]">98/100</span>
                </div>
                <div className="flex items-center justify-between text-[13px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Workday & Greenhouse Safe
                  </span>
                  <span className="font-semibold text-[#0f0f11]">Pass</span>
                </div>
                <div className="flex items-center justify-between text-[13px] text-[#52525b]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero Layout Shift Print CSS
                  </span>
                  <span className="font-semibold text-[#0f0f11]">1.00 Page</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card D: 21-Source Discovery Matrix (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-[#fafafa] border border-black/[0.06] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group hover:border-black/15 transition-all">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[12px] font-semibold text-[#0f0f11] tracking-wide">
                  Live Job Feeds
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 text-[11px] font-semibold">
                  21 Direct ATS Sources
                </span>
              </div>

              <h3 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[#0f0f11] mb-3">
                21+ Direct Company Feeds
              </h3>
              <p className="text-[15px] sm:text-[16px] text-[#52525b] leading-relaxed font-medium mb-8 max-w-xl">
                Scrapes verified company career boards hourly — uncovering remote developer roles before they get inundated with thousands of applications on LinkedIn or Indeed.
              </p>
            </div>

            {/* Provider Grid Chips */}
            <div className="relative rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
              <span className="block text-[12px] font-semibold text-[#71717a] mb-3">
                Active Ingestion Pipelines
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
   LIVE DISCOVERY STREAM (Interactive Test-Drive)
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
            <span className="text-[12px] font-semibold text-[#52525b]">
              Live Discovery Stream
            </span>
          </div>

          <h2 className="text-[36px] sm:text-[50px] font-semibold tracking-[-0.035em] text-[#0f0f11] leading-[1.08] mb-4">
            Search verified remote roles in real time.
          </h2>
          <p className="text-[17px] sm:text-[18px] text-[#52525b] font-medium leading-relaxed">
            Directly from company career boards with transparent salary ranges, verified company domains, and instant ATS match scores.
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
                  <span>Scan Live Roles</span>
                  <span className="text-white/60">→</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Filter Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="text-[12px] font-semibold text-[#86868b] mr-1">Quick Roles:</span>
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
                className="text-[12px] font-medium px-3.5 py-1.5 rounded-full bg-white border border-black/[0.06] hover:border-black/20 text-[#52525b] hover:text-[#0f0f11] transition-all"
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
                <div className="text-[14px] font-medium text-[#52525b]">
                  Querying 21 Live ATS Pipelines • Filtering Stale Postings...
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
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {role.trust} Trust
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#71717a]">
                        <strong className="text-[#0f0f11] font-semibold">{role.company}</strong>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[12px] text-[#52525b]">
                          <Zap className="w-3.5 h-3.5 text-blue-500" /> {role.ats}
                        </span>
                        <span>•</span>
                        <span className="text-[12px] text-[#0f0f11] font-semibold">
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
   ATS BENCHMARK SUITE (The Precision Standard)
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
      generic: "Hallucinated engineer credentials risking corporate & academic audit sanctions.",
      astrework: "Strict BCA Developer title compliance (Developer/Architect) and isolated candidate vaults.",
    },
  ];

  return (
    <section id="benchmark" className="py-28 px-6 sm:px-10 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.08] bg-[#fafafa] mb-4">
            <span className="text-[12px] font-semibold text-[#52525b]">
              ATS Benchmark Suite
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

        {/* Editorial Comparative Matrix */}
        <div className="rounded-3xl border border-black/[0.08] bg-[#fafafa] overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 bg-white border-b border-black/[0.08] p-6 text-[12px] font-semibold tracking-wider text-[#71717a] uppercase">
            <div className="md:col-span-3">SPECIFICATION</div>
            <div className="md:col-span-4 text-red-600/80">GENERIC RESUME / CANVA</div>
            <div className="md:col-span-5 text-[#0f0f11]">ASTREWORK ATS ENGINE</div>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {comparisons.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 p-6 sm:p-8 gap-4 sm:gap-6 items-start">
                <div className="md:col-span-3">
                  <strong className="text-[16px] font-semibold text-[#0f0f11]">{c.dimension}</strong>
                </div>

                <div className="md:col-span-4 text-[14px] text-[#71717a] leading-relaxed pr-4">
                  <span className="inline-block md:hidden text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1">
                    GENERIC:
                  </span>
                  {c.generic}
                </div>

                <div className="md:col-span-5 text-[14px] text-[#0f0f11] font-medium leading-relaxed bg-white p-4 rounded-xl border border-black/[0.05] shadow-xs">
                  <span className="inline-block md:hidden text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
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
   FREQUENTLY ASKED QUESTIONS (Accordion)
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
            <span className="text-[12px] font-semibold text-[#52525b]">
              Frequently Asked Questions
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
   FINAL CALL TO ACTION (Seamless Full-Bleed Dark Transition)
   ════════════════════════════════════════════════════════════════════════════ */
function ModernAgencyCTA() {
  return (
    <section className="relative bg-[#090a0f] text-white pt-24 pb-20 px-6 sm:px-10 overflow-hidden border-t border-white/[0.08]">
      {/* Ambient Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(0,113,227,0.22),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Subtle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[12px] font-semibold text-white/80">
            Start Free Today
          </span>
        </div>

        {/* Powerful Headline */}
        <h2 className="text-[38px] sm:text-[54px] md:text-[64px] font-semibold tracking-[-0.035em] leading-[1.08] mb-6 text-white">
          Stop getting ghosted. Start getting interviews.
        </h2>

        {/* Subhead */}
        <p className="text-[17px] sm:text-[20px] text-white/70 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
          Verified remote jobs directly from company career pages, automated ATS resume testing, and 1-click in-browser applications — 100% free for developers.
        </p>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href="/onboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white hover:bg-neutral-100 text-[#0f0f11] text-[16px] font-semibold transition-all shadow-[0_4px_24px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] group"
          >
            <span>Start Free Workspace</span>
            <span className="w-6 h-6 rounded-full bg-[#0f0f11]/10 flex items-center justify-center text-[#0f0f11] text-[13px] group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>

          <a
            href="#discovery"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white text-[15px] font-semibold transition-all backdrop-blur-md"
          >
            <span>Browse Remote Roles</span>
            <span className="text-white/40 text-[13px]">↓</span>
          </a>
        </div>

        {/* Value Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 border-t border-white/[0.08] text-[13px] text-white/60 font-medium">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>21+ Direct ATS Feeds Scanned Hourly</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Candidate Privacy & Isolation</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Free for Individual Software Builders</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FOOTER (Seamless Dark Integration & Title Compliant)
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
              <span className="text-[12px] font-medium text-[#71717a]">
                Production Engine Operational
              </span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#0f0f11] tracking-wider uppercase mb-4">
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
            <h4 className="text-[12px] font-semibold text-[#0f0f11] tracking-wider uppercase mb-4">
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
            <h4 className="text-[12px] font-semibold text-[#0f0f11] tracking-wider uppercase mb-4">
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
          <p className="text-center md:text-right text-[12px] text-[#52525b]">
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
