"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText, CheckCircle2, ChevronRight, FileUp,
  Sparkles, Loader2, Brain, Link2, User, Briefcase, Globe, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CareerStage = "student" | "fresher" | "junior" | "mid" | "senior" | null;

interface FormData {
  fullName: string;
  targetHeadline: string;
  location: string;
  email: string;
  careerStage: CareerStage;
  yearsOfExperience: string;
  workType: string;
  salaryRange: string;
  workAuthorized: boolean;
  requiresVisa: boolean;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  primarySkills: string[];
  noticePeriod: string;
  willingnessToRelocate: boolean;
  highestEducation: string;
  gender: string;
  pronouns: string;
  streetAddress: string;
  apartment: string;
  zipCode: string;
}

const CAREER_LABELS: Record<NonNullable<CareerStage>, { label: string; desc: string; emoji: string }> = {
  student:  { label: "Student",   desc: "Currently enrolled",           emoji: "🎓" },
  fresher:  { label: "Fresher",   desc: "< 1 year, first job hunt",     emoji: "🌱" },
  junior:   { label: "Junior",    desc: "1–3 years experience",         emoji: "⚡" },
  mid:      { label: "Mid-level", desc: "3–7 years experience",         emoji: "🚀" },
  senior:   { label: "Senior",    desc: "7+ years or Lead/Principal",   emoji: "🏆" },
};

const STEP_META = [
  { icon: FileUp,       label: "Import"  },
  { icon: User,         label: "Basics"  },
  { icon: Briefcase,    label: "Career"  },
  { icon: Link2,        label: "Links"   },
  { icon: CheckCircle2, label: "Review"  },
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    fullName: "", targetHeadline: "", location: "",
    email: "", // will be populated from authSession after mount
    careerStage: null, yearsOfExperience: "", workType: "remote",
    salaryRange: "", workAuthorized: true, requiresVisa: false,
    phone: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "",
    primarySkills: [],
    noticePeriod: "", willingnessToRelocate: false, highestEducation: "",
    gender: "", pronouns: "", streetAddress: "", apartment: "", zipCode: "",
  });

  const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
    setFormData((p) => ({ ...p, [key]: value }));

  /* Pre-populate email from OAuth session if user hasn't typed it yet */
  const oauthEmail = authSession?.user?.email ?? "";
  const effectiveEmail = formData.email || oauthEmail;

  const extractResume = async () => {
    if (!file) return;
    setIsExtracting(true);
    setExtractError("");
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch("/api/onboarding/extract", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const h = data.header || {};
      const c = data.career || {};
      setFormData((p) => ({
        ...p,
        fullName:         h.fullName        || p.fullName,
        targetHeadline:   h.targetHeadline  || p.targetHeadline,
        location:         h.location        || p.location,
        email:            h.email           || p.email,
        phone:            h.phone           || p.phone,
        linkedinUrl:      h.linkedinUrl     || p.linkedinUrl,
        githubUrl:        h.githubUrl       || p.githubUrl,
        portfolioUrl:     h.portfolioUrl    || p.portfolioUrl,
        careerStage:      (c.careerStage as CareerStage) || p.careerStage,
        yearsOfExperience:c.yearsOfExperience ? String(c.yearsOfExperience) : p.yearsOfExperience,
        workType:         c.workType        || p.workType,
        primarySkills:    c.primarySkills   || p.primarySkills,
        noticePeriod:     c.noticePeriod    || p.noticePeriod,
        highestEducation: c.highestEducation|| p.highestEducation,
        gender:           c.gender          || p.gender,
        pronouns:         c.pronouns        || p.pronouns,
        streetAddress:    h.streetAddress   || p.streetAddress,
        apartment:        h.apartment       || p.apartment,
        zipCode:          h.zipCode         || p.zipCode,
      }));
      setStep(2);
    } catch { setExtractError("Extraction failed. Please retry or skip."); }
    finally { setIsExtracting(false); }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: effectiveEmail,
          yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : null,
        }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.message || "Could not create profile. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ic = "w-full h-12 bg-[#f5f5f7] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 rounded-xl px-4 text-[15px] text-[#1d1d1f] transition-all outline-none border border-transparent placeholder:text-[#b0b0b8]";
  const lc = "block text-[12px] font-semibold text-[#86868b] mb-1.5 uppercase tracking-wider";

  const NavBar = ({ onBack, onNext, nextLabel = "Next", nextDisabled = false }: {
    onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean;
  }) => (
    <div className="mt-8 flex items-center justify-between">
      {onBack ? <button onClick={onBack} className="text-[#86868b] hover:text-[#1d1d1f] text-[15px] font-medium transition-colors">← Back</button> : <span />}
      {onNext && (
        <button onClick={onNext} disabled={nextDisabled}
          className="bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full px-7 py-2.5 text-[15px] font-semibold transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(0,113,227,0.25)]">
          {nextLabel} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Steps */}
      <div className="flex items-center mb-10">
        {STEP_META.map((s, i) => {
          const n = i + 1;
          const Icon = s.icon;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 text-[13px] font-semibold transition-colors ${done ? "text-[#34c759]" : active ? "text-[#0071e3]" : "text-[#c7c7cc]"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? "border-[#34c759] bg-[#34c759]/10" : active ? "border-[#0071e3] bg-[#0071e3]/10" : "border-[#d2d2d7]"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4 text-[#34c759]" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEP_META.length - 1 && <div className={`flex-1 h-[2px] mx-3 rounded-full transition-colors ${step > n ? "bg-[#34c759]/40" : "bg-[#d2d2d7]/50"}`} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} transition={{ duration:0.35 }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#0071e3]" />
              <h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Import your resume first</h2>
            </div>
            <p className="text-[#86868b] text-[15px] mb-6">AI reads your PDF and fills your entire profile — name, experience, skills, links, and career stage. 5 seconds.</p>
            <label className="block border-2 border-dashed border-[#d2d2d7] rounded-3xl p-10 flex flex-col items-center text-center hover:border-[#0071e3]/40 hover:bg-[#f5f9ff] transition-all cursor-pointer relative group">
              <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              {file
                ? (<><FileText className="w-12 h-12 text-[#0071e3] mb-3" /><p className="font-semibold text-[#1d1d1f]">{file.name}</p><p className="text-[#86868b] text-sm mt-1">Click Extract to process</p></>)
                : (<><FileUp className="w-12 h-12 text-[#c7c7cc] mb-3 group-hover:text-[#0071e3] group-hover:scale-110 transition-all duration-300" /><p className="font-semibold text-[#1d1d1f] text-lg">Drop your PDF resume here</p><p className="text-[#86868b] text-sm mt-2">or click to browse files</p></>)
              }
            </label>
            {extractError && <p className="mt-3 text-sm text-red-500">{extractError}</p>}
            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => setStep(2)} className="text-[#86868b] hover:text-[#1d1d1f] text-[14px] font-medium transition-colors">Skip — I&apos;ll fill manually</button>
              <button onClick={extractResume} disabled={!file || isExtracting}
                className="bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-40 text-white rounded-full px-7 py-2.5 text-[15px] font-semibold flex items-center gap-2 shadow-[0_4px_14px_rgba(0,113,227,0.3)] transition-all">
                {isExtracting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting…</> : <><Sparkles className="w-4 h-4" />Extract with AI</>}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} transition={{ duration:0.35 }}>
            <div className="flex items-center gap-2 mb-1"><User className="w-5 h-5 text-[#0071e3]" /><h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Your basics</h2></div>
            <p className="text-[#86868b] text-[15px] mb-6">Verify AI-extracted info. Edit anything that looks off.</p>
            <div className="space-y-4">
              <div><label className={lc}>Full Name *</label><input className={ic} value={formData.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Roushan Kumar" /></div>
              <div><label className={lc}>Target Role / Headline *</label><input className={ic} value={formData.targetHeadline} onChange={(e) => set("targetHeadline", e.target.value)} placeholder="Full-Stack Engineer | React & Node.js" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>Email</label><input className={ic} type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></div>
                <div><label className={lc}>Location</label><input className={ic} value={formData.location} onChange={(e) => set("location", e.target.value)} placeholder="Patna, Bihar, India" /></div>
              </div>
              {formData.careerStage
                ? (
                  <div className="bg-[#f0f7ff] border border-[#0071e3]/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1"><Brain className="w-4 h-4 text-[#0071e3]" /><span className="text-[13px] font-semibold text-[#0071e3]">AI detected your career stage</span></div>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">{CAREER_LABELS[formData.careerStage].emoji} {CAREER_LABELS[formData.careerStage].label}<span className="ml-2 text-[13px] text-[#86868b] font-normal">— {CAREER_LABELS[formData.careerStage].desc}</span></p>
                    <button onClick={() => set("careerStage", null)} className="mt-2 text-[12px] text-[#86868b] underline">Change it</button>
                  </div>
                ) : (
                  <div>
                    <label className={lc}>Career Stage</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {(Object.entries(CAREER_LABELS) as [NonNullable<CareerStage>, (typeof CAREER_LABELS)[NonNullable<CareerStage>]][]).map(([key, val]) => (
                        <button key={key} onClick={() => set("careerStage", key)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${formData.careerStage === key ? "border-[#0071e3] bg-[#0071e3]/5" : "border-[#e8e8ed] hover:border-[#0071e3]/30"}`}>
                          <span className="text-lg">{val.emoji}</span>
                          <p className="text-[13px] font-semibold text-[#1d1d1f] mt-0.5">{val.label}</p>
                          <p className="text-[11px] text-[#86868b]">{val.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
            </div>
            <div className="mt-6 pt-6 border-t border-black/[0.04]">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">Detailed Address (For Applications)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>Street Address</label><input className={ic} value={formData.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} placeholder="123 Main St" /></div>
                <div><label className={lc}>Apt / Suite</label><input className={ic} value={formData.apartment} onChange={(e) => set("apartment", e.target.value)} placeholder="Apt 4B" /></div>
                <div><label className={lc}>ZIP / Postal Code</label><input className={ic} value={formData.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="94105" /></div>
              </div>
            </div>
            <NavBar onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!formData.fullName || !formData.targetHeadline} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} transition={{ duration:0.35 }}>
            <div className="flex items-center gap-2 mb-1"><Briefcase className="w-5 h-5 text-[#0071e3]" /><h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Career preferences</h2></div>
            <p className="text-[#86868b] text-[15px] mb-6">AstrePilot uses this to answer screening questions accurately on job forms.</p>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lc}>Years of Experience</label><input className={ic} type="number" min="0" max="40" value={formData.yearsOfExperience} onChange={(e) => set("yearsOfExperience", e.target.value)} placeholder="e.g. 2" /></div>
                <div><label className={lc}>Expected Salary</label><input className={ic} value={formData.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} placeholder="₹8-15 LPA or $60k-90k" /></div>
              </div>
              <div>
                <label className={lc}>Preferred Work Type</label>
                <div className="flex gap-3 mt-1">
                  {(["remote","hybrid","onsite"] as const).map((t) => (
                    <button key={t} onClick={() => set("workType", t)}
                      className={`flex-1 py-3 rounded-xl border-2 text-[14px] font-semibold transition-all ${formData.workType === t ? "border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3]" : "border-[#e8e8ed] text-[#86868b] hover:border-[#0071e3]/30"}`}>
                      {t === "remote" ? "🌍 Remote" : t === "hybrid" ? "🏢 Hybrid" : "🏙 On-site"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#f5f5f7] rounded-2xl p-4 space-y-3">
                <label className={lc + " mb-0"}>Work Authorization</label>
                {([
                  { key:"workAuthorized", label:"Legally authorized to work?", sub:"AstrePilot auto-checks Yes on forms", activeColor:"bg-[#34c759]" },
                  { key:"requiresVisa",   label:"Requires visa sponsorship?",   sub:"For international applications",     activeColor:"bg-[#ff9f0a]" },
                ] as const).map(({ key, label, sub, activeColor }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div><p className="text-[14px] font-medium text-[#1d1d1f]">{label}</p><p className="text-[12px] text-[#86868b]">{sub}</p></div>
                    <button onClick={() => set(key, !formData[key])}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData[key] ? activeColor : "bg-[#d2d2d7]"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${formData[key] ? "left-6" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div><label className={lc}>Notice Period</label><input className={ic} value={formData.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. Immediate, 2 Weeks" /></div>
                <div>
                  <label className={lc}>Highest Education</label>
                  <select className={ic} value={formData.highestEducation} onChange={(e) => set("highestEducation", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="High School">High School</option>
                    <option value="Bachelors">Bachelor&apos;s Degree</option>
                    <option value="Masters">Master&apos;s Degree</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-2xl p-4">
                <div><p className="text-[14px] font-medium text-[#1d1d1f]">Willing to relocate?</p></div>
                <button onClick={() => set("willingnessToRelocate", !formData.willingnessToRelocate)}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.willingnessToRelocate ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${formData.willingnessToRelocate ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
            <NavBar onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} transition={{ duration:0.35 }}>
            <div className="flex items-center gap-2 mb-1"><Link2 className="w-5 h-5 text-[#0071e3]" /><h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Links & contact</h2></div>
            <p className="text-[#86868b] text-[15px] mb-6">AstrePilot fills these into job forms automatically — zero typing.</p>
            <div className="space-y-4">
              <div><label className={lc}>Phone Number</label><input className={ic} type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91-9431483512" /></div>
              <div><label className={lc}>LinkedIn URL</label><input className={ic} value={formData.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/yourname" /></div>
              <div><label className={lc}>GitHub URL</label><input className={ic} value={formData.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/yourusername" /></div>
              <div><label className={lc}>Portfolio / Website</label><input className={ic} value={formData.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="https://yoursite.me" /></div>
            </div>
            <div className="mt-6 pt-6 border-t border-black/[0.04]">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">Demographics (Optional)</h3>
              <p className="text-[#86868b] text-[13px] mb-4">Helps AstrePilot auto-fill EEOC and demographic questions.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lc}>Gender</label>
                  <select className={ic} value={formData.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>
                </div>
                <div><label className={lc}>Pronouns</label><input className={ic} value={formData.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="e.g. He/Him, She/Her" /></div>
              </div>
            </div>
            <NavBar onBack={() => setStep(3)} onNext={() => setStep(5)} />
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="s5" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} transition={{ duration:0.35 }}>
            <div className="flex items-center gap-2 mb-1"><Globe className="w-5 h-5 text-[#0071e3]" /><h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Review & launch</h2></div>
            <p className="text-[#86868b] text-[15px] mb-5">Everything look good? Hit Create Profile to unlock AstreWork.</p>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["Full Name",     formData.fullName],
                ["Target Role",   formData.targetHeadline],
                ["Email",         formData.email],
                ["Location",      formData.location],
                ["Career Stage",  formData.careerStage ? `${CAREER_LABELS[formData.careerStage].emoji} ${CAREER_LABELS[formData.careerStage].label}` : "Not set"],
                ["Experience",    formData.yearsOfExperience ? `${formData.yearsOfExperience} yrs` : "Not set"],
                ["Work Type",     formData.workType || "Remote"],
                ["Salary Range",  formData.salaryRange || "Not set"],
                ["Phone",         formData.phone || "Not set"],
                ["LinkedIn",      formData.linkedinUrl ? "✓ Added" : "Not set"],
                ["GitHub",        formData.githubUrl ? "✓ Added" : "Not set"],
                ["Portfolio",     formData.portfolioUrl ? "✓ Added" : "Not set"],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#f5f5f7] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">{label}</p>
                  <p className={`mt-0.5 font-medium truncate ${value === "Not set" ? "text-[#c7c7cc]" : "text-[#1d1d1f]"}`}>{value}</p>
                </div>
              ))}
            </div>
            {submitError && (
              <div className="mt-4 flex items-center gap-2 text-red-500 text-[13px] bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-black/[0.04] pt-6">
              <button onClick={() => setStep(4)} className="text-[#86868b] hover:text-[#1d1d1f] text-[15px] font-medium transition-colors">← Back</button>
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="bg-black text-white hover:bg-[#1d1d1f] disabled:opacity-50 rounded-full px-8 py-3 text-[15px] font-semibold flex items-center gap-2 shadow-lg transition-all">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><CheckCircle2 className="w-4 h-4" />Create Profile</>}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
