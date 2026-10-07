"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SIMULATION_COMPANIES,
  CompanyVacancy
} from "@/lib/simulationData";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  RotateCcw,
  Upload,
  FileText,
  AlertCircle,
  Building,
  MapPin,
  Clock,
  DollarSign,
  HelpCircle,
  Check,
  Send,
  Trash2,
  ExternalLink,
  ChevronDown,
  Info
} from "lucide-react";

export default function SimulationApplyPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") || "novasphere";

  const [company, setCompany] = useState<CompanyVacancy>(() => {
    return (
      SIMULATION_COMPANIES.find((c) => c.id === companyId) ||
      SIMULATION_COMPANIES[0]
    );
  });

  // Form field state
  const [formData, setFormData] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    headline: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    coverLetter: "",
    summary: "",
    screeningChallenge: "",
    workAuth: "",
    visaSponsorship: "",
    expectedSalary: "",
  });

  const [resumeFile, setResumeFile] = useState<{ name: string; size: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [filledCount, setFilledCount] = useState(0);
  const totalFields = 16;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const found = SIMULATION_COMPANIES.find((c) => c.id === companyId);
    if (found) setCompany(found);
  }, [companyId]);

  // Recalculate filled count whenever formData or resume changes
  useEffect(() => {
    let count = 0;
    Object.values(formData).forEach((val) => {
      if (val && String(val).trim().length > 0) count++;
    });
    if (resumeFile) count++;
    setFilledCount(count);
  }, [formData, resumeFile]);

  // 1-Click Mock Autofill (in case testing without active extension)
  const handleMockAutofill = () => {
    // Read stored simulation session or candidate profile if available
    let storedProfile: any = null;
    try {
      const raw = localStorage.getItem("astrework_profile_cache");
      if (raw) storedProfile = JSON.parse(raw);
    } catch {}

    const defaultFill = {
      fullName: storedProfile?.fullName || "Alex Mercer",
      firstName: storedProfile?.fullName?.split(" ")[0] || "Alex",
      lastName: storedProfile?.fullName?.split(" ").slice(1).join(" ") || "Mercer",
      email: storedProfile?.email || "alex.mercer.dev@gmail.com",
      phone: storedProfile?.phone || "+1 (555) 349-2810",
      location: storedProfile?.location || "San Francisco, CA / Remote",
      headline: storedProfile?.title || "Full-Stack Engineer | Distributed Systems & Next.js",
      linkedinUrl: storedProfile?.linkedinUrl || "https://linkedin.com/in/alex-mercer-swe",
      githubUrl: storedProfile?.githubUrl || "https://github.com/alexmercer-dev",
      portfolioUrl: storedProfile?.portfolioUrl || "https://alexmercer.dev",
      coverLetter: `I am thrilled to apply for the ${company.roleTitle} role at ${company.name}. With a strong background in ${company.techStack.slice(0, 3).join(", ")} and high-throughput systems, I am excited to contribute to your autonomous infrastructure while sharpening my engineering fundamentals.`,
      summary: `Final-year CS student with production experience building low-latency microservices, responsive web applications, and autonomous automation pipelines. Passionate about asynchronous distributed architecture.`,
      screeningChallenge: `In a recent project, I tackled an asynchronous race condition in our distributed telemetry pipeline where high-concurrency event streams caused out-of-order writes. I redesigned the ingestion layer using Redis Streams with deterministic partition keys, reducing latency by 42% and eliminating data corruption.`,
      workAuth: "Yes",
      visaSponsorship: "No",
      expectedSalary: company.stipend.split("+")[0].trim(),
    };

    setFormData(defaultFill);
    setResumeFile({ name: "Alex_Mercer_SWE_Resume.pdf", size: "248 KB" });
  };

  const handleClearForm = () => {
    setFormData({
      fullName: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      headline: "",
      linkedinUrl: "",
      githubUrl: "",
      portfolioUrl: "",
      coverLetter: "",
      summary: "",
      screeningChallenge: "",
      workAuth: "",
      visaSponsorship: "",
      expectedSalary: "",
    });
    setResumeFile(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeKb = (file.size / 1024).toFixed(0);
      setResumeFile({ name: file.name, size: `${sizeKb} KB` });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased pb-28">
      {/* ── Top Simulation Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md px-4 py-2.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <Link
            href={`/simulate?company=${company.id}`}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--ink)] font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Job Description</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--blue-soft)] text-[var(--blue)] font-bold text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              AstrePilot Application Form Simulation
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearForm}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--red)] rounded hover:bg-[var(--surface-muted)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Form</span>
            </button>
            <button
              onClick={handleMockAutofill}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--blue-soft)] text-[var(--blue)] hover:bg-[var(--blue)] hover:text-white text-[11px] font-bold border border-[var(--blue)]/20 transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate 1-Click Autofill</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Company & Role Header Card */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0"
              style={{ background: company.logoBg }}
            >
              {company.logoLetter}
            </div>
            <div>
              <div className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Application for
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug">
                {company.roleTitle}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-[var(--muted)] flex-wrap">
                <span className="font-semibold text-[var(--blue)]">{company.name}</span>
                <span>•</span>
                <span>{company.location}</span>
                <span>•</span>
                <span>{company.term}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)] text-[12px] text-[var(--muted)] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[var(--blue)] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This form contains realistic ATS fields (matching Greenhouse, Lever, Ashby, and Workday selectors). Test AstrePilot by pressing <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] font-mono text-[10px] text-[var(--ink)] font-bold">Ctrl+Shift+A</kbd> or using the Chrome Extension icon.
            </p>
          </div>
        </div>

        {/* ── Main Application Form ────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Personal Information */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
            <h2 className="text-[15px] font-bold text-[var(--ink)] pb-3 mb-5 border-b border-[var(--line)] flex items-center justify-between">
              <span>Personal Information</span>
              <span className="text-[11px] font-normal text-[var(--muted)]">* Required fields</span>
            </h2>

            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                />
              </div>

              {/* First Name & Last Name (Alternative breakdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="alex@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Phone / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    placeholder="+1 (555) 019-2834"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
              </div>

              {/* Location & Headline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Current Location / City *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    placeholder="e.g. San Francisco, CA / Remote"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
                <div>
                  <label htmlFor="headline" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Current Title / Headline
                  </label>
                  <input
                    type="text"
                    id="headline"
                    name="headline"
                    placeholder="e.g. CS Student & Full-Stack Builder"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Links & Online Profiles */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
            <h2 className="text-[15px] font-bold text-[var(--ink)] pb-3 mb-5 border-b border-[var(--line)]">
              Online Profiles & Portfolio
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="linkedin_url" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  id="linkedin_url"
                  name="linkedin_url"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                />
              </div>

              <div>
                <label htmlFor="github_url" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  id="github_url"
                  name="github_url"
                  placeholder="https://github.com/username"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                />
              </div>

              <div>
                <label htmlFor="portfolio_url" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Personal Portfolio / Website
                </label>
                <input
                  type="url"
                  id="portfolio_url"
                  name="portfolio_url"
                  placeholder="https://yourportfolio.dev"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Resume / CV Upload */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
            <h2 className="text-[15px] font-bold text-[var(--ink)] pb-3 mb-5 border-b border-[var(--line)] flex items-center justify-between">
              <span>Resume / CV Attachment</span>
              <span className="text-[11px] font-normal text-[var(--muted)]">PDF, DOCX up to 5MB</span>
            </h2>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />

            {resumeFile ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green-soft)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[var(--ink)]">{resumeFile.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{resumeFile.size} • Attached</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResumeFile(null)}
                  className="p-2 text-[var(--muted)] hover:text-[var(--red)] transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--line)] hover:border-[var(--blue)] rounded-xl p-8 text-center cursor-pointer transition-all bg-[var(--surface-muted)]/50 hover:bg-[var(--blue-soft)]/20"
              >
                <Upload className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                <div className="text-[13px] font-bold text-[var(--ink)]">
                  Click to attach resume or drag & drop
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  Or click below to load a simulated candidate resume
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile({ name: "Alex_Mercer_FullStack_Resume.pdf", size: "312 KB" });
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[11px] font-semibold text-[var(--blue)] hover:border-[var(--blue)] shadow-xs"
                >
                  Load Sample Candidate Resume PDF
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Screening & Free-form Questions */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
            <h2 className="text-[15px] font-bold text-[var(--ink)] pb-3 mb-5 border-b border-[var(--line)]">
              Screening & Additional Questions
            </h2>

            <div className="space-y-6">
              {/* Cover Letter */}
              <div>
                <label htmlFor="cover_letter" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Cover Letter / Note to Hiring Team
                </label>
                <textarea
                  id="cover_letter"
                  name="cover_letter"
                  rows={4}
                  placeholder={`Why are you interested in joining ${company.name} as a Software Engineering Intern?`}
                  value={formData.coverLetter}
                  onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full resize-y"
                />
              </div>

              {/* Professional Summary */}
              <div>
                <label htmlFor="summary" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Professional Summary / About Yourself
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={3}
                  placeholder="Briefly describe your technical background and past experience..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full resize-y"
                />
              </div>

              {/* Technical Screening Question */}
              <div>
                <label htmlFor="screening_challenge" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Technical Challenge: {company.screeningPrompt}
                </label>
                <textarea
                  id="screening_challenge"
                  name="screening_challenge"
                  rows={4}
                  placeholder="Share a concrete example with what technologies were used and the outcome achieved..."
                  value={formData.screeningChallenge}
                  onChange={(e) => setFormData({ ...formData, screeningChallenge: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full resize-y"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Work Authorization & Compensation */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs">
            <h2 className="text-[15px] font-bold text-[var(--ink)] pb-3 mb-5 border-b border-[var(--line)]">
              Work Authorization & Logistics
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="work_auth" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Legally authorized to work? *
                  </label>
                  <select
                    id="work_auth"
                    name="work_auth"
                    required
                    value={formData.workAuth}
                    onChange={(e) => setFormData({ ...formData, workAuth: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  >
                    <option value="">Please select...</option>
                    <option value="Yes">Yes — Authorized to work</option>
                    <option value="No">No — Not authorized</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="visa" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                    Will you require visa sponsorship? *
                  </label>
                  <select
                    id="visa"
                    name="visa"
                    required
                    value={formData.visaSponsorship}
                    onChange={(e) => setFormData({ ...formData, visaSponsorship: e.target.value })}
                    className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                  >
                    <option value="">Please select...</option>
                    <option value="No">No — Do not require sponsorship</option>
                    <option value="Yes">Yes — Require sponsorship</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="expected_salary" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Desired Monthly Compensation / Stipend
                </label>
                <input
                  type="text"
                  id="expected_salary"
                  name="expected_salary"
                  placeholder={`e.g. ${company.stipend.split("+")[0].trim()}`}
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  className="ce-field px-3.5 py-2.5 text-[13px] w-full"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Link
              href={`/simulate?company=${company.id}`}
              className="px-5 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink)] font-semibold text-[13px] transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[14px] shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting to {company.name}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* ── Fixed Testing Companion HUD Dock ─────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--line)] px-4 py-3 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--blue)] flex items-center justify-center text-white flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[var(--ink)]">
                  AstrePilot Live Field Tracker
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--green-soft)] text-[var(--green)]">
                  {filledCount} / {totalFields} Fields Ready
                </span>
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                Press <kbd className="font-mono text-[var(--ink)] font-bold">Ctrl+Shift+A</kbd> or click the AstrePilot Chrome extension icon
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] text-[var(--ink)] hover:text-[var(--red)] text-[11px] font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleMockAutofill}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white text-[11px] font-bold shadow-sm transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Autofill</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Submission Celebration Modal ─────────────────────────────────── */}
      {isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--green-soft)] text-[var(--green)] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-[var(--ink)] mb-1">
              Application Submitted! 🎉
            </h3>
            <p className="text-[12px] text-[var(--muted)] mb-5">
              Your test application for <strong className="text-[var(--ink)]">{company.roleTitle}</strong> at <strong className="text-[var(--ink)]">{company.name}</strong> was received.
            </p>

            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--line)] text-left text-[11px] space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Applicant:</span>
                <span className="font-semibold text-[var(--ink)]">{formData.fullName || "Alex Mercer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Email:</span>
                <span className="font-semibold text-[var(--ink)]">{formData.email || "alex@example.com"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Role:</span>
                <span className="font-semibold text-[var(--ink)] truncate max-w-[200px]">{company.roleTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Fields Populated:</span>
                <span className="font-bold text-[var(--green)]">{filledCount} / {totalFields} fields</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  handleClearForm();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[12px] transition-all"
              >
                Test Another Application (Reset)
              </button>
              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] font-semibold text-[12px] transition-all"
              >
                Return to AstreWork Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
