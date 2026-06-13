"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RelationshipMember, RelationshipRecord } from "@/lib/types";

type RelationshipEntry = {
  relationship: RelationshipRecord;
  members: RelationshipMember[];
  currentMember: RelationshipMember | null;
  partnerName: string;
  sourceMatch: {
    id: string;
    candidateId: string;
    score: number;
    status: string;
    proposalId: string | null;
  } | null;
};

function statusCopy(status: RelationshipRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "pending") return "Invitation pending";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Ended";
  return "Disabled for safety";
}

function statusClass(status: RelationshipRecord["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "paused") return "bg-stone-100 text-stone-600";
  if (status === "ended") return "bg-stone-100 text-stone-500";
  return "bg-red-50 text-red-600";
}

export default function RelationshipPage() {
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/relationships");
    const data = await res.json();
    setRelationships(data.relationships ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/relationships")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setRelationships(data.relationships ?? []);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function respond(id: string, action: "accept" | "decline" | "pause" | "resume" | "leave") {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/relationships/${id}/members/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not update relationship mode.");
      return;
    }
    setMessage("Relationship mode updated.");
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
          <h1 className="text-2xl font-bold tracking-tight">Relationship mode</h1>
          <p className="text-sm text-stone-500">
            Shared spaces for matches who both choose to keep building after the first date.
          </p>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {relationships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-stone-700">No relationship spaces yet.</p>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              After a mutually accepted match and a promising date, Red String can open a shared
              workspace for the two of you.
            </p>
            <Link
              href="/history"
              className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Review date history
            </Link>
          </div>
        ) : (
          <section className="space-y-4">
            {relationships.map((entry) => {
              const relationship = entry.relationship;
              const myMember = entry.currentMember;
              const invited = entry.members.some((m) => m.status === "invited");
              return (
                <div
                  key={relationship.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wide">
                        Early relationship copilot
                      </p>
                      <h2 className="text-xl font-semibold text-stone-900 mt-1">
                        You and {entry.partnerName}
                      </h2>
                      <p className="text-sm text-stone-500 mt-1">
                        {entry.sourceMatch
                          ? `${entry.sourceMatch.score}% match from Phase 1`
                          : "Built from a Phase 1 match"}
                      </p>
                    </div>
                    <span
                      className={`self-start text-xs font-medium px-3 py-1 rounded-full ${statusClass(
                        relationship.status
                      )}`}
                    >
                      {statusCopy(relationship.status)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Next plan</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Suggest and confirm quality time
                      </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Check-in</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Weekly rhythm arrives in Section 6
                      </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
                      <p className="text-xs text-stone-400">Guidance</p>
                      <p className="text-sm font-medium text-stone-700 mt-1">
                        Communication coaching arrives in Section 6
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                    <p className="text-sm font-medium text-rose-800">
                      {relationship.status === "active"
                        ? "Both partners opted in. Red String can start coordinating your rhythm."
                        : relationship.status === "pending"
                          ? invited
                            ? "Waiting for the other partner to accept the invitation."
                            : "Invitation pending."
                          : relationship.status === "paused"
                            ? "Relationship mode is paused. Shared recommendations are stopped."
                            : relationship.status === "safety_disabled"
                              ? "Relationship mode was disabled after a safety action."
                              : "This relationship space is no longer active."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/relationship/planner"
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                    >
                      Planner
                    </Link>
                    <Link
                      href="/relationship/settings"
                      className="rounded-full bg-rose-50 text-rose-600 text-sm font-medium px-4 py-2 hover:bg-rose-100"
                    >
                      Settings
                    </Link>
                    {relationship.status === "pending" && myMember?.status === "invited" && (
                      <>
                        <button
                          onClick={() => respond(relationship.id, "accept")}
                          disabled={busyId === relationship.id}
                          className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                        >
                          Accept relationship mode
                        </button>
                        <button
                          onClick={() => respond(relationship.id, "decline")}
                          disabled={busyId === relationship.id}
                          className="rounded-full border border-stone-200 text-stone-600 text-sm px-4 py-2 hover:border-stone-300 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {relationship.status === "active" && (
                      <button
                        onClick={() => respond(relationship.id, "pause")}
                        disabled={busyId === relationship.id}
                        className="rounded-full border border-stone-200 text-stone-600 text-sm px-4 py-2 hover:border-stone-300 disabled:opacity-50"
                      >
                        Pause
                      </button>
                    )}
                    {relationship.status === "paused" && myMember?.status === "paused" && (
                      <button
                        onClick={() => respond(relationship.id, "resume")}
                        disabled={busyId === relationship.id}
                        className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                    {relationship.status !== "ended" && relationship.status !== "safety_disabled" && (
                      <button
                        onClick={() => respond(relationship.id, "leave")}
                        disabled={busyId === relationship.id}
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
