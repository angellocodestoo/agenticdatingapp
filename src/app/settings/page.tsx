"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AgentSettings } from "@/lib/types";

type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function save(patch: Partial<AgentSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/");
    router.refresh();
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Agent settings</h1>
          <p className="text-sm text-stone-500">
            Tune how picky and how busy your agent should be.
            {saved && <span className="text-emerald-600 font-medium ml-2">Saved ✓</span>}
            {error && <span className="text-red-500 font-medium ml-2">{error}</span>}
          </p>
        </div>

        <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-7">
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-stone-700">Match threshold</label>
              <span className="text-sm font-bold text-rose-500">{settings.threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={settings.threshold}
              onChange={(e) => save({ threshold: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              Only people scoring above this qualify for a date. Higher = pickier agent, fewer but
              stronger matches.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-stone-700">Candidates per run</label>
              <span className="text-sm font-bold text-rose-500">{settings.poolSize}</span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              step={1}
              value={settings.poolSize}
              onChange={(e) => save({ poolSize: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              How many new people your agent reviews each time it goes out. More candidates means
              longer runs.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-stone-700">Search radius</label>
              <span className="text-sm font-bold text-rose-500">{settings.radiusMiles} mi</span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={2}
              value={settings.radiusMiles}
              onChange={(e) => save({ radiusMiles: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
            <p className="text-xs text-stone-400 leading-relaxed">
              How far your agent looks for people. Widen it if runs come back thin — great
              matches don&apos;t always live around the corner.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-stone-700">Pause agent</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Seeing someone? Your agent stops looking until you resume.
              </p>
            </div>
            <button
              onClick={() => save({ paused: !settings.paused })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                settings.paused ? "bg-rose-500" : "bg-stone-200"
              }`}
              aria-label="Toggle pause"
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                  settings.paused ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {settings.paused && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3.5 py-2.5">
              💤 Your agent is paused. It won&apos;t start new runs until you flip this off.
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Account</h2>
          {user?.isGuest ? (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">
                You&apos;re on a guest session. Your data lives in this browser&apos;s cookie — create an
                account to keep it safe.
              </p>
              <a
                href="/login"
                className="inline-block rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700"
              >
                Create account
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">
                  {user?.displayName ?? user?.email}
                </p>
                {user?.displayName && <p className="text-xs text-stone-400">{user.email}</p>}
              </div>
              <button
                onClick={logout}
                className="text-sm text-stone-500 hover:text-stone-800 underline"
              >
                Sign out
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
