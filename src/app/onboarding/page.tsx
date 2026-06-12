"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConnectedSource, UserProfileState } from "@/lib/types";
import { PRIMARY_CONNECTORS } from "@/lib/connectors";

const SOURCES = PRIMARY_CONNECTORS;

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [loading, setLoading] = useState(false);
  const [buildingPersona, setBuildingPersona] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [fitnessProvider, setFitnessProvider] = useState("Strava");
  const [basics, setBasics] = useState({
    age: "" as string,
    gender: "man",
    seeking: "women",
    wantsKids: "open",
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        if (data.fitnessProvider) setFitnessProvider(data.fitnessProvider);
        if (data.basics) {
          setBasics({
            age: String(data.basics.age),
            gender: data.basics.gender,
            seeking: data.basics.seeking,
            wantsKids: data.basics.wantsKids,
          });
        }
        setInitialized(true);
      });
  }, []);

  async function saveBasics(patch: Partial<typeof basics>) {
    const next = { ...basics, ...patch };
    setBasics(next);
    const age = Number(next.age);
    if (!age || age < 18) return; // save once a real age is present
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_basics", ...next, age }),
    });
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  async function toggleSource(source: ConnectedSource) {
    if (!profile) return;
    const connected = profile.connectedSources.includes(source);

    // Spotify uses real OAuth when the server is configured for it.
    if (source === "spotify" && !connected) {
      const status = await fetch("/api/connect/spotify?status=1")
        .then((r) => r.json())
        .catch(() => null);
      if (status?.configured) {
        window.location.assign("/api/connect/spotify");
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: connected ? "disconnect_source" : "connect_source",
        source,
        ...(source === "strava" && !connected ? { provider: fitnessProvider } : {}),
      }),
    });
    const data = await res.json();
    setProfile(data);
    setLoading(false);
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
  const canBuild = connected.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/" className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
            ← Red String
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">Build your agent profile</h1>
          <p className="text-sm text-stone-500">
            Connect accounts so your agent can understand who you actually are. Low-lift — takes 30 seconds.
          </p>
        </div>

        {/* Basics — drives life-stage matching */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Basics</h2>
          <div className="bg-white rounded-xl border border-stone-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400">Age</label>
              <input
                type="number"
                min={18}
                max={99}
                value={basics.age}
                onChange={(e) => saveBasics({ age: e.target.value })}
                placeholder="36"
                className="w-full text-sm border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400">I&apos;m a</label>
              <select
                value={basics.gender}
                onChange={(e) => saveBasics({ gender: e.target.value })}
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-rose-300"
              >
                <option value="man">Man</option>
                <option value="woman">Woman</option>
                <option value="nonbinary">Nonbinary</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400">Seeking</label>
              <select
                value={basics.seeking}
                onChange={(e) => saveBasics({ seeking: e.target.value })}
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-rose-300"
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400">Kids</label>
              <select
                value={basics.wantsKids}
                onChange={(e) => saveBasics({ wantsKids: e.target.value })}
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-rose-300"
              >
                <option value="yes">Want kids</option>
                <option value="open">Open to kids</option>
                <option value="no">Don&apos;t want kids</option>
              </select>
            </div>
          </div>
        </section>

        {/* Connected sources */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Connect accounts</h2>
          <div className="space-y-2">
            {SOURCES.map((s) => {
              const isConnected = connected.includes(s.id);
              const hasProviders = Boolean(s.providers?.length);
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !loading && toggleSource(s.id)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !loading) toggleSource(s.id);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isConnected
                      ? "bg-white border-rose-300 shadow-sm"
                      : "bg-white/60 border-stone-200 hover:border-stone-300"
                  } ${loading ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{s.label}</span>
                      {isConnected && (
                        <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                          {hasProviders ? `${fitnessProvider} connected` : "Connected"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{s.desc}</p>
                    {hasProviders && !isConnected && (
                      <select
                        value={fitnessProvider}
                        onChange={(e) => setFitnessProvider(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="mt-2 text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-rose-300"
                      >
                        {s.providers!.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
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
                </div>
              );
            })}
          </div>
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
