"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, FileX2, Ghost, CheckCircle2, Zap, ShieldCheck, BarChart3, ChevronDown, Terminal } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import Idea1HeroVisual from "@/components/Idea1HeroVisual";
import DataDustBackground from "@/components/DataDustBackground";

/* ── Animation Presets ── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

/* ── Live Metrics Hook ── */
function useLiveMetrics() {
  const [metrics, setMetrics] = useState({ totalJobsIndexed: 0, totalProviders: 0 });
  useEffect(() => {
    fetch("/api/public/metrics")
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => {});
  }, []);
  return metrics;
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 1 — THE HOOK  (Above the fold)
   Goal: Answer "What is this?" and "Why should I care?" in under 5 seconds
   ════════════════════════════════════════════════════════════════════════════ */
function HeroSection({ metrics }: { metrics: { totalJobsIndexed: number; totalProviders: number } }) {
  return (
    <section className="relative pt-36 sm:pt-44 pb-8 px-6 sm:px-12 overflow-hidden bg-white">
      {/* Soft radial glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-blue-50/80 via-white to-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Subtle floating particles (Data Dust) */}
      <DataDustBackground />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Pain-first headline */}
          <motion.h1
            variants={fadeUp}
            className="text-[42px] sm:text-[64px] md:text-[72px] font-semibold tracking-[-0.035em] leading-[1.05] text-[#1d1d1f] mb-6"
          >
            Stop sending resumes
            <br className="hidden sm:block" />
            <span className="text-[#0071e3]">into the void.</span>
          </motion.h1>

          {/* Clear human explanation */}
          <motion.p
            variants={fadeUp}
            className="text-[18px] sm:text-[21px] text-[#6e6e73] max-w-2xl mx-auto leading-relaxed mb-10 font-medium"
          >
            AstreWork automatically finds verified remote jobs from {metrics.totalProviders || "20"}+ platforms,
            builds ATS-proof resumes that actually get read, and tracks every application —
            so you can focus on landing interviews, not managing spreadsheets.
          </motion.p>

          {/* Primary CTA */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-full px-10 py-4 text-[17px] font-semibold transition-all shadow-[0_4px_14px_rgba(0,113,227,0.25)] hover:shadow-[0_6px_20px_rgba(0,113,227,0.35)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center group"
            >
              Start my free workspace
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="text-[#0071e3] hover:text-[#0077ED] text-[17px] font-semibold transition-colors"
            >
              I already have an account
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.p variants={fadeUp} className="text-[14px] text-[#86868b] font-medium">
            No credit card required · Set up in 2 minutes · Your data stays private
          </motion.p>
        </motion.div>

        {/* ── Idea 1 Hero Visual (Deconstructor) ── */}
        <Idea1HeroVisual />

        {/* ── Live metrics strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          <Stat value={metrics.totalJobsIndexed.toLocaleString() || "—"} label="Remote jobs indexed" />
          <Stat value={`${metrics.totalProviders || "—"}+`} label="Job platforms scanned" />
          <Stat value="98%" label="ATS pass rate" />
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 1.5 — SOCIAL PROOF MARQUEE
   ════════════════════════════════════════════════════════════════════════════ */
function MarqueeSection() {
  const companies = [
    "Stripe", "Shopify", "Vercel", "GitHub", "Netflix", "Linear", "Raycast", "Notion", "Arc", "Figma", "OpenAI"
  ];
  
  return (
    <section className="py-10 border-y border-black/[0.04] bg-white overflow-hidden flex flex-col items-center">
      <p className="text-[13px] font-medium text-[#86868b] mb-6 tracking-wide uppercase">Indexing active remote roles from</p>
      <div className="relative w-full max-w-5xl flex items-center">
        {/* Fade masks for edges */}
        <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />
        
        {/* Animated Marquee */}
        <motion.div
          animate={{ x: [0, -1035] }}
          transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          className="flex whitespace-nowrap items-center gap-12"
        >
          {/* Double the array for seamless looping */}
          {[...companies, ...companies, ...companies].map((company, i) => (
            <span key={i} className="text-[20px] font-bold text-[#1d1d1f]/40">
              {company}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-[32px] sm:text-[40px] font-bold tracking-tight text-[#1d1d1f]">{value}</div>
      <div className="text-[14px] text-[#86868b] font-medium mt-1">{label}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 2 — THE PROBLEM  (Empathy)
   Goal: Make the user feel understood. "Yes, that's exactly my problem."
   ════════════════════════════════════════════════════════════════════════════ */
function ProblemSection() {
  const problems = [
    {
      icon: <FileX2 className="w-8 h-8" />,
      iconColor: "text-red-500 bg-red-50",
      title: "Your resume disappears",
      stat: "75%",
      description: "of resumes are auto-rejected by ATS software before a human ever sees them. You could be the perfect candidate and still never get a call.",
    },
    {
      icon: <Ghost className="w-8 h-8" />,
      iconColor: "text-purple-500 bg-purple-50",
      title: "Employers ghost you",
      stat: "50%",
      description: "of applicants never hear back — not even a rejection. You're left wondering if your application was even received.",
    },
    {
      icon: <Search className="w-8 h-8" />,
      iconColor: "text-orange-500 bg-orange-50",
      title: "You're drowning in tabs",
      stat: "10+",
      description: "job boards open at once, hundreds of listings, most of them stale, duplicated, or outright scams. Hours wasted on dead ends.",
    },
  ];

  return (
    <section className="py-28 px-6 sm:px-12 bg-[#f5f5f7]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-[36px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f] text-center mb-6 leading-tight"
          >
            The remote job search is broken.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-[18px] text-[#6e6e73] text-center max-w-2xl mx-auto mb-16 font-medium leading-relaxed"
          >
            You're not bad at job searching. The system is designed against you.
            Here's what you're really up against.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-white rounded-3xl p-8 sm:p-10 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300"
              >
                <div className={`w-16 h-16 ${p.iconColor} rounded-2xl flex items-center justify-center mb-6`}>
                  {p.icon}
                </div>
                <div className="text-[48px] font-bold text-[#1d1d1f] tracking-tight leading-none mb-2">
                  {p.stat}
                </div>
                <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-3 tracking-tight">{p.title}</h3>
                <p className="text-[15px] text-[#6e6e73] leading-relaxed font-medium">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 3 — THE SOLUTION  (How AstreWork Works)
   Goal: Show exactly how each pain point is eliminated. 3 clear steps.
   ════════════════════════════════════════════════════════════════════════════ */
function SolutionSection() {
  const steps = [
    {
      step: "01",
      title: "We find the jobs, so you don't have to.",
      description:
        "AstreWork scans 20+ remote job platforms every hour — LinkedIn, Wellfound, Himalayas, WeWorkRemotely, and more. We automatically filter out expired listings, duplicates, and scam postings. You only see verified, active opportunities that match your profile.",
      image: "/landing-dashboard.png",
      imageAlt: "AstreWork Discovery Feed showing curated remote job listings with match scores",
      accent: "from-blue-500 to-cyan-400",
    },
    {
      step: "02",
      title: "We make your resume unrejectable.",
      description:
        "Our ATS Resume Maker analyzes your resume against real enterprise parsers and scores it on 6 critical metrics. It tells you exactly which keywords are missing, what formatting breaks ATS extraction, and how to optimize for a 95%+ pass rate — before you hit apply.",
      image: "/landing-resume-maker.png",
      imageAlt: "AstreWork ATS Resume Maker showing a Tier-1 resume with 99% ATS health score",
      accent: "from-emerald-500 to-teal-400",
    },
    {
      step: "03",
      title: "We track everything, so nothing slips through.",
      description:
        "From 'Discovered' to 'Offer,' every application is tracked in one unified pipeline. No more spreadsheets, no more forgetting which company you applied to last Tuesday. Status changes, follow-up reminders, tailored cover letters — all managed from a single workspace.",
      image: null,
      imageAlt: "",
      accent: "from-violet-500 to-purple-400",
    },
  ];

  return (
    <section className="py-28 px-6 sm:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-20"
        >
          <motion.h2
            variants={fadeUp}
            className="text-[36px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f] mb-4 leading-tight"
          >
            Here's how AstreWork fixes it.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[18px] text-[#6e6e73] font-medium">
            Three systems working together. One workspace doing the heavy lifting.
          </motion.p>
        </motion.div>

        <div className="space-y-28">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`}
            >
              {/* Text */}
              <div className="flex-1 max-w-lg">
                <motion.div
                  variants={fadeUp}
                  className={`inline-block text-[13px] font-bold tracking-widest uppercase mb-4 text-transparent bg-clip-text bg-gradient-to-r ${s.accent}`}
                >
                  Step {s.step}
                </motion.div>
                <motion.h3
                  variants={fadeUp}
                  className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-[#1d1d1f] mb-5 leading-[1.15]"
                >
                  {s.title}
                </motion.h3>
                <motion.p
                  variants={fadeUp}
                  className="text-[16px] sm:text-[17px] text-[#6e6e73] leading-relaxed font-medium"
                >
                  {s.description}
                </motion.p>
              </div>

              {/* Abstract Visuals */}
              <motion.div variants={fadeUp} className="flex-1 w-full">
                <div className="relative rounded-3xl bg-[#f5f5f7] border border-black/[0.04] aspect-[4/3] sm:aspect-square md:aspect-[4/3] flex items-center justify-center p-8 overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                  
                  {s.step === "01" && (
                    <div className="w-full max-w-sm flex flex-col gap-4 relative z-10">
                      <div className="absolute -left-12 top-10 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full" />
                      <div className="absolute -right-8 bottom-10 w-32 h-32 bg-cyan-400/20 blur-3xl rounded-full" />
                      {[
                        { title: "Senior React Developer", company: "Stripe", time: "2 mins ago" },
                        { title: "Frontend Engineer", company: "Vercel", time: "15 mins ago" },
                        { title: "Full Stack (Remote)", company: "Shopify", time: "1 hour ago" }
                      ].map((job, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ x: 50, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.15, duration: 0.5 }}
                          className="bg-white p-5 rounded-2xl shadow-sm border border-black/[0.04] flex items-center justify-between"
                        >
                          <div>
                            <div className="text-[14px] font-semibold text-[#1d1d1f]">{job.title}</div>
                            <div className="text-[12px] text-[#86868b] mt-1">{job.company}</div>
                          </div>
                          <div className="text-[11px] font-medium text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
                            {job.time}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {s.step === "02" && (
                    <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/[0.04] relative z-10">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full" />
                       <div className="text-center mb-6 relative">
                         <div className="text-[48px] font-bold text-[#1d1d1f] tracking-tighter">98<span className="text-[24px] text-[#86868b]">%</span></div>
                         <div className="text-[12px] font-semibold tracking-widest uppercase text-emerald-500 mt-1">ATS Pass Rate</div>
                       </div>
                       <div className="space-y-4 relative">
                          {["Keywords Optimized", "Formatting Validated", "Impact Measured"].map((check, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-[13px] font-medium text-[#1d1d1f]">{check}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {s.step === "03" && (
                    <div className="w-full h-full relative z-10 flex items-center justify-center">
                       <div className="absolute inset-0 bg-violet-500/5 blur-[100px] rounded-full" />
                       <div className="flex gap-4 items-end">
                         {/* Kanban Columns Abstract */}
                         <motion.div initial={{ height: 100 }} whileInView={{ height: 160 }} transition={{ duration: 1 }} className="w-16 sm:w-20 bg-white rounded-t-xl border-t border-x border-black/[0.04] shadow-sm flex flex-col justify-end p-2 gap-2 relative">
                           <div className="w-full h-12 bg-black/5 rounded-md" />
                           <div className="w-full h-8 bg-black/5 rounded-md" />
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#86868b] tracking-widest">APPLIED</div>
                         </motion.div>
                         <motion.div initial={{ height: 100 }} whileInView={{ height: 220 }} transition={{ duration: 1, delay: 0.2 }} className="w-16 sm:w-20 bg-white rounded-t-xl border-t border-x border-black/[0.04] shadow-sm flex flex-col justify-end p-2 gap-2 relative">
                           <div className="w-full h-16 bg-black/5 rounded-md" />
                           <div className="w-full h-12 bg-black/5 rounded-md" />
                           <div className="w-full h-8 bg-black/5 rounded-md" />
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#86868b] tracking-widest">INTERVIEW</div>
                         </motion.div>
                         <motion.div initial={{ height: 100 }} whileInView={{ height: 120 }} transition={{ duration: 1, delay: 0.4 }} className="w-16 sm:w-20 bg-white rounded-t-xl border-t border-x border-violet-200 shadow-sm flex flex-col justify-end p-2 gap-2 relative">
                           <div className="w-full h-20 bg-violet-500/10 rounded-md border border-violet-500/20" />
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-violet-600 tracking-widest">OFFER</div>
                         </motion.div>
                       </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4 — TRUST & CREDIBILITY
   Goal: Eliminate skepticism. Build confidence.
   ════════════════════════════════════════════════════════════════════════════ */
function TrustSection() {
  const signals = [
    { icon: <Zap className="w-5 h-5" />, text: "Automated hourly job scans across 20+ platforms" },
    { icon: <ShieldCheck className="w-5 h-5" />, text: "ATS-safe resume templates tested against real enterprise parsers" },
    { icon: <CheckCircle2 className="w-5 h-5" />, text: "AI-powered resume extraction using Google Gemini" },
    { icon: <BarChart3 className="w-5 h-5" />, text: "Full application lifecycle tracking in one place" },
  ];

  return (
    <section className="py-28 px-6 sm:px-12 bg-[#f5f5f7]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-[36px] sm:text-[48px] font-semibold tracking-tight text-[#1d1d1f] text-center mb-6 leading-tight"
          >
            Built by job seekers who got
            <br className="hidden sm:block" /> tired of the same broken system.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-[18px] text-[#6e6e73] text-center max-w-2xl mx-auto mb-16 font-medium leading-relaxed"
          >
            AstreWork started as a personal tool we built to manage our own remote job search.
            We open-sourced the career engine because nobody should have to fight
            ATS robots and ghost postings alone.
          </motion.p>

          <div className="grid sm:grid-cols-2 gap-5">
            {signals.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-start gap-4 bg-white rounded-2xl p-6 border border-black/[0.04]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <p className="text-[15px] sm:text-[16px] text-[#1d1d1f] font-medium leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 5 — THE CLOSE  (Final CTA)
   Goal: Convert the convinced visitor.
   ════════════════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section className="py-32 px-6 sm:px-12 bg-white">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="max-w-3xl mx-auto text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-[36px] sm:text-[52px] font-semibold tracking-tight text-[#1d1d1f] mb-6 leading-tight"
        >
          Your career deserves better
          <br className="hidden sm:block" /> than a spreadsheet.
        </motion.h2>
        <motion.p variants={fadeUp} className="text-[18px] text-[#6e6e73] font-medium mb-10 leading-relaxed">
          Join AstreWork and start managing your remote job search with the same precision
          that top engineering teams use to ship products.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link
            href="/onboard"
            className="inline-flex items-center justify-center bg-[#1d1d1f] hover:bg-black text-white rounded-full px-10 py-5 text-[17px] font-semibold transition-all group shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Create my free workspace
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
        <motion.p variants={fadeUp} className="text-[14px] text-[#86868b] font-medium mt-6">
          No credit card required · Set up in 2 minutes · Your data stays private
        </motion.p>
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4.5 — INTERACTIVE DEMO (Try It Widget)
   ════════════════════════════════════════════════════════════════════════════ */
function InteractiveDemoSection() {
  const [role, setRole] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<number | null>(null);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(Math.floor(Math.random() * 500) + 120);
    }, 2000);
  };

  return (
    <section className="py-24 px-6 sm:px-12 bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay" />
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <Terminal className="w-12 h-12 text-[#0071e3] mx-auto mb-6" />
        <h2 className="text-[32px] sm:text-[42px] font-semibold tracking-tight mb-4 leading-tight">
          Test the Engine.
        </h2>
        <p className="text-[16px] text-gray-400 font-medium mb-10 max-w-xl mx-auto">
          Type your target role below to see how many verified remote opportunities AstreWork can index for you right now.
        </p>
        
        <form onSubmit={handleScan} className="max-w-lg mx-auto bg-white/10 p-2 rounded-2xl flex border border-white/10 backdrop-blur-md transition-all focus-within:border-white/30 focus-within:bg-white/20">
          <input
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex-1 bg-transparent text-white px-4 py-3 outline-none placeholder-gray-500 font-medium text-[16px]"
          />
          <button
            type="submit"
            disabled={isScanning || !role.trim()}
            className="bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-50 text-white rounded-xl px-6 font-semibold transition-colors flex items-center"
          >
            {isScanning ? "Scanning..." : "Scan"}
          </button>
        </form>

        <div className="mt-8 h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isScanning && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-gray-400 font-mono text-[14px] flex items-center gap-3"
              >
                <div className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                Querying 20+ platforms... filtering duplicates...
              </motion.div>
            )}
            {scanResult && !isScanning && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-3 rounded-full font-medium"
              >
                Found <strong>{scanResult}</strong> active, verified remote roles for "{role}".
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4.7 — FAQ
   ════════════════════════════════════════════════════════════════════════════ */
function FAQSection() {
  const faqs = [
    { q: "Is my resume data private?", a: "Yes. Your resume data is only used for your job matching and ATS formatting. We never sell your data or use it to train public models." },
    { q: "How is this different from LinkedIn or Indeed?", a: "LinkedIn is a social network. AstreWork is a personal career engine. We aggregate jobs from LinkedIn, Indeed, and 18 other platforms, remove the noise, and track your applications automatically." },
    { q: "Does the ATS Resume Maker actually work?", a: "Our templates are tested against popular ATS parsers like Workday, Greenhouse, and Lever. We ensure strict layout parsing so your keywords are actually read by the machine." },
    { q: "Is AstreWork really free?", a: "The core engine (job discovery and basic resume scanning) is completely free. We plan to offer a Pro tier for advanced AI-driven cover letter generation in the future." },
  ];
  
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 sm:px-12 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f] text-center mb-12">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-black/[0.06] rounded-2xl overflow-hidden bg-[#f5f5f7]/50">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-[#1d1d1f] text-[16px]">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#86868b] transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-[#6e6e73] font-medium leading-relaxed">
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
   PAGE ASSEMBLY
   ════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const metrics = useLiveMetrics();

  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)] text-[#1d1d1f] selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-b border-black/[0.04] z-50 flex items-center px-6 sm:px-12">
        <div className="flex-1 flex items-center space-x-2.5">
          <svg viewBox="0 0 100 100" className="w-5 h-5 text-[#1d1d1f]" fill="currentColor">
            <path d="M10,90 Q50,10 90,90 H70 Q50,40 30,90 Z" />
          </svg>
          <span className="font-bold tracking-tight text-[15px]">AstreWork</span>
        </div>
        <div className="flex items-center space-x-6 text-[14px] font-medium">
          <Link href="/login" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
            Sign in
          </Link>
          <Link
            href="/onboard"
            className="bg-[#0071e3] text-white px-5 py-2 rounded-full hover:bg-[#0077ED] transition-colors text-[13px] font-semibold"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <HeroSection metrics={metrics} />
      <MarqueeSection />
      <ProblemSection />
      <SolutionSection />
      <TrustSection />
      <InteractiveDemoSection />
      <FAQSection />
      <CTASection />

      {/* Footer */}
      <footer className="py-16 border-t border-black/[0.04] bg-[#fbfbfd]">
        <div className="max-w-5xl mx-auto px-6 sm:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-semibold text-[#1d1d1f] text-[13px] mb-4">Product</h3>
              <ul className="space-y-3 text-[13px] text-[#86868b]">
                <li><Link href="/login" className="hover:text-[#1d1d1f] transition-colors">Sign In</Link></li>
                <li><Link href="/onboard" className="hover:text-[#1d1d1f] transition-colors">Get Started Free</Link></li>
                <li><Link href="/about" className="hover:text-[#1d1d1f] transition-colors">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] text-[13px] mb-4">Support</h3>
              <ul className="space-y-3 text-[13px] text-[#86868b]">
                <li><Link href="/contact" className="hover:text-[#1d1d1f] transition-colors">Contact Us</Link></li>
                <li><a href="mailto:support@astrework.com" className="hover:text-[#1d1d1f] transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] text-[13px] mb-4">Legal</h3>
              <ul className="space-y-3 text-[13px] text-[#86868b]">
                <li><Link href="/terms" className="hover:text-[#1d1d1f] transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-[#1d1d1f] transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] text-[13px] mb-4">Compliance</h3>
              <ul className="space-y-3 text-[13px] text-[#86868b]">
                <li><Link href="/dmca" className="hover:text-[#1d1d1f] transition-colors">DMCA Policy</Link></li>
                <li><Link href="/cookie-policy" className="hover:text-[#1d1d1f] transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-black/[0.04] flex flex-col md:flex-row justify-between items-center text-[12px] font-medium text-[#86868b] space-y-4 md:space-y-0">
            <p>© {new Date().getFullYear()} AstreWork. Built with conviction.</p>
            <div className="flex items-center space-x-2">
              <svg viewBox="0 0 100 100" className="w-4 h-4 text-[#1d1d1f]" fill="currentColor">
                <path d="M10,90 Q50,10 90,90 H70 Q50,40 30,90 Z" />
              </svg>
              <span className="font-semibold text-[#1d1d1f]">AstreWork Autonomous Career Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
