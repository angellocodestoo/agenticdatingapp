"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HouseholdRecord, HouseholdResponsibility, HouseholdRitual } from "@/lib/types";

type HouseholdEntry = {
  household: HouseholdRecord;
  partnerName: string;
};

function fmt(value?: string) {
  if (!value) return "No date set";
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return value;
  }
}

export default function HouseholdResponsibilitiesPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [responsibilities, setResponsibilities] = useState<Record<string, HouseholdResponsibility[]>>({});
  const [rituals, setRituals] = useState<Record<string, HouseholdRitual[]>>({});
  const [title, setTitle] = useState<Record<string, string>>({});
  const [ritualTitle, setRitualTitle] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/households")
      .then((res) => res.json())
      .then(async (data) => {
        const entries = (data.households ?? []) as HouseholdEntry[];
        const loadedItems = await Promise.all(
          entries.map(async (entry) => {
            const id = entry.household.id;
            const [respRes, ritRes] = await Promise.all([
              fetch(`/api/households/${id}/responsibilities`),
              fetch(`/api/households/${id}/rituals`),
            ]);
            const [respData, ritData] = await Promise.all([respRes.json(), ritRes.json()]);
            return [id, respData.responsibilities ?? [], ritData.rituals ?? []] as const;
          })
        );
        if (!active) return;
        setHouseholds(entries);
        setResponsibilities(Object.fromEntries(loadedItems.map(([id, items]) => [id, items])));
        setRituals(Object.fromEntries(loadedItems.map(([id, , items]) => [id, items])));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload(id: string) {
    const [respRes, ritRes] = await Promise.all([
      fetch(`/api/households/${id}/responsibilities`),
      fetch(`/api/households/${id}/rituals`),
    ]);
    const [respData, ritData] = await Promise.all([respRes.json(), ritRes.json()]);
    setResponsibilities((current) => ({ ...current, [id]: respData.responsibilities ?? [] }));
    setRituals((current) => ({ ...current, [id]: ritData.rituals ?? [] }));
  }

  async function createResponsibility(id: string) {
    const value = title[id]?.trim();
    if (!value) return;
    setBusy(`${id}:responsibility`);
    setMessage(null);
    const res = await fetch(`/api/households/${id}/responsibilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value, type: "recurring", emotionalLoad: "medium" }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create responsibility.");
      return;
    }
    setTitle((current) => ({ ...current, [id]: "" }));
    reload(id);
  }

  async function createRitual(id: string) {
    const value = ritualTitle[id]?.trim();
    if (!value) return;
    setBusy(`${id}:ritual`);
    setMessage(null);
    const res = await fetch(`/api/households/${id}/rituals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value, cadence: "weekly" }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create ritual.");
      return;
    }
    setRitualTitle((current) => ({ ...current, [id]: "" }));
    reload(id);
  }

  async function updateResponsibility(householdId: string, id: string, status: HouseholdResponsibility["status"]) {
    await fetch(`/api/households/${householdId}/responsibilities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    reload(householdId);
  }

  async function updateRitual(householdId: string, id: string, status: HouseholdRitual["status"]) {
    await fetch(`/api/households/${householdId}/rituals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    reload(householdId);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/household" className="text-xs text-rose-500 hover:text-rose-600">
            Back to household mode
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Responsibilities and rituals</h1>
          <p className="text-sm text-stone-500">
            Keep obligations clear and connection protected.
          </p>
        </div>
        {message && <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>}
        {households.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <p className="text-sm text-stone-500">Open household mode first.</p>
          </div>
        ) : (
          households.map((entry) => {
            const id = entry.household.id;
            return (
              <section key={id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5">
                <h2 className="text-lg font-semibold text-stone-900">You and {entry.partnerName}</h2>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Responsibilities</p>
                    <div className="flex gap-2">
                      <input
                        value={title[id] ?? ""}
                        onChange={(e) => setTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Add a responsibility"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <button
                        onClick={() => createResponsibility(id)}
                        disabled={busy === `${id}:responsibility`}
                        className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {(responsibilities[id] ?? []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-stone-100 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{item.title}</p>
                            <p className="text-xs text-stone-400">
                              {item.type} - {fmt(item.dueAt)} - {item.emotionalLoad ?? "medium"} load
                            </p>
                          </div>
                          <span className="text-xs rounded-full bg-stone-100 px-2 py-1 text-stone-500">{item.status}</span>
                        </div>
                        {item.status !== "completed" && (
                          <button
                            onClick={() => updateResponsibility(id, item.id, "completed")}
                            className="text-xs text-rose-600 underline"
                          >
                            Mark complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Rituals</p>
                    <div className="flex gap-2">
                      <input
                        value={ritualTitle[id] ?? ""}
                        onChange={(e) => setRitualTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Add a protected ritual"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <button
                        onClick={() => createRitual(id)}
                        disabled={busy === `${id}:ritual`}
                        className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {(rituals[id] ?? []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-rose-900">{item.title}</p>
                            <p className="text-xs text-rose-600">
                              {item.cadence ?? "uncadenced"} - next {fmt(item.nextAt)}
                            </p>
                          </div>
                          <span className="text-xs rounded-full bg-white px-2 py-1 text-rose-600">{item.status}</span>
                        </div>
                        {item.status !== "completed" && (
                          <button
                            onClick={() => updateRitual(id, item.id, "completed")}
                            className="text-xs text-rose-700 underline"
                          >
                            Mark complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
