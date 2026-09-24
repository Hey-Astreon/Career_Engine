"use client";

import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";
import { calculateProviderReliability, type ProviderHealthSnapshot } from "@/lib/dashboardStats";

function formatSync(value: string | null): string {
  if (!value) return "No successful sync";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sync unavailable";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatSyncTime(value?: string | null, currentMs: number = Date.now()): string {
  if (!value) return "No successful sync";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Sync unavailable";
  const minutes = Math.max(0, Math.floor((currentMs - timestamp) / 60000));
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}

function statusTone(status: string) {
  if (status === "HEALTHY") return { dot: "bg-[var(--green)]", chip: "ce-chip-green", bar: "bg-[var(--green)]" };
  if (status === "DEGRADED") return { dot: "bg-[var(--amber)]", chip: "bg-[var(--amber-soft)] text-[var(--amber)]", bar: "bg-[var(--amber)]" };
  return { dot: "bg-[var(--red)]", chip: "ce-chip-red", bar: "bg-[var(--red)]" };
}

// eslint-disable-next-line react-hooks/purity
export function ProviderHealthReport({ rows, nowTick = Date.now() }: { rows: ProviderHealthSnapshot[]; nowTick?: number }) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const reportRows = [...rows].sort((left, right) => left.provider.localeCompare(right.provider));

  return (
    <section id="provider-health-report" className="ce-surface mt-7 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
        <div>
          <div className="ce-page-eyebrow">Complete source report</div>
          <h2 className="mt-2 text-[24px] font-bold tracking-[-.05em] text-[var(--ink)]">
            Every provider, clearly accounted for.
          </h2>
          <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[var(--muted)]">
            All providers in the live sync state are shown below with raw jobs seen and freshness time. Operational reliability is calculated from current status, successful-sync freshness, and consecutive failures.
          </p>
        </div>
        <div className="text-right">
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">Coverage</span>
          <b className="mt-2 block text-[20px] text-[var(--ink)]">{reportRows.length} providers</b>
          <span className="mt-1 block text-[10px] text-[var(--muted)]">Select a row for source detail</span>
        </div>
      </div>

      <div className="overflow-x-auto border-y border-[var(--line)]">
        <div className="min-w-[1010px]">
          <div className="grid grid-cols-[minmax(210px,1.4fr)_120px_180px_100px_80px_150px_32px] gap-4 bg-[var(--surface-muted)] px-5 py-3 font-mono text-[8px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
            <span>Provider & Raw Volume</span>
            <span>Status</span>
            <span>Operational reliability</span>
            <span>Active jobs</span>
            <span>Stale</span>
            <span>Last sync</span>
            <span />
          </div>

          {reportRows.map((source) => {
            const status = source.status.toUpperCase();
            const reliability = calculateProviderReliability(source, nowTick);
            const tone = statusTone(status);
            const expanded = expandedProvider === source.provider;
            const attention =
              source.lastError ||
              (source.consecutiveFailures
                ? `${source.consecutiveFailures} consecutive failed sync${source.consecutiveFailures === 1 ? "" : "s"}.`
                : "No current provider error recorded.");

            return (
              <div key={source.provider}>
                <button
                  type="button"
                  onClick={() => setExpandedProvider(expanded ? null : source.provider)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[minmax(210px,1.4fr)_120px_180px_100px_80px_150px_32px] items-center gap-4 border-b border-[var(--line)] px-5 py-4 text-left transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <i className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                    <div className="min-w-0">
                      <b className="block truncate text-[11px] text-[var(--ink)]">
                        {source.provider.replaceAll("_", " ")}
                      </b>
                      <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[.08em] text-[var(--muted)]">
                        {source.totalJobsSeen.toLocaleString()} raw jobs seen
                      </span>
                    </div>
                  </span>

                  <span className={`ce-chip w-fit ${tone.chip}`}>{status}</span>

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-14 overflow-hidden bg-[var(--line)]">
                      <i className={`block h-full ${tone.bar}`} style={{ width: `${reliability.score}%` }} />
                    </span>
                    <b className="font-mono text-[10px] text-[var(--ink)]">{reliability.score}</b>
                    <span className="text-[9px] text-[var(--muted)]">/100</span>
                  </span>

                  <span className="text-[12px] text-[var(--ink)]">{(source.activeJobs ?? 0).toLocaleString()}</span>
                  <span className={`text-[12px] ${(source.staleJobs ?? 0) ? "text-[var(--amber)]" : "text-[var(--ink)]"}`}>
                    {(source.staleJobs ?? 0).toLocaleString()}
                  </span>

                  <div>
                    <span className="block text-[11px] font-medium text-[var(--ink)]">
                      {formatSyncTime(source.lastSuccessfulSyncAt, nowTick)}
                    </span>
                    <span className="block text-[9px] text-[var(--muted)]">
                      {formatSync(source.lastSuccessfulSyncAt)}
                    </span>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 text-[var(--muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </button>

                {expanded ? (
                  <div className="grid gap-4 border-b border-[var(--line)] bg-[var(--surface-muted)] px-8 py-4 text-[10px] leading-5 text-[var(--muted)] md:grid-cols-4">
                    <span>
                      <b className="block text-[var(--ink)]">Latest attention</b>
                      {attention}
                    </span>
                    <span>
                      <b className="block text-[var(--ink)]">Raw jobs seen</b>
                      {source.totalJobsSeen.toLocaleString()}
                    </span>
                    <span>
                      <b className="block text-[var(--ink)]">Last attempted</b>
                      {formatSyncTime(source.lastSyncAttemptAt, nowTick)} ({formatSync(source.lastSyncAttemptAt)})
                    </span>
                    <span>
                      <b className="block text-[var(--ink)]">Reliability inputs</b>
                      {reliability.statusPenalty}% status · {reliability.freshnessPenalty}% freshness · {reliability.failurePenalty}% failures
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-5 text-[10px] leading-5 text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <CircleCheck className="h-3.5 w-3.5 text-[var(--green)]" />
          Active jobs: current non-expired stored postings.
        </span>
        <span className="flex items-center gap-2">
          <CircleAlert className="h-3.5 w-3.5 text-[var(--amber)]" />
          Stale: stored postings marked expired.
        </span>
      </div>
    </section>
  );
}
