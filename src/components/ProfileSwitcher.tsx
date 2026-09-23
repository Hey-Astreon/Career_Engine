"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { UserCheck, ChevronDown, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function getInitials(name: string): string {
  if (!name) return "CA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileSwitcher() {
  const {
    activeProfileSlug,
    activeProfile,
    allProfiles,
    setAllProfiles,
    setActiveProfileSlug,
  } = useProfileStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch("/api/profiles");
        const data = await res.json();
        if (data.success && data.profiles?.length) {
          setAllProfiles(data.profiles);
          // If the user owns a profile, auto-select it if not already selected
          if (data.userProfileSlug) {
            setActiveProfileSlug(data.userProfileSlug);
          }
        }
      } catch (error) {
        console.error("Failed to load profiles:", error);
      }
    }
    fetchProfiles();
  }, [setAllProfiles, setActiveProfileSlug]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    setActiveProfileSlug(slug);
    setIsOpen(false);
  };

  const activeInitials = activeProfile
    ? getInitials(activeProfile.fullName)
    : activeProfileSlug === "roushan"
    ? "RK"
    : activeProfileSlug === "ayushi"
    ? "AR"
    : "CA";

  const isUserOwned = Boolean((activeProfile as any)?.isOwner);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-left shadow-sm transition-all hover:border-[var(--blue)] focus:outline-none"
        aria-label="Switch candidate profile"
      >
        <span
          className={`grid h-6 w-6 place-items-center rounded font-mono text-[9px] font-bold ${
            isUserOwned
              ? "bg-[var(--green-soft)] text-[var(--green)]"
              : "bg-[var(--blue-soft)] text-[var(--blue)]"
          }`}
        >
          {activeInitials}
        </span>
        <span className="hidden sm:block">
          <b className="block max-w-36 truncate text-[11px] font-bold text-[var(--ink)] leading-tight">
            {activeProfile?.fullName || "Candidate Context"}
          </b>
          <small className="block mt-0.5 font-mono text-[7px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {isUserOwned ? "YOUR PROFILE" : "CANDIDATE CONTEXT"}
          </small>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_20px_50px_rgba(21,35,56,.18)] animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-[8px] font-bold tracking-[.12em] text-[var(--muted)]">
            <span>SWITCH CANDIDATE CONTEXT</span>
            <span>{allProfiles.length} PROFILES</span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
            {allProfiles.map((p) => {
              const isSelected = activeProfileSlug === p.slug;
              const isOwner = Boolean((p as any).isOwner);
              const isTemplate = Boolean((p as any).isTemplate);
              const initials = getInitials(p.fullName);

              return (
                <button
                  key={p.slug}
                  onClick={() => handleSelect(p.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-muted)] ${
                    isSelected ? "bg-[var(--blue-soft)]" : ""
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded font-mono text-[9px] font-bold ${
                        isOwner
                          ? "bg-[var(--green-soft)] text-[var(--green)]"
                          : "bg-[var(--surface-muted)] text-[var(--ink)]"
                      }`}
                    >
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <b className="truncate text-[11px] font-bold text-[var(--ink)]">
                          {p.fullName}
                        </b>
                        {isOwner && (
                          <span className="shrink-0 rounded bg-[var(--green-soft)] px-1 py-0.2 font-mono text-[7px] font-bold text-[var(--green)]">
                            YOU
                          </span>
                        )}
                        {isTemplate && (
                          <span className="shrink-0 rounded bg-[var(--surface-muted)] px-1 py-0.2 font-mono text-[7px] font-semibold text-[var(--muted)]">
                            TEMPLATE
                          </span>
                        )}
                      </span>
                      <small className="mt-0.5 block truncate text-[9px] text-[var(--muted)]">
                        {p.title}
                      </small>
                    </span>
                  </span>
                  {isSelected && (
                    <UserCheck className="h-4 w-4 shrink-0 text-[var(--blue)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

