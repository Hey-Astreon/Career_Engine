"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useProfileStore } from "@/store/useProfileStore";
import { ProfileEditModal } from "./ProfileEditModal";
import {
  User,
  LogOut,
  Settings,
  Sparkles,
  Briefcase,
  FileText,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

export function UserAccountMenu() {
  const { data: session, status } = useSession();
  const { activeProfile } = useProfileStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--surface-muted)]" />
    );
  }

  const displayName =
    activeProfile?.fullName ||
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Candidate";

  const email = session?.user?.email || activeProfile?.email || "";
  const headline = activeProfile?.title || "Remote Candidate";

  // Derive initials
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 pl-2 text-left shadow-sm transition-all hover:border-[var(--blue)] focus:outline-none"
        aria-label="User account menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ink)] font-mono text-[10px] font-bold text-white shadow-sm">
          {initials}
        </span>
        <div className="hidden text-left md:block">
          <span className="block max-w-[130px] truncate text-[11px] font-bold text-[var(--ink)] leading-tight">
            {displayName}
          </span>
          <span className="block max-w-[130px] truncate text-[9px] text-[var(--muted)] leading-tight">
            {email}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_20px_50px_rgba(21,35,56,.18)] animate-in fade-in zoom-in-95 duration-100">
          {/* Header Card */}
          <div className="border-b border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ink)] font-mono text-[12px] font-bold text-white shadow-md">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <b className="truncate text-[13px] font-bold text-[var(--ink)]">
                    {displayName}
                  </b>
                  <span className="inline-flex items-center rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--green)]">
                    PRO
                  </span>
                </div>
                <p className="truncate text-[10px] text-[var(--muted)]">{email}</p>
                <p className="mt-1 line-clamp-1 text-[10px] font-medium text-[var(--ink-soft)]">
                  {headline}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsEditModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <Settings className="h-4 w-4 text-[var(--blue)]" />
              <span>Edit Candidate Profile</span>
            </button>

            <Link
              href="/resume-maker"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <FileText className="h-4 w-4 text-[var(--green)]" />
              <span>ATS Resume Studio</span>
            </Link>

            <Link
              href="/applications"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <Briefcase className="h-4 w-4 text-[var(--amber)]" />
              <span>Tracked Applications</span>
            </Link>

            <Link
              href="/match"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>AI Match Studio</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-[var(--line)] p-2">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-[var(--red)] transition-colors hover:bg-[var(--red-soft)]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Drawer/Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
