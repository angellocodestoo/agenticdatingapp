"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RelationshipMember, RelationshipRecord } from "@/lib/types";

type RelationshipEntry = {
  relationship: RelationshipRecord;
  members: RelationshipMember[];
  currentMember: RelationshipMember | null;
  partnerName: string;
};

type Draft = {
  stage: RelationshipRecord["stage"];
  sharedValues: string;
  qualityTimePreferences: string;
  communicationNorms: string;
  planningCadence: string;
  nextThirtyDayGoal: string;
  sharingLevel: RelationshipMember["sharingLevel"];
  communicationChannel: string;
  responseExpectation: string;
  planningStyle: string;
  affectionStyle: string;
  repairPreference: string;
  dateNightPreferences: string;
  aloneTimeNeeds: string;
  sensitiveTopics: string;
};

function join(values: string[] | undefined) {
  return (values ?? []).join(", ");
}

function split(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFor(entry: RelationshipEntry): Draft {
  const profile = entry.relationship.profile;
  const preferences = entry.currentMember?.preferences;
  return {
    stage: entry.relationship.stage,
    sharedValues: join(profile.sharedValues),
    qualityTimePreferences: join(profile.qualityTimePreferences),
    communicationNorms: join(profile.communicationNorms),
    planningCadence: profile.planningCadence ?? "",
    nextThirtyDayGoal: profile.nextThirtyDayGoal ?? "",
    sharingLevel: entry.currentMember?.sharingLevel ?? "summary",
    communicationChannel: preferences?.communicationChannel ?? "",
    responseExpectation: preferences?.responseExpectation ?? "",
    planningStyle: preferences?.planningStyle ?? "",
    affectionStyle: preferences?.affectionStyle ?? "",
    repairPreference: preferences?.repairPreference ?? "",
    dateNightPreferences: join(preferences?.dateNightPreferences),
    aloneTimeNeeds: preferences?.aloneTimeNeeds ?? "",
    sensitiveTopics: join(preferences?.sensitiveTopics),
  };
}

export default function RelationshipSettingsPage() {
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/relationships")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const entries = (data.relationships ?? []) as RelationshipEntry[];
        setRelationships(entries);
        setDrafts(
          Object.fromEntries(entries.map((entry) => [entry.relationship.id, draftFor(entry)]))
        );
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function save(entry: RelationshipEntry) {
    const draft = drafts[entry.relationship.id];
    if (!draft) return;
    setBusyId(entry.relationship.id);
    setMessage(null);
    const res = await fetch(`/api/relationships/${entry.relationship.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          stage: draft.stage,
          sharedValues: split(draft.sharedValues),
          qualityTimePreferences: split(draft.qualityTimePreferences),
          communicationNorms: split(draft.communicationNorms),
          planningCadence: draft.planningCadence,
          nextThirtyDayGoal: draft.nextThirtyDayGoal,
        },
        preferences: {
          sharingLevel: draft.sharingLevel,
          communicationChannel: draft.communicationChannel,
          responseExpectation: draft.responseExpectation,
          planningStyle: draft.planningStyle,
          affectionStyle: draft.affectionStyle,
          repairPreference: draft.repairPreference,
          dateNightPreferences: split(draft.dateNightPreferences),
          aloneTimeNeeds: draft.aloneTimeNeeds,
          sensitiveTopics: split(draft.sensitiveTopics),
        },
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save relationship settings.");
      return;
    }
    setMessage("Relationship settings saved.");
    setRelationships((current) =>
      current.map((item) =>
        item.relationship.id === entry.relationship.id
          ? {
              ...item,
              relationship: data.relationship,
              members: data.members,
              currentMember:
                data.members.find(
                  (member: RelationshipMember) => member.id === item.currentMember?.id
                ) ?? item.currentMember,
            }
          : item
      )
    );
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-1">
            <Link href="/relationship" className="text-xs text-rose-500 hover:text-rose-600">
              Back to relationship mode
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Relationship settings</h1>
            <p className="text-sm text-stone-500">
              Shape what your partner can see and how Red String should guide the relationship.
            </p>
          </div>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {relationships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">No relationship space to configure yet.</p>
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
              const draft = drafts[entry.relationship.id];
              if (!draft) return null;
              return (
                <div
                  key={entry.relationship.id}
                  className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5"
                >
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Shared profile</p>
                    <h2 className="text-lg font-semibold text-stone-900 mt-1">
                      You and {entry.partnerName}
                    </h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Stage</span>
                      <select
                        value={draft.stage}
                        onChange={(e) =>
                          updateDraft(entry.relationship.id, {
                            stage: e.target.value as RelationshipRecord["stage"],
                          })
                        }
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <option value="early_dating">Early dating</option>
                        <option value="exclusive">Exclusive</option>
                        <option value="committed">Committed</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Sharing level</span>
                      <select
                        value={draft.sharingLevel}
                        onChange={(e) =>
                          updateDraft(entry.relationship.id, {
                            sharingLevel: e.target.value as RelationshipMember["sharingLevel"],
                          })
                        }
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <option value="private">Private</option>
                        <option value="summary">Summary</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Shared values</span>
                      <input
                        value={draft.sharedValues}
                        onChange={(e) => updateDraft(entry.relationship.id, { sharedValues: e.target.value })}
                        placeholder="growth, kindness, stability"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Quality time</span>
                      <input
                        value={draft.qualityTimePreferences}
                        onChange={(e) =>
                          updateDraft(entry.relationship.id, {
                            qualityTimePreferences: e.target.value,
                          })
                        }
                        placeholder="walks, dinner, quiet nights"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Communication norms</span>
                      <input
                        value={draft.communicationNorms}
                        onChange={(e) =>
                          updateDraft(entry.relationship.id, { communicationNorms: e.target.value })
                        }
                        placeholder="direct, warm, plan ahead"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Planning cadence</span>
                      <input
                        value={draft.planningCadence}
                        onChange={(e) =>
                          updateDraft(entry.relationship.id, { planningCadence: e.target.value })
                        }
                        placeholder="one planned date each week"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-stone-500">Next 30-day goal</span>
                    <textarea
                      value={draft.nextThirtyDayGoal}
                      onChange={(e) =>
                        updateDraft(entry.relationship.id, { nextThirtyDayGoal: e.target.value })
                      }
                      rows={2}
                      placeholder="Build a steady rhythm without over-scheduling."
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                  </label>

                  <div className="border-t border-stone-100 pt-5 space-y-4">
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Your preference card</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        ["communicationChannel", "Best channel", "text for logistics, call for nuance"],
                        ["responseExpectation", "Response expectation", "same day is great"],
                        ["planningStyle", "Planning style", "likes a plan by Wednesday"],
                        ["affectionStyle", "Affection style", "words, thoughtful gestures"],
                        ["repairPreference", "Repair preference", "name it, then reset gently"],
                        ["aloneTimeNeeds", "Alone-time needs", "quiet Sunday mornings"],
                      ].map(([key, label, placeholder]) => (
                        <label key={key} className="space-y-1.5">
                          <span className="text-xs font-medium text-stone-500">{label}</span>
                          <input
                            value={String(draft[key as keyof Draft] ?? "")}
                            onChange={(e) =>
                              updateDraft(entry.relationship.id, {
                                [key]: e.target.value,
                              } as Partial<Draft>)
                            }
                            placeholder={placeholder}
                            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                          />
                        </label>
                      ))}
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-stone-500">Date-night preferences</span>
                        <input
                          value={draft.dateNightPreferences}
                          onChange={(e) =>
                            updateDraft(entry.relationship.id, {
                              dateNightPreferences: e.target.value,
                            })
                          }
                          placeholder="live music, cozy restaurants"
                          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-stone-500">Sensitive topics</span>
                        <input
                          value={draft.sensitiveTopics}
                          onChange={(e) =>
                            updateDraft(entry.relationship.id, { sensitiveTopics: e.target.value })
                          }
                          placeholder="family timing, work stress"
                          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => save(entry)}
                    disabled={busyId === entry.relationship.id}
                    className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-700 disabled:opacity-50"
                  >
                    {busyId === entry.relationship.id ? "Saving..." : "Save settings"}
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
