"use client";

import { useState, useEffect } from "react";
import { Clock, Mail, Shield, BellRing, Save, Check } from "lucide-react";

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

  const testDigest = async () => {
    try {
      const res = await fetch("/api/alerts/digest", { method: "POST" });
      const data = await res.json();
      if (data.htmlPreview) {
        // Open the HTML in a new window/tab to preview
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.htmlPreview);
          win.document.close();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-10 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--canvas)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-white px-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Settings & Preferences
        </h1>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-3xl mx-auto space-y-8">
          
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
                    onChange={(e) => setPreferences({...preferences, emailDigest: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--blue)]"></div>
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
                      <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer flex-1 transition-all ${preferences.frequency === 'DAILY' ? 'border-[var(--blue)] bg-blue-50/50' : 'border-gray-200'}`}>
                        <input 
                          type="radio" 
                          name="frequency" 
                          value="DAILY" 
                          checked={preferences.frequency === 'DAILY'}
                          onChange={(e) => setPreferences({...preferences, frequency: e.target.value})}
                          className="text-[var(--blue)]"
                        />
                        <span className="text-sm font-medium">Daily</span>
                      </label>
                      <label className={`flex items-center gap-2 border p-3 rounded-lg cursor-pointer flex-1 transition-all ${preferences.frequency === 'WEEKLY' ? 'border-[var(--blue)] bg-blue-50/50' : 'border-gray-200'}`}>
                        <input 
                          type="radio" 
                          name="frequency" 
                          value="WEEKLY" 
                          checked={preferences.frequency === 'WEEKLY'}
                          onChange={(e) => setPreferences({...preferences, frequency: e.target.value})}
                          className="text-[var(--blue)]"
                        />
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
                      type="range" 
                      min="0" 
                      max="100" 
                      value={preferences.matchScoreThreshold}
                      onChange={(e) => setPreferences({...preferences, matchScoreThreshold: parseInt(e.target.value)})}
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
            
            <div className="border-t border-[var(--line)] bg-gray-50 px-6 py-4 flex items-center justify-between">
              <button 
                onClick={testDigest}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Preview Digest
              </button>
              
              <button 
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Saved!" : saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
