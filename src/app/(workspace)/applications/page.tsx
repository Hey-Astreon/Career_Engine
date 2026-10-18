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
  Mail,
  AlertCircle,
  Trophy,
} from "lucide-react";

interface TrackedApplication {
  id: string;
  company: string;
  title: string;
  status: string;
  appliedDate: string;
  daysSilent: number;
  jobUrl: string;
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

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<"ALL" | "IN_FLIGHT" | "QUIET" | "OFFER">("ALL");

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

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/applications?profileSlug=${activeProfileSlug || "roushan"}`);
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
        const res = await fetch(`/api/applications?profileSlug=${activeProfileSlug || "roushan"}`);
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

  const deleteApplication = async (appId: string) => {
    if (!window.confirm("Remove this tracked application?")) return;
    try {
      const res = await fetch(`/api/applications?id=${appId}`, { method: "DELETE" });
      if (res.ok) fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  // Follow-up Draft generation
  const openFollowupModal = async (app: TrackedApplication, initialTone: "nudge" | "project_update" | "referral" = "nudge") => {
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

  // Summary Telemetry
  const stats = useMemo(() => {
    const total = applications.length;
    const inFlight = applications.filter((a) =>
      ["SHORTLISTED", "APPLIED", "SCREENING", "TECHNICAL_ROUND"].includes(a.status)
    ).length;
    const quietAlerts = applications.filter(
      (a) => a.status === "QUIET" || (a.status === "APPLIED" && a.daysSilent >= 5)
    ).length;
    const offers = applications.filter((a) => a.status === "OFFER").length;
    return { total, inFlight, quietAlerts, offers };
  }, [applications]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Search query
      if (
        searchTerm &&
        !app.company.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !app.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Stage filter
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
      {/* Top Header & Telemetry */}
      <div className="ce-action-bar flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-[var(--line)] rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-[var(--ink)]">
            <Briefcase className="w-5 h-5 text-[var(--blue)]" />
            Application Pipeline Tracker
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Monitor pipeline velocity, track silence intervals, and dispatch automated follow-up nudges.
          </p>
        </div>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-[var(--line)] text-xs font-medium flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Total: <strong>{stats.total}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs font-medium text-blue-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>In-Flight: <strong>{stats.inFlight}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Quiet Attention: <strong>{stats.quietAlerts}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span>Offers: <strong>{stats.offers}</strong></span>
          </div>
          <button onClick={fetchApplications} className="ce-btn ce-btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company or title..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[var(--line)] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
          </div>
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--muted)] font-medium mr-1">Filter:</span>
          {(
            [
              { id: "ALL", label: `All (${applications.length})` },
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
                  : "bg-white border border-[var(--line)] text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board Columns */}
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
                <div key={col.id} className="w-80 flex flex-col bg-white rounded-xl border border-[var(--line)] shadow-xs">
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
                      const isNeedsAttention = app.status === "QUIET" || (app.status === "APPLIED" && app.daysSilent >= 5);
                      return (
                        <div
                          key={app.id}
                          className="p-3 bg-white border border-[var(--line)] rounded-lg shadow-2xs hover:border-[var(--blue)] transition-colors group space-y-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-sm text-[var(--ink)]">{app.company}</div>
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

      {/* Follow-up Studio Interactive Modal */}
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
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Follow-up Strategy / Tone:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "nudge" as const,
                    label: "Gentle Check-in",
                    desc: "Polite status check after quiet days",
                  },
                  {
                    id: "project_update" as const,
                    label: "Technical Update",
                    desc: "Share recent code & project proof",
                  },
                  {
                    id: "referral" as const,
                    label: "Team Referral",
                    desc: "Ask for engineering lead connect",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeFollowupTone(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      followupTone === t.id
                        ? "border-[var(--blue)] bg-blue-50/50 shadow-2xs"
                        : "border-[var(--line)] hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--ink)]">{t.label}</div>
                    <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-tight">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Draft Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Generated Email Draft:</label>
                {followupDraft?.subject && (
                  <span className="text-[11px] text-[var(--muted)] font-mono truncate max-w-xs">
                    {followupDraft.subject}
                  </span>
                )}
              </div>

              {isGeneratingFollowup ? (
                <div className="h-44 border border-[var(--line)] rounded-lg bg-gray-50 flex items-center justify-center text-xs text-[var(--muted)]">
                  Generating tailored follow-up draft...
                </div>
              ) : (
                <textarea
                  value={followupDraft?.fullDraft || ""}
                  onChange={(e) =>
                    setFollowupDraft((prev) => (prev ? { ...prev, fullDraft: e.target.value } : null))
                  }
                  rows={9}
                  className="w-full text-xs font-mono p-3 border border-[var(--line)] rounded-lg bg-gray-50/40 text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] focus:bg-white resize-none"
                />
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <button
                onClick={() => setFollowupApp(null)}
                className="ce-btn ce-btn-secondary text-xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {followupDraft?.mailtoUrl && (
                  <a
                    href={followupDraft.mailtoUrl}
                    className="ce-btn ce-btn-secondary text-xs flex items-center gap-1.5 text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Open in Mail
                  </a>
                )}
                <button
                  onClick={() => followupDraft && copyToClipboard(followupDraft.fullDraft)}
                  className="ce-btn ce-btn-primary text-xs flex items-center gap-1.5"
                >
                  {copiedFollowup ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied Draft!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
