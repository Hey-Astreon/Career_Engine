"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, Search, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FormattedJobDescription } from "@/components/FormattedJobDescription";
import { canFetchMatchSourceText } from "@/lib/matchDescription";

interface JobItem {
  id: string;
  company: string;
  title: string;
  platform: string;
  location: string;
  url: string;
  rawDescription: string;
  hasFullText?: boolean;
}

interface RecommendedResumeVariant {
  variantName: string;
  fileName: string;
  pdfPath: string;
  reasoning: string;
  keyStrengths: string[];
}

interface MatchScoreData {
  score: number;
  hardSkills: string[];
  missingSkills: string[];
  reasoning: string;
  eligible?: boolean;
  rejectionReason?: string | null;
  recommendedResumeVariant?: RecommendedResumeVariant;
  cached?: boolean;
}

export default function MatchStudioPage() {
  const { activeProfileSlug, activeProfile } = useProfileStore();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [matchData, setMatchData] = useState<MatchScoreData | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [search, setSearch] = useState("");
  const [descriptionUpdatedJobId, setDescriptionUpdatedJobId] = useState<string | null>(null);

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

  const handleRunMatch = async (jobId: string, forceRefresh = false) => {
    setSelectedJobId(jobId);
    setMatchData(null);
    setIsEvaluating(true);

    try {
      const response = await fetch("/api/jobs/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileSlug: activeProfileSlug || "roushan", jobPostingId: jobId, forceRefresh }),
      });
      const data = await response.json();
      if (data.success && data.matchScore) {
        setMatchData(data.matchScore);
        if (forceRefresh) setDescriptionUpdatedJobId((current) => current === jobId ? null : current);
      }
    } catch (error) {
      console.error("Error evaluating match:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const fetchSelectedSourceDescription = async () => {
    if (!selectedJob) throw new Error("Choose a role before loading its source description.");

    const response = await fetch(`/api/jobs/${encodeURIComponent(selectedJob.id)}/description`);
    const data = await response.json();
    if (!response.ok || !data.success || typeof data.description !== "string") {
      throw new Error(data.error || "Unable to retrieve the source description.");
    }

    setJobs((currentJobs) => currentJobs.map((job) => job.id === selectedJob.id
      ? { ...job, rawDescription: data.description, hasFullText: true }
      : job));
    setDescriptionUpdatedJobId(selectedJob.id);
    setMatchData(null);
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId);
  const filteredJobs = useMemo(
    () => jobs.filter((job) => `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase())),
    [jobs, search],
  );
  const scoreLabel = !matchData ? "Not evaluated" : matchData.eligible === false ? "Ineligible" : matchData.score >= 80 ? "Strong match" : matchData.score >= 60 ? "Developing match" : "Gap detected";
  const shouldReevaluate = descriptionUpdatedJobId === selectedJob?.id;

  return <div>
    <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div>
        <div className="ce-page-eyebrow">Candidate intelligence <span className="mx-2 text-[var(--line-strong)]">/</span> profile-aware scoring</div>
        <h1 className="ce-page-title">Match Studio</h1>
        <p className="ce-page-copy">Compare real role requirements with {activeProfile?.fullName || "your active candidate profile"}. The backend keeps the evaluation and eligibility logic; this workspace makes the evidence easier to act on.</p>
      </div>
      <span className="ce-chip ce-chip-blue"><Target className="h-3 w-3" />{jobs.length} roles available</span>
    </section>

    <section className="mt-10 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="ce-surface overflow-hidden">
        <div className="border-b border-[var(--line)] p-5">
          <div className="ce-page-eyebrow">Role library</div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="ce-field pl-9 pr-3" placeholder="Search loaded roles" />
          </div>
        </div>
        <div className="max-h-[560px] overflow-y-auto p-2">
          {filteredJobs.map((job) => {
            const active = job.id === selectedJobId;
            return <button key={job.id} onClick={() => void handleRunMatch(job.id)} className={`w-full border-b border-[var(--line)] px-3 py-3 text-left transition-colors last:border-b-0 ${active ? "bg-[var(--blue-soft)]" : "hover:bg-[var(--surface-muted)]"}`}>
              <span className="flex items-center justify-between gap-2"><b className="truncate text-[10px] text-[var(--ink)]">{job.company}</b><em className="ce-chip !min-h-5 !px-1.5 !text-[7px] not-italic">{job.platform}</em></span>
              <span className="mt-1 block line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--ink-soft)]">{job.title}</span>
              {active && <span className="mt-2 block font-mono text-[8px] font-bold uppercase tracking-[.09em] text-[var(--blue)]">Active evaluation</span>}
            </button>;
          })}
          {!filteredJobs.length && <div className="p-8 text-center text-[10px] text-[var(--muted)]">No loaded roles match that search.</div>}
        </div>
      </aside>

      <main className="ce-surface min-w-0 p-5 sm:p-7">
        {selectedJob ? <>
          <div className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-start">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[var(--blue-soft)] text-[var(--blue)]"><Building2 className="h-4 w-4" /></span>
              <div>
                <div className="ce-page-eyebrow">{selectedJob.company} · {selectedJob.platform}</div>
                <h2 className="mt-2 text-[23px] font-bold leading-7 tracking-[-.045em] text-[var(--ink)]">{selectedJob.title}</h2>
                <p className="mt-2 text-[11px] text-[var(--muted)]">{selectedJob.location}</p>
              </div>
            </div>
            <button onClick={() => void handleRunMatch(selectedJob.id, shouldReevaluate)} disabled={isEvaluating} className="ce-button-primary disabled:opacity-60">
              <Sparkles className={`h-3.5 w-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
              {isEvaluating ? "Evaluating profile" : shouldReevaluate ? "Re-evaluate source text" : "Run evaluation"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
            <section className="border border-[var(--line)] bg-[var(--surface-muted)] p-5">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">Current match</span>
              <strong className={`mt-3 block text-[52px] leading-none tracking-[-.075em] ${matchData?.eligible === false ? "text-[var(--red)]" : "text-[var(--ink)]"}`}>{matchData ? `${matchData.score}%` : "—"}</strong>
              <b className="mt-3 block text-[12px] text-[var(--ink)]">{scoreLabel}</b>
              <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">{shouldReevaluate ? "Source description loaded. Re-evaluate to use it." : matchData?.cached ? "Using a verified cached evaluation." : "Run the evaluation to inspect evidence."}</p>
            </section>
            <section className="border border-[var(--line)] p-5">
              <div className="flex items-center justify-between">
                <div><div className="ce-page-eyebrow">Decision evidence</div><h3 className="mt-2 text-[16px] font-bold tracking-[-.035em] text-[var(--ink)]">Skills and requirement coverage</h3></div>
                {matchData && <span className={`ce-chip ${matchData.eligible === false ? "ce-chip-red" : "ce-chip-green"}`}>{matchData.eligible === false ? "STRICT GATE FAILED" : "READY TO REVIEW"}</span>}
              </div>
              {matchData?.eligible === false ? <div className="mt-5 border border-[var(--red-soft)] bg-[var(--red-soft)] p-4 text-[11px] leading-5 text-[var(--red)]">{matchData.rejectionReason || "This role does not meet a hard eligibility requirement for the active candidate workflow."}</div> : matchData ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><SkillPanel title="Verified overlap" icon={<CheckCircle2 className="h-4 w-4" />} skills={matchData.hardSkills} good /><SkillPanel title="Skills to develop" icon={<AlertTriangle className="h-4 w-4" />} skills={matchData.missingSkills} /></div> : <div className="mt-6 flex items-start gap-3 border-t border-[var(--line)] pt-5 text-[11px] leading-5 text-[var(--muted)]"><Sparkles className="h-4 w-4 shrink-0 text-[var(--blue)]" />Choose “Run evaluation” to use the existing match service against the active profile.</div>}
            </section>
          </div>

          {matchData?.recommendedResumeVariant && (
            <section className="mt-5 border border-[var(--blue)] bg-[var(--blue-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[.1em] text-[var(--blue)]">
                  Recommended Resume Variant
                </span>
                <span className="ce-chip ce-chip-blue font-mono text-[8px]">
                  {matchData.recommendedResumeVariant.fileName}
                </span>
              </div>
              <strong className="mt-1 block text-[14px] text-[var(--ink)]">
                {matchData.recommendedResumeVariant.variantName}
              </strong>
              <p className="mt-1 text-[11px] leading-4 text-[var(--ink-soft)]">
                {matchData.recommendedResumeVariant.reasoning}
              </p>
            </section>
          )}

          {matchData?.reasoning && <section className="mt-5 border-t border-[var(--line)] pt-5"><div className="ce-page-eyebrow">Technical assessment</div><p className="mt-3 max-w-3xl text-[12px] leading-6 text-[var(--ink-soft)]">{matchData.reasoning}</p></section>}

          <section className="mt-6 border-t border-[var(--line)] pt-5">
            <div className="flex items-center justify-between gap-4">
              <div><div className="ce-page-eyebrow">Source role brief</div><h3 className="mt-2 text-[16px] font-bold tracking-[-.035em] text-[var(--ink)]">Job description</h3></div>
              <a href={selectedJob.url} target="_blank" rel="noreferrer" className="ce-button-secondary !min-h-8 !px-2.5">View listing <ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className="mt-4">
              <FormattedJobDescription
                description={selectedJob.rawDescription}
                hasFullText={selectedJob.hasFullText}
                canFetchSourceText={canFetchMatchSourceText(selectedJob.platform, selectedJob.url)}
                onFetchSourceText={fetchSelectedSourceDescription}
              />
            </div>
          </section>
        </> : <div className="grid min-h-96 place-items-center text-center"><div><Target className="mx-auto h-7 w-7 text-[var(--blue)]" /><b className="mt-3 block text-[13px] text-[var(--ink)]">Choose a role to begin</b><p className="mt-2 text-[11px] text-[var(--muted)]">Loaded discovery roles will appear in the role library.</p></div></div>}
      </main>
    </section>
  </div>;
}

function SkillPanel({ title, icon, skills, good }: { title: string; icon: ReactNode; skills: string[]; good?: boolean }) {
  return <div className="border border-[var(--line)] bg-[var(--surface-muted)] p-4"><div className={`flex items-center gap-2 text-[11px] font-bold ${good ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>{icon}{title} <span className="font-mono text-[8px]">({skills.length})</span></div><div className="mt-3 flex flex-wrap gap-1">{skills.length ? skills.map((skill) => <span key={skill} className={`ce-chip ${good ? "ce-chip-green" : ""}`}>{skill}</span>) : <span className="text-[10px] text-[var(--muted)]">No specific skills surfaced.</span>}</div></div>;
}
