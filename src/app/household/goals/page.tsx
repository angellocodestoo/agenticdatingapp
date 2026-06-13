"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HouseholdDecision, HouseholdGoal, HouseholdRecord } from "@/lib/types";

type HouseholdEntry = { household: HouseholdRecord; partnerName: string };

export default function HouseholdGoalsPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [decisions, setDecisions] = useState<Record<string, HouseholdDecision[]>>({});
  const [goals, setGoals] = useState<Record<string, HouseholdGoal[]>>({});
  const [decisionTitle, setDecisionTitle] = useState<Record<string, string>>({});
  const [goalTitle, setGoalTitle] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
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
            const [dRes, gRes] = await Promise.all([
              fetch(`/api/households/${id}/decisions`),
              fetch(`/api/households/${id}/goals`),
            ]);
            const [dData, gData] = await Promise.all([dRes.json(), gRes.json()]);
            return [id, dData.decisions ?? [], gData.goals ?? []] as const;
          })
        );
        if (!active) return;
        setHouseholds(entries);
        setDecisions(Object.fromEntries(loadedItems.map(([id, items]) => [id, items])));
        setGoals(Object.fromEntries(loadedItems.map(([id, , items]) => [id, items])));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload(id: string) {
    const [dRes, gRes] = await Promise.all([
      fetch(`/api/households/${id}/decisions`),
      fetch(`/api/households/${id}/goals`),
    ]);
    const [dData, gData] = await Promise.all([dRes.json(), gRes.json()]);
    setDecisions((current) => ({ ...current, [id]: dData.decisions ?? [] }));
    setGoals((current) => ({ ...current, [id]: gData.goals ?? [] }));
  }

  async function createDecision(id: string) {
    const title = decisionTitle[id]?.trim();
    if (!title) return;
    const res = await fetch(`/api/households/${id}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, domain: "shared life" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not create decision.");
      return;
    }
    setDecisionTitle((current) => ({ ...current, [id]: "" }));
    reload(id);
  }

  async function createGoal(id: string) {
    const title = goalTitle[id]?.trim();
    if (!title) return;
    const res = await fetch(`/api/households/${id}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category: "shared life" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not create goal.");
      return;
    }
    setGoalTitle((current) => ({ ...current, [id]: "" }));
    reload(id);
  }

  async function resolveDecision(householdId: string, decisionId: string) {
    await fetch(`/api/households/${householdId}/decisions/${decisionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", outcome: "Resolved together." }),
    });
    reload(householdId);
  }

  async function completeGoal(householdId: string, goalId: string) {
    await fetch(`/api/households/${householdId}/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
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
          <h1 className="text-2xl font-bold tracking-tight">Decisions and goals</h1>
          <p className="text-sm text-stone-500">
            Give big choices structure and long arcs a place to live.
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
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Decisions</p>
                    <div className="flex gap-2">
                      <input
                        value={decisionTitle[id] ?? ""}
                        onChange={(e) => setDecisionTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Add a decision"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <button onClick={() => createDecision(id)} className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2">
                        Add
                      </button>
                    </div>
                    {(decisions[id] ?? []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-stone-100 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-stone-800">{item.title}</p>
                            <p className="text-xs text-stone-400">{item.domain} - {item.status}</p>
                          </div>
                        </div>
                        {item.status === "open" && (
                          <button onClick={() => resolveDecision(id, item.id)} className="text-xs text-rose-600 underline">
                            Record outcome
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Goals</p>
                    <div className="flex gap-2">
                      <input
                        value={goalTitle[id] ?? ""}
                        onChange={(e) => setGoalTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Add a long-term goal"
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <button onClick={() => createGoal(id)} className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2">
                        Add
                      </button>
                    </div>
                    {(goals[id] ?? []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-rose-900">{item.title}</p>
                            <p className="text-xs text-rose-600">{item.category} - {item.status}</p>
                          </div>
                        </div>
                        {item.status === "active" && (
                          <button onClick={() => completeGoal(id, item.id)} className="text-xs text-rose-700 underline">
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
