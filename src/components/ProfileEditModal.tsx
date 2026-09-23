"use client";

import React, { useState, useEffect } from "react";
import { ProfileData, useProfileStore } from "@/store/useProfileStore";
import { X, Save, Sparkles, Loader2, CheckCircle2, User, Globe, Mail, Phone, MapPin } from "lucide-react";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { activeProfile, updateActiveProfile } = useProfileStore();

  const [formData, setFormData] = useState({
    fullName: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile && isOpen) {
      setFormData({
        fullName: activeProfile.fullName || "",
        title: activeProfile.title || "",
        location: activeProfile.location || "",
        email: activeProfile.email || "",
        phone: activeProfile.phone || "",
        linkedinUrl: activeProfile.linkedinUrl || "",
        githubUrl: activeProfile.githubUrl || "",
        portfolioUrl: activeProfile.portfolioUrl || "",
      });
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [activeProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile");
      }

      updateActiveProfile(data.profile);
      setSuccessMsg("Profile saved successfully!");
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ce-drawer-backdrop" role="dialog" aria-modal="true" aria-label="Edit Profile">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--blue-soft)] text-[var(--blue)]">
              <User className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-[var(--ink)]">Candidate Profile Settings</h2>
              <p className="text-[11px] text-[var(--muted)]">Keep your headline, links, and contact info fresh across all tools.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ce-button-quiet !min-h-8 !px-2 rounded-md"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-md border border-[var(--red)] bg-[var(--red-soft)] p-3 text-[11px] font-medium text-[var(--red)]">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-[var(--green)] bg-[var(--green-soft)] p-3 text-[11px] font-medium text-[var(--green)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="ce-field mt-1 px-3 text-[12px]"
                placeholder="e.g. Alex Mercer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Location
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="ce-field px-3 pl-8 text-[12px]"
                  placeholder="e.g. San Francisco, CA / Remote"
                />
                <MapPin className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Target Headline / Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="ce-field mt-1 px-3 text-[12px]"
              placeholder="e.g. Senior Full-Stack Engineer | Distributed Systems & Next.js"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Contact Email
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="ce-field px-3 pl-8 text-[12px]"
                  placeholder="alex@example.com"
                />
                <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Phone Number
              </label>
              <div className="relative mt-1">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="ce-field px-3 pl-8 text-[12px]"
                  placeholder="+1 (555) 019-2834"
                />
                <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Online Profiles & Portfolio
            </span>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="ce-field px-3 pl-8 text-[11px]"
                  placeholder="https://linkedin.com/in/username"
                />
                <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-[var(--muted)]" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z" />
                </svg>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="ce-field px-3 pl-8 text-[11px]"
                  placeholder="https://github.com/username"
                />
                <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-[var(--muted)]" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
                </svg>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  className="ce-field px-3 pl-8 text-[11px]"
                  placeholder="https://yourportfolio.dev"
                />
                <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="ce-button-secondary !min-h-9 !px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="ce-button-primary !min-h-9 !px-4"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
