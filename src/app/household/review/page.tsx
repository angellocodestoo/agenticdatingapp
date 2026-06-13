"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HouseholdRecord, HouseholdReview } from "@/lib/types";

type HouseholdEntry = { household: HouseholdRecord; partnerName: string };
type Draft = {
  relationshipEnergy: number;
  logisticsLoad: number;
  fairnessSense: number;
  connectionSense: number;
  appreciation: string;
  frictionPoint: string;
  nextWeekPriority: string;
};
const DEFAULT: Draft = { relationshipEnergy: 3, logisticsLoad: 3, fairnessSense: 3, connectionSense: 3, appreciation: "", frictionPoint: "", nextWeekPriority: "" };

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="space-y-2">
      <div className="flex justify-between text-xs"><span className="font-medium text-stone-500">{label}</span><span className="text-stone-400">{value}/5</span></div>
      <input type="range" min="1" max="5" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-rose-500" />
    </label>
  );
}

export default function HouseholdReviewPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [reviews, setReviews] = useState<Record<string, HouseholdReview[]>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/households").then((r) => r.json()).then(async (data) => {
      const entries = (data.households ?? []) as HouseholdEntry[];
      const loadedReviews = await Promise.all(entries.map(async (entry) => {
        const res = await fetch(`/api/households/${entry.household.id}/reviews`);
        const payload = await res.json();
        return [entry.household.id, payload.reviews ?? []] as const;
      }));
      if (!active) return;
      setHouseholds(entries);
      setReviews(Object.fromEntries(loadedReviews));
      setDrafts(Object.fromEntries(entries.map((entry) => [entry.household.id, DEFAULT])));
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? DEFAULT), ...patch } }));
  }

  async function submit(id: string) {
    const draft = drafts[id] ?? DEFAULT;
    await fetch(`/api/households/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, sharingLevel: "summary" }),
    });
    const res = await fetch(`/api/households/${id}/reviews`);
    const data = await res.json();
    setReviews((current) => ({ ...current, [id]: data.reviews ?? [] }));
    setDrafts((current) => ({ ...current, [id]: DEFAULT }));
  }

  if (!loaded) return <div className="min-h-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/household" className="text-xs text-rose-500 hover:text-rose-600">Back to household mode</Link>
          <h1 className="text-2xl font-bold tracking-tight">Weekly review</h1>
          <p className="text-sm text-stone-500">Name what worked, what felt heavy, and what next week needs.</p>
        </div>
        {households.length === 0 ? <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center"><p className="text-sm text-stone-500">Open household mode first.</p></div> : households.map((entry) => {
          const id = entry.household.id;
          const draft = drafts[id] ?? DEFAULT;
          return (
            <section key={id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-semibold text-stone-900">You and {entry.partnerName}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Slider label="Relationship energy" value={draft.relationshipEnergy} onChange={(v) => update(id, { relationshipEnergy: v })} />
                <Slider label="Logistics load" value={draft.logisticsLoad} onChange={(v) => update(id, { logisticsLoad: v })} />
                <Slider label="Fairness sense" value={draft.fairnessSense} onChange={(v) => update(id, { fairnessSense: v })} />
                <Slider label="Connection sense" value={draft.connectionSense} onChange={(v) => update(id, { connectionSense: v })} />
              </div>
              {(["appreciation", "frictionPoint", "nextWeekPriority"] as const).map((key) => (
                <input key={key} value={draft[key]} onChange={(e) => update(id, { [key]: e.target.value })} placeholder={key.replace(/([A-Z])/g, " $1").toLowerCase()} className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              ))}
              <button onClick={() => submit(id)} className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-700">Submit review</button>
              {(reviews[id] ?? []).slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString()} - {review.sharingLevel}</p>
                  <p className="text-sm text-stone-600 mt-1">Energy {review.relationshipEnergy}/5, load {review.logisticsLoad}/5, fairness {review.fairnessSense}/5, connection {review.connectionSense}/5</p>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
