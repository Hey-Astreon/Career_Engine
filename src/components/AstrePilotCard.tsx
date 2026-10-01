"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, RefreshCw, Clock, Target, Layers, AlertCircle, Check, ExternalLink } from "lucide-react";

interface Stats {
  fills: number;
  fields: number;
  hoursSaved: number;
}

interface FillRecord {
  id: string;
  company: string | null;
  jobTitle: string | null;
  siteUrl: string;
  fieldsFilled: number;
  fieldsTotal: number;
  hasAiAnswers: boolean;
  filledAt: string;
}

export default function AstrePilotCard() {
  const [token, setToken] = useState<string | null>(null);
  const [bookmarkletHref, setBookmarkletHref] = useState<string>("#");
  const [stats, setStats] = useState<Stats>({ fills: 0, fields: 0, hoursSaved: 0 });
  const [history, setHistory] = useState<FillRecord[]>([]);
  const [loadingToken, setLoadingToken] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadToken = useCallback(async () => {
    setLoadingToken(true);
    try {
      const res = await fetch("/api/autopilot/token");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setToken(data.token);
      // Build the bookmarklet href client-side using the token
      // We import the builder dynamically to keep this client component clean
      const { buildBookmarkletHref } = await import("@/lib/autopilot/bookmarklet");
      const origin = typeof window !== "undefined" ? window.location.origin : "https://astrework.vercel.app";
      setBookmarkletHref(buildBookmarkletHref(data.token, origin));
    } catch {
      setToken(null);
    } finally {
      setLoadingToken(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/autopilot/log", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setHistory(data.history ?? []);
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => { loadToken(); }, [loadToken]);
  useEffect(() => { if (token) loadStats(); }, [token, loadStats]);

  const handleRegen = async () => {
    setRegenLoading(true);
    await loadToken();
    setRegenLoading(false);
  };

  const handleCopyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = Boolean(token);

  return (
    <div className="ce-surface overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between p-6 border-b border-[var(--line)]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--blue)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-bold text-[var(--ink)] tracking-tight">AstrePilot</span>
              <span className="text-[8px] font-bold tracking-widest text-[var(--blue)] bg-[var(--blue-soft)] border border-[var(--blue)]/20 rounded px-1.5 py-0.5 uppercase">
                Beta
              </span>
            </div>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">
              Autofill any job application form with your AstreWork profile — in seconds.
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
          isConnected
            ? "bg-[var(--green-soft)] text-[var(--green)]"
            : "bg-[var(--surface-muted)] text-[var(--muted)]"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[var(--green)]" : "bg-[var(--muted)]"}`} />
          {isConnected ? "Connected" : "Not set up"}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--line)]">

        {/* Left — How to set up */}
        <div className="p-6">
          <p className="text-[9px] font-bold tracking-widest text-[var(--muted)] uppercase mb-4">
            How to set up
          </p>
          <ol className="space-y-4">
            {[
              {
                n: "1",
                title: "Save your AstrePilot bookmark",
                desc: "Drag the button on the right into your browser's bookmarks bar.",
              },
              {
                n: "2",
                title: "Open any job application form",
                desc: "Navigate to Greenhouse, Lever, LinkedIn, or any company careers page.",
              },
              {
                n: "3",
                title: "Click ⚡ AstrePilot in your bookmarks",
                desc: "Your profile fills instantly with a decode animation. Review and submit.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--blue-soft)] text-[var(--blue)] text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {step.n}
                </span>
                <div>
                  <div className="text-[12px] font-semibold text-[var(--ink)] leading-tight">{step.title}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">{step.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right — Bookmarklet + token */}
        <div className="p-6 flex flex-col items-center justify-center gap-5">
          <p className="text-[9px] font-bold tracking-widest text-[var(--muted)] uppercase self-start">
            Your AstrePilot
          </p>

          {loadingToken ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--line)] border-t-[var(--blue)] rounded-full animate-spin" />
              <span className="text-[11px] text-[var(--muted)]">Generating your link…</span>
            </div>
          ) : token ? (
            <>
              {/* Draggable bookmarklet button */}
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="text-[10px] text-[var(--muted)] font-medium">
                  Drag this button to your bookmarks bar →
                </div>
                <div className="border-2 border-dashed border-[var(--line)] rounded-xl p-3 w-full flex justify-center">
                  {/* eslint-disable-next-line react/jsx-no-target-blank */}
                  <a
                    href={bookmarkletHref}
                    draggable
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0c1220] hover:bg-[#131b2e] rounded-xl text-white font-bold text-[13px] tracking-tight transition-colors cursor-grab active:cursor-grabbing select-none shadow-lg"
                    title="Drag me to your bookmarks bar"
                  >
                    <Zap className="w-4 h-4 text-blue-400" />
                    AstrePilot
                  </a>
                </div>
                <div className="text-[10px] text-[var(--muted)] text-center leading-relaxed">
                  Your profile is securely embedded.
                  <br />Token expires in 90 days.
                </div>
              </div>

              {/* Token copy */}
              <button
                onClick={handleCopyToken}
                className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                {copied ? (
                  <><Check className="w-3 h-3 text-[var(--green)]" /><span className="text-[var(--green)]">Token copied</span></>
                ) : (
                  <><ExternalLink className="w-3 h-3" />Copy raw token</>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-[var(--amber)] bg-[var(--amber-soft)] border border-[var(--amber)]/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Complete onboarding to use AstrePilot
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--surface-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={<Target className="w-3 h-3" />} value={stats.fills} label="applications filled" color="green" />
          <StatChip icon={<Layers className="w-3 h-3" />} value={stats.fields} label="fields saved" color="blue" />
          <StatChip icon={<Clock className="w-3 h-3" />} value={`~${stats.hoursSaved}h`} label="saved" color="purple" />
        </div>
        <div className="flex items-center gap-3">
          {stats.fills > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-[10px] font-semibold text-[var(--blue)] hover:text-[var(--ink)] transition-colors"
            >
              {showHistory ? "Hide history" : `View history (${stats.fills})`}
            </button>
          )}
          <button
            onClick={handleRegen}
            disabled={regenLoading}
            className="ce-button-secondary text-[10px] gap-1.5 min-h-[28px] px-2.5"
          >
            <RefreshCw className={`w-3 h-3 ${regenLoading ? "animate-spin" : ""}`} />
            Regenerate token
          </button>
        </div>
      </div>

      {/* ── History Panel ────────────────────────────────────────────────── */}
      {showHistory && history.length > 0 && (
        <div className="border-t border-[var(--line)] max-h-64 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[var(--surface-muted)] border-b border-[var(--line)]">
              <tr>
                {["Company", "Role", "Fields", "AI", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-[var(--line)]/50 hover:bg-[var(--surface-muted)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-[var(--ink)]">{r.company || "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--muted)] max-w-[120px] truncate">{r.jobTitle || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="ce-chip ce-chip-blue">{r.fieldsFilled}/{r.fieldsTotal}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.hasAiAnswers
                      ? <span className="ce-chip ce-chip-green">AI</span>
                      : <span className="ce-chip">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap">
                    {new Date(r.filledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Stat Chip ─────────────────────────────────────────────────────────── */
function StatChip({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: "green" | "blue" | "purple";
}) {
  const colors = {
    green: "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/20",
    blue: "bg-[var(--blue-soft)] text-[var(--blue)] border-[var(--blue)]/20",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${colors[color]}`}>
      {icon}
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}
