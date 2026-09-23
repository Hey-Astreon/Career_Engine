"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, ChevronRight, FileUp, Sparkles, Loader2 } from "lucide-react";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    targetHeadline: "",
    location: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const extractResume = async () => {
    if (!file) return;
    setIsExtracting(true);
    
    try {
      const formDataObj = new FormData();
      formDataObj.append("resume", file);
      
      const res = await fetch("/api/onboarding/extract", {
        method: "POST",
        body: formDataObj,
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.header) {
          setFormData((prev) => ({
            ...prev,
            fullName: data.header.fullName || prev.fullName,
            targetHeadline: data.header.targetHeadline || prev.targetHeadline,
            location: data.header.location || prev.location,
            email: data.header.email || prev.email,
            phone: data.header.phone || prev.phone,
            linkedinUrl: data.header.linkedinUrl || prev.linkedinUrl,
            githubUrl: data.header.githubUrl || prev.githubUrl,
            portfolioUrl: data.header.portfolioUrl || prev.portfolioUrl,
          }));
        }
        setStep(3); // Move to review step
      } else {
        console.error("Extraction failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        console.error("Failed to complete onboarding");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-10 text-[13px] font-semibold tracking-tight text-[#86868b]">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-[#0071e3]" : ""}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step >= 1 ? "border-[#0071e3] bg-[#0071e3]/10" : "border-[#d2d2d7]"}`}>1</div>
          <span>Basics</span>
        </div>
        <div className="flex-1 h-[1px] bg-[#d2d2d7]/50 mx-4" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-[#0071e3]" : ""}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step >= 2 ? "border-[#0071e3] bg-[#0071e3]/10" : "border-[#d2d2d7]"}`}>2</div>
          <span>Import</span>
        </div>
        <div className="flex-1 h-[1px] bg-[#d2d2d7]/50 mx-4" />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-[#0071e3]" : ""}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step >= 3 ? "border-[#0071e3] bg-[#0071e3]/10" : "border-[#d2d2d7]"}`}>3</div>
          <span>Review</span>
        </div>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-6 tracking-tight">Let&apos;s start with the basics</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#86868b] mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full h-12 bg-[#f5f5f7] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 rounded-xl px-4 text-[15px] text-[#1d1d1f] transition-all outline-none border border-transparent"
                placeholder="Steve Jobs"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#86868b] mb-1.5 uppercase tracking-wider">Target Role / Headline</label>
              <input
                type="text"
                value={formData.targetHeadline}
                onChange={(e) => setFormData({ ...formData, targetHeadline: e.target.value })}
                className="w-full h-12 bg-[#f5f5f7] focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 rounded-xl px-4 text-[15px] text-[#1d1d1f] transition-all outline-none border border-transparent"
                placeholder="Senior Full Stack Engineer"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!formData.fullName || !formData.targetHeadline}
              className="bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-[15px] font-semibold transition-all flex items-center gap-2"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-2 tracking-tight">Import your existing resume</h2>
          <p className="text-[#86868b] text-[15px] mb-6">Our Gemini AI will extract your experience, skills, and projects instantly.</p>
          
          <div className="border-2 border-dashed border-[#d2d2d7] rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#fbfbfd] transition-colors relative group">
            <input 
              type="file" 
              accept=".pdf" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleFileUpload} 
            />
            {file ? (
              <>
                <FileText className="w-12 h-12 text-[#0071e3] mb-4" />
                <h3 className="font-semibold text-[#1d1d1f]">{file.name}</h3>
                <p className="text-[#86868b] text-sm mt-1">Ready to extract</p>
              </>
            ) : (
              <>
                <FileUp className="w-12 h-12 text-[#86868b] mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold text-[#1d1d1f] text-lg">Upload PDF Resume</h3>
                <p className="text-[#86868b] text-sm mt-2 max-w-[200px]">Drag and drop your old resume here, or click to browse.</p>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-[#86868b] hover:text-[#1d1d1f] text-[15px] font-medium transition-colors">
              Back
            </button>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-6 py-2.5 text-[15px] font-semibold text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#ebebeb] rounded-full transition-colors">
                Skip Import
              </button>
              <button
                onClick={extractResume}
                disabled={!file || isExtracting}
                className="bg-[#0071e3] hover:bg-[#0077ED] disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-[15px] font-semibold transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(0,113,227,0.3)]"
              >
                {isExtracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Extracting AI Data...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Extract with AI</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-2 tracking-tight">Review & Finalize</h2>
          <p className="text-[#86868b] text-[15px] mb-6">Verify the extracted data looks correct. You can always edit this later.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#86868b] mb-1 uppercase tracking-wider">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-11 bg-[#f5f5f7] rounded-xl px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#86868b] mb-1 uppercase tracking-wider">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-11 bg-[#f5f5f7] rounded-xl px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#86868b] mb-1 uppercase tracking-wider">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full h-11 bg-[#f5f5f7] rounded-xl px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#86868b] mb-1 uppercase tracking-wider">LinkedIn URL</label>
              <input type="text" value={formData.linkedinUrl} onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})} className="w-full h-11 bg-[#f5f5f7] rounded-xl px-4 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white" />
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-black/[0.04] pt-6">
            <button onClick={() => setStep(2)} className="text-[#86868b] hover:text-[#1d1d1f] text-[15px] font-medium transition-colors">
              Back
            </button>
            <button onClick={handleSubmit} className="bg-black text-white hover:bg-[#1d1d1f] rounded-full px-8 py-3 text-[15px] font-semibold transition-all flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-4 h-4" /> Create Profile
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
