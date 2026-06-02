"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ConnectedSource, UserArtifact, UserProfileState } from "@/lib/types";

const SOURCES: { id: ConnectedSource; label: string; icon: string; desc: string }[] = [
  {
    id: "google_calendar",
    label: "Google Calendar",
    icon: "📅",
    desc: "Reveals schedule style, priorities, and lifestyle rhythm.",
  },
  {
    id: "spotify",
    label: "Spotify",
    icon: "🎵",
    desc: "Shows personality through music taste and listening habits.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    desc: "Gives context on career, ambition, and professional identity.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [loading, setLoading] = useState(false);
  const [buildingPersona, setBuildingPersona] = useState(false);
  const [artifactText, setArtifactText] = useState("");
  const [artifactLabel, setArtifactLabel] = useState("About me");
  const [addingArtifact, setAddingArtifact] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setInitialized(true);
      });
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  async function toggleSource(source: ConnectedSource) {
    if (!profile) return;
    setLoading(true);
    const connected = profile.connectedSources.includes(source);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: connected ? "disconnect_source" : "connect_source",
        source,
      }),
    });
    const data = await res.json();
    setProfile(data);
    setLoading(false);
  }

  async function addArtifact() {
    if (!artifactText.trim()) return;
    setAddingArtifact(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_artifact",
        label: artifactLabel || "Personal note",
        content: artifactText,
      }),
    });
    const data = await res.json();
    setProfile(data);
    setArtifactText("");
    setArtifactLabel("About me");
    setAddingArtifact(false);
  }

  async function removeArtifact(id: string) {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_artifact", id }),
    });
    const data = await res.json();
    setProfile(data);
  }

  async function buildPersona() {
    setBuildingPersona(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "build_persona" }),
    });
    setBuildingPersona(false);
    router.push("/persona");
  }

  const connected = profile?.connectedSources ?? [];
  const artifacts: UserArtifact[] = profile?.artifacts ?? [];
  const canBuild = connected.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-1">
          <a href="/" className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
            ← Soulmate
          </a>
          <h1 className="text-2xl font-semibold text-stone-900">Build your agent profile</h1>
          <p className="text-sm text-stone-500">
            Connect accounts so your agent can understand who you actually are. Low-lift — takes 30 seconds.
          </p>
        </div>

        {/* Connected sources */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Connect accounts</h2>
          <div className="space-y-2">
            {SOURCES.map((s) => {
              const isConnected = connected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSource(s.id)}
                  disabled={loading}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    isConnected
                      ? "bg-white border-rose-300 shadow-sm"
                      : "bg-white/60 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{s.label}</span>
                      {isConnected && (
                        <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{s.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                      isConnected
                        ? "bg-rose-500 border-rose-500"
                        : "border-stone-300"
                    }`}
                  >
                    {isConnected && (
                      <svg className="w-full h-full text-white p-0.5" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Artifacts */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Personal context</h2>
            <span className="text-xs text-stone-400">Optional — helps your agent understand you better</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={artifactLabel}
                onChange={(e) => setArtifactLabel(e.target.value)}
                placeholder="Label (e.g. 'About me')"
                className="flex-shrink-0 w-36 text-xs border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>
            <textarea
              value={artifactText}
              onChange={(e) => setArtifactText(e.target.value)}
              placeholder="Write anything your agent should know about you — your values, what you're looking for, lifestyle, dealbreakers, past relationship patterns. The more honest, the better your matches."
              rows={4}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-rose-300 resize-none placeholder:text-stone-300"
            />
            <button
              onClick={addArtifact}
              disabled={!artifactText.trim() || addingArtifact}
              className="text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-40 transition-colors"
            >
              {addingArtifact ? "Adding…" : "+ Add note"}
            </button>
          </div>

          {artifacts.length > 0 && (
            <div className="space-y-2">
              {artifacts.map((a) => (
                <div
                  key={a.id}
                  className="bg-white border border-stone-200 rounded-xl p-3 flex gap-3 items-start"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-stone-600">{a.label}</div>
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{a.content}</p>
                  </div>
                  <button
                    onClick={() => removeArtifact(a.id)}
                    className="text-stone-300 hover:text-rose-400 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Build CTA */}
        <button
          onClick={buildPersona}
          disabled={!canBuild || buildingPersona}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 text-white py-4 text-sm font-semibold shadow-lg shadow-rose-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {buildingPersona ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Building your profile…
            </>
          ) : (
            "Build my agent profile →"
          )}
        </button>
        {!canBuild && (
          <p className="text-center text-xs text-stone-400">Connect at least one account to continue.</p>
        )}
      </div>
    </main>
  );
}
