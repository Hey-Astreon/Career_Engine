import React, { useEffect, useState } from "react";
import { OptimizedResume } from "@/lib/ai/resumeOptimizer";
import { Save, Copy, FileText, Trash2, SplitSquareHorizontal, Eye, X, Download, Sparkles, ShieldCheck } from "lucide-react";

export interface SavedVariant {
  id: string;
  name: string;
  category: string;
  atsScore: number;
  updatedAt: string;
}

export interface OfficialVariant {
  variantName: string;
  fileName: string;
  category: string;
  description: string;
  keyStrengths: string[];
}

interface Props {
  profileSlug: string;
  currentResumeData: OptimizedResume;
  onLoadVariant: (resumeData: OptimizedResume) => void;
}

export function ResumeVariantsSidebar({ profileSlug, currentResumeData, onLoadVariant }: Props) {
  const [variants, setVariants] = useState<SavedVariant[]>([]);
  const [officialVariants, setOfficialVariants] = useState<OfficialVariant[]>([]);
  const [activeTab, setActiveTab] = useState<"official" | "custom">("official");
  const [isLoading, setIsLoading] = useState(false);
  
  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState("General");

  // Compare modal state
  const [showCompareModal, setShowCompareModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compareDiff, setCompareDiff] = useState<any>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null);

  const fetchVariants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/resume/variants?profileSlug=${profileSlug}`);
      const data = await res.json();
      if (data.success) {
        setVariants(data.variants || []);
        if (Array.isArray(data.officialVariants)) {
          setOfficialVariants(data.officialVariants);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVariants();
  }, [profileSlug]);

  const handleSave = async () => {
    if (!saveName.trim()) return alert("Variant name is required");
    try {
      const res = await fetch("/api/resume/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileSlug,
          name: saveName.trim(),
          category: saveCategory.trim() || "General",
          resumeData: currentResumeData,
          atsScore: 0, // Optionally calculate real score here
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSaveModal(false);
        setSaveName("");
        fetchVariants();
      } else {
        alert("Failed to save variant: " + data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoad = async (id: string) => {
    if (!window.confirm("Load this variant? Unsaved changes will be lost.")) return;
    try {
      const res = await fetch(`/api/resume/variants/${id}`);
      const data = await res.json();
      if (data.success && data.variant) {
        onLoadVariant(data.variant.resumeData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this variant?")) return;
    try {
      const res = await fetch(`/api/resume/variants?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchVariants();
        if (selectedForCompare === id) setSelectedForCompare(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompare = async (idA: string, idB: string) => {
    try {
      const res = await fetch("/api/resume/variants/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantIdA: idA, variantIdB: idB }),
      });
      const data = await res.json();
      if (data.success) {
        setCompareDiff(data);
        setShowCompareModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl shadow-sm flex flex-col h-full max-h-[800px]">
      <div className="p-3 border-b border-[var(--line)] bg-gray-50/50 rounded-t-xl space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[var(--blue)]" />
            Resume Variants
          </h2>
          {activeTab === "custom" && (
            <button onClick={() => setShowSaveModal(true)} className="ce-button-primary !py-0.5 !px-2 !text-[10px] !min-h-0">
              Save Current
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-gray-200/70 p-0.5 rounded-lg text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("official")}
            className={`py-1 rounded text-center transition-all ${
              activeTab === "official"
                ? "bg-white text-[var(--ink)] shadow-xs"
                : "text-gray-500 hover:text-[var(--ink)]"
            }`}
          >
            Locked PDFs ({officialVariants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`py-1 rounded text-center transition-all ${
              activeTab === "custom"
                ? "bg-white text-[var(--ink)] shadow-xs"
                : "text-gray-500 hover:text-[var(--ink)]"
            }`}
          >
            Saved Drafts ({variants.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-xs text-gray-500 text-center py-4">Loading variants...</div>
        ) : activeTab === "official" ? (
          officialVariants.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4 border border-dashed rounded-md">
              No locked PDF variants found on disk.
            </div>
          ) : (
            officialVariants.map((v) => (
              <div
                key={v.fileName}
                className="p-2.5 border border-[var(--line)] rounded-lg bg-gray-50/60 hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-[var(--ink)] line-clamp-1" title={v.variantName}>
                      {v.variantName}
                    </span>
                    <span className="ce-chip text-[8px] font-mono shrink-0">
                      {v.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                    {v.description}
                  </p>
                  {v.keyStrengths?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {v.keyStrengths.slice(0, 2).map((s) => (
                        <span key={s} className="bg-blue-50 text-blue-700 text-[8px] px-1.5 py-0.5 rounded font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 border-t border-[var(--line)] pt-2 mt-1">
                  <a
                    href={`/api/resume/download?slug=${profileSlug}&variant=${encodeURIComponent(v.fileName)}&view=inline`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] border border-gray-200 text-gray-700 hover:bg-gray-100 bg-white rounded font-medium transition-colors"
                  >
                    <Eye className="w-3 h-3 text-[var(--blue)]" /> Preview
                  </a>
                  <a
                    href={`/api/resume/download?slug=${profileSlug}&variant=${encodeURIComponent(v.fileName)}&view=attachment`}
                    download={v.fileName}
                    className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] bg-[var(--ink)] hover:opacity-90 text-white rounded font-medium transition-opacity"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              </div>
            ))
          )
        ) : variants.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4 border border-dashed rounded-md">
            No custom saved variants. (Max 20)
          </div>
        ) : (
          variants.map((v) => (
            <div key={v.id} className="p-3 border border-[var(--line)] rounded-lg hover:border-blue-300 transition-colors bg-gray-50 group">
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-sm line-clamp-1" title={v.name}>{v.name}</div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mb-3 flex items-center justify-between">
                <span className="bg-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider">{v.category}</span>
                <span>{new Date(v.updatedAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex gap-2 text-xs">
                <button onClick={() => handleLoad(v.id)} className="flex-1 flex items-center justify-center gap-1 py-1 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded">
                  <Copy className="w-3 h-3" /> Load
                </button>
                <button 
                  onClick={() => {
                    if (selectedForCompare) {
                      if (selectedForCompare !== v.id) handleCompare(selectedForCompare, v.id);
                      setSelectedForCompare(null);
                    } else {
                      setSelectedForCompare(v.id);
                    }
                  }} 
                  className={`flex-1 flex items-center justify-center gap-1 py-1 border rounded transition-colors ${
                    selectedForCompare === v.id 
                      ? "border-amber-300 text-amber-700 bg-amber-50" 
                      : "border-gray-200 text-gray-600 hover:bg-gray-100 bg-white"
                  }`}
                >
                  <SplitSquareHorizontal className="w-3 h-3" /> 
                  {selectedForCompare === v.id ? "Select 2nd" : "Compare"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Save Resume Variant</h3>
              <button onClick={() => setShowSaveModal(false)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Variant Name</label>
                <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="ce-field w-full" placeholder="e.g. AI Engineer - Series A" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Category</label>
                <input type="text" value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)} className="ce-field w-full" placeholder="e.g. General" />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowSaveModal(false)} className="ce-button-secondary">Cancel</button>
              <button onClick={handleSave} className="ce-button-primary">Save Variant</button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && compareDiff && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <SplitSquareHorizontal className="w-5 h-5 text-amber-500" />
                Comparing: <span className="text-blue-600">{compareDiff.variantA.name}</span> vs <span className="text-green-600">{compareDiff.variantB.name}</span>
              </h3>
              <button onClick={() => setShowCompareModal(false)} className="p-1 hover:bg-gray-200 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {compareDiff.diff.summaryDiff.isChanged && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-2 font-bold text-xs border-b">Summary Changes</div>
                  <div className="grid grid-cols-2">
                    <div className="p-3 bg-red-50 text-red-900 text-sm border-r line-through">{compareDiff.diff.summaryDiff.old}</div>
                    <div className="p-3 bg-green-50 text-green-900 text-sm">{compareDiff.diff.summaryDiff.new}</div>
                  </div>
                </div>
              )}

              {compareDiff.diff.skillChanges.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-2 font-bold text-xs border-b">Skills Changes</div>
                  {compareDiff.diff.skillChanges.map((sc: { section: string, old: string, new: string }, idx: number) => (
                    <div key={idx} className="border-b last:border-0">
                      <div className="px-3 py-1 bg-gray-50 text-xs font-semibold">{sc.section}</div>
                      <div className="grid grid-cols-2">
                        <div className="p-2 bg-red-50 text-red-900 text-sm border-r">{sc.old}</div>
                        <div className="p-2 bg-green-50 text-green-900 text-sm">{sc.new}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {compareDiff.diff.projectChanges.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-2 font-bold text-xs border-b">Project Changes</div>
                  {compareDiff.diff.projectChanges.map((pc: { title: string, oldBullets: string[], newBullets: string[] }, idx: number) => (
                    <div key={idx} className="border-b last:border-0 p-3">
                      <div className="font-bold text-sm mb-2">{pc.title}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <ul className="list-disc pl-4 text-xs text-red-800 bg-red-50 p-2 rounded">
                          {pc.oldBullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                        </ul>
                        <ul className="list-disc pl-4 text-xs text-green-800 bg-green-50 p-2 rounded">
                          {pc.newBullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!compareDiff.diff.summaryDiff.isChanged && compareDiff.diff.skillChanges.length === 0 && compareDiff.diff.projectChanges.length === 0 && (
                <div className="text-center py-10 text-gray-500">No significant differences found between these variants.</div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
