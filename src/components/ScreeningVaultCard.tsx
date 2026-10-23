"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Star,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Zap,
  BookOpen,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VaultItem {
  id: string;
  category: string;
  questionPattern: string;
  keywords: string[];
  answerText: string;
  isFavorite: boolean;
  timesUsed: number;
  lastUsedAt: string | null;
  companyContext: string | null;
  roleContext: string | null;
}

const CATEGORIES = [
  { key: "ALL", label: "All Items" },
  { key: "MOTIVATION", label: "Motivation" },
  { key: "TECHNICAL", label: "Technical" },
  { key: "LOGISTICS", label: "Logistics" },
  { key: "COMPENSATION", label: "Compensation" },
  { key: "BEHAVIORAL", label: "Behavioral" },
];

export default function ScreeningVaultCard() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Item Modal / Inline state
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("MOTIVATION");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Expanded items state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchVault = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/autopilot/vault");
      if (res.ok) {
        const data = await res.json();
        setItems(data.vault || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isFavorite: !currentStatus } : i))
    );

    try {
      await fetch(`/api/autopilot/vault/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !currentStatus }),
      });
    } catch {
      fetchVault(); // Rollback on error
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to remove this answer from your vault?")) return;

    setItems((prev) => prev.filter((i) => i.id !== id));

    try {
      await fetch(`/api/autopilot/vault/${id}`, {
        method: "DELETE",
      });
    } catch {
      fetchVault();
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setSaving(true);
    setAddError(null);

    try {
      const res = await fetch("/api/autopilot/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPattern: newQuestion.trim(),
          answerText: newAnswer.trim(),
          category: newCategory,
          isFavorite: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save to vault");
      }

      setNewQuestion("");
      setNewAnswer("");
      setIsAdding(false);
      fetchVault();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === "ALL" ||
      item.category.toUpperCase() === selectedCategory;

    const matchesSearch =
      !searchQuery.trim() ||
      item.questionPattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answerText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const totalUsed = items.reduce((acc, curr) => acc + (curr.timesUsed || 0), 0);
  const favoriteCount = items.filter((i) => i.isFavorite).length;

  return (
    <div className="bg-white border border-[var(--line)] rounded-xl shadow-sm overflow-hidden">
      {/* ── Header Strip ── */}
      <div className="border-b border-[var(--line)] bg-gray-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold flex items-center gap-2 text-gray-900">
            <Shield className="w-4 h-4 text-[var(--blue)]" />
            Smart Screening Q&A Memory Bank
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-curated responses used by AstrePilot for instant sub-5ms semantic matches on ATS applications.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--blue)] text-white hover:bg-blue-600 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? "Cancel" : "Add Q&A Entry"}
        </button>
      </div>

      {/* ── KPI Metrics Bar ── */}
      <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-b border-[var(--line)] bg-white text-center py-3">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Saved</span>
          <span className="text-lg font-bold text-gray-900 tracking-tight">{items.length}</span>
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Times Deployed</span>
          <span className="text-lg font-bold text-[var(--blue)] tracking-tight">{totalUsed}</span>
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Starred Priorities</span>
          <span className="text-lg font-bold text-amber-500 tracking-tight">{favoriteCount}</span>
        </div>
      </div>

      {/* ── Inline Add Drawer ── */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-5 border-b border-[var(--line)] bg-blue-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--blue)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              New Q&A Vault Ammunition
            </span>
            <span className="text-[11px] text-gray-400">Tip: Use {"{{COMPANY}}"} or {"{{ROLE}}"} for auto-interpolation</span>
          </div>

          {addError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Question Pattern (e.g. Why do you want to work at {{COMPANY}}?)"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--line)] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--blue)]"
              />
            </div>
            <div>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--line)] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--blue)]"
              >
                <option value="MOTIVATION">Motivation</option>
                <option value="TECHNICAL">Technical</option>
                <option value="LOGISTICS">Logistics</option>
                <option value="COMPENSATION">Compensation</option>
                <option value="BEHAVIORAL">Behavioral</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Your high-impact answer. Write in first person. Compliant titles: Software Developer, Systems Architect, Builder."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              required
              className="w-full p-3 text-xs rounded-lg border border-[var(--line)] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[var(--blue)] resize-y"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save to Memory Bank"}
            </button>
          </div>
        </form>
      )}

      {/* ── Filters & Search ── */}
      <div className="p-4 border-b border-[var(--line)] flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedCategory === cat.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vault ammunition…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[var(--line)] bg-gray-50 focus:bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* ── Entries List ── */}
      <div className="divide-y divide-[var(--line)]">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading Screening Q&A Memory Bank…</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No screening questions found matching your filter criteria.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const isCopied = copiedId === item.id;

            return (
              <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[var(--blue)] border border-blue-100">
                        {item.category}
                      </span>
                      {item.timesUsed > 0 && (
                        <span className="text-[10px] font-mono text-gray-400">
                          Used {item.timesUsed}x
                        </span>
                      )}
                      <h3 className="text-xs font-bold text-gray-900 truncate">
                        {item.questionPattern}
                      </h3>
                    </div>

                    <p
                      className={`text-xs text-gray-600 leading-relaxed font-sans ${
                        isExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {item.answerText}
                    </p>

                    {item.answerText.length > 140 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="text-[11px] font-medium text-[var(--blue)] hover:underline mt-1 inline-flex items-center gap-0.5"
                      >
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Read Full Answer <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id, item.isFavorite)}
                      title={item.isFavorite ? "Unstar" : "Star as priority answer"}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        item.isFavorite
                          ? "border-amber-200 bg-amber-50 text-amber-500"
                          : "border-gray-200 text-gray-400 hover:text-amber-500 hover:bg-gray-50"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-current" : ""}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.id, item.answerText)}
                      title="Copy answer"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      title="Delete from vault"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
