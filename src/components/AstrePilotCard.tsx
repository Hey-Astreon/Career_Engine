"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, RefreshCw, Clock, Target, Layers, AlertCircle, Check, ExternalLink, Copy, BrainCircuit, Puzzle, Bookmark, Download } from "lucide-react";

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

interface SessionRecord {
  company: string | null;
  jobTitle: string | null;
  createdAt: string;
}

export default function AstrePilotCard() {
  const [token, setToken] = useState<string | null>(null);
  const [bookmarkletHref, setBookmarkletHref] = useState<string>("#");
  const [stats, setStats] = useState<Stats>({ fills: 0, fields: 0, hoursSaved: 0 });
  const [history, setHistory] = useState<FillRecord[]>([]);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [installMode, setInstallMode] = useState<"extension" | "bookmarklet">("extension");

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
      const [statsRes, sessionRes] = await Promise.all([
        fetch("/api/autopilot/log", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/autopilot/session", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setHistory(data.history ?? []);
      }
      
      if (sessionRes.ok) {
        const sData = await sessionRes.json();
        setSession(sData.session || null);
      }
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

  const handleCopyBookmarklet = async () => {
    if (!bookmarkletHref || bookmarkletHref === "#") return;
    await navigator.clipboard.writeText(bookmarkletHref);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
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
                Chrome Extension & Bookmarklet
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

      {/* ── Mode Selector Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 pt-4 border-b border-[var(--line)] bg-[var(--surface-muted)]/50">
        <button
          onClick={() => setInstallMode("extension")}
          className={`flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-all border-b-2 ${
            installMode === "extension"
              ? "border-[var(--blue)] text-[var(--blue)] bg-[var(--surface)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Puzzle className="w-3.5 h-3.5" />
          <span>Chrome Extension</span>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue)]/20">
            Recommended
          </span>
        </button>
        <button
          onClick={() => setInstallMode("bookmarklet")}
          className={`flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-all border-b-2 ${
            installMode === "bookmarklet"
              ? "border-[var(--blue)] text-[var(--blue)] bg-[var(--surface)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Browser Bookmarklet</span>
          <span className="text-[9px] font-medium text-[var(--muted)]">No install</span>
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--line)]">

        {/* Left — Setup Instructions */}
        <div className="p-6">
          <p className="text-[9px] font-bold tracking-widest text-[var(--muted)] uppercase mb-4">
            {installMode === "extension" ? "How to install Extension" : "How to set up Bookmarklet"}
          </p>
          <ol className="space-y-4">
            {(installMode === "extension"
              ? [
                  {
                    n: "1",
                    title: "Download & Unzip AstrePilot",
                    desc: "Download astrepilot-extension.zip and extract the files to a folder on your computer.",
                  },
                  {
                    n: "2",
                    title: "Open chrome://extensions",
                    desc: "Open Chrome or Edge extensions manager, and turn ON \"Developer mode\" (top-right toggle).",
                  },
                  {
                    n: "3",
                    title: "Click \"Load unpacked\"",
                    desc: "Select the extracted extension folder. AstrePilot will appear in your browser extensions bar.",
                  },
                  {
                    n: "4",
                    title: "Autofill with 1 click or Ctrl+Shift+A",
                    desc: "On any job application (Greenhouse, Lever, Workday, etc.), click the AstrePilot icon or press Ctrl+Shift+A!",
                  },
                ]
              : [
                  {
                    n: "1",
                    title: "Save your AstrePilot bookmark",
                    desc: "Drag the button → OR → click \"Copy Bookmarklet\", then right-click your bookmarks bar → Add Page → paste as URL.",
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
                ]
            ).map((step) => (
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

        {/* Right — Actions & Tools */}
        <div className="p-6 flex flex-col items-center justify-center gap-5">
          <p className="text-[9px] font-bold tracking-widest text-[var(--muted)] uppercase self-start">
            {installMode === "extension" ? "Download AstrePilot Extension" : "Your AstrePilot Bookmarklet"}
          </p>

          {loadingToken ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--line)] border-t-[var(--blue)] rounded-full animate-spin" />
              <span className="text-[11px] text-[var(--muted)]">Generating your link…</span>
            </div>
          ) : token ? (
            <>
              {/* Brain Context Indicator */}
              {session ? (
                <div className="w-full bg-[var(--green-soft)] border border-[var(--green)]/20 rounded-xl p-3 flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BrainCircuit className="w-4 h-4 text-[var(--green)]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-[var(--green)] uppercase mb-0.5">Brain Primed</div>
                    <div className="text-[13px] font-bold text-[var(--ink)] leading-tight">{session.company || "Company"}</div>
                    <div className="text-[11px] text-[var(--muted)] truncate max-w-[200px]">{session.jobTitle || "Job Role"}</div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-[var(--surface-muted)] border border-[var(--line)] rounded-xl p-3 flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--line)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BrainCircuit className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-[var(--muted)] uppercase mb-0.5">Brain Empty</div>
                    <div className="text-[11px] text-[var(--muted)] leading-snug">Use Custom JD Mode to prime AstrePilot for a specific role.</div>
                  </div>
                </div>
              )}

              {installMode === "extension" ? (
                /* Chrome Extension UI */
                <div className="flex flex-col items-center gap-3 w-full">
                  <a
                    href="/downloads/astrepilot-extension.zip"
                    download="astrepilot-extension.zip"
                    className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-[var(--blue)] hover:bg-[var(--blue-light)] text-white font-bold text-[13px] rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Chrome Extension (.zip)</span>
                  </a>

                  <div className="flex items-center justify-between w-full px-2 text-[10px] text-[var(--muted)]">
                    <span className="flex items-center gap-1 font-semibold text-[var(--green)]">
                      <Check className="w-3 h-3" /> Manifest V3 Ready
                    </span>
                    <span>Version 1.0.0</span>
                  </div>

                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--blue)] hover:text-[var(--ink)] bg-[var(--blue-soft)] hover:bg-[var(--line)] border border-[var(--blue)]/20 rounded-lg px-3 py-1.5 transition-all w-full justify-center mt-1"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3 text-[var(--green)]" /><span className="text-[var(--green)]">Token copied to clipboard</span></>
                    ) : (
                      <><Copy className="w-3 h-3" />Copy Connection Token</>
                    )}
                  </button>
                  <p className="text-[10px] text-[var(--muted)] text-center leading-relaxed">
                    Auto-connects automatically when AstreWork is open in any tab.
                  </p>
                </div>
              ) : (
                /* Bookmarklet UI */
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
                  {/* Copy bookmarklet for Chrome/Edge manual install */}
                  <button
                    onClick={handleCopyBookmarklet}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--blue)] hover:text-[var(--ink)] bg-[var(--blue-soft)] hover:bg-[var(--line)] border border-[var(--blue)]/20 rounded-lg px-3 py-1.5 transition-all w-full justify-center"
                    title="For Chrome: copy this, then right-click bookmarks bar → Add Page → paste as URL"
                  >
                    {copiedBookmarklet ? (
                      <><Check className="w-3 h-3 text-[var(--green)]" /><span className="text-[var(--green)]">Copied! Paste as bookmark URL</span></>
                    ) : (
                      <><Copy className="w-3 h-3" />Copy Bookmarklet Code</>  
                    )}
                  </button>
                  <div className="text-[10px] text-[var(--muted)] text-center leading-relaxed">
                    Your profile is securely embedded.
                    <br />Token expires in 90 days.
                  </div>
                </div>
              )}
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
