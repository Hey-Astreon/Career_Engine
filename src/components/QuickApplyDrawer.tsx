"use client";

import React, { useState, useEffect } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Briefcase,
  FileText,
  User,
  Globe,
  Mail,
  Phone,
  MapPin,
  Send,
  HelpCircle,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { generateAtsAutoFillUrl } from "@/lib/deepLinkEngine";

interface JobItem {
  id: string;
  company: string;
  title: string;
  category: string;
  location: string;
  platform: string;
  url: string;
}

interface QuickApplyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobItem | null;
}

interface OfficialVariantItem {
  variantName: string;
  fileName: string;
  category: string;
  description: string;
  keyStrengths: string[];
}

export function QuickApplyDrawer({ isOpen, onClose, job }: QuickApplyDrawerProps) {
  const { activeProfile, activeProfileSlug } = useProfileStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [officialVariants, setOfficialVariants] = useState<OfficialVariantItem[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  useEffect(() => {
    async function loadVariants() {
      try {
        const res = await fetch(`/api/resume/variants?profileSlug=${activeProfileSlug || "roushan"}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.officialVariants)) {
          setOfficialVariants(data.officialVariants);
          // Smart preselection based on job title
          const title = (job?.title || "").toLowerCase();
          let best = data.officialVariants[0]?.fileName;
          if (/ai|ml|llm|genai/i.test(title)) {
            const aiVar = data.officialVariants.find((v: OfficialVariantItem) => v.fileName.includes("AI_") || v.fileName.includes("AI_Product"));
            if (aiVar) best = aiVar.fileName;
          } else if (/python/i.test(title)) {
            const pyVar = data.officialVariants.find((v: OfficialVariantItem) => v.fileName.includes("Python"));
            if (pyVar) best = pyVar.fileName;
          } else if (/backend|system|api|c#|\.net/i.test(title)) {
            const beVar = data.officialVariants.find((v: OfficialVariantItem) => v.fileName.includes("Backend"));
            if (beVar) best = beVar.fileName;
          } else if (/full\s*stack/i.test(title)) {
            const fsVar = data.officialVariants.find((v: OfficialVariantItem) => v.fileName.includes("Full_Stack"));
            if (fsVar) best = fsVar.fileName;
          } else if (/product/i.test(title)) {
            const prodVar = data.officialVariants.find((v: OfficialVariantItem) => v.fileName.includes("Product"));
            if (prodVar) best = prodVar.fileName;
          }
          setSelectedVariant(best || data.officialVariants[0]?.fileName || "");
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (isOpen && job) {
      void loadVariants();
    }
  }, [isOpen, job, activeProfileSlug]);

  if (!isOpen || !job) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const candidateName = activeProfile?.fullName || "Candidate";
  const candidateEmail = activeProfile?.email || "";
  const candidatePhone = activeProfile?.phone || "";
  const candidateLocation = activeProfile?.location || "Remote";
  const candidateLinkedin = activeProfile?.linkedinUrl || "";
  const candidateGithub = activeProfile?.githubUrl || "";
  const candidatePortfolio = activeProfile?.portfolioUrl || "";

  // Generate Auto-Fill URL
  const { autoFillUrl, isSupported } = generateAtsAutoFillUrl(job.url, job.platform, activeProfile);

  // Dynamic tailored cover letter
  const defaultCoverLetter = `Dear Hiring Team at ${job.company},

I am writing to express my strong enthusiasm for the ${job.title} role. With a robust background in building scalable, resilient software, I specialize in engineering high-performance systems and clean APIs.

Recently, I engineered ${activeProfile?.projects[0]?.title || "distributed microservices and cloud infrastructure"}, focusing on strict reliability, architectural modularity, and rapid delivery. My technical experience directly matches the scope of responsibilities outlined for the ${job.title} position at ${job.company}.

I would welcome the opportunity to discuss how my skill set can contribute to your engineering objectives. Thank you for your time and consideration.

Sincerely,
${candidateName}
${candidateEmail} | ${candidatePhone}`;

  return (
    <div className="ce-drawer-backdrop" role="dialog" aria-modal="true" aria-label="Quick Apply Kit">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--line)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-[var(--blue-soft)] font-mono text-[10px] font-bold text-[var(--blue)]">
                {job.company.slice(0, 2).toUpperCase()}
              </span>
              <h2 className="text-[17px] font-bold text-[var(--ink)] leading-tight">
                Quick Apply Toolkit
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {job.title} · <b className="text-[var(--ink)]">{job.company}</b>
            </p>
          </div>
          <button
            onClick={onClose}
            className="ce-button-quiet !min-h-8 !px-2 rounded-md"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Action Button: Open Original Job Form */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
              <span className="block text-[11px] font-bold text-[var(--ink)]">External Application Portal</span>
              {isSupported && (
                <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                  <Sparkles className="h-2.5 w-2.5" />
                  Auto-Fill Ready
                </span>
              )}
            </div>
            <span className="block truncate text-[10px] text-[var(--muted)] mt-0.5">{job.url}</span>
          </div>
          <a
            href={autoFillUrl}
            target="_blank"
            rel="noreferrer"
            className="ce-button-primary !min-h-8 !px-3 shrink-0"
          >
            <span>Open Application</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Tailored PDF Resume Section (Option 1 - 1-Click Access) */}
        <div className="rounded-xl border border-[var(--blue)] bg-[var(--blue-soft)]/60 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--blue)] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Tailored Resume PDF (Locked Official A4)
            </span>
            <span className="ce-chip ce-chip-blue font-mono text-[8px]">
              Ready for Submission
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label className="block text-[9px] font-mono uppercase tracking-wider text-[var(--muted)] mb-1">
                Selected Variant
              </label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="ce-field w-full text-[11px] font-semibold text-[var(--ink)] bg-white"
                aria-label="Select resume variant"
              >
                {officialVariants.map((v) => (
                  <option key={v.fileName} value={v.fileName}>
                    {v.variantName} ({v.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-4 shrink-0">
              {selectedVariant && (
                <>
                  <a
                    href={`/api/resume/download?slug=${activeProfileSlug || "roushan"}&variant=${encodeURIComponent(selectedVariant)}&view=inline`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ce-button-secondary !min-h-8 !px-3 text-[11px] inline-flex items-center gap-1.5"
                    title="Preview PDF in browser"
                  >
                    <Eye className="h-3.5 w-3.5 text-[var(--blue)]" />
                    Preview
                  </a>
                  <a
                    href={`/api/resume/download?slug=${activeProfileSlug || "roushan"}&variant=${encodeURIComponent(selectedVariant)}&view=attachment`}
                    download={selectedVariant}
                    className="ce-button-primary !min-h-8 !px-3 text-[11px] inline-flex items-center gap-1.5 shadow-sm"
                    title={`Download official ${selectedVariant}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Candidate Credentials Section (1-Click Copy) */}
        <div className="space-y-2">
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
            1-Click Candidate Info
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { label: "Full Name", value: candidateName, key: "name" },
              { label: "Email", value: candidateEmail, key: "email" },
              { label: "Phone", value: candidatePhone, key: "phone" },
              { label: "Location", value: candidateLocation, key: "location" },
              { label: "LinkedIn", value: candidateLinkedin, key: "linkedin" },
              { label: "GitHub", value: candidateGithub, key: "github" },
              { label: "Portfolio", value: candidatePortfolio, key: "portfolio" },
            ]
              .filter((item) => Boolean(item.value))
              .map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[11px]"
                >
                  <div className="min-w-0 pr-2">
                    <span className="block text-[8px] font-bold uppercase text-[var(--muted)]">{item.label}</span>
                    <span className="block truncate font-semibold text-[var(--ink)]">{item.value}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.value, item.key)}
                    className="ce-button-secondary !min-h-6 !px-2 !text-[9px] shrink-0"
                    title={`Copy ${item.label}`}
                  >
                    {copiedField === item.key ? (
                      <Check className="h-3 w-3 text-[var(--green)]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Tailored Cover Letter Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Tailored Cover Letter
            </span>
            <button
              onClick={() => copyToClipboard(defaultCoverLetter, "coverLetter")}
              className="ce-button-secondary !min-h-7 !px-2.5 !text-[10px]"
            >
              {copiedField === "coverLetter" ? (
                <>
                  <Check className="h-3 w-3 text-[var(--green)]" />
                  <span>Copied Letter!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Cover Letter</span>
                </>
              )}
            </button>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white p-3.5 text-[11px] font-mono leading-relaxed text-[var(--ink-soft)] whitespace-pre-line max-h-48 overflow-y-auto">
            {defaultCoverLetter}
          </div>
        </div>

        {/* Common ATS Answers */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--blue)]" />
            <span>Standard ATS Questionnaire Answers</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
            <div className="rounded-md border border-[var(--line)] bg-white p-2">
              <span className="block text-[8px] text-[var(--muted)] uppercase font-semibold">Remote Work Auth</span>
              <b className="text-[var(--ink)]">Authorized without sponsorship</b>
            </div>
            <div className="rounded-md border border-[var(--line)] bg-white p-2">
              <span className="block text-[8px] text-[var(--muted)] uppercase font-semibold">Earliest Start Date</span>
              <b className="text-[var(--ink)]">Immediately / 2 Weeks notice</b>
            </div>
          </div>
        </div>

        {/* Footer Deep-Link to Outreach Studio */}
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
          <Link
            href="/outreach"
            onClick={onClose}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--blue)] hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Launch Recruiter Radar for {job.company} →</span>
          </Link>
          <button
            onClick={onClose}
            className="ce-button-secondary !min-h-8 !px-4 text-[11px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
