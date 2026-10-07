"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SIMULATION_COMPANIES,
  CompanyVacancy
} from "@/lib/simulationData";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Building,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  RotateCcw,
  Check,
  Share2,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Globe
} from "lucide-react";

function SimulationJobContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("company") || "novasphere";

  const [selectedCompany, setSelectedCompany] = useState<CompanyVacancy>(() => {
    return (
      SIMULATION_COMPANIES.find((c) => c.id === initialId) ||
      SIMULATION_COMPANIES[0]
    );
  });

  const [isPrimed, setIsPrimed] = useState(false);
  const [isPriming, setIsPriming] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const found = SIMULATION_COMPANIES.find((c) => c.id === initialId);
    if (found) setSelectedCompany(found);
  }, [initialId]);

  const handleRandomize = () => {
    const others = SIMULATION_COMPANIES.filter((c) => c.id !== selectedCompany.id);
    const random = others[Math.floor(Math.random() * others.length)];
    if (random) {
      setSelectedCompany(random);
      setIsPrimed(false);
    }
  };

  const handlePrimeBrain = async () => {
    setIsPriming(true);
    try {
      // Store in localStorage for extension & local simulations to read
      localStorage.setItem(
        "astrepilot_simulation_session",
        JSON.stringify({
          company: selectedCompany.name,
          jobTitle: selectedCompany.roleTitle,
          stipend: selectedCompany.stipend,
          location: selectedCompany.location,
          about: selectedCompany.aboutCompany,
          screeningPrompt: selectedCompany.screeningPrompt,
          techStack: selectedCompany.techStack,
          primedAt: new Date().toISOString()
        })
      );

      // Attempt to prime actual backend session if user has a token
      const token = localStorage.getItem("astrepilot_token");
      if (token) {
        await fetch("/api/autopilot/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            company: selectedCompany.name,
            jobTitle: selectedCompany.roleTitle,
            jdText: `${selectedCompany.aboutCompany}\n\n${selectedCompany.roleOverview}\n\nKey Skills: ${selectedCompany.techStack.join(", ")}`,
            tailoredSummary: `Enthusiastic candidate applying for ${selectedCompany.roleTitle} at ${selectedCompany.name}. Skilled in ${selectedCompany.techStack.slice(0, 4).join(", ")}.`,
            keySkills: selectedCompany.techStack,
            workType: "remote",
            salaryRange: selectedCompany.stipend
          })
        }).catch(() => {});
      }

      setIsPrimed(true);
      setTimeout(() => setIsPrimed(false), 4000);
    } catch {
      setIsPrimed(true);
    } finally {
      setIsPriming(false);
    }
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
      {/* ── Top Simulation Banner ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md px-4 py-2.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--blue-soft)] text-[var(--blue)] font-bold text-[10px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              AstrePilot Test Simulation
            </span>
            <span className="text-[var(--muted)] hidden sm:inline">
              Simulated Employer Portal for testing AstreWork & AstrePilot autofill
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Company Switcher */}
            <div className="flex items-center gap-1 bg-[var(--surface-muted)] p-1 rounded-lg border border-[var(--line)]">
              {SIMULATION_COMPANIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCompany(c);
                    setIsPrimed(false);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    selectedCompany.id === c.id
                      ? "bg-[var(--surface)] text-[var(--blue)] shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </button>
              ))}
              <button
                onClick={handleRandomize}
                title="Randomize Company"
                className="px-2 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden md:inline">Random</span>
              </button>
            </div>

            {/* Prime Brain Button */}
            <button
              onClick={handlePrimeBrain}
              disabled={isPriming}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                isPrimed
                  ? "bg-[var(--green-soft)] border-[var(--green)]/30 text-[var(--green)]"
                  : "bg-[var(--blue-soft)] border-[var(--blue)]/30 text-[var(--blue)] hover:bg-[var(--blue)] hover:text-white"
              }`}
            >
              {isPrimed ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Brain Primed!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isPriming ? "Priming..." : "Prime AstrePilot"}</span>
                </>
              )}
            </button>

            {/* Direct Link to Application Form */}
            <Link
              href={`/simulate/apply?company=${selectedCompany.id}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[11px] shadow-sm transition-all"
            >
              <span>Test Form</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Job Post Container ───────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mb-6">
          <Link href="/dashboard" className="hover:text-[var(--ink)] transition-colors">
            AstreWork
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span>Careers Portal</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-[var(--ink)]">{selectedCompany.name}</span>
        </div>

        {/* ── Company & Role Hero Header ─────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Dynamic Company Logo Avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md flex-shrink-0"
                style={{ background: selectedCompany.logoBg }}
              >
                {selectedCompany.logoLetter}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h2 className="text-[18px] font-bold text-[var(--ink)] tracking-tight">
                    {selectedCompany.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--blue-soft)] text-[var(--blue)]">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Employer
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--line)]">
                    {selectedCompany.fundingStage}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--muted)] mb-3">
                  {selectedCompany.tagline}
                </p>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight leading-snug">
                  {selectedCompany.roleTitle}
                </h1>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 flex-shrink-0 md:min-w-[190px]">
              <Link
                href={`/simulate/apply?company=${selectedCompany.id}`}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[13px] shadow-md hover:shadow-lg transition-all text-center"
              >
                <span>Apply for this Role</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink)] text-[12px] font-semibold transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>{copiedLink ? "Link Copied!" : "Share Role"}</span>
              </button>
            </div>
          </div>

          {/* Key Opportunity Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center text-[var(--blue)] flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Location</div>
                <div className="text-[12px] font-semibold text-[var(--ink)]">100% Remote</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--green-soft)] flex items-center justify-center text-[var(--green)] flex-shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Stipend</div>
                <div className="text-[12px] font-semibold text-[var(--ink)]">{selectedCompany.stipend.split("+")[0]}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--amber-soft)] flex items-center justify-center text-[var(--amber)] flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Duration</div>
                <div className="text-[12px] font-semibold text-[var(--ink)]">4 – 6 Months</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center text-[var(--muted)] flex-shrink-0 border border-[var(--line)]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Team Size</div>
                <div className="text-[12px] font-semibold text-[var(--ink)]">{selectedCompany.teamSize}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content Grid: Main Description + Sidebar ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Company */}
            <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-[16px] font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-[var(--blue)]" />
                About {selectedCompany.name}
              </h3>
              <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
                {selectedCompany.aboutCompany}
              </p>
            </section>

            {/* Role Overview */}
            <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-[16px] font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--blue)]" />
                The Opportunity & Internship Scope
              </h3>
              <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed mb-4">
                {selectedCompany.roleOverview}
              </p>

              <h4 className="text-[13px] font-bold text-[var(--ink)] mb-2 mt-4">
                What You&apos;ll Do as an Intern:
              </h4>
              <ul className="space-y-2.5">
                {selectedCompany.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--ink-muted)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--blue)] flex-shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Qualifications */}
            <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-[16px] font-bold text-[var(--ink)] mb-3">
                What We&apos;re Looking For
              </h3>
              <ul className="space-y-2.5 mb-6">
                {selectedCompany.qualifications.map((qual, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--ink-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] flex-shrink-0 mt-2" />
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>

              <h4 className="text-[13px] font-bold text-[var(--ink)] mb-2">
                Bonus / Nice-to-Have:
              </h4>
              <ul className="space-y-2">
                {selectedCompany.bonusPoints.map((bonus, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px] text-[var(--muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--line)] flex-shrink-0 mt-1.5" />
                    <span>{bonus}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Perks & Benefits */}
            <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
              <h3 className="text-[16px] font-bold text-[var(--ink)] mb-3">
                Internship Perks & Benefits
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCompany.perks.map((perk, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--line)] text-[12px] text-[var(--ink)] font-medium flex items-start gap-2"
                  >
                    <Check className="w-4 h-4 text-[var(--green)] flex-shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Tech Stack Card */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
              <h4 className="text-[12px] font-bold tracking-wider uppercase text-[var(--muted)] mb-3">
                Primary Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedCompany.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue)]/15"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* AstrePilot Testing Tip Card */}
            <div className="rounded-xl border border-[var(--blue)]/30 bg-[var(--blue-soft)]/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[var(--blue)]" />
                <h4 className="text-[13px] font-bold text-[var(--ink)]">
                  Testing with AstrePilot
                </h4>
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed mb-3">
                This page simulates a live remote internship listing. Clicking below takes you to the standard job application form where you can test AstrePilot&apos;s auto-fill HUD and AI screening answers.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handlePrimeBrain}
                  className="w-full py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--blue)]/30 text-[var(--blue)] hover:bg-[var(--blue)] hover:text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isPrimed ? "Brain Primed with this JD!" : "Prime AstrePilot Brain Now"}
                </button>

                <Link
                  href={`/simulate/apply?company=${selectedCompany.id}`}
                  className="w-full py-2.5 px-3 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Open Application Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Department & Office Info */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-[12px] space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Department</span>
                <p className="font-semibold text-[var(--ink)]">{selectedCompany.department}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Employment Type</span>
                <p className="font-semibold text-[var(--ink)]">{selectedCompany.term}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Workplace Policy</span>
                <p className="font-semibold text-[var(--ink)]">100% Asynchronous & Remote</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Call To Action ────────────────────────────────────────── */}
        <div className="mt-12 rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-muted)] p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-[var(--ink)] mb-2">
            Ready to test the application workflow?
          </h3>
          <p className="text-[13px] text-[var(--muted)] max-w-xl mx-auto mb-6">
            Proceed to the job application form for {selectedCompany.name}. Test AstrePilot&apos;s auto-fill, screening response generation, and form submission.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href={`/simulate/apply?company=${selectedCompany.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[13px] shadow-md hover:shadow-lg transition-all"
            >
              <span>Continue to Application Form</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink)] font-semibold text-[13px] transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SimulationJobPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] text-[13px]">
          Loading simulation...
        </div>
      }
    >
      <SimulationJobContent />
    </Suspense>
  );
}

