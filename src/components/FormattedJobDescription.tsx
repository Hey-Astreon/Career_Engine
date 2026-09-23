"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Copy, FileText, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import { isSparseDescription, sourceTextToReadableText } from "@/lib/jobDescription";

interface FormattedJobDescriptionProps {
  description: string;
  hasFullText?: boolean;
  canFetchSourceText?: boolean;
  onFetchSourceText?: () => Promise<void>;
}

type DescriptionSection = { title: string; items: string[] };

const SECTION_MARKERS = [
  { title: "Responsibilities", expression: /\b(what you'll do|what you will do|responsibilities|your impact|day-to-day|tasks)\b/i },
  { title: "Requirements", expression: /\b(requirements|qualifications|what we're looking for|skills needed|who you are|preferred qualifications)\b/i },
  { title: "Benefits", expression: /\b(benefits|perks|what we offer|compensation|why join us)\b/i },
];

function createStructuredSections(sourceText: string): DescriptionSection[] {
  const prepared = sourceText.replace(/\r\n/g, "\n");
  const lines = prepared
    .split(/\n|\s+[•*]\s+|\s+-\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const groups = new Map<string, string[]>();
  let current = "Role overview";
  groups.set(current, []);

  for (const line of lines) {
    const marker = SECTION_MARKERS.find((candidate) => candidate.expression.test(line));
    if (marker && line.length < 90) {
      current = marker.title;
      if (!groups.has(current)) groups.set(current, []);
      continue;
    }
    const sentences = line.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()) ?? [line];
    for (const sentence of sentences) {
      if (sentence.length > 18) groups.get(current)?.push(sentence);
    }
  }

  return [...groups.entries()]
    .map(([title, items]) => ({ title, items: items.slice(0, 10) }))
    .filter((section) => section.items.length > 0);
}

export function FormattedJobDescription({ description, hasFullText, canFetchSourceText, onFetchSourceText }: FormattedJobDescriptionProps) {
  const [viewMode, setViewMode] = useState<"structured" | "original">("structured");
  const [copied, setCopied] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const sourceText = useMemo(() => sourceTextToReadableText(description), [description]);
  const sections = useMemo(() => createStructuredSections(sourceText), [sourceText]);
  // Provider completeness metadata can be stale or absent even when a readable
  // multi-paragraph description is already present. Treat the actual source
  // text as authoritative for the summary-only warning.
  const sparse = isSparseDescription(description);

  const copySourceText = async () => {
    await navigator.clipboard.writeText(sourceText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const fetchFullText = async () => {
    if (!onFetchSourceText) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      await onFetchSourceText();
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Unable to retrieve the source description.");
    } finally {
      setIsFetching(false);
    }
  };

  if (!sourceText) {
    return <div className="border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-[12px] leading-5 text-[var(--muted)]">This source did not provide readable responsibilities or requirements. Open the original application page to review the complete role details.</div>;
  }

  return <div className="ce-description space-y-4">
    {sparse && <div className="flex flex-wrap items-start justify-between gap-3 border border-[var(--amber)] bg-[var(--amber-soft)] p-3 text-[11px] leading-5 text-[var(--ink)]"><span className="flex min-w-0 gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber)]" /><span><b>Listing summary only.</b> This provider did not include responsibilities or requirements in its feed.</span></span>{canFetchSourceText ? <button type="button" onClick={fetchFullText} disabled={isFetching} className="ce-button-secondary shrink-0 !min-h-8"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />{isFetching ? "Loading source text" : "Get full description"}</button> : null}</div>}
    {fetchError && <p role="alert" className="text-[11px] text-[var(--red)]">{fetchError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] bg-[var(--surface-muted)] p-2"><div className="flex flex-wrap gap-1"><button type="button" onClick={() => setViewMode("structured")} aria-pressed={viewMode === "structured"} className={`ce-button-secondary !min-h-8 ${viewMode === "structured" ? "!border-[var(--blue)] !bg-[var(--blue)] !text-white" : ""}`}><Sparkles className="h-3.5 w-3.5" />Structured view</button><button type="button" onClick={() => setViewMode("original")} aria-pressed={viewMode === "original"} className={`ce-button-secondary !min-h-8 ${viewMode === "original" ? "!border-[var(--ink)] !bg-[var(--ink)] !text-white" : ""}`}><FileText className="h-3.5 w-3.5" />Original source text</button></div><button type="button" onClick={copySourceText} className="ce-button-secondary !min-h-8">{copied ? <><Check className="h-3.5 w-3.5 text-[var(--green)]" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy source text</>}</button></div>
    <p className="text-[10px] leading-4 text-[var(--muted)]">{viewMode === "structured" ? "Structured view groups readable source text into practical sections. It does not add facts that are not in the source." : "Original source text preserves the readable source order and paragraph flow without AstreWork grouping."}</p>
    {viewMode === "structured" ? <div className="space-y-3">{sections.length ? sections.map((section) => <section key={section.title} className="border border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2 border-b border-[var(--line)] pb-2"><ListChecks className="h-4 w-4 text-[var(--blue)]" /><h4 className="text-[13px] font-bold text-[var(--ink)]">{section.title}</h4></div><ul className="mt-3 space-y-2">{section.items.map((item, index) => <li key={`${section.title}-${index}`} className="flex gap-2 text-[12px] leading-5 text-[var(--ink-soft)]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]" />{item}</li>)}</ul></section>) : <div className="border border-[var(--line)] p-4 text-[12px] text-[var(--muted)]">The source description did not include enough detail to structure. Use Original source text for the exact content.</div>}</div> : <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border border-[var(--line)] bg-[var(--surface-muted)] p-4 font-sans text-[12px] leading-6 text-[var(--ink-soft)]">{sourceText}</pre>}
  </div>;
}
