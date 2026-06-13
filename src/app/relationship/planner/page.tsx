"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RelationshipPlan, RelationshipRecord } from "@/lib/types";

type RelationshipEntry = {
  relationship: RelationshipRecord;
  partnerName: string;
};

function formatDate(value?: string) {
  if (!value) return "Time not set";
  try {
    return new Date(value).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusClass(status: RelationshipPlan["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-700";
  if (status === "declined") return "bg-stone-100 text-stone-500";
  if (status === "completed") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export default function RelationshipPlannerPage() {
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [plansByRelationship, setPlansByRelationship] = useState<Record<string, RelationshipPlan[]>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/relationships")
      .then((res) => res.json())
      .then(async (data) => {
        if (!active) return;
        const entries = (data.relationships ?? []) as RelationshipEntry[];
        const plans = await Promise.all(
          entries.map(async (entry) => {
            const res = await fetch(`/api/relationships/${entry.relationship.id}/plans`);
            const data = await res.json();
            return [entry.relationship.id, data.plans ?? []] as const;
          })
        );
        if (!active) return;
        setRelationships(entries);
        setPlansByRelationship(Object.fromEntries(plans));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reloadPlans(relationshipId: string) {
    const res = await fetch(`/api/relationships/${relationshipId}/plans`);
    const data = await res.json();
    setPlansByRelationship((current) => ({
      ...current,
      [relationshipId]: data.plans ?? [],
    }));
  }

  async function createPlan(relationshipId: string, mode: "suggest" | "custom") {
    setBusyKey(`${relationshipId}:${mode}`);
    setMessage(null);
    const res = await fetch(`/api/relationships/${relationshipId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        type: mode === "suggest" ? "date_night" : "custom",
        title: mode === "custom" ? titles[relationshipId] : undefined,
      }),
    });
    const data = await res.json();
    setBusyKey(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create plan.");
      return;
    }
    setTitles((current) => ({ ...current, [relationshipId]: "" }));
    setMessage("Shared plan created.");
    reloadPlans(relationshipId);
  }

  async function updatePlan(
    relationshipId: string,
    planId: string,
    action: "accept" | "decline" | "complete"
  ) {
    setBusyKey(`${relationshipId}:${planId}:${action}`);
    setMessage(null);
    const res = await fetch(`/api/relationships/${relationshipId}/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusyKey(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not update plan.");
      return;
    }
    setMessage("Plan updated.");
    reloadPlans(relationshipId);
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
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-1">
          <Link href="/relationship" className="text-xs text-rose-500 hover:text-rose-600">
            Back to relationship mode
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Shared planner</h1>
          <p className="text-sm text-stone-500">
            Suggest, accept, and complete quality-time plans together.
          </p>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {relationships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">Open relationship mode before planning together.</p>
            <Link
              href="/history"
              className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Review date history
            </Link>
          </div>
        ) : (
          <section className="space-y-5">
            {relationships.map((entry) => {
              const relationshipId = entry.relationship.id;
              const plans = plansByRelationship[relationshipId] ?? [];
              return (
                <div
                  key={relationshipId}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Planning with</p>
                      <h2 className="text-lg font-semibold text-stone-900 mt-1">
                        {entry.partnerName}
                      </h2>
                    </div>
                    <button
                      onClick={() => createPlan(relationshipId, "suggest")}
                      disabled={busyKey === `${relationshipId}:suggest`}
                      className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2 hover:bg-rose-600 disabled:opacity-50"
                    >
                      {busyKey === `${relationshipId}:suggest` ? "Suggesting..." : "Suggest date night"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={titles[relationshipId] ?? ""}
                      onChange={(e) =>
                        setTitles((current) => ({
                          ...current,
                          [relationshipId]: e.target.value,
                        }))
                      }
                      placeholder="Add a custom plan"
                      className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <button
                      onClick={() => createPlan(relationshipId, "custom")}
                      disabled={!titles[relationshipId]?.trim() || busyKey === `${relationshipId}:custom`}
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>

                  {plans.length === 0 ? (
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-sm text-stone-500">
                        No plans yet. Ask Red String to suggest a date night.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {plans.map((plan) => (
                        <div key={plan.id} className="rounded-xl border border-stone-100 p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <p className="font-medium text-stone-800">{plan.title}</p>
                              <p className="text-sm text-stone-500 mt-0.5">
                                {formatDate(plan.scheduledFor)}
                              </p>
                              {plan.location?.venueName && (
                                <p className="text-sm text-stone-500">
                                  {plan.location.venueName}
                                  {plan.location.addressLine ? ` - ${plan.location.addressLine}` : ""}
                                </p>
                              )}
                              {plan.notes && (
                                <p className="text-xs text-stone-400 mt-1">{plan.notes}</p>
                              )}
                            </div>
                            <span
                              className={`self-start text-xs font-medium px-2.5 py-1 rounded-full ${statusClass(
                                plan.status
                              )}`}
                            >
                              {plan.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {plan.status === "suggested" && (
                              <>
                                <button
                                  onClick={() => updatePlan(relationshipId, plan.id, "accept")}
                                  disabled={busyKey === `${relationshipId}:${plan.id}:accept`}
                                  className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => updatePlan(relationshipId, plan.id, "decline")}
                                  disabled={busyKey === `${relationshipId}:${plan.id}:decline`}
                                  className="rounded-full border border-stone-200 text-stone-600 text-sm px-4 py-2 hover:border-stone-300 disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {plan.status === "accepted" && (
                              <button
                                onClick={() => updatePlan(relationshipId, plan.id, "complete")}
                                disabled={busyKey === `${relationshipId}:${plan.id}:complete`}
                                className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2 hover:bg-rose-600 disabled:opacity-50"
                              >
                                Mark complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
