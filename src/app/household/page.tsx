"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HouseholdMember, HouseholdRecord } from "@/lib/types";

type HouseholdEntry = {
  household: HouseholdRecord;
  members: HouseholdMember[];
  currentMember: HouseholdMember | null;
  partnerName: string;
};

function statusCopy(status: HouseholdRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "pending") return "Invitation pending";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Ended";
  return "Disabled for safety";
}

function statusClass(status: HouseholdRecord["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "paused") return "bg-stone-100 text-stone-600";
  if (status === "ended") return "bg-stone-100 text-stone-500";
  return "bg-red-50 text-red-600";
}

export default function HouseholdPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/households");
    const data = await res.json();
    setHouseholds(data.households ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/households")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setHouseholds(data.households ?? []);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function respond(id: string, action: "accept" | "decline" | "pause" | "resume" | "leave") {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/households/${id}/members/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not update household mode.");
      return;
    }
    setMessage("Household mode updated.");
    refresh();
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
          <h1 className="text-2xl font-bold tracking-tight">Household mode</h1>
          <p className="text-sm text-stone-500">
            The knot layer: responsibilities, rituals, decisions, goals, memory, and resilience.
          </p>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {households.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-stone-700">No household space yet.</p>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              Active relationship spaces can graduate into household mode when both partners opt in.
            </p>
            <Link
              href="/relationship"
              className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Review relationship mode
            </Link>
          </div>
        ) : (
          <section className="space-y-4">
            {households.map((entry) => {
              const household = entry.household;
              const myMember = entry.currentMember;
              const invited = entry.members.some((m) => m.status === "invited");
              return (
                <div
                  key={household.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">
                        Marriage and household OS
                      </p>
                      <h2 className="text-xl font-semibold text-stone-900 mt-1">
                        You and {entry.partnerName}
                      </h2>
                      <p className="text-sm text-stone-500 mt-1 capitalize">
                        {household.stage.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span
                      className={`self-start text-xs font-medium px-3 py-1 rounded-full ${statusClass(
                        household.status
                      )}`}
                    >
                      {statusCopy(household.status)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Responsibilities</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Own tasks without losing the relationship
                      </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Decisions</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Structure the big calls
                      </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Memory</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Preserve what matters
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                    <p className="text-sm font-medium text-rose-800">
                      {household.status === "active"
                        ? "Both partners opted in. Red String can help run the shared-life layer."
                        : household.status === "pending"
                          ? invited
                            ? "Waiting for the other partner to accept household mode."
                            : "Household invitation pending."
                          : household.status === "paused"
                            ? "Household mode is paused. Shared recommendations are stopped."
                            : household.status === "safety_disabled"
                              ? "Household mode was disabled after a safety action."
                              : "This household space is no longer active."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/household/responsibilities"
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                    >
                      Responsibilities
                    </Link>
                    <Link
                      href="/household/goals"
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                    >
                      Decisions
                    </Link>
                    <Link
                      href="/household/review"
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                    >
                      Review
                    </Link>
                    <Link
                      href="/household/memory"
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                    >
                      Memory
                    </Link>
                    <Link
                      href="/household/settings"
                      className="rounded-full bg-rose-50 text-rose-600 text-sm font-medium px-4 py-2 hover:bg-rose-100"
                    >
                      Settings
                    </Link>
                    {household.status === "pending" && myMember?.status === "invited" && (
                      <>
                        <button
                          onClick={() => respond(household.id, "accept")}
                          disabled={busyId === household.id}
                          className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                        >
                          Accept household mode
                        </button>
                        <button
                          onClick={() => respond(household.id, "decline")}
                          disabled={busyId === household.id}
                          className="rounded-full border border-stone-200 text-stone-600 text-sm px-4 py-2 hover:border-stone-300 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {household.status === "active" && (
                      <button
                        onClick={() => respond(household.id, "pause")}
                        disabled={busyId === household.id}
                        className="rounded-full border border-stone-200 text-stone-600 text-sm px-4 py-2 hover:border-stone-300 disabled:opacity-50"
                      >
                        Pause
                      </button>
                    )}
                    {household.status === "paused" && myMember?.status === "paused" && (
                      <button
                        onClick={() => respond(household.id, "resume")}
                        disabled={busyId === household.id}
                        className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                    {household.status !== "ended" && household.status !== "safety_disabled" && (
                      <button
                        onClick={() => respond(household.id, "leave")}
                        disabled={busyId === household.id}
                        className="rounded-full text-rose-600 text-sm px-4 py-2 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
