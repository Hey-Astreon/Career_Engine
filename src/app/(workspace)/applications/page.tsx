"use client";

import React, { useEffect, useState } from "react";
import { useProfileStore } from "@/store/useProfileStore";
import { Briefcase, ExternalLink, RefreshCw, Trash2 } from "lucide-react";

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
  const { activeProfileSlug, activeProfile } = useProfileStore();
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/applications?profileSlug=${activeProfileSlug}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplications();
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

  return (
    <div className="flex h-full flex-col">
      <div className="ce-action-bar">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[var(--blue)]" />
          Application Pipeline Tracker
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchApplications} className="ce-btn ce-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 bg-gray-50/30">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">Loading applications...</div>
        ) : (
          <div className="flex h-full gap-4 min-w-max">
            {STATUS_COLUMNS.map((col) => {
              const colApps = applications.filter((app) => app.status === col.id);
              return (
                <div key={col.id} className="w-80 flex flex-col bg-white rounded-lg border border-[var(--line)] shadow-sm">
                  <div className="p-3 border-b border-[var(--line)] flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{col.label}</h3>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">
                      {colApps.length}
                    </span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
                    {colApps.map((app) => (
                      <div key={app.id} className="p-3 bg-white border border-[var(--line)] rounded-md shadow-sm hover:border-[var(--blue)] transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm">{app.company}</div>
                            <div className="text-xs text-gray-500 line-clamp-1" title={app.title}>{app.title}</div>
                          </div>
                          <button onClick={() => deleteApplication(app.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between mt-3 items-center">
                          <span title={`Applied: ${app.appliedDate}`}>
                            {app.daysSilent > 0 ? `${app.daysSilent}d ago` : "Today"}
                          </span>
                          {app.atsExtractabilityScore && (
                            <span className="bg-[var(--blue-light)] text-[var(--blue)] px-1.5 py-0.5 rounded font-mono">
                              ATS: {app.atsExtractabilityScore}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex gap-1">
                          <select 
                            className="text-xs border border-gray-200 rounded p-1 w-full bg-gray-50"
                            value={app.status}
                            onChange={(e) => updateStatus(app.id, e.target.value)}
                          >
                            {STATUS_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                          {app.jobUrl && (
                            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="p-1 border border-gray-200 rounded text-gray-500 hover:text-[var(--blue)] flex items-center justify-center">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {colApps.length === 0 && (
                      <div className="text-center p-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-md">
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
    </div>
  );
}
