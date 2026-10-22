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
    <div className="flex h-full flex-col space-y-4">
      {/* ── Top Header & Telemetry ────────────────────────────────────────── */}
      <div className="ce-action-bar flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-[var(--line)] rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2 text-[var(--ink)]">
              <Briefcase className="w-5 h-5 text-[var(--blue)]" />
              Application Pipeline &amp; AstrePilot Tracker
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[var(--blue)] border border-blue-200">
              Live Tracker
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Structured tracking report of every remote opportunity form applied via AstrePilot or tracked manually.
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-[var(--line)]">
            <button
              onClick={() => handleSetViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-[var(--ink)] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Structured Detailed Table Report"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Detailed Table</span>
            </button>
            <button
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-[var(--ink)] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
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
              className="ce-btn ce-btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-[var(--line)] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--line)]/60 mb-1">
                    Spreadsheet &amp; Data Exports
                  </div>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Download CSV (.csv)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Excel &amp; Google Sheets ready (UTF-8 BOM)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <div>
                      <div>Download Excel (.xls)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Pre-styled Excel worksheet</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("xml")}
                    className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <div>
                      <div>Download XML (.xml)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Semantic XML data schema</div>
                    </div>
                  </button>
                  <div className="border-t border-[var(--line)]/60 my-1" />
                  <button
                    onClick={handleCopyTsv}
                    className="w-full text-left px-2.5 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-blue-50 hover:text-[var(--blue)] rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-[var(--blue)]" />
                    <div>
                      <div>Copy as TSV (Clipboard)</div>
                      <div className="text-[10px] text-gray-400 font-normal">Ctrl+V paste into Sheets or Excel</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={fetchApplications}
            className="ce-btn ce-btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh application data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Telemetry Stats Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white border border-[var(--line)] rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Total Applications</div>
            <div className="text-base font-extrabold text-[var(--ink)]">{stats.total}</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-blue-200/70 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[var(--blue)] flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue)]">AstrePilot Autofills</div>
            <div className="text-base font-extrabold text-[var(--blue)]">{stats.astrepilot}</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-[var(--line)] rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">In-Flight</div>
            <div className="text-base font-extrabold text-[var(--ink)]">{stats.inFlight}</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-amber-200/80 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Quiet Attention</div>
            <div className="text-base font-extrabold text-amber-800">{stats.quietAlerts}</div>
          </div>
        </div>

        <div className="p-3 bg-white border border-emerald-200/80 rounded-xl shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Offers</div>
            <div className="text-base font-extrabold text-emerald-800">{stats.offers}</div>
          </div>
        </div>
      </div>

      {/* ── Filters and Search Controls ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, title, or link..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[var(--line)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--blue)] shadow-2xs"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-[var(--muted)] font-medium mr-1">Filter:</span>
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
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterStage === tab.id
                  ? "bg-[var(--blue)] text-white shadow-xs"
                  : "bg-white border border-[var(--line)] text-gray-600 hover:bg-gray-50 shadow-2xs"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toast for TSV Copy ─────────────────────────────────────────── */}
      {copiedTsv && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Table copied to clipboard! Paste directly into Google Sheets or Excel.</span>
        </div>
      )}

      {/* ── Main Content: Table View OR Kanban View ─────────────────────── */}
      {viewMode === "table" ? (
        /* ══════════════════════════════════════════════════════════════════ */
        /* STRUCTURED DETAILED TABLE REPORT                                  */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 bg-white rounded-xl border border-[var(--line)] shadow-xs overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
              Loading structured application report...
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <Briefcase className="w-10 h-10 text-gray-300" />
              <div className="text-sm font-semibold text-[var(--ink)]">No applications found</div>
              <p className="text-xs text-[var(--muted)] max-w-sm">
                {searchTerm || filterStage !== "ALL"
                  ? "No applications matched your filter criteria."
                  : "Autofill application forms with AstrePilot or track jobs directly from the AstreWork Feed."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-xs border-b border-[var(--line)] text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Position / Role</th>
                    <th className="py-3 px-4">Date of Apply</th>
                    <th className="py-3 px-4">Application Form</th>
                    <th className="py-3 px-4">Engine / Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Days Silent</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal">
                  {filteredApps.map((app, idx) => {
                    const isNeedsAttention =
                      app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
                    const isAstrePilot = app.source?.includes("AstrePilot");
                    const initials = app.company.slice(0, 2).toUpperCase();

                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        {/* Sl No. */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-gray-500">
                          {idx + 1}
                        </td>

                        {/* Company Name */}
                        <td className="py-3 px-4 font-semibold text-[var(--ink)]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 border border-[var(--line)] flex items-center justify-center font-bold text-[10px] text-gray-700 flex-shrink-0">
                              {initials}
                            </div>
                            <span className="truncate max-w-[150px]" title={app.company}>
                              {app.company}
                            </span>
                          </div>
                        </td>

                        {/* Position / Role Title */}
                        <td className="py-3 px-4 font-medium text-[var(--ink)]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[180px]" title={app.title}>
                              {app.title}
                            </span>
                            {app.atsExtractabilityScore && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[var(--blue)] border border-blue-200/60"
                                title={`ATS Score: ${app.atsExtractabilityScore}`}
                              >
                                {app.atsExtractabilityScore}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date Applied */}
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          <div title={app.appliedDateFull || app.appliedDate}>
                            {app.appliedDate}
                          </div>
                        </td>

                        {/* Application Form Link */}
                        <td className="py-3 px-4">
                          {app.jobUrl ? (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 hover:bg-blue-50 text-[var(--blue)] hover:text-blue-700 border border-gray-200 hover:border-blue-200 text-[11px] font-medium transition-colors"
                              title={app.jobUrl}
                            >
                              <span>Open Form</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Engine / Source */}
                        <td className="py-3 px-4">
                          {isAstrePilot ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[var(--blue)] text-[11px] font-semibold whitespace-nowrap">
                              <Zap className="w-3 h-3 fill-[var(--blue)]" />
                              <span>AstrePilot</span>
                              {app.fieldsFilled != null && (
                                <span className="font-mono font-bold">
                                  ({app.fieldsFilled}/{app.fieldsTotal || app.fieldsFilled})
                                </span>
                              )}
                              {app.hasAiAnswers && (
                                <span className="ml-0.5 px-1 rounded bg-blue-600 text-white text-[9px] font-bold">
                                  AI
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200 whitespace-nowrap">
                              {app.source || "Direct Portal"}
                            </span>
                          )}
                        </td>

                        {/* Status (Interactive dropdown & Confirmation Badge) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={app.status}
                              onChange={(e) => updateStatus(app.id, e.target.value)}
                              className="text-xs font-semibold border border-[var(--line)] rounded-md px-2 py-1 bg-white hover:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] shadow-2xs"
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
                                className="px-1.5 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Click to confirm this autofill was officially submitted"
                              >
                                <Check className="w-3 h-3 text-amber-600" />
                                <span>Confirm</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Days Silent */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              isNeedsAttention
                                ? "bg-amber-100 text-amber-800 font-semibold"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {app.daysSilent > 0 ? `${app.daysSilent}d silent` : "Applied today"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openFollowupModal(app)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                isNeedsAttention
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-blue-50 text-[var(--blue)] hover:bg-blue-100"
                              }`}
                              title="Draft AI follow-up email"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{isNeedsAttention ? "⚡ Nudge" : "Follow-up"}</span>
                            </button>

                            <button
                              onClick={() => deleteApplication(app.id)}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
        /* VISUAL KANBAN PIPELINE VIEW                                       */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 overflow-x-auto p-4 bg-gray-50/50 rounded-xl border border-[var(--line)]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
              Loading pipeline applications...
            </div>
          ) : (
            <div className="flex h-full gap-4 min-w-max">
              {STATUS_COLUMNS.map((col) => {
                const colApps = filteredApps.filter((app) => app.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="w-80 flex flex-col bg-white rounded-xl border border-[var(--line)] shadow-xs"
                  >
                    <div className="p-3 border-b border-[var(--line)] flex justify-between items-center bg-gray-50/60 rounded-t-xl">
                      <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                        {col.label}
                      </h3>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono font-medium">
                        {colApps.length}
                      </span>
                    </div>
                    <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[220px]">
                      {colApps.map((app) => {
                        const isNeedsAttention =
                          app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
                        const isAstrePilot = app.source?.includes("AstrePilot");

                        return (
                          <div
                            key={app.id}
                            className="p-3 bg-white border border-[var(--line)] rounded-lg shadow-2xs hover:border-[var(--blue)] transition-colors group space-y-2.5"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold text-sm text-[var(--ink)]">
                                  {app.company}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-1" title={app.title}>
                                  {app.title}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteApplication(app.id)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                title="Delete tracked application"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* AstrePilot Telemetry Badge */}
                            {isAstrePilot && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[var(--blue)] text-[10px] font-semibold">
                                <Zap className="w-3 h-3 fill-[var(--blue)]" />
                                <span>AstrePilot Filled</span>
                                {app.fieldsFilled != null && (
                                  <span>
                                    ({app.fieldsFilled}/{app.fieldsTotal})
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-gray-500 flex justify-between items-center pt-1 border-t border-gray-100">
                              <span
                                className={`flex items-center gap-1 ${
                                  isNeedsAttention ? "text-amber-700 font-semibold" : "text-gray-500"
                                }`}
                                title={`Applied on: ${app.appliedDate}`}
                              >
                                <Clock className="w-3 h-3" />
                                {app.daysSilent > 0 ? `${app.daysSilent}d silent` : "Applied today"}
                              </span>
                              {app.atsExtractabilityScore && (
                                <span className="bg-[var(--blue-light)] text-[var(--blue)] px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                                  ATS: {app.atsExtractabilityScore}
                                </span>
                              )}
                            </div>

                            {/* Quick Follow-up & Action Row */}
                            <div className="flex items-center justify-between gap-1 pt-1">
                              <button
                                onClick={() => openFollowupModal(app)}
                                className={`text-[11px] font-semibold px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                                  isNeedsAttention
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    : "bg-blue-50 text-[var(--blue)] hover:bg-blue-100"
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                {isNeedsAttention ? "⚡ Send Nudge" : "Draft Follow-up"}
                              </button>

                              {app.jobUrl && (
                                <a
                                  href={app.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 border border-gray-200 rounded text-gray-500 hover:text-[var(--blue)] hover:border-[var(--blue)] transition-colors"
                                  title="Open original job posting"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {/* Stage Transition Selector */}
                            <div className="pt-1">
                              <select
                                className="text-xs border border-gray-200 rounded p-1 w-full bg-gray-50 hover:bg-white text-gray-700 focus:outline-none"
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
                        <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-[var(--line)] shadow-xl max-w-xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--line)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--blue)] bg-blue-50 px-2 py-0.5 rounded">
                    ⚡ Follow-up Studio
                  </span>
                  {followupApp.daysSilent >= 5 && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {followupApp.daysSilent} Days Silent
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-[var(--ink)] mt-1">
                  Follow-up with {followupApp.company}
                </h2>
                <p className="text-xs text-[var(--muted)]">{followupApp.title}</p>
              </div>
              <button
                onClick={() => setFollowupApp(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tone Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink)]">Select Tone / Intent:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "nudge", label: "Gentle Nudge", desc: "Friendly 1-week check-in" },
                  { id: "project_update", label: "Project Update", desc: "Share new code / milestone" },
                  { id: "referral", label: "Internal Inquiry", desc: "Reach out to recruiter" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeFollowupTone(t.id as any)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      followupTone === t.id
                        ? "border-[var(--blue)] bg-blue-50/50 shadow-xs"
                        : "border-[var(--line)] hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--ink)]">{t.label}</div>
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generated Content Area */}
            {isGeneratingFollowup ? (
              <div className="h-44 flex flex-col items-center justify-center space-y-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Sparkles className="w-6 h-6 text-[var(--blue)] animate-spin" />
                <span className="text-xs text-[var(--muted)]">Crafting tailored follow-up draft...</span>
              </div>
            ) : followupDraft ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-[var(--line)] space-y-2">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-500">Subject: </span>
                    <span className="font-medium text-[var(--ink)]">{followupDraft.subject}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {followupDraft.body}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => copyToClipboard(followupDraft.fullDraft)}
                    className="ce-btn ce-btn-secondary text-xs flex items-center gap-1.5"
                  >
                    {copiedFollowup ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied to Clipboard!</span>
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
                    className="ce-btn ce-btn-primary text-xs flex items-center gap-1.5"
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
