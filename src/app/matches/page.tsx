"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Candidate } from "@/lib/types";

export default function MatchesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPersona, setHasPersona] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([cands, prof]) => {
      setCandidates(cands);
      setHasPersona(!!prof.persona);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPersona) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-stone-500 text-sm">Build your profile first.</p>
        <Link href="/onboarding" className="text-rose-500 underline text-sm">
          Go to onboarding
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50 to-amber-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-1">
          <a href="/persona" className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
            ← Your profile
          </a>
          <h1 className="text-2xl font-semibold text-stone-900">Potential matches</h1>
          <p className="text-sm text-stone-500">
            Select someone to let your agents talk. Dealbreakers are filtered automatically.
          </p>
        </div>

        <div className="space-y-3">
          {candidates.map((c) => {
            const p = c.persona;
            const topValues = p.values
              .filter((v) => v.strength === "high")
              .slice(0, 2)
              .map((v) => v.key);
            return (
              <Link
                key={c.id}
                href={`/matches/${c.id}`}
                className="block bg-white rounded-2xl border border-stone-200 p-5 hover:border-rose-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-stone-800">{p.displayName}</span>
                      <span className="text-xs text-stone-400">
                        {p.location.city}, {p.location.region}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 italic">{p.headline}</p>
                    <p className="text-sm text-stone-600 leading-relaxed line-clamp-2">{p.bio}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-stone-300 group-hover:text-rose-400 flex-shrink-0 transition-colors mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {topValues.map((v) => (
                    <span
                      key={v}
                      className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full capitalize"
                    >
                      {v}
                    </span>
                  ))}
                  {p.interests.slice(0, 3).map((i) => (
                    <span
                      key={i}
                      className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full"
                    >
                      {i}
                    </span>
                  ))}
                  {p.dealbreakers.length === 0 && p.yellowFlags.length > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                      {p.yellowFlags.length} yellow flag{p.yellowFlags.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
