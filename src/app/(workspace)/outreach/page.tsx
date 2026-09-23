"use client";

import React, { useState, useEffect } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Search,
  Building2,
  Mail,
  Linkedin,
  MessageSquare,
  RefreshCw,
  Loader2,
  Users,
  Target,
  ArrowRight,
  Flame,
} from "lucide-react";

interface JobItem {
  id: string;
  company: string;
  title: string;
  category: string;
  location: string;
  platform: string;
  url: string;
}

interface OutreachData {
  company: string;
  jobTitle: string;
  recruiterSearchUrl: string;
  recruiterSearchQuery: string;
  coldEmailSubject: string;
  coldEmailBody: string;
  linkedinConnectionNote: string;
  linkedinInMail: string;
  keyTalkingPoints: string[];
}

export default function OutreachPage() {
  const { activeProfileSlug, activeProfile } = useProfileStore();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tone, setTone] = useState<"direct" | "enthusiastic" | "executive">("direct");

  const [outreachData, setOutreachData] = useState<OutreachData | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load jobs from discovery API
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("/api/jobs/scrape");
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
          setJobs(data.jobs);
          setSelectedJobId(data.jobs[0].id);
        }
      } catch (err) {
        console.error("Failed to load jobs for outreach:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  // Fetch / Generate outreach when selected job or tone changes
  useEffect(() => {
    if (!selectedJobId) return;

    let cancelled = false;

    async function generateOutreach() {
      setIsGenerating(true);
      try {
        const res = await fetch("/api/outreach/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobPostingId: selectedJobId,
            profileSlug: activeProfileSlug || "roushan",
            tone,
          }),
        });

        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setOutreachData(data.data);
        }
      } catch (err) {
        console.error("Outreach generation failed:", err);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    }

    generateOutreach();

    return () => {
      cancelled = true;
    };
  }, [selectedJobId, activeProfileSlug, tone]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredJobs = jobs.filter(
    (j) =>
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="ce-page-eyebrow">Recruiter Radar & Cold Outreach</span>
        <h1 className="ce-page-title text-[32px] sm:text-[40px]">Direct Outreach Studio</h1>
        <p className="ce-page-copy">
          Skip the ATS black hole. Target hiring managers and recruiters directly with AI-tailored cold emails,
          LinkedIn connection requests, and 1-click recruiter search.
        </p>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Job Selector (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Target Opportunities ({jobs.length})
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company or title..."
              className="ce-field px-3 pl-8 text-[11px]"
            />
          </div>

          <div className="max-h-[640px] overflow-y-auto space-y-1.5 pr-1">
            {isLoadingJobs ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--blue)]" />
                <p className="mt-2 font-mono text-[10px] text-[var(--muted)]">Loading opportunities...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[var(--muted)]">
                No roles match your search.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = job.id === selectedJobId;
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-[var(--blue)] bg-[var(--blue-soft)] shadow-xs"
                        : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-white font-mono text-[9px] font-bold text-[var(--ink)] shadow-xs border border-[var(--line)]">
                      {job.company.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[12px] font-bold text-[var(--ink)]">
                        {job.company}
                      </b>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ink-soft)] font-medium">
                        {job.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block rounded bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[8px] font-semibold text-[var(--muted)]">
                          {job.platform}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Outreach Package (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedJob && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
              {/* Header Card */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--blue-soft)] font-mono text-[12px] font-bold text-[var(--blue)]">
                    {selectedJob.company.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-[var(--ink)] leading-tight">
                      {selectedJob.company}
                    </h2>
                    <p className="text-[12px] text-[var(--muted)]">{selectedJob.title}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Recruiter Finder Button */}
                  {outreachData?.recruiterSearchUrl && (
                    <a
                      href={outreachData.recruiterSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ce-button-secondary !min-h-8 !px-3 !text-[11px] border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/70"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Find Hiring Managers on LinkedIn</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {/* Tone Switcher */}
                  <div className="flex items-center rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-0.5 text-[10px] font-bold">
                    <button
                      onClick={() => setTone("direct")}
                      className={`px-2 py-1 rounded transition-colors ${
                        tone === "direct" ? "bg-white text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"
                      }`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => setTone("enthusiastic")}
                      className={`px-2 py-1 rounded transition-colors ${
                        tone === "enthusiastic" ? "bg-white text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"
                      }`}
                    >
                      Warm
                    </button>
                    <button
                      onClick={() => setTone("executive")}
                      className={`px-2 py-1 rounded transition-colors ${
                        tone === "executive" ? "bg-white text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"
                      }`}
                    >
                      Executive
                    </button>
                  </div>
                </div>
              </div>

              {isGenerating ? (
                <div className="py-20 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--blue)]" />
                  <p className="mt-3 text-[13px] font-bold text-[var(--ink)]">
                    Crafting personalized pitch for {selectedJob.company}...
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                    Connecting candidate project proof to target role requirements
                  </p>
                </div>
              ) : outreachData ? (
                <div className="mt-5 space-y-5">
                  {/* Card 1: Cold Email */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded bg-blue-50 text-blue-600">
                          <Mail className="h-3.5 w-3.5" />
                        </span>
                        <b className="text-[12px] font-bold text-[var(--ink)]">Cold Email to Hiring Lead</b>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `Subject: ${outreachData.coldEmailSubject}\n\n${outreachData.coldEmailBody}`,
                            "coldEmailFull"
                          )
                        }
                        className="ce-button-secondary !min-h-7 !px-2.5 !text-[10px]"
                      >
                        {copiedKey === "coldEmailFull" ? (
                          <>
                            <Check className="h-3 w-3 text-[var(--green)]" />
                            <span>Copied Full Email!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Subject & Body</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Subject Line */}
                    <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-[11px]">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Subject:
                      </span>
                      <span className="font-semibold text-[var(--ink)] truncate max-w-[420px] px-2">
                        {outreachData.coldEmailSubject}
                      </span>
                      <button
                        onClick={() => copyToClipboard(outreachData.coldEmailSubject, "subjectOnly")}
                        className="text-[10px] font-bold text-[var(--blue)] hover:underline shrink-0"
                      >
                        {copiedKey === "subjectOnly" ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    {/* Email Body */}
                    <div className="relative rounded-lg border border-[var(--line)] bg-white p-3.5 text-[12px] leading-relaxed text-[var(--ink-soft)] font-mono whitespace-pre-line">
                      {outreachData.coldEmailBody}
                    </div>
                  </div>

                  {/* Card 2: LinkedIn Connection Request Note */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded bg-sky-50 text-sky-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <b className="text-[12px] font-bold text-[var(--ink)]">
                          LinkedIn Connection Note (&lt; 300 Chars)
                        </b>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[9px] font-semibold text-[var(--muted)]">
                          {outreachData.linkedinConnectionNote.length} / 300
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(outreachData.linkedinConnectionNote, "linkedinNote")
                          }
                          className="ce-button-secondary !min-h-7 !px-2.5 !text-[10px]"
                        >
                          {copiedKey === "linkedinNote" ? (
                            <>
                              <Check className="h-3 w-3 text-[var(--green)]" />
                              <span>Copied Note!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-[12px] text-[var(--ink)] leading-relaxed">
                      {outreachData.linkedinConnectionNote}
                    </div>
                  </div>

                  {/* Card 3: InMail Pitch */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded bg-indigo-50 text-indigo-600">
                          <Send className="h-3.5 w-3.5" />
                        </span>
                        <b className="text-[12px] font-bold text-[var(--ink)]">LinkedIn InMail / DM Pitch</b>
                      </div>
                      <button
                        onClick={() => copyToClipboard(outreachData.linkedinInMail, "inmail")}
                        className="ce-button-secondary !min-h-7 !px-2.5 !text-[10px]"
                      >
                        {copiedKey === "inmail" ? (
                          <>
                            <Check className="h-3 w-3 text-[var(--green)]" />
                            <span>Copied InMail!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy InMail</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg border border-[var(--line)] bg-white p-3 text-[12px] text-[var(--ink)] leading-relaxed whitespace-pre-line font-mono">
                      {outreachData.linkedinInMail}
                    </div>
                  </div>

                  {/* Card 4: Key Strategic Talking Points */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                    <b className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Key Talking Points to Emphasize in Conversation
                    </b>
                    <ul className="mt-2.5 space-y-1.5">
                      {outreachData.keyTalkingPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[12px] text-[var(--ink)]">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--blue)] shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
