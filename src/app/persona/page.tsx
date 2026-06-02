"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  UserProfileState,
  PersonaAssumption,
  ValueKey,
  DealbreakerKey,
  ValuePreference,
  Dealbreaker,
} from "@/lib/types";

const ALL_VALUES: { key: ValueKey; label: string }[] = [
  { key: "family", label: "Family" },
  { key: "ambition", label: "Ambition" },
  { key: "kindness", label: "Kindness" },
  { key: "growth", label: "Growth" },
  { key: "health", label: "Health" },
  { key: "curiosity", label: "Curiosity" },
  { key: "faith", label: "Faith" },
  { key: "community", label: "Community" },
  { key: "adventure", label: "Adventure" },
  { key: "stability", label: "Stability" },
];

const ALL_DEALBREAKERS: { key: DealbreakerKey; label: string }[] = [
  { key: "smoking", label: "Smoking" },
  { key: "heavy_drinking", label: "Heavy drinking" },
  { key: "wants_kids_no", label: "Doesn't want kids" },
  { key: "wants_kids_yes", label: "Wants kids (I don't)" },
  { key: "politics_mismatch", label: "Strong political mismatch" },
  { key: "religion_mismatch", label: "Strong religion mismatch" },
  { key: "non_monogamy", label: "Open/non-monogamous" },
  { key: "worklife_incompatible", label: "Work–life incompatibility" },
  { key: "distance_too_far", label: "Lives too far away" },
];

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "bg-emerald-100 text-emerald-700"
      : pct >= 60
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-600";
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${color}`}>
      {pct}% confident
    </span>
  );
}

export default function PersonaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: UserProfileState) => {
        if (!d.persona) router.push("/onboarding");
        else setProfile(d);
      });
  }, [router]);

  if (!profile?.persona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const persona = profile.persona;

  async function patchPersona(patch: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_persona", persona: patch }),
    });
    const data: UserProfileState = await res.json();
    setProfile(data);
    setSaving(false);
  }

  function rateAssumption(
    assumption: PersonaAssumption,
    rating: PersonaAssumption["userRating"]
  ) {
    const updated = persona.assumptions.map((a) =>
      a.id === assumption.id ? { ...a, userRating: rating } : a
    );
    patchPersona({ assumptions: updated });
  }

  function toggleValue(key: ValueKey) {
    const existing = persona.values.find((v) => v.key === key);
    let updated: ValuePreference[];
    if (existing) {
      if (existing.strength === "low") updated = persona.values.map((v) => v.key === key ? { ...v, strength: "medium" as const } : v);
      else if (existing.strength === "medium") updated = persona.values.map((v) => v.key === key ? { ...v, strength: "high" as const } : v);
      else updated = persona.values.filter((v) => v.key !== key);
    } else {
      updated = [...persona.values, { key, strength: "low" as const }];
    }
    patchPersona({ values: updated });
  }

  function toggleDealbreaker(key: DealbreakerKey) {
    const existing = persona.dealbreakers.find((d) => d.key === key);
    let updated: Dealbreaker[];
    if (existing) updated = persona.dealbreakers.filter((d) => d.key !== key);
    else updated = [...persona.dealbreakers, { key }];
    patchPersona({ dealbreakers: updated });
  }

  function strengthLabel(v: ValuePreference) {
    if (v.strength === "high") return "Core";
    if (v.strength === "medium") return "Important";
    return "Nice to have";
  }

  function strengthStyle(v: ValuePreference) {
    if (v.strength === "high") return "bg-rose-100 text-rose-700 ring-1 ring-rose-300";
    if (v.strength === "medium") return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    return "bg-stone-100 text-stone-600";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <a href="/onboarding" className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
              ← Back
            </a>
            <h1 className="text-2xl font-semibold text-stone-900">Your dating profile</h1>
            <p className="text-sm text-stone-500">
              This is what your agent learned about you. Fix anything that&apos;s off — it gets smarter from your feedback.
            </p>
          </div>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="w-3 h-3 border border-stone-300 border-t-stone-500 rounded-full animate-spin" />
              Saving
            </span>
          )}
        </div>

        {/* Profile card — dating-app style */}
        <section className="bg-white rounded-[28px] border border-rose-100 shadow-lg shadow-rose-100/50 overflow-hidden">
          <div className="relative h-36 flex items-end bg-gradient-to-br from-rose-400 via-rose-400 to-amber-400">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-rose-500 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Built by your agent
            </div>
            <div className="relative px-5 pb-4 flex items-end gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/95 flex items-center justify-center text-3xl shadow-lg -mb-1">
                💘
              </div>
              <div className="text-white pb-1">
                <div className="text-xl font-bold leading-tight">
                  {persona.displayName}<span className="font-light">, {Math.round((persona.ageRange.min + persona.ageRange.max) / 2)}</span>
                </div>
                <div className="text-xs text-white/85">{persona.location.city}, {persona.location.region}</div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-medium text-rose-500 italic">{persona.headline}</p>
            <p className="text-sm text-stone-600 leading-relaxed">{persona.bio}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {persona.interests.map((i) => (
                <span key={i} className="text-xs bg-rose-50 text-rose-500 px-2.5 py-1 rounded-full font-medium">
                  {i}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Agent assumptions */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            What your agent assumed
          </h2>
          <div className="space-y-2">
            {persona.assumptions.map((a) => (
              <div
                key={a.id}
                className={`bg-white rounded-xl border p-4 space-y-2 transition-all ${
                  a.userRating === "wrong"
                    ? "border-red-200 opacity-60"
                    : a.userRating === "accurate"
                    ? "border-emerald-200"
                    : "border-stone-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-stone-700 flex-1">{a.label}</p>
                  <ConfidenceBadge confidence={a.confidence} />
                </div>
                <div className="flex gap-1.5">
                  {(["accurate", "somewhat", "wrong"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => rateAssumption(a, r)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${
                        a.userRating === r
                          ? r === "accurate"
                            ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                            : r === "somewhat"
                            ? "bg-amber-100 border-amber-300 text-amber-700"
                            : "bg-red-100 border-red-300 text-red-600"
                          : "bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      {r === "accurate" ? "Accurate" : r === "somewhat" ? "Partly" : "Wrong"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Your values</h2>
          <p className="text-xs text-stone-400">
            Tap to add. Tap again to cycle: Nice to have → Important → Core. Tap Core to remove.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_VALUES.map(({ key, label }) => {
              const existing = persona.values.find((v) => v.key === key);
              return (
                <button
                  key={key}
                  onClick={() => toggleValue(key)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    existing
                      ? strengthStyle(existing)
                      : "bg-white border-stone-200 text-stone-400 hover:border-stone-300"
                  }`}
                >
                  {label}
                  {existing && (
                    <span className="ml-1.5 text-xs opacity-70">{strengthLabel(existing)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Dealbreakers */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Hard dealbreakers</h2>
          <p className="text-xs text-stone-400">
            These eliminate a candidate before the agent even talks to them.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_DEALBREAKERS.map(({ key, label }) => {
              const active = persona.dealbreakers.some((d) => d.key === key);
              return (
                <button
                  key={key}
                  onClick={() => toggleDealbreaker(key)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "bg-white border-stone-200 text-stone-400 hover:border-stone-300"
                  }`}
                >
                  {active && <span className="mr-1 text-red-400">✕</span>}
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <button
          onClick={() => router.push("/agent-run")}
          className="w-full rounded-full bg-rose-500 text-white py-3.5 text-sm font-medium hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Send my agent out
        </button>
      </div>
    </main>
  );
}
