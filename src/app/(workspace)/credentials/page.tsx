"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Plus, Search, Copy, Check, Eye, EyeOff, Trash2, ExternalLink, Sparkles, AlertCircle } from "lucide-react";

interface SiteCredentialItem {
  id: string;
  sitePattern: string;
  loginId: string;
  password?: string;
  notes?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function CredentialVaultPage() {
  const [credentials, setCredentials] = useState<SiteCredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [generatedSample, setGeneratedSample] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/autopilot/credentials");
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (e) {
      console.error("Failed to load credentials:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGeneratePassword = async () => {
    try {
      const res = await fetch("/api/autopilot/credentials?generate=true");
      if (res.ok) {
        const data = await res.json();
        if (data.password) {
          setPassword(data.password);
          setGeneratedSample(data.password);
        }
      }
    } catch (e) {
      console.error("Generate error:", e);
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim() || !loginId.trim() || !password.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/autopilot/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: siteUrl.trim(),
          loginId: loginId.trim(),
          password: password.trim(),
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSiteUrl("");
        setLoginId("");
        setPassword("");
        setNotes("");
        fetchCredentials();
      }
    } catch (err) {
      console.error("Failed to save credential:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/autopilot/credentials?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        setCredentials((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filtered = credentials.filter(
    (c) =>
      c.sitePattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.loginId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,113,227,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ce-blue, #0071e3)" }}>
              <KeyRound size={20} />
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--ce-ink, #0f172a)", letterSpacing: "-0.5px", margin: 0 }}>
              AstrePilot Credential Vault
            </h1>
            <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(16,185,129,0.12)", color: "var(--ce-green, #10b981)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.25)" }}>
              PILLAR F · AES-256-GCM
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--ce-ink-soft, #475569)", margin: 0 }}>
            Encrypted candidate credential storage. AstrePilot senses ATS registration and login portals, automatically queries your Vault, and autofills credentials without human intervention.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "var(--ce-blue, #0071e3)",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,113,227,0.25)",
            }}
          >
            <Plus size={16} />
            <span>Add Site Credential</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "var(--ce-surface, #fff)", border: "1px solid var(--ce-line, #e2e8f0)", borderRadius: "12px", padding: "18px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--ce-muted, #64748b)", marginBottom: "4px" }}>Secured ATS Sites</div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--ce-ink, #0f172a)" }}>{credentials.length}</div>
          <div style={{ fontSize: "11px", color: "var(--ce-green, #10b981)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={13} />
            <span>Encrypted with 256-bit GCM</span>
          </div>
        </div>

        <div style={{ background: "var(--ce-surface, #fff)", border: "1px solid var(--ce-line, #e2e8f0)", borderRadius: "12px", padding: "18px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--ce-muted, #64748b)", marginBottom: "4px" }}>Recent Fills</div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--ce-ink, #0f172a)" }}>
            {credentials.filter((c) => c.lastUsedAt).length}
          </div>
          <div style={{ fontSize: "11px", color: "var(--ce-muted, #64748b)", marginTop: "4px" }}>
            Automated ATS form fills
          </div>
        </div>

        <div style={{ background: "var(--ce-surface, #fff)", border: "1px solid var(--ce-line, #e2e8f0)", borderRadius: "12px", padding: "18px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--ce-muted, #64748b)", marginBottom: "4px" }}>Fast Generator</div>
          <button
            onClick={handleGeneratePassword}
            style={{
              marginTop: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "rgba(0,113,227,0.08)",
              color: "var(--ce-blue, #0071e3)",
              border: "1px solid rgba(0,113,227,0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <Sparkles size={14} />
            <span>Generate Strong Password</span>
          </button>
          {generatedSample && (
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "monospace", color: "var(--ce-ink, #0f172a)" }}>
              <span>{generatedSample}</span>
              <button
                onClick={() => handleCopy(generatedSample, "sample")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ce-blue, #0071e3)" }}
                title="Copy"
              >
                {copiedKey === "sample" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ce-muted, #94a3b8)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ATS domain (e.g. cotiviti.icims.com) or username..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              background: "var(--ce-surface, #fff)",
              border: "1px solid var(--ce-line, #e2e8f0)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--ce-ink, #0f172a)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Credentials Table / List */}
      <div style={{ background: "var(--ce-surface, #fff)", border: "1px solid var(--ce-line, #e2e8f0)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ce-muted, #64748b)", fontSize: "14px" }}>
            Loading encrypted credentials...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0,113,227,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--ce-blue, #0071e3)" }}>
              <KeyRound size={24} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--ce-ink, #0f172a)", marginBottom: "6px" }}>
              {searchQuery ? "No matching site credentials found" : "No site credentials stored yet"}
            </div>
            <p style={{ fontSize: "13px", color: "var(--ce-muted, #64748b)", maxWidth: "460px", margin: "0 auto 20px", lineHeight: "1.5" }}>
              {searchQuery
                ? "Try searching for a different ATS domain or clear your search query."
                : "AstrePilot autonomously detects registration and login gates on iCIMS, Workday, and Greenhouse. Click 'Add Site Credential' or let AstrePilot save your accounts as you apply."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: "9px 16px",
                  background: "var(--ce-blue, #0071e3)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Add Your First Site Credential
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--ce-line, #e2e8f0)", color: "var(--ce-muted, #64748b)", fontWeight: "600", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 20px" }}>ATS Domain / Portal</th>
                <th style={{ padding: "12px 20px" }}>Username / Login ID</th>
                <th style={{ padding: "12px 20px" }}>Password</th>
                <th style={{ padding: "12px 20px" }}>Last Used</th>
                <th style={{ padding: "12px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cred) => {
                const isVisible = visiblePasswords[cred.id] || false;
                const isCopiedLogin = copiedKey === `login-${cred.id}`;
                const isCopiedPwd = copiedKey === `pwd-${cred.id}`;
                const isConfirmingDelete = deleteConfirmId === cred.id;

                return (
                  <tr key={cred.id} style={{ borderBottom: "1px solid var(--ce-line, #e2e8f0)", transition: "background 0.15s" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "600", color: "var(--ce-ink, #0f172a)" }}>{cred.sitePattern}</span>
                        <a
                          href={`https://${cred.sitePattern}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--ce-muted, #94a3b8)", display: "inline-flex" }}
                          title="Open portal"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      {cred.notes && <div style={{ fontSize: "11px", color: "var(--ce-muted, #64748b)", marginTop: "2px" }}>{cred.notes}</div>}
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.03)", padding: "3px 8px", borderRadius: "6px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--ce-ink, #0f172a)" }}>{cred.loginId}</span>
                        <button
                          onClick={() => handleCopy(cred.loginId, `login-${cred.id}`)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ce-muted, #64748b)" }}
                          title="Copy Username"
                        >
                          {isCopiedLogin ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.03)", padding: "3px 8px", borderRadius: "6px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--ce-ink, #0f172a)" }}>
                          {isVisible ? cred.password : "••••••••••••"}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(cred.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ce-muted, #64748b)" }}
                          title={isVisible ? "Hide Password" : "Show Password"}
                        >
                          {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        {cred.password && (
                          <button
                            onClick={() => handleCopy(cred.password!, `pwd-${cred.id}`)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--ce-muted, #64748b)" }}
                            title="Copy Password"
                          >
                            {isCopiedPwd ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: "14px 20px", color: "var(--ce-muted, #64748b)", fontSize: "12px" }}>
                      {cred.lastUsedAt ? new Date(cred.lastUsedAt).toLocaleDateString() : "Saved for future"}
                    </td>

                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      {isConfirmingDelete ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: "600" }}>Delete?</span>
                          <button
                            onClick={() => handleDelete(cred.id)}
                            style={{ padding: "3px 8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ padding: "3px 8px", background: "rgba(0,0,0,0.05)", color: "var(--ce-ink, #0f172a)", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(cred.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ce-muted, #94a3b8)", padding: "4px 6px", borderRadius: "4px" }}
                          title="Delete Credential"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--ce-surface, #fff)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--ce-line, #e2e8f0)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyRound size={20} color="var(--ce-blue, #0071e3)" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--ce-ink, #0f172a)" }}>
                  Add Site Credential
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--ce-muted, #64748b)" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCredential}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--ce-ink, #0f172a)", marginBottom: "6px" }}>
                  ATS Domain or Site URL *
                </label>
                <input
                  type="text"
                  required
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="e.g. cotiviti.icims.com or https://company.wd5.myworkdayjobs.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid var(--ce-line, #cbd5e1)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--ce-ink, #0f172a)",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--ce-muted, #64748b)", marginTop: "4px", display: "block" }}>
                  AstrePilot automatically canonicalizes the hostname pattern.
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--ce-ink, #0f172a)", marginBottom: "6px" }}>
                  Username / Email ID *
                </label>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. playboxstation460@gmail.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid var(--ce-line, #cbd5e1)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--ce-ink, #0f172a)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--ce-ink, #0f172a)" }}>
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "var(--ce-blue, #0071e3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Sparkles size={12} />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password for this ATS portal"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid var(--ce-line, #cbd5e1)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    color: "var(--ce-ink, #0f172a)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--ce-ink, #0f172a)", marginBottom: "6px" }}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cotiviti iCIMS applicant portal"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid var(--ce-line, #cbd5e1)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--ce-ink, #0f172a)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "9px 16px",
                    background: "rgba(0,0,0,0.05)",
                    color: "var(--ce-ink, #0f172a)",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 20px",
                    background: "var(--ce-blue, #0071e3)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,113,227,0.25)",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? "Securing..." : "Save to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
