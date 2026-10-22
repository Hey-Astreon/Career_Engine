"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import {
  Briefcase,
  ExternalLink,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  Clock,
  Sparkles,
  AlertCircle,
  Trophy,
  Download,
  Table,
  Columns3,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface TrackedApplication {
  id: string;
  slNo?: number;
  company: string;
  title: string;
  status: string;
  confirmed?: boolean;
  appliedDate: string;
  appliedDateFull?: string;
  appliedAtIso?: string;
  daysSilent: number;
  jobUrl: string;
  source?: string;
  fieldsFilled?: number | null;
  fieldsTotal?: number | null;
  hasAiAnswers?: boolean;
  resumeVariantName?: string;
  atsExtractabilityScore?: number;
}

const STATUS_COLUMNS = [
  { id: "DISCOVERED", label: "Discovered" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "TECHNICAL_ROUND", label: "Technical Round" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Rejected" },
  { id: "QUIET", label: "Quiet" },
];

export default function ApplicationsPage() {
  const { activeProfileSlug } = useProfileStore();
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: "table" (Structured Table Report) vs "kanban" (Visual Stage Pipeline)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<"ALL" | "ASTREPILOT" | "IN_FLIGHT" | "QUIET" | "OFFER">("ALL");

  // Export Menu Dropdown State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);

  // Follow-up Studio Modal State
  const [followupApp, setFollowupApp] = useState<TrackedApplication | null>(null);
  const [followupTone, setFollowupTone] = useState<"nudge" | "project_update" | "referral">("nudge");
  const [followupDraft, setFollowupDraft] = useState<{
    subject: string;
    body: string;
    fullDraft: string;
    mailtoUrl: string;
  } | null>(null);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [copiedFollowup, setCopiedFollowup] = useState(false);

  // Load view mode preference from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("astrework_applications_view_mode");
      if (savedMode === "kanban" || savedMode === "table") {
        setViewMode(savedMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetViewMode = (mode: "table" | "kanban") => {
    setViewMode(mode);
    try {
      localStorage.setItem("astrework_applications_view_mode", mode);
    } catch {
      /* ignore */
    }
  };

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParam = activeProfileSlug ? `?profileSlug=${encodeURIComponent(activeProfileSlug)}` : "";
      const res = await fetch(`/api/applications${queryParam}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProfileSlug]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const queryParam = activeProfileSlug ? `?profileSlug=${encodeURIComponent(activeProfileSlug)}` : "";
        const res = await fetch(`/api/applications${queryParam}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setApplications(data.applications || []);
        }
      } catch (err) {
        if (isMounted) console.error("Failed to load applications", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activeProfileSlug]);

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmApplication = async (appId: string) => {
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, confirmed: true }),
      });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteApplication = async (appId: string) => {
    if (!window.confirm("Remove this tracked application from your account?")) return;
    try {
      const res = await fetch(`/api/applications?id=${appId}`, { method: "DELETE" });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  // Follow-up Draft generation
  const openFollowupModal = async (
    app: TrackedApplication,
    initialTone: "nudge" | "project_update" | "referral" = "nudge"
  ) => {
    setFollowupApp(app);
    setFollowupTone(initialTone);
    setIsGeneratingFollowup(true);
    setCopiedFollowup(false);

    try {
      const res = await fetch("/api/applications/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, tone: initialTone }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowupDraft({
          subject: data.subject,
          body: data.body,
          fullDraft: data.followupDraft,
          mailtoUrl: data.mailtoUrl,
        });
      }
    } catch (err) {
      console.error("Failed to generate follow-up:", err);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const changeFollowupTone = async (newTone: "nudge" | "project_update" | "referral") => {
    if (!followupApp) return;
    setFollowupTone(newTone);
    setIsGeneratingFollowup(true);
    setCopiedFollowup(false);

    try {
      const res = await fetch("/api/applications/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: followupApp.id, tone: newTone }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowupDraft({
          subject: data.subject,
          body: data.body,
          fullDraft: data.followupDraft,
          mailtoUrl: data.mailtoUrl,
        });
      }
    } catch (err) {
      console.error("Failed to generate follow-up:", err);
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFollowup(true);
    setTimeout(() => setCopiedFollowup(false), 2000);
  };

  // Export handlers
  const handleExport = (format: "csv" | "excel" | "xml") => {
    setShowExportMenu(false);
    const query = new URLSearchParams();
    query.set("format", format);
    if (activeProfileSlug) query.set("profileSlug", activeProfileSlug);
    if (filterStage === "ASTREPILOT") query.set("filter", "astrepilot");
    else if (filterStage === "IN_FLIGHT") query.set("filter", "in_flight");
    else if (filterStage === "QUIET") query.set("filter", "quiet");
    else if (filterStage === "OFFER") query.set("filter", "offer");

    window.open(`/api/applications/export?${query.toString()}`, "_blank");
  };

  const handleCopyTsv = async () => {
    setShowExportMenu(false);
    try {
      const query = new URLSearchParams();
      query.set("format", "tsv");
      if (activeProfileSlug) query.set("profileSlug", activeProfileSlug);
      if (filterStage === "ASTREPILOT") query.set("filter", "astrepilot");
      else if (filterStage === "IN_FLIGHT") query.set("filter", "in_flight");
      else if (filterStage === "QUIET") query.set("filter", "quiet");
      else if (filterStage === "OFFER") query.set("filter", "offer");

      const res = await fetch(`/api/applications/export?${query.toString()}`);
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        setCopiedTsv(true);
        setTimeout(() => setCopiedTsv(false), 2500);
      }
    } catch (e) {
      console.error("Failed to copy TSV:", e);
    }
  };

  // Summary Telemetry
  const stats = useMemo(() => {
    const total = applications.length;
    const astrepilot = applications.filter((a) => a.source?.includes("AstrePilot")).length;
    const inFlight = applications.filter((a) =>
      ["SHORTLISTED", "APPLIED", "SCREENING", "TECHNICAL_ROUND"].includes(a.status)
    ).length;
    const quietAlerts = applications.filter(
      (a) => a.status === "QUIET" || (a.status === "APPLIED" && a.daysSilent >= 5)
    ).length;
    const offers = applications.filter((a) => a.status === "OFFER").length;
    return { total, astrepilot, inFlight, quietAlerts, offers };
  }, [applications]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Search query
      if (
        searchTerm &&
        !app.company.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !app.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !app.jobUrl.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(app.source || "").toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Stage filter
      if (filterStage === "ASTREPILOT") {
        return app.source?.includes("AstrePilot");
      }
      if (filterStage === "IN_FLIGHT") {
        return ["SHORTLISTED", "APPLIED", "SCREENING", "TECHNICAL_ROUND"].includes(app.status);
      }
      if (filterStage === "QUIET") {
        return app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
      }
      if (filterStage === "OFFER") {
        return app.status === "OFFER";
      }

      return true;
    });
  }, [applications, searchTerm, filterStage]);

  return (
    <div className="flex h-full flex-col space-y-5">
      {/* ── Top Header & Workspace Title ─────────────────────────────────── */}
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end pb-1">
        <div>
          <div className="ce-page-eyebrow">
            Application Intelligence <span className="mx-2 text-[var(--line-strong)]">/</span> AstrePilot Harvester Active
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-.045em] text-[var(--ink)]">
              Application Pipeline &amp; AstrePilot Tracker
            </h1>
            <span className="ce-chip ce-chip-blue !min-h-5 !px-2 !text-[8px]">
              LIVE TRACKER
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
            Structured tracking report of every remote opportunity form applied via AstrePilot or tracked manually. Real-time telemetry, stage progression, and export suite.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-md border border-[var(--line)] bg-[var(--surface-muted)]">
            <button
              onClick={() => handleSetViewMode("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs font-bold"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              title="Structured Detailed Table Report"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Detailed Table</span>
            </button>
            <button
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs font-bold"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              title="Visual Kanban Pipeline"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
          </div>

          {/* Export Suite Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="ce-button-secondary !min-h-[30px] !py-1 !px-2.5 !text-[11px]"
              aria-label="Export report"
            >
              <Download className="w-3.5 h-3.5 text-[var(--blue)]" />
              <span>Export Report</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-[var(--surface)] rounded-lg border border-[var(--line)] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 font-mono text-[8px] font-bold text-[var(--muted)] uppercase tracking-[.12em] border-b border-[var(--line)] mb-1">
                    Spreadsheet &amp; Data Exports
                  </div>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] rounded flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div>Download CSV (.csv)</div>
                      <div className="text-[9px] text-[var(--muted)] font-normal">Excel &amp; Google Sheets ready (UTF-8 BOM)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] rounded flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div>Download Excel (.xls)</div>
                      <div className="text-[9px] text-[var(--muted)] font-normal">Pre-styled Excel worksheet</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("xml")}
                    className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] rounded flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div>Download XML (.xml)</div>
                      <div className="text-[9px] text-[var(--muted)] font-normal">Semantic XML data schema</div>
                    </div>
                  </button>
                  <div className="border-t border-[var(--line)] my-1" />
                  <button
                    onClick={handleCopyTsv}
                    className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--blue-soft)] hover:text-[var(--blue)] rounded flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-[var(--blue)] shrink-0" />
                    <div>
                      <div>Copy as TSV (Clipboard)</div>
                      <div className="text-[9px] text-[var(--muted)] font-normal">Ctrl+V paste directly into Sheets or Excel</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={fetchApplications}
            disabled={isLoading}
            className="ce-button-secondary !min-h-[30px] !py-1 !px-2.5 !text-[11px]"
            title="Refresh application data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[var(--blue)]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* ── Unified 5-Segment Telemetry Stats Strip ─────────────────────── */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] shadow-2xs">
        <TelemetryCell
          icon={<Briefcase className="w-3.5 h-3.5" />}
          label="Total Applications"
          value={stats.total}
          note="all tracked opportunities"
        />
        <TelemetryCell
          icon={<Zap className="w-3.5 h-3.5" />}
          label="AstrePilot Autofills"
          value={stats.astrepilot}
          note="form automations logged"
          blue
        />
        <TelemetryCell
          icon={<Clock className="w-3.5 h-3.5" />}
          label="In-Flight"
          value={stats.inFlight}
          note="in active review"
        />
        <TelemetryCell
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          label="Quiet Attention"
          value={stats.quietAlerts}
          note="5+ days without update"
          amber
        />
        <TelemetryCell
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Offers"
          value={stats.offers}
          note="pipeline victories"
          green
        />
      </div>

      {/* ── Filters and Search Toolbar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, title, or link..."
              className="ce-field !min-h-8 pl-8 pr-3 text-[11px] rounded-md"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="ce-button-quiet !min-h-8 !px-2 text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)] mr-1">
            Filter:
          </span>
          {(
            [
              { id: "ALL", label: `All (${applications.length})` },
              { id: "ASTREPILOT", label: `⚡ AstrePilot (${stats.astrepilot})` },
              { id: "IN_FLIGHT", label: `In-Flight (${stats.inFlight})` },
              { id: "QUIET", label: `Quiet (${stats.quietAlerts})` },
              { id: "OFFER", label: `Offers (${stats.offers})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStage(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                filterStage === tab.id
                  ? "bg-[var(--blue)] text-white shadow-2xs font-semibold"
                  : "bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toast for TSV Copy ─────────────────────────────────────────── */}
      {copiedTsv && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--ink)] text-white text-[11px] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
          <span>Table copied to clipboard! Paste directly into Google Sheets or Excel.</span>
        </div>
      )}

      {/* ── Main Content: Table View OR Kanban View ─────────────────────── */}
      {viewMode === "table" ? (
        /* ══════════════════════════════════════════════════════════════════ */
        /* STRUCTURED DETAILED TABLE REPORT (Tier-1 Spreadsheet)             */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 bg-[var(--surface)] rounded-lg border border-[var(--line)] shadow-2xs overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-[12px] text-[var(--muted)]">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--blue)] mr-2" />
              Loading structured application report...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--blue-soft)] text-[var(--blue)] mb-3">
                <Briefcase className="w-4 h-4" />
              </span>
              <b className="text-[13px] font-bold text-[var(--ink)] tracking-[-.02em]">
                No applications found
              </b>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)] max-w-sm">
                {searchTerm || filterStage !== "ALL"
                  ? "No applications matched your active search or filter criteria."
                  : "Autofill application forms with AstrePilot or track jobs directly from the AstreWork Feed."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--surface-muted)] border-b border-[var(--line)] font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)] z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Position / Role</th>
                    <th className="py-2.5 px-3">Date Applied</th>
                    <th className="py-2.5 px-3">Application Form</th>
                    <th className="py-2.5 px-3">Engine / Source</th>
                    <th className="py-2.5 px-3">Stage / Status</th>
                    <th className="py-2.5 px-3">Days Silent</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] font-normal">
                  {filteredApps.map((app, idx) => {
                    const isNeedsAttention =
                      app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
                    const isAstrePilot = app.source?.includes("AstrePilot");
                    const initials = app.company.slice(0, 2).toUpperCase();

                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-[var(--surface-muted)]/60 transition-colors group"
                      >
                        {/* Sl No. */}
                        <td className="py-2.5 px-3 text-center font-mono text-[10px] text-[var(--muted)]">
                          {idx + 1}
                        </td>

                        {/* Company Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-[var(--blue-soft)] font-mono text-[9px] font-bold text-[var(--blue)]">
                              {initials}
                            </span>
                            <span className="font-bold text-[12px] text-[var(--ink)] truncate max-w-[150px]" title={app.company}>
                              {app.company}
                            </span>
                          </div>
                        </td>

                        {/* Position / Role Title */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[11px] text-[var(--ink)] truncate max-w-[190px]" title={app.title}>
                              {app.title}
                            </span>
                            {app.atsExtractabilityScore && (
                              <span
                                className="ce-chip ce-chip-blue !min-h-4 !px-1.5 !text-[8px]"
                                title={`ATS Score: ${app.atsExtractabilityScore}`}
                              >
                                {app.atsExtractabilityScore}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date Applied */}
                        <td className="py-2.5 px-3 font-mono text-[10px] text-[var(--muted)] whitespace-nowrap">
                          <span title={app.appliedDateFull || app.appliedDate}>
                            {app.appliedDate}
                          </span>
                        </td>

                        {/* Application Form Link */}
                        <td className="py-2.5 px-3">
                          {app.jobUrl ? (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:underline"
                              title={app.jobUrl}
                            >
                              <span>Open Form</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[var(--muted)] text-[10px]">—</span>
                          )}
                        </td>

                        {/* Engine / Source */}
                        <td className="py-2.5 px-3">
                          {isAstrePilot ? (
                            <span className="ce-chip ce-chip-blue whitespace-nowrap">
                              <Zap className="w-2.5 h-2.5 fill-[var(--blue)]" />
                              <span>AstrePilot</span>
                              {app.fieldsFilled != null && (
                                <span className="font-mono font-bold">
                                  ({app.fieldsFilled}/{app.fieldsTotal || app.fieldsFilled})
                                </span>
                              )}
                              {app.hasAiAnswers && (
                                <span className="ml-0.5 px-1 rounded bg-[var(--blue)] text-white text-[8px] font-bold">
                                  AI
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="ce-chip whitespace-nowrap">
                              {app.source || "Direct Portal"}
                            </span>
                          )}
                        </td>

                        {/* Status (Interactive dropdown & Confirmation Badge) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={app.status}
                              onChange={(e) => updateStatus(app.id, e.target.value)}
                              className="text-[10px] font-semibold border border-[var(--line)] rounded px-2 py-0.5 bg-[var(--surface)] hover:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] shadow-2xs text-[var(--ink)]"
                            >
                              {STATUS_COLUMNS.map((col) => (
                                <option key={col.id} value={col.id}>
                                  {col.label}
                                </option>
                              ))}
                            </select>

                            {/* Unconfirmed Pill */}
                            {app.confirmed === false && (
                              <button
                                onClick={() => confirmApplication(app.id)}
                                className="ce-chip ce-chip-amber hover:opacity-90 transition-opacity !cursor-pointer"
                                title="Click to confirm this autofill was officially submitted"
                              >
                                <Check className="w-2.5 h-2.5 text-[var(--amber)]" />
                                <span>Confirm</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Days Silent */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`ce-chip ${isNeedsAttention ? "ce-chip-amber" : ""}`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {app.daysSilent > 0 ? `${app.daysSilent}d silent` : "Today"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openFollowupModal(app)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                isNeedsAttention
                                  ? "bg-[var(--amber-soft)] text-[var(--amber)] hover:bg-[var(--amber-soft)]/80"
                                  : "bg-[var(--blue-soft)] text-[var(--blue)] hover:bg-[var(--blue-soft)]/80"
                              }`}
                              title="Draft AI follow-up email"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{isNeedsAttention ? "Nudge" : "Follow-up"}</span>
                            </button>

                            <button
                              onClick={() => deleteApplication(app.id)}
                              className="p-1 rounded text-[var(--muted)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors"
                              title="Delete tracked application"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════ */
        /* VISUAL KANBAN PIPELINE VIEW (Tier-1 Visual Ergonomics)             */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 overflow-x-auto p-3 bg-[var(--surface-muted)]/50 rounded-lg border border-[var(--line)]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-[12px] text-[var(--muted)]">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--blue)] mr-2" />
              Loading pipeline applications...
            </div>
          ) : (
            <div className="flex h-full gap-3 min-w-max">
              {STATUS_COLUMNS.map((col) => {
                const colApps = filteredApps.filter((app) => app.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="w-72 flex flex-col bg-[var(--surface)] rounded-lg border border-[var(--line)] shadow-2xs"
                  >
                    <div className="px-3 py-2 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-muted)] rounded-t-lg">
                      <h3 className="font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">
                        {col.label}
                      </h3>
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)]">
                        {colApps.length}
                      </span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[220px]">
                      {colApps.map((app) => {
                        const isNeedsAttention =
                          app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
                        const isAstrePilot = app.source?.includes("AstrePilot");

                        return (
                          <div
                            key={app.id}
                            className="p-2.5 bg-[var(--surface)] border border-[var(--line)] rounded-md shadow-2xs hover:border-[var(--blue)] transition-colors group space-y-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-[12px] text-[var(--ink)] truncate" title={app.company}>
                                  {app.company}
                                </div>
                                <div className="text-[11px] text-[var(--muted)] line-clamp-1" title={app.title}>
                                  {app.title}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteApplication(app.id)}
                                className="text-[var(--muted)] hover:text-[var(--red)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                title="Delete tracked application"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* AstrePilot Telemetry Badge */}
                            {isAstrePilot && (
                              <div className="ce-chip ce-chip-blue">
                                <Zap className="w-2.5 h-2.5 fill-[var(--blue)]" />
                                <span>AstrePilot Filled</span>
                                {app.fieldsFilled != null && (
                                  <span>
                                    ({app.fieldsFilled}/{app.fieldsTotal || app.fieldsFilled})
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-[10px] text-[var(--muted)] flex justify-between items-center pt-1 border-t border-[var(--line)]">
                              <span
                                className={`flex items-center gap-1 font-mono ${
                                  isNeedsAttention ? "text-[var(--amber)] font-bold" : "text-[var(--muted)]"
                                }`}
                                title={`Applied on: ${app.appliedDate}`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {app.daysSilent > 0 ? `${app.daysSilent}d silent` : "Today"}
                              </span>
                              {app.atsExtractabilityScore && (
                                <span className="ce-chip ce-chip-blue !min-h-4 !px-1.5 !text-[8px]">
                                  ATS: {app.atsExtractabilityScore}
                                </span>
                              )}
                            </div>

                            {/* Quick Follow-up & Action Row */}
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <button
                                onClick={() => openFollowupModal(app)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                                  isNeedsAttention
                                    ? "bg-[var(--amber-soft)] text-[var(--amber)] hover:bg-[var(--amber-soft)]/80"
                                    : "bg-[var(--blue-soft)] text-[var(--blue)] hover:bg-[var(--blue-soft)]/80"
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {isNeedsAttention ? "Nudge" : "Follow-up"}
                              </button>

                              {app.jobUrl && (
                                <a
                                  href={app.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 border border-[var(--line)] rounded text-[var(--muted)] hover:text-[var(--blue)] hover:border-[var(--blue)] transition-colors"
                                  title="Open original job posting"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {/* Stage Transition Selector */}
                            <div className="pt-0.5">
                              <select
                                className="text-[10px] font-semibold border border-[var(--line)] rounded px-1.5 py-0.5 w-full bg-[var(--surface-muted)] hover:bg-[var(--surface)] text-[var(--ink)] focus:outline-none"
                                value={app.status}
                                onChange={(e) => updateStatus(app.id, e.target.value)}
                              >
                                {STATUS_COLUMNS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    Stage: {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                      {colApps.length === 0 && (
                        <div className="text-center py-6 text-[10px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-md">
                          No applications
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Follow-up Studio Interactive Modal ────────────────────────────── */}
      {followupApp && (
        <div className="ce-drawer-backdrop" role="dialog" aria-modal="true">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--line)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="ce-chip ce-chip-blue">
                    ⚡ FOLLOW-UP STUDIO
                  </span>
                  {followupApp.daysSilent >= 5 && (
                    <span className="ce-chip ce-chip-amber">
                      {followupApp.daysSilent} DAYS SILENT
                    </span>
                  )}
                </div>
                <h2 className="text-[16px] font-bold tracking-[-.03em] text-[var(--ink)] mt-2">
                  Follow-up with {followupApp.company}
                </h2>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{followupApp.title}</p>
              </div>
              <button
                onClick={() => setFollowupApp(null)}
                className="ce-button-quiet !min-h-7 !px-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tone Selector Pills */}
            <div className="space-y-1.5">
              <label className="font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">
                Select Tone / Intent:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "nudge", label: "Gentle Nudge", desc: "Friendly 1-week check-in" },
                  { id: "project_update", label: "Project Update", desc: "Share new code / milestone" },
                  { id: "referral", label: "Internal Inquiry", desc: "Reach out to recruiter" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeFollowupTone(t.id as any)}
                    className={`p-2.5 rounded-md border text-left transition-all ${
                      followupTone === t.id
                        ? "border-[var(--blue)] bg-[var(--blue-soft)] shadow-2xs"
                        : "border-[var(--line)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[var(--ink)]">{t.label}</div>
                    <div className="text-[9px] text-[var(--muted)] mt-0.5 leading-snug">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generated Content Area */}
            {isGeneratingFollowup ? (
              <div className="h-40 flex flex-col items-center justify-center space-y-2 bg-[var(--surface-muted)] rounded-md border border-dashed border-[var(--line)]">
                <Sparkles className="w-5 h-5 text-[var(--blue)] animate-spin" />
                <span className="text-[11px] text-[var(--muted)]">Crafting tailored follow-up draft...</span>
              </div>
            ) : followupDraft ? (
              <div className="space-y-3">
                <div className="p-3 bg-[var(--surface-muted)] rounded-md border border-[var(--line)] space-y-2">
                  <div className="text-[11px]">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">Subject: </span>
                    <span className="font-bold text-[var(--ink)]">{followupDraft.subject}</span>
                  </div>
                  <div className="border-t border-[var(--line)] pt-2 text-[11px] text-[var(--ink-soft)] whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto font-sans">
                    {followupDraft.body}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => copyToClipboard(followupDraft.fullDraft)}
                    className="ce-button-secondary !min-h-8 !px-3 !text-[11px] flex items-center gap-1.5"
                  >
                    {copiedFollowup ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--green)]" />
                        <span className="text-[var(--green)] font-bold">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Full Draft</span>
                      </>
                    )}
                  </button>

                  <a
                    href={followupDraft.mailtoUrl}
                    className="ce-button-primary !min-h-8 !px-3 !text-[11px] flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Email App</span>
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** ── Segmented Telemetry Metric Cell ─────────────────────────────────────── */
function TelemetryCell({
  icon,
  label,
  value,
  note,
  blue,
  amber,
  green,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
  blue?: boolean;
  amber?: boolean;
  green?: boolean;
}) {
  const iconColor = blue
    ? "bg-[var(--blue-soft)] text-[var(--blue)]"
    : amber
    ? "bg-[var(--amber-soft)] text-[var(--amber)]"
    : green
    ? "bg-[var(--green-soft)] text-[var(--green)]"
    : "bg-[var(--surface-muted)] text-[var(--muted)]";

  return (
    <div className="flex min-h-20 items-center gap-3 p-3.5 transition-colors hover:bg-[var(--surface-muted)]/50">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${iconColor}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block font-mono text-[8px] font-bold uppercase tracking-[.12em] text-[var(--muted)] truncate">
          {label}
        </span>
        <strong className="mt-1 block text-[22px] font-bold leading-none tracking-[-.05em] text-[var(--ink)]">
          {value}
        </strong>
        <small className="mt-1.5 block text-[9px] text-[var(--muted)] truncate">{note}</small>
      </div>
    </div>
  );
}

