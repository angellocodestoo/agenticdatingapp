"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HouseholdMemory, HouseholdMemoryType, HouseholdRecord, HouseholdSharingLevel } from "@/lib/types";

type HouseholdEntry = { household: HouseholdRecord; partnerName: string };

export default function HouseholdMemoryPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [memory, setMemory] = useState<Record<string, HouseholdMemory[]>>({});
  const [title, setTitle] = useState<Record<string, string>>({});
  const [type, setType] = useState<Record<string, HouseholdMemoryType>>({});
  const [sharing, setSharing] = useState<Record<string, HouseholdSharingLevel>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/households").then((r) => r.json()).then(async (data) => {
      const entries = (data.households ?? []) as HouseholdEntry[];
      const loadedMemory = await Promise.all(entries.map(async (entry) => {
        const res = await fetch(`/api/households/${entry.household.id}/memory`);
        const payload = await res.json();
        return [entry.household.id, payload.memory ?? []] as const;
      }));
      if (!active) return;
      setHouseholds(entries);
      setMemory(Object.fromEntries(loadedMemory));
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  async function reload(id: string) {
    const res = await fetch(`/api/households/${id}/memory`);
    const payload = await res.json();
    setMemory((current) => ({ ...current, [id]: payload.memory ?? [] }));
  }

  async function addMemory(id: string) {
    const value = title[id]?.trim();
    if (!value) return;
    await fetch(`/api/households/${id}/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value, type: type[id] ?? "context", sharingLevel: sharing[id] ?? "shared" }),
    });
    setTitle((current) => ({ ...current, [id]: "" }));
    reload(id);
  }

  if (!loaded) return <div className="min-h-screen flex items-center justify-center"><div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/household" className="text-xs text-rose-500 hover:text-rose-600">Back to household mode</Link>
          <h1 className="text-2xl font-bold tracking-tight">Partnership memory</h1>
          <p className="text-sm text-stone-500">Preserve milestones, gratitude, repairs, rituals, goals, and important context.</p>
        </div>
        {households.length === 0 ? <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center"><p className="text-sm text-stone-500">Open household mode first.</p></div> : households.map((entry) => {
          const id = entry.household.id;
          return (
            <section key={id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-semibold text-stone-900">You and {entry.partnerName}</h2>
              <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                <input value={title[id] ?? ""} onChange={(e) => setTitle((current) => ({ ...current, [id]: e.target.value }))} placeholder="Add a memory" className="min-w-0 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
                <select value={type[id] ?? "context"} onChange={(e) => setType((current) => ({ ...current, [id]: e.target.value as HouseholdMemoryType }))} className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm bg-white">
                  {["milestone", "decision", "repair", "gratitude", "ritual", "goal", "context"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={sharing[id] ?? "shared"} onChange={(e) => setSharing((current) => ({ ...current, [id]: e.target.value as HouseholdSharingLevel }))} className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm bg-white">
                  <option value="private">private</option><option value="summary">summary</option><option value="shared">shared</option>
                </select>
                <button onClick={() => addMemory(id)} className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2">Add</button>
              </div>
              <div className="space-y-3">
                {(memory[id] ?? []).map((item) => (
                  <div key={item.id} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{item.title}</p>
                        <p className="text-xs text-stone-400">{item.type} - {item.sharingLevel} - {new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
