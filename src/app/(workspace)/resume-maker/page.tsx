"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  Flame,
  ZoomIn,
  ZoomOut,
  FileText,
  ArrowRight,
  Upload,
  Info,
} from "lucide-react";
import {
  OptimizedResume,
  ResumePreset,
  RESUME_STARTER_PRESETS,
  calculateAtsAudit,
  renderResumeMarkdown,
  renderResumePlaintext,
} from "@/lib/resumeBaseline";
import { useProfileStore } from "@/store/useProfileStore";
import { ResumeVariantsSidebar } from "@/components/ResumeVariantsSidebar";

export default function ResumeMakerPage() {
  const { activeProfileSlug, activeProfile } = useProfileStore();
  // Active starter preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>("systems_backend");
  const [resumeData, setResumeData] = useState<OptimizedResume>(() => {
    return JSON.parse(JSON.stringify(RESUME_STARTER_PRESETS[0].resume));
  });

  // UI state
  const [activeSection, setActiveSection] = useState<string>("header");
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showFScan, setShowFScan] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showVariantsDrawer, setShowVariantsDrawer] = useState<boolean>(false);
  const [showAtsChecklist, setShowAtsChecklist] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time ATS Audit Matrix
  const audit = useMemo(() => {
    return calculateAtsAudit(resumeData);
  }, [resumeData]);

  // Flash notification helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Populate from active candidate profile
  const handleSyncActiveProfile = () => {
    if (!activeProfile) {
      showToast("No active candidate profile found");
      return;
    }
    setResumeData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (activeProfile.fullName) updated.header.fullName = activeProfile.fullName;
      if (activeProfile.title) updated.header.targetHeadline = activeProfile.title;
      if (activeProfile.location) updated.header.location = activeProfile.location;
      if (activeProfile.email) updated.header.email = activeProfile.email;
      if (activeProfile.phone) updated.header.phone = activeProfile.phone;
      if (activeProfile.linkedinUrl) updated.header.linkedinUrl = activeProfile.linkedinUrl;
      if (activeProfile.githubUrl) updated.header.githubUrl = activeProfile.githubUrl;
      if (activeProfile.portfolioUrl) updated.header.portfolioUrl = activeProfile.portfolioUrl;

      if (activeProfile.projects && activeProfile.projects.length > 0) {
        updated.projects = activeProfile.projects.map((proj) => ({
          title: proj.title,
          techStack: proj.techStack || "",
          liveDemoUrl: proj.liveDemoUrl || "",
          githubUrl: proj.githubUrl || "",
          bulletPoints: proj.bulletPoints
            ? proj.bulletPoints.split("\n").filter(Boolean)
            : [proj.architecture || "Engineered core distributed services and resilient workflows."],
        }));
      }

      return updated;
    });
    setSelectedPresetId("custom_profile");
    showToast(`Loaded details from "${activeProfile.fullName}"`);
  };

  // Load Preset
  const handleSelectPreset = (preset: ResumePreset) => {
    setSelectedPresetId(preset.id);
    setResumeData(JSON.parse(JSON.stringify(preset.resume)));
    showToast(`Loaded "${preset.name}" preset!`);
  };

  // Reset to current preset
  const handleResetCurrent = () => {
    const matched = RESUME_STARTER_PRESETS.find((p) => p.id === selectedPresetId);
    if (matched) {
      setResumeData(JSON.parse(JSON.stringify(matched.resume)));
      showToast("Reset to preset baseline");
    }
  };

  // Header update
  const updateHeader = (field: keyof typeof resumeData.header, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        [field]: value,
      },
    }));
  };

  // Skills updates
  const updateSkillCategoryName = (index: number, newName: string) => {
    setResumeData((prev) => {
      const updated = [...prev.skills];
      updated[index] = { ...updated[index], categoryName: newName };
      return { ...prev, skills: updated };
    });
  };

  const updateSkillCategoryText = (index: number, newText: string) => {
    setResumeData((prev) => {
      const updated = [...prev.skills];
      updated[index] = { ...updated[index], skillsText: newText };
      return { ...prev, skills: updated };
    });
  };

  const addSkillCategory = () => {
    setResumeData((prev) => ({
      ...prev,
      skills: [
        ...prev.skills,
        { categoryName: "New Category", skillsText: "Tool 1 • Tool 2 • Tool 3" },
      ],
    }));
  };

  const removeSkillCategory = (index: number) => {
    if (resumeData.skills.length <= 1) return;
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  // Projects updates
  const updateProjectField = (
    index: number,
    field: "title" | "techStack" | "liveDemoUrl" | "githubUrl",
    value: string
  ) => {
    setResumeData((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const updateProjectBullet = (projectIndex: number, bulletIndex: number, value: string) => {
    setResumeData((prev) => {
      const updated = [...prev.projects];
      const updatedBullets = [...updated[projectIndex].bullets];
      updatedBullets[bulletIndex] = value;
      updated[projectIndex] = { ...updated[projectIndex], bullets: updatedBullets };
      return { ...prev, projects: updated };
    });
  };

  const addProjectBullet = (projectIndex: number) => {
    setResumeData((prev) => {
      const updated = [...prev.projects];
      updated[projectIndex] = {
        ...updated[projectIndex],
        bullets: [
          ...updated[projectIndex].bullets,
          "Engineering Challenge: Integrated [Tech] to achieve [Outcome with % or ms metric].",
        ],
      };
      return { ...prev, projects: updated };
    });
  };

  const removeProjectBullet = (projectIndex: number, bulletIndex: number) => {
    setResumeData((prev) => {
      const updated = [...prev.projects];
      if (updated[projectIndex].bullets.length <= 1) return prev;
      updated[projectIndex] = {
        ...updated[projectIndex],
        bullets: updated[projectIndex].bullets.filter((_, i) => i !== bulletIndex),
      };
      return { ...prev, projects: updated };
    });
  };

  const addProject = () => {
    setResumeData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: "New Flagship Technical Project",
          techStack: "TypeScript, Next.js, Node.js, PostgreSQL",
          liveDemoUrl: "https://demo.example.com",
          githubUrl: "https://github.com/username/project",
          bullets: [
            "Product Architecture: Architected a full-stack system supporting concurrent users with low latency.",
            "Technical Solution: Implemented caching and automated schema normalization to optimize data ingestion.",
            "Quantifiable Outcome: Accelerated API response times by 35% and maintained 99.9% test coverage.",
          ],
        },
      ],
    }));
  };

  const removeProject = (index: number) => {
    if (resumeData.projects.length <= 1) return;
    setResumeData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // Simulations updates
  const updateSimulationField = (
    index: number,
    field: "company" | "roleTitle" | "period" | "problemScope" | "actionTaken" | "engineeringOutcome",
    value: string
  ) => {
    setResumeData((prev) => {
      const updated = [...prev.simulations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, simulations: updated };
    });
  };

  const addSimulation = () => {
    setResumeData((prev) => ({
      ...prev,
      simulations: [
        ...prev.simulations,
        {
          company: "Enterprise Company / Simulation",
          roleTitle: "Software Engineering Simulation",
          period: "Month Year",
          problemScope: "Addressed data concurrency bottlenecks across distributed API microservices.",
          actionTaken: "Implemented atomic transaction updates and optimized indexing schemas.",
          engineeringOutcome: "Reduced query latency by 30% and verified zero data regressions with automated test suites.",
        },
      ],
    }));
  };

  const removeSimulation = (index: number) => {
    if (resumeData.simulations.length <= 1) return;
    setResumeData((prev) => ({
      ...prev,
      simulations: prev.simulations.filter((_, i) => i !== index),
    }));
  };

  // Education updates
  const updateEducation = (field: keyof typeof resumeData.education, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      education: {
        ...prev.education,
        [field]: value,
      },
    }));
  };

  // AI & Systems Summary Enhancer
  const enhanceSummaryWithMetrics = () => {
    const systemsTemplates = [
      `Systems-focused Software Engineer with expertise in building low-latency REST APIs, concurrent microservice architectures, and robust web applications. Proficient in modern distributed frameworks and relational databases (3NF), with a proven track record of optimizing system throughput, reducing API latency under 200ms, and maintaining high test reliability across automated CI/CD pipelines.`,
      `Performance-driven Full-Stack Engineer skilled in developing high-throughput TypeScript runtimes, scalable REST endpoints, and resilient database architectures. Demonstrated experience eliminating rendering bottlenecks by 40%, architecting zero-knowledge security protocols, and delivering enterprise-grade software products.`,
    ];
    const picked = systemsTemplates[Math.floor(Math.random() * systemsTemplates.length)];
    setResumeData((prev) => ({ ...prev, summary: picked }));
    showToast("Summary enhanced with Tier-1 Systems keywords!");
  };

  // Action Bar Handlers
  const handlePrint = () => {
    const candidate = resumeData.header.fullName || "Candidate";
    const targetFilename = `${candidate.replace(/[^a-zA-Z0-9]/g, "_")}_Tier1_Resume`;
    const originalTitle = document.title;
    document.title = targetFilename;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  const handleCopyMarkdown = () => {
    const md = renderResumeMarkdown(resumeData);
    navigator.clipboard.writeText(md);
    setCopiedFormat("markdown");
    showToast("Markdown copied to clipboard!");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = renderResumeMarkdown(resumeData);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resumeData.header.fullName.replace(/\s+/g, "_")}_Tier1_ATS_Resume.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded Markdown file!");
  };

  const handleDownloadPlaintext = () => {
    const txt = renderResumePlaintext(resumeData);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resumeData.header.fullName.replace(/\s+/g, "_")}_Tier1_ATS_Resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded ATS Plaintext file!");
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(resumeData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resumeData.header.fullName.replace(/\s+/g, "_")}_resume_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported JSON backup!");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.header && parsed.summary && parsed.skills && parsed.projects) {
          setResumeData(parsed);
          showToast("Resume JSON imported successfully!");
        } else {
          alert("Invalid resume JSON format.");
        }
      } catch (err) {
        alert("Could not parse JSON file: " + String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="ce-full-width-page w-full">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-xs font-semibold text-white shadow-2xl transition-all animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="ce-page-eyebrow flex items-center gap-1.5 text-blue-600">
              <Sparkles className="w-3.5 h-3.5" />
              TIER-1 ATS RESUME MAKER
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">ATS SAFE</span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">A4 · 1 PAGE</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] mt-1">
            Build Your Tier-1 ATS Resume
          </h1>
        </div>

        {/* Global Action Toolbar — Two Clusters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cluster 1: Data ops */}
          <div className="flex items-center gap-1.5 border border-[var(--line)] rounded-lg px-2 py-1.5 bg-white">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100" title="Import JSON backup">
              <Upload className="w-3 h-3" /><span>Import</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
            <span className="text-slate-200">|</span>
            <button onClick={handleExportJson} className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100" title="Export JSON backup">
              <Download className="w-3 h-3" /><span>Export</span>
            </button>
            <span className="text-slate-200">|</span>
            <button onClick={handleResetCurrent} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50" title="Reset to preset">
              <RotateCcw className="w-3 h-3" /><span>Reset</span>
            </button>
            <span className="text-slate-200">|</span>
            <button onClick={() => setShowVariantsDrawer(true)} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50" title="Open Saved Resume Variants">
              <FileText className="w-3 h-3" /><span>Variants</span>
            </button>
          </div>

          {/* Cluster 2: Export / Print */}
          <div className="flex items-center gap-1.5">
            <button onClick={handleCopyMarkdown} className="ce-button-secondary !min-h-[34px] !text-xs gap-1.5" title="Copy as Markdown">
              {copiedFormat === "markdown" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Markdown</span>
            </button>
            <button onClick={handleDownloadPlaintext} className="ce-button-secondary !min-h-[34px] !text-xs gap-1.5" title="ATS Plaintext">
              <FileText className="w-3.5 h-3.5" /><span>ATS Text</span>
            </button>
            <button onClick={handlePrint} className="ce-button-primary !min-h-[34px] !text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" /><span>Print / PDF</span>
            </button>
            <Link href="/resume-builder" className="ce-button-secondary !min-h-[34px] !text-xs gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" /><span>Match Jobs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Variants Slide-In Drawer */}
      {showVariantsDrawer && (
        <div className="fixed inset-0 z-40 flex no-print" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowVariantsDrawer(false)} />
          {/* Drawer Panel */}
          <div className="relative ml-auto w-full max-w-sm h-full bg-white shadow-2xl flex flex-col border-l border-[var(--line)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-gray-50">
              <h2 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Resume Variant Manager
              </h2>
              <button onClick={() => setShowVariantsDrawer(false)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                <ArrowRight className="w-4 h-4 text-gray-500 rotate-180" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ResumeVariantsSidebar
                profileSlug={activeProfileSlug || "roushan"}
                currentResumeData={resumeData}
                onLoadVariant={(loadedData) => {
                  setResumeData(loadedData);
                  setShowVariantsDrawer(false);
                  showToast("Variant loaded successfully");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Starter Presets — inside editor column header (below toolbar) */}

      {/* Main Two-Column Studio Layout: 4 | 8 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Form Editor (4 cols) */}
        <div className="lg:col-span-4 space-y-3 no-print">

          {/* Preset Blueprint — sleek row */}
          <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starter Blueprint</span>
              <span className="text-[9px] text-[var(--muted)] hidden sm:block">Click to load baseline</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeProfile && (
                <button
                  onClick={handleSyncActiveProfile}
                  title={`Populate with ${activeProfile.fullName}'s profile`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${
                    selectedPresetId === "custom_profile"
                      ? "bg-[var(--green)] text-white border-[var(--green)] shadow-xs"
                      : "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/30 hover:bg-[var(--green)] hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span className="leading-none">My Profile ({activeProfile.fullName.split(" ")[0]})</span>
                </button>
              )}
              {RESUME_STARTER_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.description}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      isSelected
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />}
                    <span className="leading-none">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Contact & Header */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "header" ? "" : "header")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  1
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Target Headline & Contact Information
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    Full Name, Target Title, Location, Phone, Email & Links
                  </span>
                </div>
              </div>
              {activeSection === "header" ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {activeSection === "header" && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Full Legal / Preferred Name
                    </label>
                    <input
                      type="text"
                      value={resumeData.header.fullName}
                      onChange={(e) => updateHeader("fullName", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. ROUSHAN KUMAR"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Target Role Headline
                    </label>
                    <input
                      type="text"
                      value={resumeData.header.targetHeadline}
                      onChange={(e) => updateHeader("targetHeadline", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. Systems Engineer | Backend Architect | AI Developer Tools"
                    />
                  </div>

                  {/* Row 2 */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={resumeData.header.email}
                      onChange={(e) => updateHeader("email", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. roushanraut404@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={resumeData.header.phone}
                      onChange={(e) => updateHeader("phone", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. +91-9431483512"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={resumeData.header.location}
                      onChange={(e) => updateHeader("location", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. Bihar, India"
                    />
                  </div>

                  {/* Row 4 */}
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Portfolio / Website
                    </label>
                    <input
                      type="url"
                      value={resumeData.header.portfolioUrl}
                      onChange={(e) => updateHeader("portfolioUrl", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="https://astreon.me"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={resumeData.header.githubUrl}
                      onChange={(e) => updateHeader("githubUrl", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="https://github.com/Hey-Astreon"
                    />
                  </div>

                  {/* Row 5 */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={resumeData.header.linkedinUrl}
                      onChange={(e) => updateHeader("linkedinUrl", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="https://linkedin.com/in/astreon4547"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Professional Summary */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "summary" ? "" : "summary")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  2
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Professional Summary (Executive Bio)
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    Calibrated single paragraph (40-70 words) dense in systems keywords
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {resumeData.summary.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                {activeSection === "summary" ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {activeSection === "summary" && (
              <div className="p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--muted)]">
                    Must clearly state engineering specialties, languages, databases (3NF), and test tooling.
                  </span>
                  <button
                    onClick={enhanceSummaryWithMetrics}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Polish (Systems Keywords)</span>
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={resumeData.summary}
                  onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
                  className="w-full rounded-md border border-[var(--line)] p-2.5 text-xs text-[var(--ink)] leading-relaxed focus:border-blue-500 focus:outline-none bg-[var(--surface-muted)]"
                  placeholder="Systems-focused Software Engineer with deep expertise in building low-latency REST APIs..."
                />
              </div>
            )}
          </div>

          {/* Section 3: Technical Skills */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "skills" ? "" : "skills")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  3
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Categorized Technical Skills ({resumeData.skills.length} Categories)
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    Organized into 4-6 categories with standard ATS bullet bullets
                  </span>
                </div>
              </div>
              {activeSection === "skills" ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {activeSection === "skills" && (
              <div className="p-4 space-y-3 bg-white">
                <div className="space-y-3">
                  {resumeData.skills.map((category, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[var(--line)] bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={category.categoryName}
                          onChange={(e) => updateSkillCategoryName(idx, e.target.value)}
                          className="font-bold text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-[var(--ink)] w-1/2"
                          placeholder="Category Name"
                        />
                        <button
                          onClick={() => removeSkillCategory(idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                          title="Remove category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={category.skillsText}
                        onChange={(e) => updateSkillCategoryText(idx, e.target.value)}
                        className="ce-field px-2.5 !bg-white"
                        placeholder="Node.js • Express.js • Python (FastAPI) • REST APIs"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addSkillCategory}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill Category</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Flagship Technical Projects */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "projects" ? "" : "projects")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  4
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Flagship Technical Projects ({resumeData.projects.length} Projects)
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    XYZ impact bullets: [Action Verb] + [Architecture / Solution] + [Metric (% or ms)]
                  </span>
                </div>
              </div>
              {activeSection === "projects" ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {activeSection === "projects" && (
              <div className="p-4 space-y-4 bg-white">
                {resumeData.projects.map((proj, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-lg border border-[var(--line)] bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700">Project #{pIdx + 1}</span>
                      <button
                        onClick={() => removeProject(pIdx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => updateProjectField(pIdx, "title", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="e.g. Astra Vision - Developer Sandbox"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Tech Stack Tags
                        </label>
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) => updateProjectField(pIdx, "techStack", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="e.g. FastAPI, Python, Monaco, Tree-Sitter"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Live Demo URL
                        </label>
                        <input
                          type="url"
                          value={proj.liveDemoUrl}
                          onChange={(e) => updateProjectField(pIdx, "liveDemoUrl", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="https://demo.example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          GitHub Repo URL
                        </label>
                        <input
                          type="url"
                          value={proj.githubUrl}
                          onChange={(e) => updateProjectField(pIdx, "githubUrl", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="https://github.com/user/repo"
                        />
                      </div>
                    </div>

                    {/* Bullet Points with XYZ Formula */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-[10px] font-bold text-slate-700">
                        XYZ Impact Bullet Points:
                      </label>
                      {proj.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2">
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) => updateProjectBullet(pIdx, bIdx, e.target.value)}
                            className="flex-1 rounded border border-[var(--line)] p-2 text-xs text-[var(--ink)] bg-white focus:border-blue-500 focus:outline-none"
                            placeholder="Product Architecture: Architected..."
                          />
                          <button
                            onClick={() => removeProjectBullet(pIdx, bIdx)}
                            className="text-slate-400 hover:text-red-500 pt-1"
                            title="Remove bullet"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addProjectBullet(pIdx)}
                        className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addProject}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Technical Project</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Technical Simulations & Virtual Experiences */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "simulations" ? "" : "simulations")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  5
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Technical Simulations & Work Experiences ({resumeData.simulations.length})
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    Structured with Problem Scope, Action Taken, and Engineering Outcome
                  </span>
                </div>
              </div>
              {activeSection === "simulations" ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {activeSection === "simulations" && (
              <div className="p-4 space-y-4 bg-white">
                {resumeData.simulations.map((sim, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3.5 rounded-lg border border-[var(--line)] bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700">Experience #{sIdx + 1}</span>
                      <button
                        onClick={() => removeSimulation(sIdx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete simulation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Company / Simulation Org
                        </label>
                        <input
                          type="text"
                          value={sim.company}
                          onChange={(e) => updateSimulationField(sIdx, "company", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="e.g. Commonwealth Bank"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Role Title
                        </label>
                        <input
                          type="text"
                          value={sim.roleTitle}
                          onChange={(e) => updateSimulationField(sIdx, "roleTitle", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="Software Engineering Virtual Simulation"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--ink)] mb-1">
                          Period / Date
                        </label>
                        <input
                          type="text"
                          value={sim.period}
                          onChange={(e) => updateSimulationField(sIdx, "period", e.target.value)}
                          className="ce-field px-2.5 !bg-white"
                          placeholder="e.g. June 2026"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Problem & Scope:
                      </label>
                      <textarea
                        rows={2}
                        value={sim.problemScope}
                        onChange={(e) => updateSimulationField(sIdx, "problemScope", e.target.value)}
                        className="w-full rounded border border-[var(--line)] p-2 text-xs text-[var(--ink)] bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Action Taken:
                      </label>
                      <textarea
                        rows={2}
                        value={sim.actionTaken}
                        onChange={(e) => updateSimulationField(sIdx, "actionTaken", e.target.value)}
                        className="w-full rounded border border-[var(--line)] p-2 text-xs text-[var(--ink)] bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Engineering Outcome (Include quantifiable metrics):
                      </label>
                      <textarea
                        rows={2}
                        value={sim.engineeringOutcome}
                        onChange={(e) => updateSimulationField(sIdx, "engineeringOutcome", e.target.value)}
                        className="w-full rounded border border-[var(--line)] p-2 text-xs text-[var(--ink)] bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={addSimulation}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Experience / Simulation</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 6: Education & Coursework */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "education" ? "" : "education")}
              className="flex w-full items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border-b border-[var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                  6
                </div>
                <div className="text-left">
                  <strong className="block text-xs font-bold text-[var(--ink)]">
                    Education & Relevant CS Coursework
                  </strong>
                  <span className="block text-[10px] text-[var(--muted)]">
                    Degree, University, Graduation timeline & foundational computer science topics
                  </span>
                </div>
              </div>
              {activeSection === "education" ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {activeSection === "education" && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Degree Program
                    </label>
                    <input
                      type="text"
                      value={resumeData.education.degree}
                      onChange={(e) => updateEducation("degree", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. Bachelor of Computer Applications (BCA)"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      University / Institution
                    </label>
                    <input
                      type="text"
                      value={resumeData.education.university}
                      onChange={(e) => updateEducation("university", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. Amity University Noida"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                      Period / Graduation
                    </label>
                    <input
                      type="text"
                      value={resumeData.education.period}
                      onChange={(e) => updateEducation("period", e.target.value)}
                      className="ce-field px-2.5"
                      placeholder="e.g. Expected July 2028"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                    Relevant Coursework List (Bulleted or bullet separated)
                  </label>
                  <input
                    type="text"
                    value={resumeData.education.coursework}
                    onChange={(e) => updateEducation("coursework", e.target.value)}
                    className="ce-field px-2.5"
                    placeholder="Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS)"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live A4 Preview (8 cols — wider for full A4) */}
        <div className="lg:col-span-8 space-y-3 sticky top-20 ats-print-container">

          {/* Unified ATS Control Bar */}
          <div className="rounded-xl border border-[var(--line)] bg-white shadow-xs no-print overflow-hidden">
            {/* Top Row: Score + Controls */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              {/* Score Badge + Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg font-mono font-black text-base ${
                  audit.overallScore >= 93 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {audit.overallScore}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-sm font-extrabold text-[var(--ink)]">ATS Audit: {audit.grade}</strong>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[10px] text-[var(--muted)] truncate">
                    {audit.metricCount} metrics · Single-column format
                  </p>
                </div>
              </div>

              {/* View Controls: unified pill group */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Heatmap toggle */}
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title="Toggle Recruiter Heatmap"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    showHeatmap
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Heatmap</span>
                </button>

                {/* F-Scan toggle */}
                <button
                  onClick={() => setShowFScan(!showFScan)}
                  title="Toggle F-Pattern Eye Scan"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    showFScan
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>F-Scan</span>
                </button>

                {/* Zoom — same visual weight */}
                <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg overflow-hidden ml-1">
                  <button onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.05))} className="p-1.5 hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom Out">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[11px] font-mono font-semibold text-slate-700 min-w-[38px] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button onClick={() => setZoomScale((z) => Math.min(1.3, z + 0.05))} className="p-1.5 hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom In">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible ATS Checklist */}
            <div className="border-t border-[var(--line)]">
              <button
                onClick={() => setShowAtsChecklist(!showAtsChecklist)}
                className="w-full flex items-center justify-between px-4 py-2 text-[11px] hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Info className="w-3 h-3 text-blue-500" />
                  ATS Health Checklist
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    audit.checks.filter(c => c.passed).length === audit.checks.length
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {audit.checks.filter((c) => c.passed).length}/{audit.checks.length} Passed
                  </span>
                </span>
                {showAtsChecklist
                  ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                }
              </button>
              {showAtsChecklist && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
                  {audit.checks.map((check, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5 text-[10px]">
                      {check.passed
                        ? <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        : <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      }
                      <span className={check.passed ? "text-slate-700" : "text-amber-800 font-semibold"}>
                        {check.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live A4 Sheet Render Container — overflow scroll so any zoom works */}
          <div
            className="overflow-auto rounded-xl border border-slate-300 bg-slate-100 shadow-inner ats-print-wrapper"
            style={{ height: "calc(100vh - 240px)", padding: "16px" }}
          >
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                width: "210mm",
                margin: "0 auto",
              }}
              className="relative"
            >
              {/* Recruiter Heatmap Overlay */}
              {showHeatmap && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded opacity-60 mix-blend-multiply no-print">
                  <div className="absolute -top-10 left-10 h-44 w-96 rounded-full bg-red-400 blur-3xl opacity-70" />
                  <div className="absolute top-24 left-8 h-36 w-80 rounded-full bg-amber-400 blur-2xl opacity-60" />
                  <div className="absolute top-52 left-12 h-32 w-72 rounded-full bg-yellow-400 blur-2xl opacity-50" />
                  <div className="absolute bottom-32 left-10 h-40 w-64 rounded-full bg-blue-300 blur-3xl opacity-40" />
                </div>
              )}

              {/* F-Scan Visualizer Box Overlay */}
              {showFScan && (
                <div className="no-print pointer-events-none">
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "10mm", left: "12mm", right: "12mm", height: "32mm" }}
                  >
                    <span className="ats-f-pattern-tag">1. Header & Headline (1.5s scan)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "45mm", left: "12mm", right: "20mm", height: "24mm" }}
                  >
                    <span className="ats-f-pattern-tag">2. Executive Summary (1.8s scan)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "72mm", left: "12mm", right: "30mm", height: "35mm" }}
                  >
                    <span className="ats-f-pattern-tag">3. Skills & Categorization (2.0s scan)</span>
                  </div>
                  <div
                    className="ats-f-pattern-box"
                    style={{ top: "110mm", left: "12mm", right: "40mm", height: "65mm" }}
                  >
                    <span className="ats-f-pattern-tag">4. Projects & XYZ Metrics (2.2s scan)</span>
                  </div>
                </div>
              )}

              {/* The Single-Column Tier-1 ATS A4 Sheet */}
              <div className="ats-a4-sheet text-left">
                {/* 1. Header */}
                <div className="text-center">
                  <h1 className="tracking-tight text-slate-900 font-extrabold">
                    {resumeData.header.fullName || "YOUR FULL NAME"}
                  </h1>
                  <div className="mt-1 text-[8.4pt] font-bold text-slate-800">
                    {resumeData.header.targetHeadline}
                  </div>
                  <div className="mt-1 text-[7.6pt] text-slate-700 flex flex-wrap items-center justify-center gap-x-1.5 leading-tight font-medium">
                    {resumeData.header.location && <span>{resumeData.header.location}</span>}
                    {resumeData.header.phone && <span>| {resumeData.header.phone}</span>}
                    {resumeData.header.email && <span>| {resumeData.header.email}</span>}
                    {resumeData.header.portfolioUrl && (
                      <span>
                        |{" "}
                        <a
                          href={resumeData.header.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          {resumeData.header.portfolioUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </span>
                    )}
                    {resumeData.header.githubUrl && (
                      <span>
                        |{" "}
                        <a
                          href={resumeData.header.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          {resumeData.header.githubUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </span>
                    )}
                    {resumeData.header.linkedinUrl && (
                      <span>
                        |{" "}
                        <a
                          href={resumeData.header.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          {resumeData.header.linkedinUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <hr />

                {/* 2. Professional Summary */}
                <div>
                  <h2>PROFESSIONAL SUMMARY</h2>
                  <p className="mt-1 text-[7.9pt] text-slate-800 text-justify leading-snug">
                    {resumeData.summary}
                  </p>
                </div>

                <hr />

                {/* 3. Technical Skills */}
                <div>
                  <h2>TECHNICAL SKILLS</h2>
                  <div className="mt-1 space-y-0.5 text-[7.8pt] text-slate-800 leading-tight">
                    {resumeData.skills.map((s, idx) => (
                      <div key={idx}>
                        <b>• {s.categoryName}:</b> {s.skillsText}
                      </div>
                    ))}
                  </div>
                </div>

                <hr />

                {/* 4. Technical Projects */}
                <div>
                  <h2>TECHNICAL PROJECTS</h2>
                  <div className="mt-1 space-y-2">
                    {resumeData.projects.map((proj, pIdx) => (
                      <div key={pIdx}>
                        <div className="flex items-baseline justify-between text-[8.1pt]">
                          <div>
                            <strong className="text-slate-900">{proj.title}</strong>
                            {proj.techStack && (
                              <span className="text-slate-700 font-medium"> ({proj.techStack})</span>
                            )}
                          </div>
                          <div className="text-[7.4pt] text-blue-700 space-x-1.5 shrink-0">
                            {proj.liveDemoUrl && (
                              <a
                                href={proj.liveDemoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                Live Demo
                              </a>
                            )}
                            {proj.githubUrl && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                GitHub
                              </a>
                            )}
                          </div>
                        </div>
                        <ul className="list-disc pl-4 text-[7.65pt] text-slate-800 space-y-0.5 mt-0.5">
                          {proj.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-tight">
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <hr />

                {/* 5. Simulations & Experience */}
                <div>
                  <h2>TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES</h2>
                  <div className="mt-1 space-y-2">
                    {resumeData.simulations.map((sim, sIdx) => (
                      <div key={sIdx}>
                        <div className="flex items-baseline justify-between text-[8.0pt]">
                          <strong className="text-slate-900">
                            {sim.company} - {sim.roleTitle}
                          </strong>
                          <span className="text-[7.4pt] text-slate-600 font-medium">
                            {sim.period}
                          </span>
                        </div>
                        <ul className="list-disc pl-4 text-[7.65pt] text-slate-800 space-y-0.5 mt-0.5">
                          <li className="leading-tight">
                            <b>Problem & Scope:</b> {sim.problemScope}
                          </li>
                          <li className="leading-tight">
                            <b>Action Taken:</b> {sim.actionTaken}
                          </li>
                          <li className="leading-tight">
                            <b>Engineering Outcome:</b> {sim.engineeringOutcome}
                          </li>
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <hr />

                {/* 6. Education */}
                <div>
                  <h2>EDUCATION</h2>
                  <div className="mt-1">
                    <div className="flex items-baseline justify-between text-[8.0pt]">
                      <div>
                        <strong className="text-slate-900">{resumeData.education.degree}</strong> -{" "}
                        <span className="text-slate-800">{resumeData.education.university}</span>
                      </div>
                      <span className="text-[7.4pt] text-slate-600 font-medium">
                        {resumeData.education.period}
                      </span>
                    </div>
                    {resumeData.education.coursework && (
                      <div className="text-[7.6pt] text-slate-800 mt-0.5 leading-tight">
                        <b>• Relevant Coursework:</b> {resumeData.education.coursework}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
