"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  MousePointerClick,
  ArrowRight,
  RotateCcw,
  Check,
  Mail,
  Radar,
} from "lucide-react";

type TabKey = "jobs" | "resume" | "autofill";

interface JobItem {
  id: string;
  title: string;
  company: string;
  category: "all" | "fullstack" | "backend" | "frontend";
  ats: string;
  location: string;
  salary: string;
  freshness: string;
  matchScore: number;
  skills: string[];
}

const SAMPLE_JOBS: JobItem[] = [
  {
    id: "stripe-fs",
    title: "Senior Full Stack Developer",
    company: "Stripe",
    category: "fullstack",
    ats: "Greenhouse Direct",
    location: "Remote (US / Worldwide)",
    salary: "$160k – $210k",
    freshness: "3m ago",
    matchScore: 98,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  },
  {
    id: "linear-be",
    title: "Distributed Systems Developer",
    company: "Linear",
    category: "backend",
    ats: "Ashby Pipeline",
    location: "Remote",
    salary: "$175k – $225k",
    freshness: "12m ago",
    matchScore: 96,
    skills: ["TypeScript", "Distributed Systems", "Sync Engines", "LibSQL"],
  },
  {
    id: "supabase-fe",
    title: "Frontend React Developer",
    company: "Supabase",
    category: "frontend",
    ats: "Lever Direct",
    location: "Remote",
    salary: "$140k – $180k",
    freshness: "28m ago",
    matchScore: 95,
    skills: ["React", "Next.js", "Tailwind CSS", "UI Systems"],
  },
  {
    id: "vercel-edge",
    title: "Edge Runtime Developer",
    company: "Vercel",
    category: "backend",
    ats: "Workable Stream",
    location: "Remote",
    salary: "$165k – $215k",
    freshness: "42m ago",
    matchScore: 94,
    skills: ["Rust", "Node.js", "Edge Computing", "Turbopack"],
  },
];

export default function HeroInteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<TabKey>("jobs");
  const [autoRotate, setAutoRotate] = useState(true);

  // Tab 1 state: Filter category & selected job
  const [jobCategory, setJobCategory] = useState<"all" | "fullstack" | "backend" | "frontend">("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("stripe-fs");

  // Tab 2 state: ATS Resume Scanner & Laser X-Ray
  const [isScanningResume, setIsScanningResume] = useState(false);
  const [resumeScore, setResumeScore] = useState(98);
  const [showInviteModal, setShowInviteModal] = useState(true);
  const [resumeViewMode, setResumeViewMode] = useState<"split" | "laser">("split");

  // Tab 3 state: 1-Click Fast Apply simulation
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState(0);
  const [autofillCompleted, setAutofillCompleted] = useState(false);

  // Auto-switch tabs every 10 seconds unless user manually interacts
  useEffect(() => {
    if (!autoRotate) return;
    const tabs: TabKey[] = ["jobs", "resume", "autofill"];
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const nextIndex = (tabs.indexOf(current) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 9500);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const handleTabSelect = (tab: TabKey) => {
    setAutoRotate(false);
    setActiveTab(tab);
  };

  const filteredJobs = SAMPLE_JOBS.filter(
    (j) => jobCategory === "all" || j.category === jobCategory
  );

  const handleSimulateResumeScan = () => {
    setIsScanningResume(true);
    setResumeScore(62);
    setShowInviteModal(false);

    setTimeout(() => {
      setResumeScore(84);
    }, 400);

    setTimeout(() => {
      setResumeScore(98);
      setIsScanningResume(false);
      setShowInviteModal(true);
    }, 900);
  };

  const handleSimulateAutofill = () => {
    setIsAutofilling(true);
    setAutofillProgress(0);
    setAutofillCompleted(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setAutofillProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsAutofilling(false);
        setAutofillCompleted(true);
      }
    }, 280);
  };

  const handleResetAutofill = () => {
    setAutofillCompleted(false);
    setAutofillProgress(0);
  };

  return (
    <div className="mt-10 sm:mt-12 w-full max-w-[1040px] mx-auto text-left">
      {/* Interactive Tabs Bar (Clean, Zero Numbered Vibe-Coding) */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleTabSelect("jobs")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all cursor-pointer ${
            activeTab === "jobs"
              ? "bg-[#0f0f11] text-white shadow-md scale-[1.02]"
              : "bg-white/90 hover:bg-white text-[#52525b] border border-black/[0.08]"
          }`}
        >
          <Radar className={`w-4 h-4 ${activeTab === "jobs" ? "text-blue-400 animate-spin" : "text-gray-400"}`} />
          <span>Live Verified Radar</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect("resume")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all cursor-pointer ${
            activeTab === "resume"
              ? "bg-[#0f0f11] text-white shadow-md scale-[1.02]"
              : "bg-white/90 hover:bg-white text-[#52525b] border border-black/[0.08]"
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === "resume" ? "text-amber-400" : "text-gray-400"}`} />
          <span>ATS Laser X-Ray</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect("autofill")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-semibold transition-all cursor-pointer ${
            activeTab === "autofill"
              ? "bg-[#0f0f11] text-white shadow-md scale-[1.02]"
              : "bg-white/90 hover:bg-white text-[#52525b] border border-black/[0.08]"
          }`}
        >
          <MousePointerClick className={`w-4 h-4 ${activeTab === "autofill" ? "text-emerald-400" : "text-gray-400"}`} />
          <span>1-Click Fast Apply</span>
        </button>
      </div>

      {/* Main Interactive Showcase Window */}
      <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-black/[0.08] bg-white transition-all">
        {/* Browser Frame Header */}
        <div className="bg-[#f4f4f6] px-5 py-3 border-b border-black/[0.06] flex items-center justify-between text-[12px] text-[#71717a]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
            <span className="ml-3 font-mono text-[11px] text-[#86868b] hidden sm:inline">
              astrework.app / {activeTab === "jobs" ? "live-radar" : activeTab === "resume" ? "ats-xray" : "fast-apply"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[11px] text-[#52525b]">
              {activeTab === "jobs" ? "21 ATS Feeds Synchronized" : activeTab === "resume" ? "Parser Audit Active" : "In-Browser Assistant Ready"}
            </span>
          </div>
        </div>

        {/* Dynamic Interactive Body */}
        <div className="p-5 sm:p-7 min-h-[440px] flex items-center justify-center bg-[#fafafa]">
          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════════════════════════════
                TAB 1: LIVE VERIFIED RADAR (FOMO & Freshness)
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === "jobs" && (
              <motion.div
                key="tab-jobs"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl space-y-3.5"
              >
                {/* Header Controls & Live Blip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[14px] font-bold text-[#0f0f11]">Direct Company Boards</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      Zero Reposts
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {(["all", "fullstack", "backend", "frontend"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setAutoRotate(false);
                          setJobCategory(cat);
                        }}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors capitalize cursor-pointer ${
                          jobCategory === cat
                            ? "bg-[#0f0f11] text-white shadow-xs"
                            : "bg-white border border-black/[0.06] text-[#71717a] hover:text-[#0f0f11]"
                        }`}
                      >
                        {cat === "all" ? "All Roles" : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Cards */}
                <div className="space-y-2.5">
                  {filteredJobs.slice(0, 3).map((job) => {
                    const isSelected = selectedJobId === job.id;
                    return (
                      <div
                        key={job.id}
                        onClick={() => {
                          setAutoRotate(false);
                          setSelectedJobId(job.id);
                        }}
                        className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500/60 shadow-[0_4px_16px_rgba(37,99,235,0.08)] ring-1 ring-blue-500/30"
                            : "border-black/[0.06] hover:border-black/20 shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] sm:text-[16px] font-semibold text-[#0f0f11]">
                                {job.title}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                {job.ats}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-[#71717a]">
                              <strong className="font-semibold text-[#0f0f11]">{job.company}</strong>
                              <span>•</span>
                              <span>{job.location}</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">{job.salary}</span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.04]">
                            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Discovered {job.freshness}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f0f11]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {job.matchScore}% ATS Match
                            </span>
                          </div>
                        </div>

                        {/* Expanded details when selected */}
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 pt-3 border-t border-black/[0.05] space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-[#86868b] mr-1">Stack:</span>
                                {job.skills.map((skill, sIdx) => (
                                  <span key={sIdx} className="px-2 py-0.5 bg-[#f4f4f6] text-[#52525b] text-[11px] rounded font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTabSelect("autofill");
                                }}
                                className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 text-[12px]"
                              >
                                Fast Apply With AstrePilot <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 text-[12px] text-[#71717a]">
                  <span>Caught directly from company career APIs before being listed on job aggregators.</span>
                  <span className="font-semibold text-[#0f0f11]">480+ Roles Today</span>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2: ATS LASER X-RAY & INTERVIEW UNLOCKER (Relief & Validation)
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === "resume" && (
              <motion.div
                key="tab-resume"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl space-y-4"
              >
                {/* Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#0f0f11]">ATS Parser X-Ray</span>
                    <span className="text-[12px] text-[#71717a]">See what the bots actually read</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResumeViewMode(resumeViewMode === "split" ? "laser" : "split")}
                      className="px-2.5 py-1 rounded-md bg-white border border-black/[0.08] hover:border-black/20 text-[11px] font-medium text-[#52525b] transition-colors cursor-pointer"
                    >
                      {resumeViewMode === "split" ? "Laser Scan View" : "Split Comparison"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateResumeScan}
                      disabled={isScanningResume}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0f0f11] hover:bg-black text-[11px] font-semibold text-white shadow-2xs transition-all cursor-pointer"
                    >
                      <RotateCcw className={`w-3 h-3 ${isScanningResume ? "animate-spin text-blue-400" : ""}`} />
                      <span>{isScanningResume ? "Scanning ATS..." : "Audit Scanner"}</span>
                    </button>
                  </div>
                </div>

                {/* Main Comparative View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                  {/* Before: Raw Resume */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-red-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[12px] font-bold text-red-600 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" /> Generic Canva / Word
                        </span>
                        <span className="text-[12px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          62 / 100
                        </span>
                      </div>

                      <div className="space-y-2 text-[12px] text-[#71717a]">
                        <p className="line-through text-gray-400 italic bg-gray-50 p-2 rounded">
                          &ldquo;Responsible for managing backend microservices and databases.&rdquo;
                        </p>
                        <div className="p-2.5 rounded-lg bg-red-50/70 text-red-800 text-[11px] space-y-1 font-medium">
                          <div>⚠️ Workday ATS broke multi-column table layout</div>
                          <div>⚠️ Missing quantifiable impact metrics</div>
                          <div>⚠️ 1.3 pages (Clipped by recruiter screen)</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/[0.06] text-[11px] font-semibold text-red-600 flex items-center gap-1">
                      ❌ Auto-rejected by screening filter
                    </div>
                  </div>

                  {/* After: AstreWork Optimized */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-300 shadow-xs flex flex-col justify-between relative overflow-hidden">
                    {/* Laser sweep animation bar */}
                    {isScanningResume && (
                      <motion.div
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] z-20 pointer-events-none"
                      />
                    )}

                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[12px] font-bold text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> AstreWork Single-Page
                        </span>
                        <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {resumeScore} / 100
                        </span>
                      </div>

                      <div className="space-y-2 text-[12px] text-[#0f0f11]">
                        <p className="font-medium bg-emerald-50/60 p-2 rounded border border-emerald-200/50">
                          &ldquo;Architected distributed scraper pipelines across 21 endpoints, increasing velocity by 300%.&rdquo;
                        </p>
                        <div className="p-2.5 rounded-lg bg-emerald-50/70 text-emerald-900 text-[11px] space-y-1 font-medium">
                          <div>✓ 100% linear text extraction guaranteed</div>
                          <div>✓ Google XYZ impact structure enforced</div>
                          <div>✓ Strict single-page A4 geometry (Zero overflow)</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/[0.06] text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      🎉 Interview Callback Expected
                    </div>
                  </div>
                </div>

                {/* The Dopamine Ding: Realistic Interview Invitation Banner */}
                {showInviteModal && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-blue-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[12px] shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[13px] text-[#0f0f11] font-semibold">Stripe Recruiting Team</strong>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200/50">
                            Interview Request
                          </span>
                        </div>
                        <p className="text-[12px] text-[#52525b] mt-0.5">
                          &ldquo;Hi Roushan, your distributed systems background looks like a great match. Would you be open for a 30-min intro chat this Thursday?&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.05]">
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        ✓ 98% ATS Pass
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3: 1-CLICK FAST APPLY (Velocity & Relief)
                ══════════════════════════════════════════════════════════════ */}
            {activeTab === "autofill" && (
              <motion.div
                key="tab-autofill"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-xl bg-white p-6 rounded-2xl border border-black/[0.08] shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[13px] font-bold text-[#0f0f11]">AstrePilot In-Browser Assistant</span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/50 px-2 py-0.5 rounded">
                    Greenhouse ATS Page Detected (stripe.com)
                  </span>
                </div>

                {/* Form fields simulator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                    <span className="text-[#71717a]">Target Role:</span>
                    <strong className="text-[#0f0f11]">Senior Full Stack Developer @ Stripe</strong>
                  </div>

                  <div className="flex items-center justify-between text-[12px] p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                    <span className="text-[#71717a]">Form Fields:</span>
                    <span className="font-semibold text-emerald-600">
                      {autofillCompleted
                        ? "14 of 14 Fields Synthesized ✓"
                        : isAutofilling
                        ? `Populating (${autofillProgress}%)...`
                        : "14 Application Fields Ready"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px] p-2.5 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                    <span className="text-[#71717a]">Attached Resume:</span>
                    <span className="font-semibold text-[#0f0f11] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      AstreWork-ATS-A4.pdf
                    </span>
                  </div>
                </div>

                {/* Autofill Progress Bar */}
                {isAutofilling && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-[#52525b]">
                      <span>Mapping applicant profile into Greenhouse...</span>
                      <span>{autofillProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${autofillProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                )}

                {/* Interactive Action Trigger */}
                <div className="pt-2">
                  {autofillCompleted ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-semibold flex items-center justify-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Application Ready in 1.2s! (Saved 18 minutes)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetAutofill}
                          className="p-3 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 text-[#52525b] hover:text-[#0f0f11] transition-all cursor-pointer"
                          title="Reset simulation"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-[11px] text-center text-[#71717a]">
                        ⚡ Dispatched directly to hiring team before public job board flood.
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSimulateAutofill}
                      disabled={isAutofilling}
                      className="w-full py-3.5 rounded-xl bg-[#0f0f11] hover:bg-black text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <MousePointerClick className="w-4 h-4 text-emerald-400" />
                      <span>{isAutofilling ? "Injecting Profile Fields..." : "Simulate 1-Click Fast Apply"}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
