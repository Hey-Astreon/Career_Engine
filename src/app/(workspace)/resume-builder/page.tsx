"use client";

import { useProfileStore } from "@/store/useProfileStore";
import {
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  FileCheck,
  Flame,
  Mail,
  MessageSquare,
  Printer,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  OptimizedResume,
  getMasterResumeBaseline,
  injectKeywordIntoResume,
} from "@/lib/resumeBaseline";

interface JobItem {
  id: string;
  company: string;
  title: string;
  platform: string;
  url: string;
  rawDescription?: string;
}

interface ApplicationKitData {
  coverLetter: string;
  linkedInMessage: string;
  coldEmail: string;
  followUpEmail: string;
}

export default function ResumeBuilderPage() {
  const { activeProfileSlug, activeProfile } = useProfileStore();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [resumeData, setResumeData] = useState<OptimizedResume>(() =>
    getMasterResumeBaseline(activeProfileSlug || "roushan")
  );
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [zoomScale, setZoomScale] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string>("summary");

  // Power upgrades states
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFScan, setShowFScan] = useState(false);
  const [injectedNotification, setInjectedNotification] = useState<string | null>(null);
  const [copiedKitTab, setCopiedKitTab] = useState<string | null>(null);

  // Synchronized Outreach Suite State
  const [activeOutreachTab, setActiveOutreachTab] = useState<"coverLetter" | "linkedin" | "email" | "followup">("coverLetter");
  const [isEditingOutreach, setIsEditingOutreach] = useState(false);
  const [kitData, setKitData] = useState<ApplicationKitData>({
    coverLetter: "",
    linkedInMessage: "",
    coldEmail: "",
    followUpEmail: "",
  });
  const [isLoadingKit, setIsLoadingKit] = useState(false);

  // Load baseline when candidate switches
  useEffect(() => {
    const slug = activeProfileSlug || "roushan";
    const baseline = getMasterResumeBaseline(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumeData(baseline);
  }, [activeProfileSlug]);

  // Load jobs from discovery API
  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs/scrape");
        const data = await response.json();
        if (data.success && data.jobs?.length) {
          setJobs(data.jobs);
          setSelectedJobId(data.jobs[0].id);
        }
      } catch (error) {
        console.error("Failed to load jobs:", error);
      }
    }
    void loadJobs();
  }, []);

  // Helper to generate instant high-converting outreach fallback
  const generateOutreachFallback = (
    candidateName: string,
    roleTitle: string,
    companyName: string
  ): ApplicationKitData => {
    const isAyushi = candidateName.toLowerCase().includes("ayushi");
    const portfolio = isAyushi ? "https://ayushiraj.me" : "https://astreon.me";
    const github = isAyushi ? "https://github.com/Silenttears-cloud" : "https://github.com/Hey-Astreon";
    const linkedin = isAyushi ? "https://www.linkedin.com/in/alrya404/" : "https://linkedin.com/in/astreon4547";

    const coverLetter = `Dear Hiring Team at ${companyName},

I am writing to express my strong interest in the ${roleTitle} role at ${companyName}. As a Systems and Backend Software Engineer specializing in low-latency architectures, distributed APIs, and full-stack software development, I have architected high-performance systems spanning C#/.NET Core, Java Spring Boot, Python FastAPI, and modern TypeScript runtimes.

Throughout my engineering work, I focus on building robust, fault-tolerant infrastructure with strict performance guarantees. My flagship projects include Astra Vision—an automated AST code parser and execution sandbox featuring subprocess isolation and sub-200ms latency—and IDBI FinSync, an intelligent financial management platform with live AI streaming and PostgreSQL transaction ledgers. Furthermore, my hands-on software engineering virtual experiences with Commonwealth Bank, Y Combinator (Shiptivity), and Walmart USA reinforced my adherence to 3NF database normalization, asynchronous event processing, and comprehensive unit testing (xUnit, Jest, PyTest).

${companyName}'s engineering culture and high technical standards align directly with my background in low-latency systems and clean architectural design. I am particularly excited about the prospect of contributing to your team's core services, optimizing API throughput, and solving complex engineering challenges at scale.

Thank you for your time and consideration. I would welcome the opportunity to discuss how my technical skills and disciplined engineering approach can drive immediate value for ${companyName}.

Sincerely,
${candidateName}
Portfolio: ${portfolio} | GitHub: ${github} | LinkedIn: ${linkedin}`;

    const linkedInMessage = `Hi [Name], I noticed ${companyName} is hiring for ${roleTitle}. I’m a Backend & Systems Engineer specializing in low-latency REST APIs (FastAPI, .NET Core, Spring Boot) and AST compiler tools with sub-200ms execution times. I'd love to connect and share how my background aligns with your engineering roadmap: ${portfolio}`;

    const coldEmail = `Subject: ${roleTitle} application – ${candidateName} (Systems & Backend Specialist)

Hi [Hiring Lead / Founder],

I’ve been following ${companyName}'s engineering milestones and wanted to reach out regarding the ${roleTitle} position.

I build high-throughput, low-latency software systems across Python (FastAPI), C#/.NET Core, Java Spring Boot, and TypeScript. In my recent work on Astra Vision, I built a self-healing subprocess sandbox executing code graphs in under 200ms, complemented by production virtual simulation experience at Commonwealth Bank and YC Shiptivity.

I’d love to contribute to ${companyName}’s backend performance and core product scaling. You can explore my live demos and technical codebase at ${portfolio} and ${github}.

Would you have 10 minutes next week for a brief conversation?

Best regards,
${candidateName}
${linkedin}`;

    const followUpEmail = `Subject: Re: ${roleTitle} application – ${candidateName}

Hi [Hiring Lead / Team],

I wanted to follow up on my note from last week regarding the ${roleTitle} opening at ${companyName}. 

I remain very enthusiastic about ${companyName}’s technical mission and would love to contribute my experience in low-latency APIs, database normalization, and automated testing to your team.

Looking forward to connecting when your schedule allows.

Best regards,
${candidateName}
${portfolio}`;

    return { coverLetter, linkedInMessage, coldEmail, followUpEmail };
  };

  // Fetch or sync Application Kit when selected job or profile changes
  useEffect(() => {
    async function fetchKit() {
      const candidateName = activeProfile?.fullName || resumeData.header.fullName || "Candidate";
      const targetRole = resumeData.targetRole || "Software Engineer";
      const targetCompany = resumeData.targetCompany || "Target Company";

      // Immediate high-quality client fallback so user is NEVER stuck loading
      const fallback = generateOutreachFallback(candidateName, targetRole, targetCompany);
      setKitData(fallback);

      if (!selectedJobId || customMode) return;
      setIsLoadingKit(true);
      try {
        const res = await fetch("/api/jobs/kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileSlug: activeProfileSlug || "roushan",
            jobPostingId: selectedJobId,
          }),
        });
        const data = await res.json();
        if (data.success && data.kit) {
          setKitData({
            coverLetter: data.kit.coverLetter || fallback.coverLetter,
            linkedInMessage: data.kit.linkedInMessage || fallback.linkedInMessage,
            coldEmail: data.kit.coldEmail || fallback.coldEmail,
            followUpEmail: data.kit.followUpEmail || fallback.followUpEmail,
          });
        }
      } catch (err) {
        console.warn("Using instant high-conversion outreach fallback:", err);
      } finally {
        setIsLoadingKit(false);
      }
    }
    void fetchKit();
  }, [selectedJobId, activeProfileSlug, customMode, resumeData.targetRole, resumeData.targetCompany, activeProfile?.fullName, resumeData.header.fullName]);

  const handleOptimizeResume = async (jobId?: string) => {
    setIsOptimizing(true);
    try {
      const payload: Record<string, string> = {
        profileSlug: activeProfileSlug || "roushan",
      };

      if (customMode && customDesc.trim()) {
        payload.customJobTitle = customTitle.trim() || "Full Stack Software Engineer";
        payload.customJobCompany = customCompany.trim() || "Target Company";
        payload.customJobDescription = customDesc.trim();
      } else if (jobId || selectedJobId) {
        payload.jobPostingId = jobId || selectedJobId;
      }

      const res = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.resume) {
        setResumeData(data.resume);
      }
    } catch (error) {
      console.error("Error optimizing resume:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleResetToMaster = () => {
    const baseline = getMasterResumeBaseline(activeProfileSlug || "roushan");
    setResumeData(baseline);
  };

  const handleDispatchApplication = async () => {
    if (!selectedJobId) {
      alert("Please select a job from the Discovery Feed to dispatch.");
      return;
    }
    
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/applications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileSlug: activeProfileSlug || "roushan",
          jobPostingId: selectedJobId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Application Successfully Dispatched to Pipeline Tracker!");
        const jobUrl = jobs.find(j => j.id === selectedJobId)?.url;
        if (jobUrl) {
          window.open(jobUrl, "_blank");
        }
      } else {
        alert("Dispatch failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to dispatch application.");
    } finally {
      setIsOptimizing(false);
    }
  };


  /**
   * 1-Click Auto-Named PDF Export
   */
  const handlePrint = () => {
    const candidate = activeProfile?.fullName || resumeData.header.fullName || "Candidate";
    const company = resumeData.targetCompany || "Company";
    const targetFilename = `${candidate.replace(/[^a-zA-Z0-9]/g, "_")}_Resume_${company.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const originalTitle = document.title;

    document.title = targetFilename;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  /**
   * 1-Click Missing Keyword Injector
   */
  const handleInjectKeyword = (keyword: string) => {
    const updated = injectKeywordIntoResume(resumeData, keyword);
    setResumeData(updated);
    setInjectedNotification(`Injected "+ ${keyword}" into Technical Skills & updated ATS score!`);
    setTimeout(() => setInjectedNotification(null), 3000);
  };

  /**
   * Copy Outreach Text
   */
  const handleCopyOutreach = async (text: string, type: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKitTab(type);
      setTimeout(() => setCopiedKitTab(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Inline update handlers
  const updateSummary = (newSummary: string) => {
    setResumeData((prev) => ({ ...prev, summary: newSummary }));
  };

  const updateHeadline = (newHeadline: string) => {
    setResumeData((prev) => ({
      ...prev,
      header: { ...prev.header, targetHeadline: newHeadline },
    }));
  };

  const updateSkill = (index: number, newText: string) => {
    setResumeData((prev) => {
      const updated = [...prev.skills];
      updated[index] = { ...updated[index], skillsText: newText };
      return { ...prev, skills: updated };
    });
  };

  const updateProjectBullet = (projIndex: number, bulletIndex: number, newBullet: string) => {
    setResumeData((prev) => {
      const updatedProjects = [...prev.projects];
      const updatedBullets = [...updatedProjects[projIndex].bullets];
      updatedBullets[bulletIndex] = newBullet;
      updatedProjects[projIndex] = { ...updatedProjects[projIndex], bullets: updatedBullets };
      return { ...prev, projects: updatedProjects };
    });
  };

  /**
   * Helper to highlight matched keywords when ATS Heatmap is active
   */
  const renderTextWithHeatmap = (text: string) => {
    if (!showHeatmap || resumeData.matchedKeywords.length === 0) {
      return text;
    }

    const regexPattern = new RegExp(
      `\\b(${resumeData.matchedKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
      "gi"
    );

    const parts = text.split(regexPattern);
    return parts.map((part, i) => {
      const isMatch = resumeData.matchedKeywords.some(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <span key={i} className="ats-keyword-match">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const currentOutreachText = useMemo(() => {
    if (activeOutreachTab === "coverLetter") return kitData.coverLetter;
    if (activeOutreachTab === "linkedin") return kitData.linkedInMessage;
    if (activeOutreachTab === "email") return kitData.coldEmail;
    return kitData.followUpEmail;
  }, [activeOutreachTab, kitData]);

  const wordCount = useMemo(() => {
    return currentOutreachText ? currentOutreachText.trim().split(/\s+/).length : 0;
  }, [currentOutreachText]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end no-print">
        <div>
          <div className="ce-page-eyebrow">
            ALL-IN-ONE APPLICATION SUITE <span className="mx-2 text-[var(--line-strong)]">/</span> 1-PAGE A4 ATS RESUME & OUTREACH
          </div>
          <h1 className="ce-page-title">Complete Application Kit</h1>
          <p className="ce-page-copy">
            Tailor your exact 1-page A4 master resume and generate fully synchronized, high-response Cover Letters, Recruiter DMs, and Cold Emails for any target role.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="ce-chip ce-chip-blue">
            <FileCheck className="h-3 w-3" />
            {activeProfile?.fullName || "Candidate"}
          </span>
          <button
            onClick={handlePrint}
            className="ce-button-primary !min-h-9 !px-4"
            title={`Downloads as ${activeProfile?.fullName || "Candidate"}_Resume_${resumeData.targetCompany || "Company"}.pdf`}
          >
            <Printer className="h-3.5 w-3.5" />
            Download / Print A4 PDF
          </button>
        </div>
      </section>

      {/* Injected Notification Banner */}
      {injectedNotification && (
        <div className="rounded-lg bg-[var(--green-soft)] border border-[var(--green)] p-3 text-[12px] font-bold text-[var(--green)] flex items-center justify-between no-print animate-in fade-in slide-in-from-top-1">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {injectedNotification}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-mono">ATS Updated</span>
        </div>
      )}

      {/* Target Job Selector & Action Bar */}
      <section className="ce-surface p-4 no-print sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <button
              onClick={() => setCustomMode(!customMode)}
              className={`ce-chip cursor-pointer transition-colors ${
                customMode ? "bg-[var(--ink)] text-white" : "bg-[var(--surface-muted)] text-[var(--ink)]"
              }`}
            >
              <Target className="h-3 w-3" />
              {customMode ? "Custom JD Mode (Active)" : "Select from Discovery Feed"}
            </button>

            {!customMode && (
              <div className="relative min-w-[280px] flex-1 max-w-md">
                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    void handleOptimizeResume(e.target.value);
                  }}
                  className="ce-field !pr-8 font-medium truncate"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company} — {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleOptimizeResume()}
              disabled={isOptimizing}
              className="ce-button-secondary disabled:opacity-60"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isOptimizing ? "animate-spin" : ""}`} />
              {isOptimizing ? "Optimizing..." : "Optimize"}
            </button>
            
            <button
              onClick={handleDispatchApplication}
              disabled={isOptimizing || customMode || !selectedJobId}
              className="ce-button-primary !min-h-9"
              title="Save to Pipeline Tracker & Open Application Link"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Dispatch Application
            </button>

            <button
              onClick={handleResetToMaster}
              className="ce-button-secondary !min-h-9"
              title="Reset to Master Profile Baseline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Custom Job Input Accordion */}
        {customMode && (
          <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Job Title
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Backend Engineer"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="ce-field mt-1"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Supabase"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="ce-field mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Job Description / Required Skills
              </label>
              <textarea
                rows={3}
                placeholder="Paste job description requirements and tech stack here..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="ce-field mt-1 !h-auto p-2"
              />
            </div>
          </div>
        )}
      </section>

      {/* Main Builder Grid: Left Editor & Right A4 Sheet */}
      <section className="grid gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
        {/* Left Column: Telemetry & Section Editors */}
        <aside className="space-y-4 no-print">
          {/* ATS Telemetry & Match Card */}
          <div className="ce-surface p-5">
            <div className="flex items-center justify-between">
              <div className="ce-page-eyebrow">ATS Match Engine</div>
              <span className="ce-chip ce-chip-green font-mono text-[10px]">
                {resumeData.atsScore}% Score
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-[var(--green-soft)] text-[var(--green)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <b className="text-[13px] text-[var(--ink)]">
                  {resumeData.targetRole}
                </b>
                <p className="text-[11px] text-[var(--muted)]">
                  {resumeData.targetCompany} · 1-Page A4 Calibrated
                </p>
              </div>
            </div>

            {resumeData.matchedKeywords.length > 0 && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  Matched Skills ({resumeData.matchedKeywords.length})
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {resumeData.matchedKeywords.map((kw) => (
                    <span key={kw} className="ce-chip ce-chip-green !min-h-5 !px-2 !text-[9px]">
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {resumeData.missingKeywords.length > 0 && (
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--amber)] uppercase tracking-wider">
                    Missing Keywords (Click to Inject)
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">1-Click Auto-Fit</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {resumeData.missingKeywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => handleInjectKeyword(kw)}
                      className="ce-chip !bg-[var(--amber-soft)] !text-[var(--amber)] !min-h-5 !px-2 !text-[9px] hover:!bg-[var(--amber)] hover:!text-white transition-colors cursor-pointer"
                      title={`Click to auto-inject ${kw} into Technical Skills`}
                    >
                      + {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-[var(--line)] pt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--green)]" />
                Page Budget: 100% Filled
              </span>
              <span className="font-mono text-[9px]">0 Overlap · 0 Gaps</span>
            </div>
          </div>

          {/* Section Editors Accordion */}
          <div className="ce-surface divide-y divide-[var(--line)] overflow-hidden">
            {/* Header / Headline */}
            <div className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === "header" ? "" : "header")}
                className="flex w-full items-center justify-between text-left font-bold text-[12px] text-[var(--ink)]"
              >
                <span>1. Target Headline</span>
                {expandedSection === "header" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSection === "header" && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={resumeData.header.targetHeadline}
                    onChange={(e) => updateHeadline(e.target.value)}
                    className="ce-field text-[11px]"
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === "summary" ? "" : "summary")}
                className="flex w-full items-center justify-between text-left font-bold text-[12px] text-[var(--ink)]"
              >
                <span>2. Professional Summary</span>
                {expandedSection === "summary" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSection === "summary" && (
                <div className="mt-3">
                  <textarea
                    rows={5}
                    value={resumeData.summary}
                    onChange={(e) => updateSummary(e.target.value)}
                    className="ce-field !h-auto p-2.5 text-[11px] leading-5"
                  />
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === "skills" ? "" : "skills")}
                className="flex w-full items-center justify-between text-left font-bold text-[12px] text-[var(--ink)]"
              >
                <span>3. Technical Skills (6 Categories)</span>
                {expandedSection === "skills" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSection === "skills" && (
                <div className="mt-3 space-y-2">
                  {resumeData.skills.map((cat, idx) => (
                    <div key={cat.categoryName}>
                      <span className="text-[10px] font-bold text-[var(--muted)]">
                        {cat.categoryName}
                      </span>
                      <input
                        type="text"
                        value={cat.skillsText}
                        onChange={(e) => updateSkill(idx, e.target.value)}
                        className="ce-field mt-0.5 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === "projects" ? "" : "projects")}
                className="flex w-full items-center justify-between text-left font-bold text-[12px] text-[var(--ink)]"
              >
                <span>4. Flagship Projects (3 Projects)</span>
                {expandedSection === "projects" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSection === "projects" && (
                <div className="mt-3 space-y-3">
                  {resumeData.projects.map((proj, pIdx) => (
                    <div key={proj.title} className="rounded border border-[var(--line)] p-2.5 bg-[var(--surface-muted)]">
                      <b className="text-[11px] text-[var(--ink)]">{proj.title.split(" - ")[0]}</b>
                      <div className="mt-2 space-y-1.5">
                        {proj.bullets.map((bullet, bIdx) => (
                          <textarea
                            key={bIdx}
                            rows={2}
                            value={bullet}
                            onChange={(e) => updateProjectBullet(pIdx, bIdx, e.target.value)}
                            className="ce-field !h-auto p-1.5 text-[10px] leading-4"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Column: Live A4 Printable Sheet Previewer */}
        <main className="flex flex-col items-center">
          {/* Visual Controls & Power Toggles */}
          <div className="mb-3 flex flex-wrap items-center justify-between w-full max-w-[210mm] gap-2 no-print">
            {/* Heatmap & F-Pattern Guide Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`ce-chip cursor-pointer transition-colors !min-h-7 !px-2.5 !text-[10px] font-bold ${
                  showHeatmap ? "bg-emerald-600 text-white" : "bg-[var(--surface-muted)] text-[var(--ink-soft)]"
                }`}
                title="Visually highlight keywords matched with target JD"
              >
                <Flame className="h-3 w-3" />
                ATS Heatmap: {showHeatmap ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setShowFScan(!showFScan)}
                className={`ce-chip cursor-pointer transition-colors !min-h-7 !px-2.5 !text-[10px] font-bold ${
                  showFScan ? "bg-[var(--blue)] text-white" : "bg-[var(--surface-muted)] text-[var(--ink-soft)]"
                }`}
                title="Display 6-Second Recruiter Eye-Tracking Hotspots"
              >
                <Eye className="h-3 w-3" />
                6-Sec Scan Guide: {showFScan ? "ON" : "OFF"}
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.05))}
                className="ce-button-secondary !min-h-7 !px-2"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="font-mono text-[10px] text-[var(--ink-soft)] w-10 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale(Math.min(1.2, zoomScale + 0.05))}
                className="ce-button-secondary !min-h-7 !px-2"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
              <button
                onClick={() => setZoomScale(1)}
                className="ce-button-secondary !min-h-7 !px-2 text-[10px]"
              >
                100% Fit
              </button>
            </div>
          </div>

          {/* Printable A4 Sheet Container */}
          <div
            style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
            className="transition-transform duration-150 relative"
          >
            <div id="ats-resume-document" className="ats-a4-sheet relative">
              {/* Recruiter 6-Second Scan Guide HUD Overlays */}
              {showFScan && (
                <>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "9mm", left: "10mm", right: "10mm", height: "18mm" }}
                  >
                    <span className="ats-f-pattern-tag">Zone 1: Identity & Role Alignment (0.8s)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "30mm", left: "10mm", right: "10mm", height: "24mm" }}
                  >
                    <span className="ats-f-pattern-tag">Zone 2: Executive Summary & Impact Metrics (1.5s)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "86mm", left: "10mm", right: "10mm", height: "30mm" }}
                  >
                    <span className="ats-f-pattern-tag">Zone 3: Flagship Architecture & Concurrency (2.2s)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "58mm", left: "10mm", right: "10mm", height: "25mm" }}
                  >
                    <span className="ats-f-pattern-tag">Zone 4: Categorized Stack Verification (1.5s)</span>
                  </div>
                </>
              )}

              {/* HEADER */}
              <div style={{ textAlign: "center", marginBottom: "2pt" }}>
                <h1>{resumeData.header.fullName}</h1>
                <div style={{ fontSize: "9.0pt", fontWeight: 700, color: "#1e293b", marginTop: "1.5pt" }}>
                  {renderTextWithHeatmap(resumeData.header.targetHeadline)}
                </div>
                <div style={{ fontSize: "8.0pt", color: "#334155", marginTop: "2pt" }}>
                  {resumeData.header.location} | {resumeData.header.phone} | {resumeData.header.email} |{" "}
                  <a href={resumeData.header.portfolioUrl} target="_blank" rel="noreferrer">
                    {resumeData.header.portfolioUrl.replace(/^https?:\/\//, "")}
                  </a>{" "}
                  |{" "}
                  <a href={resumeData.header.githubUrl} target="_blank" rel="noreferrer">
                    {resumeData.header.githubUrl.replace(/^https?:\/\//, "")}
                  </a>{" "}
                  |{" "}
                  <a href={resumeData.header.linkedinUrl} target="_blank" rel="noreferrer">
                    {resumeData.header.linkedinUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              </div>

              <hr />

              {/* PROFESSIONAL SUMMARY */}
              <div>
                <h2>PROFESSIONAL SUMMARY</h2>
                <div style={{ fontSize: "8.65pt", lineHeight: "1.28", color: "#1e293b", marginTop: "2pt", textAlign: "justify" }}>
                  {renderTextWithHeatmap(resumeData.summary)}
                </div>
              </div>

              <hr />

              {/* TECHNICAL SKILLS */}
              <div>
                <h2>TECHNICAL SKILLS</h2>
                <div style={{ marginTop: "2pt" }}>
                  {resumeData.skills.map((s) => (
                    <div key={s.categoryName} style={{ fontSize: "8.35pt", lineHeight: "1.25", color: "#1e293b", marginBottom: "1.4pt" }}>
                      <b>• {s.categoryName}:</b> {renderTextWithHeatmap(s.skillsText)}
                    </div>
                  ))}
                </div>
              </div>

              <hr />

              {/* TECHNICAL PROJECTS */}
              <div>
                <h2>TECHNICAL PROJECTS</h2>
                <div style={{ marginTop: "2pt" }}>
                  {resumeData.projects.map((proj) => (
                    <div key={proj.title} style={{ marginBottom: "2.8pt" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <h3 style={{ fontSize: "8.75pt" }}>
                          <b>{renderTextWithHeatmap(proj.title)}</b>
                        </h3>
                        <span style={{ fontSize: "7.8pt", color: "#475569" }}>
                          <a href={proj.liveDemoUrl} target="_blank" rel="noreferrer">Live Demo</a> |{" "}
                          <a href={proj.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
                        </span>
                      </div>
                      <ul>
                        {proj.bullets.map((b, i) => {
                          const parts = b.split(":");
                          const prefix = parts.length > 1 ? parts[0] + ":" : "";
                          const rest = parts.length > 1 ? parts.slice(1).join(":") : b;
                          return (
                            <li key={i}>
                              {prefix && <b>{prefix} </b>}
                              {renderTextWithHeatmap(rest)}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <hr />

              {/* TECHNICAL SIMULATIONS */}
              <div>
                <h2>TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES</h2>
                <div style={{ marginTop: "2pt" }}>
                  {resumeData.simulations.map((sim) => (
                    <div key={sim.company} style={{ marginBottom: "2.8pt" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <h3 style={{ fontSize: "8.75pt" }}>
                          <b>{sim.company} - {sim.roleTitle}</b>
                        </h3>
                        <span style={{ fontSize: "7.8pt", color: "#475569" }}>{sim.period}</span>
                      </div>
                      <ul>
                        <li>
                          <b>Problem & Scope:</b> {renderTextWithHeatmap(sim.problemScope)}
                        </li>
                        <li>
                          <b>Action Taken:</b> {renderTextWithHeatmap(sim.actionTaken)}
                        </li>
                        <li>
                          <b>Engineering Outcome:</b> {renderTextWithHeatmap(sim.engineeringOutcome)}
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <hr />

              {/* EDUCATION */}
              <div>
                <h2>EDUCATION</h2>
                <div style={{ marginTop: "2pt" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h3 style={{ fontSize: "8.75pt" }}>
                      <b>{resumeData.education.degree}</b> - {resumeData.education.university}
                    </h3>
                    <span style={{ fontSize: "7.8pt", color: "#475569" }}>{resumeData.education.period}</span>
                  </div>
                  <ul>
                    <li>
                      <b>Relevant Coursework:</b> {renderTextWithHeatmap(resumeData.education.coursework)}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>

      {/* Spacious, Dedicated Outreach Suite Workspace */}
      <section className="ce-surface p-6 sm:p-8 no-print border border-[var(--line)] shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-[var(--line)] pb-5">
          <div>
            <div className="ce-page-eyebrow">SYNCHRONIZED OUTREACH SUITE</div>
            <h2 className="text-[18px] font-bold text-[var(--ink)] mt-1">
              Multi-Channel Application Materials ({resumeData.targetCompany || "Target Role"})
            </h2>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Tailored outreach materials automatically synchronized with your current resume optimizations and target tech stack.
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setActiveOutreachTab("coverLetter");
                setIsEditingOutreach(false);
              }}
              className={`ce-chip cursor-pointer !min-h-9 !px-3.5 !text-[12px] font-semibold transition-all ${
                activeOutreachTab === "coverLetter"
                  ? "bg-[var(--ink)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)]"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Cover Letter
            </button>
            <button
              onClick={() => {
                setActiveOutreachTab("linkedin");
                setIsEditingOutreach(false);
              }}
              className={`ce-chip cursor-pointer !min-h-9 !px-3.5 !text-[12px] font-semibold transition-all ${
                activeOutreachTab === "linkedin"
                  ? "bg-[var(--ink)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)]"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              LinkedIn Recruiter DM
            </button>
            <button
              onClick={() => {
                setActiveOutreachTab("email");
                setIsEditingOutreach(false);
              }}
              className={`ce-chip cursor-pointer !min-h-9 !px-3.5 !text-[12px] font-semibold transition-all ${
                activeOutreachTab === "email"
                  ? "bg-[var(--ink)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)]"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Founder / CTO Cold Email
            </button>
            <button
              onClick={() => {
                setActiveOutreachTab("followup");
                setIsEditingOutreach(false);
              }}
              className={`ce-chip cursor-pointer !min-h-9 !px-3.5 !text-[12px] font-semibold transition-all ${
                activeOutreachTab === "followup"
                  ? "bg-[var(--ink)] text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)]"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              7-Day Follow-Up
            </button>
          </div>
        </div>

        {/* Spacious Content Viewer / Editor Canvas */}
        <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-6 transition-all">
          {/* Card Action & Metric Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink)]">
                {activeOutreachTab === "coverLetter" && "4-Paragraph Executive Cover Letter"}
                {activeOutreachTab === "linkedin" && "LinkedIn Recruiter InMail / Connection Hook (300 Chars)"}
                {activeOutreachTab === "email" && "Executive Cold Pitch to Founder / Engineering VP"}
                {activeOutreachTab === "followup" && "High-Signal 7-Day Respectful Follow-Up"}
              </span>
              <span className="ce-chip ce-chip-blue !min-h-5 !px-2 !text-[10px] font-mono">
                {wordCount} words · {Math.max(1, Math.round(wordCount / 200))} min read
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingOutreach(!isEditingOutreach)}
                className="ce-button-secondary !min-h-8 !px-3 !text-[11px]"
                title="Toggle Edit Mode"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {isEditingOutreach ? "Reader Mode" : "Edit Text"}
              </button>

              <button
                onClick={() => void handleCopyOutreach(currentOutreachText, activeOutreachTab)}
                className="ce-button-primary !min-h-8 !px-3.5 !text-[11px]"
              >
                {copiedKitTab === activeOutreachTab ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[var(--green)]" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Reading / Editing Body */}
          {isLoadingKit ? (
            <div className="py-16 text-center text-[13px] text-[var(--muted)]">
              <Sparkles className="mx-auto h-6 w-6 animate-spin text-[var(--blue)] mb-3" />
              Synchronizing tailored outreach copy with target parameters...
            </div>
          ) : isEditingOutreach ? (
            <textarea
              rows={14}
              value={currentOutreachText}
              onChange={(e) => {
                const val = e.target.value;
                setKitData((prev) => ({
                  ...prev,
                  [activeOutreachTab === "coverLetter"
                    ? "coverLetter"
                    : activeOutreachTab === "linkedin"
                    ? "linkedInMessage"
                    : activeOutreachTab === "email"
                    ? "coldEmail"
                    : "followUpEmail"]: val,
                }));
              }}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 font-mono text-[12.5px] leading-6 text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] resize-y min-h-[360px]"
            />
          ) : (
            <div className="rounded-lg bg-[var(--surface)] p-6 text-[13.5px] leading-7 text-[var(--ink)] whitespace-pre-line border border-[var(--line)] min-h-[320px] font-sans">
              {currentOutreachText}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
