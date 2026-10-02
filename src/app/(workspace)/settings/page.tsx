"use client";

import { useState, useEffect, useRef } from "react";
import {
  Clock, Mail, Shield, BellRing, Save, Check,
  User, Pencil, Loader2, Sparkles, Upload,
  FileText, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import AstrePilotCard from "@/components/AstrePilotCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileForm {
  fullName: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  careerStage: string;
  yearsOfExperience: string;
  workType: string;
  salaryRange: string;
  workAuthorized: boolean;
  requiresVisa: boolean;
  primarySkills: string[];
}

// ---------------------------------------------------------------------------
// Profile Identity Card
// ---------------------------------------------------------------------------
function ProfileIdentityCard() {
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    portfolioUrl: "",
    githubUrl: "",
    careerStage: "",
    yearsOfExperience: "",
    workType: "remote",
    salaryRange: "",
    workAuthorized: true,
    requiresVisa: false,
    primarySkills: [],
  });
  const [originalForm, setOriginalForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume AI extract
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Accordion
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => {
        const profile = data.profiles?.find((p: { isOwner: boolean }) => p.isOwner);
        if (profile) {
          const mapped: ProfileForm = {
            fullName: profile.fullName ?? "",
            title: profile.title ?? "",
            location: profile.location ?? "",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
            linkedinUrl: profile.linkedinUrl ?? "",
            portfolioUrl: profile.portfolioUrl ?? "",
            githubUrl: profile.githubUrl ?? "",
            careerStage: profile.careerStage ?? "",
            yearsOfExperience: profile.yearsOfExperience ? String(profile.yearsOfExperience) : "",
            workType: profile.workType ?? "remote",
            salaryRange: profile.salaryRange ?? "",
            workAuthorized: profile.workAuthorized ?? true,
            requiresVisa: profile.requiresVisa ?? false,
            primarySkills: profile.primarySkills ? JSON.parse(profile.primarySkills) : [],
          };
          setForm(mapped);
          setOriginalForm(mapped);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isDirty =
    originalForm &&
    JSON.stringify(form) !== JSON.stringify(originalForm);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalForm({ ...form });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Failed to save profile.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExtract = async () => {
    if (!extractFile) return;
    setIsExtracting(true);
    setExtractMsg(null);
    try {
      const fd = new FormData();
      fd.append("resume", extractFile);
      const res = await fetch("/api/onboarding/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (data.header) {
        setForm((prev) => ({
          ...prev,
          fullName: data.header.fullName || prev.fullName,
          title: data.header.targetHeadline || prev.title,
          location: data.header.location || prev.location,
          email: data.header.email || prev.email,
          phone: data.header.phone || prev.phone,
          linkedinUrl: data.header.linkedinUrl || prev.linkedinUrl,
          portfolioUrl: data.header.portfolioUrl || prev.portfolioUrl,
          githubUrl: data.header.githubUrl || prev.githubUrl,
          careerStage: data.career?.careerStage || prev.careerStage,
          yearsOfExperience: data.career?.yearsOfExperience ? String(data.career.yearsOfExperience) : prev.yearsOfExperience,
          workType: data.career?.workType || prev.workType,
          salaryRange: data.career?.salaryRange || prev.salaryRange,
          workAuthorized: data.career?.workAuthorized ?? prev.workAuthorized,
          requiresVisa: data.career?.requiresVisa ?? prev.requiresVisa,
          primarySkills: data.career?.primarySkills || prev.primarySkills,
        }));
        setExtractMsg("✓ AI extracted fields below — review then Save Changes.");
        setExpanded(true);
      } else {
        setExtractMsg("Could not extract data. Try a cleaner PDF.");
      }
    } catch {
      setExtractMsg("Extraction failed. Please retry.");
    } finally {
      setIsExtracting(false);
      setExtractFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const Field = ({
    label, field, type = "text", placeholder = ""
  }: {
    label: string;
    field: keyof ProfileForm;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[field] as string}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full h-10 px-3 text-[13px] rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] focus:bg-white focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-[var(--ink)]"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white border border-[var(--line)] rounded-xl shadow-sm p-10 flex items-center justify-center gap-3 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--line)] bg-gray-50 px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold flex items-center gap-2 text-gray-900">
            <User className="w-4 h-4 text-[var(--blue)]" />
            Career Identity & Profile
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your professional identity at any career milestone — graduation, role change, or relocation.
          </p>
        </div>
        {/* Quick snapshot badge */}
        {originalForm && (
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{originalForm.fullName}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{originalForm.title}</p>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* ── Re-Onboard via AI Resume Extract ───────────────────────────── */}
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-blue-900">Re-run AI Profile Extract</p>
              <p className="text-[12px] text-blue-700 mt-0.5">
                Changed jobs, graduated, or have a new resume? Upload it and our AI will pre-fill the form below instantly.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div className="relative flex items-center gap-3 mt-1">
            <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-[12px] font-semibold transition-colors shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              {extractFile ? extractFile.name : "Choose PDF…"}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setExtractFile(e.target.files[0])}
              />
            </label>

            {extractFile && (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="inline-flex items-center gap-2 bg-[var(--blue)] text-white text-[12px] font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                {isExtracting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Extract with AI</>
                )}
              </button>
            )}

            {extractFile && !isExtracting && (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-600">
                <FileText className="w-3.5 h-3.5" />
                {(extractFile.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>

          {extractMsg && (
            <div className={`flex items-start gap-2 text-[12px] font-medium rounded-lg px-3 py-2 ${
              extractMsg.startsWith("✓")
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}>
              {extractMsg.startsWith("✓")
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              {extractMsg}
            </div>
          )}
        </div>

        {/* ── Editable Fields (accordion) ──────────────────────────────────── */}
        <div className="border border-[var(--line)] rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="text-[13px] font-semibold text-gray-800 flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
              Edit Profile Fields Manually
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expanded && (
            <div className="p-5 space-y-4 border-t border-[var(--line)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" field="fullName" placeholder="Your full name" />
                <Field label="Target Role / Headline" field="title" placeholder="e.g. Software Engineer" />
                <Field label="Location" field="location" placeholder="City, Country" />
                <Field label="Email" field="email" type="email" placeholder="you@example.com" />
                <Field label="Phone" field="phone" placeholder="+91 98765 43210" />
                <Field label="LinkedIn URL" field="linkedinUrl" placeholder="https://linkedin.com/in/…" />
                <Field label="Portfolio URL" field="portfolioUrl" placeholder="https://yoursite.dev" />
                <Field label="GitHub URL" field="githubUrl" placeholder="https://github.com/…" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-[var(--line)]">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Career Stage</label>
                  <select
                    value={form.careerStage}
                    onChange={(e) => setForm({ ...form, careerStage: e.target.value })}
                    className="w-full h-10 px-3 text-[13px] rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] focus:bg-white focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-[var(--ink)]"
                  >
                    <option value="">Not set</option>
                    <option value="student">Student</option>
                    <option value="fresher">Fresher</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
                <Field label="Years of Exp" field="yearsOfExperience" type="number" placeholder="e.g. 2" />
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Work Type</label>
                  <select
                    value={form.workType}
                    onChange={(e) => setForm({ ...form, workType: e.target.value })}
                    className="w-full h-10 px-3 text-[13px] rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] focus:bg-white focus:border-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-[var(--ink)]"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>
                <Field label="Salary Range" field="salaryRange" placeholder="e.g. $80k - $100k" />
              </div>

              {/* Context note */}
              <p className="text-[11px] text-gray-400 leading-relaxed border-t border-[var(--line)] pt-3">
                Changes here update your AstreWork career identity. Your applications pipeline, job history, and resume variants are not affected.
              </p>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 text-[12px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-[var(--line)] bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400">
          {isDirty ? (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> You have unsaved changes
            </span>
          ) : (
            "Profile is up to date."
          )}
        </p>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 rounded-lg text-[13px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved!</>
          ) : saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const [preferences, setPreferences] = useState({
    emailDigest: true,
    frequency: "DAILY",
    matchScoreThreshold: 70,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts/digest")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPreferences({
            emailDigest: data.emailDigest ?? true,
            frequency: data.frequency ?? "DAILY",
            matchScoreThreshold: data.matchScoreThreshold ?? 70,
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/alerts/digest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const [testingDigest, setTestingDigest] = useState(false);
  const [digestFeedback, setDigestFeedback] = useState<string | null>(null);

  const testDigest = async () => {
    setTestingDigest(true);
    setDigestFeedback(null);
    try {
      const res = await fetch("/api/alerts/digest", { method: "POST" });
      const data = await res.json();
      if (data.message) {
        setDigestFeedback(data.message);
        setTimeout(() => setDigestFeedback(null), 5000);
      }
      if (data.htmlPreview) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.htmlPreview);
          win.document.close();
        }
      }
    } catch (e) {
      console.error(e);
      setDigestFeedback("Failed to trigger test digest");
    } finally {
      setTestingDigest(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading settings…</div>;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--canvas)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-white px-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Settings &amp; Preferences
        </h1>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ── Profile Identity Card ── */}
          <ProfileIdentityCard />

          {/* ── Email Digest Alerts ── */}
          <div className="bg-white border border-[var(--line)] rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-[var(--line)] bg-gray-50 px-6 py-4">
              <h2 className="text-[15px] font-semibold flex items-center gap-2 text-gray-900">
                <BellRing className="w-4 h-4 text-[var(--blue)]" />
                Email Digest Alerts
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure how and when you receive automated job discovery digests.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Enable Email Digests</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Receive personalized job alerts in your inbox.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.emailDigest}
                    onChange={(e) => setPreferences({ ...preferences, emailDigest: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--blue)]" />
                </label>
              </div>

              {preferences.emailDigest && (
                <>
                  <div className="space-y-3 pt-4 border-t border-[var(--line)]">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Digest Frequency</h3>
                      <p className="text-sm text-gray-500 mt-0.5">How often should we send you updates?</p>
                    </div>
                    <div className="flex gap-4">
                      <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer flex-1 transition-all ${preferences.frequency === "DAILY" ? "border-[var(--blue)] bg-blue-50/50" : "border-gray-200"}`}>
                        <input type="radio" name="frequency" value="DAILY" checked={preferences.frequency === "DAILY"} onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })} className="text-[var(--blue)]" />
                        <span className="text-sm font-medium">Daily</span>
                      </label>
                      <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer flex-1 transition-all ${preferences.frequency === "WEEKLY" ? "border-[var(--blue)] bg-blue-50/50" : "border-gray-200"}`}>
                        <input type="radio" name="frequency" value="WEEKLY" checked={preferences.frequency === "WEEKLY"} onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })} className="text-[var(--blue)]" />
                        <span className="text-sm font-medium">Weekly</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[var(--line)]">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Minimum Match Score</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Only email jobs with a match score above this threshold.</p>
                      </div>
                      <span className="text-sm font-bold text-[var(--blue)]">{preferences.matchScoreThreshold}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={preferences.matchScoreThreshold}
                      onChange={(e) => setPreferences({ ...preferences, matchScoreThreshold: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--blue)]"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0% (All Jobs)</span>
                      <span>100% (Perfect Match)</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-[var(--line)] bg-gray-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={testDigest}
                  disabled={testingDigest}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {testingDigest ? "Dispatching…" : "Send Test Digest & Preview"}
                </button>
                {digestFeedback && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {digestFeedback}
                  </span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saved ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {saved ? "Saved!" : saving ? "Saving…" : "Save Preferences"}
              </button>
            </div>
          </div>

        </div>

        {/* ── AstrePilot Section ───────────────────────────────────────── */}
        <div className="mt-10">
          <p className="ce-page-eyebrow mb-1">Automation</p>
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--ink)] mb-1">AstrePilot</h2>
          <p className="text-[12px] text-[var(--muted)] mb-4">Intelligent autofill for job application forms — powered by your AstreWork profile.</p>
          <AstrePilotCard />
        </div>

      </main>
    </div>
  );
}
