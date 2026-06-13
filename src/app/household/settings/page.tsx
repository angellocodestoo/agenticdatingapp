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

type Draft = {
  stage: HouseholdRecord["stage"];
  homeBase: string;
  commitmentStage: string;
  planningCadence: string;
  protectedRituals: string;
  responsibilityAreas: string;
  sensitiveDomains: string;
  longTermGoals: string;
  legacyNotes: string;
  sharingLevel: HouseholdMember["sharingLevel"];
  loadPreference: string;
  planningRole: string;
  reviewCadence: string;
  privateNotes: string;
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

function draftFor(entry: HouseholdEntry): Draft {
  const profile = entry.household.profile;
  const preferences = entry.currentMember?.preferences;
  return {
    stage: entry.household.stage,
    homeBase: profile.homeBase ?? "",
    commitmentStage: profile.commitmentStage ?? "",
    planningCadence: profile.planningCadence ?? "",
    protectedRituals: join(profile.protectedRituals),
    responsibilityAreas: join(profile.responsibilityAreas),
    sensitiveDomains: join(profile.sensitiveDomains),
    longTermGoals: join(profile.longTermGoals),
    legacyNotes: profile.legacyNotes ?? "",
    sharingLevel: entry.currentMember?.sharingLevel ?? "summary",
    loadPreference: preferences?.loadPreference ?? "",
    planningRole: preferences?.planningRole ?? "",
    reviewCadence: preferences?.reviewCadence ?? "",
    privateNotes: preferences?.privateNotes ?? "",
  };
}

export default function HouseholdSettingsPage() {
  const [households, setHouseholds] = useState<HouseholdEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/households")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const entries = (data.households ?? []) as HouseholdEntry[];
        setHouseholds(entries);
        setDrafts(Object.fromEntries(entries.map((entry) => [entry.household.id, draftFor(entry)])));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  async function save(entry: HouseholdEntry) {
    const draft = drafts[entry.household.id];
    if (!draft) return;
    setBusyId(entry.household.id);
    setMessage(null);
    const res = await fetch(`/api/households/${entry.household.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          stage: draft.stage,
          homeBase: draft.homeBase,
          commitmentStage: draft.commitmentStage,
          planningCadence: draft.planningCadence,
          protectedRituals: split(draft.protectedRituals),
          responsibilityAreas: split(draft.responsibilityAreas),
          sensitiveDomains: split(draft.sensitiveDomains),
          longTermGoals: split(draft.longTermGoals),
          legacyNotes: draft.legacyNotes,
        },
        preferences: {
          sharingLevel: draft.sharingLevel,
          loadPreference: draft.loadPreference,
          planningRole: draft.planningRole,
          reviewCadence: draft.reviewCadence,
          privateNotes: draft.privateNotes,
        },
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save household settings.");
      return;
    }
    setMessage("Household settings saved.");
    setHouseholds((current) =>
      current.map((item) =>
        item.household.id === entry.household.id
          ? {
              ...item,
              household: data.household,
              members: data.members,
              currentMember:
                data.members.find((member: HouseholdMember) => member.id === item.currentMember?.id) ??
                item.currentMember,
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
        <div className="space-y-1">
          <Link href="/household" className="text-xs text-rose-500 hover:text-rose-600">
            Back to household mode
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Household settings</h1>
          <p className="text-sm text-stone-500">
            Set the operating context for your shared life: rituals, responsibilities, goals, and boundaries.
          </p>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {households.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">No household space to configure yet.</p>
            <Link
              href="/relationship"
              className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Review relationship mode
            </Link>
          </div>
        ) : (
          <section className="space-y-5">
            {households.map((entry) => {
              const draft = drafts[entry.household.id];
              if (!draft) return null;
              return (
                <div key={entry.household.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5">
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Household profile</p>
                    <h2 className="text-lg font-semibold text-stone-900 mt-1">
                      You and {entry.partnerName}
                    </h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Stage</span>
                      <select
                        value={draft.stage}
                        onChange={(e) => updateDraft(entry.household.id, { stage: e.target.value as HouseholdRecord["stage"] })}
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <option value="shared_life">Shared life</option>
                        <option value="engaged">Engaged</option>
                        <option value="married">Married</option>
                        <option value="family">Family</option>
                        <option value="legacy">Legacy</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Sharing level</span>
                      <select
                        value={draft.sharingLevel}
                        onChange={(e) => updateDraft(entry.household.id, { sharingLevel: e.target.value as HouseholdMember["sharingLevel"] })}
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <option value="private">Private</option>
                        <option value="summary">Summary</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      ["homeBase", "Home base", "Brooklyn, NY"],
                      ["commitmentStage", "Commitment stage", "planning a shared home"],
                      ["planningCadence", "Planning cadence", "Sunday evening reset"],
                      ["protectedRituals", "Protected rituals", "date night, morning coffee"],
                      ["responsibilityAreas", "Responsibility areas", "home, family, money, travel"],
                      ["sensitiveDomains", "Sensitive domains", "in-laws, budget, fertility"],
                      ["longTermGoals", "Long-term goals", "home fund, annual trip"],
                      ["loadPreference", "Your load preference", "prefers advance planning"],
                      ["planningRole", "Your planning role", "calendar keeper"],
                      ["reviewCadence", "Your review cadence", "weekly"],
                    ].map(([key, label, placeholder]) => (
                      <label key={key} className="space-y-1.5">
                        <span className="text-xs font-medium text-stone-500">{label}</span>
                        <input
                          value={String(draft[key as keyof Draft] ?? "")}
                          onChange={(e) => updateDraft(entry.household.id, { [key]: e.target.value } as Partial<Draft>)}
                          placeholder={placeholder}
                          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Legacy notes</span>
                      <textarea
                        value={draft.legacyNotes}
                        onChange={(e) => updateDraft(entry.household.id, { legacyNotes: e.target.value })}
                        rows={3}
                        placeholder="What should this household protect over time?"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Private notes</span>
                      <textarea
                        value={draft.privateNotes}
                        onChange={(e) => updateDraft(entry.household.id, { privateNotes: e.target.value })}
                        rows={3}
                        placeholder="Private operating context for your own agent"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => save(entry)}
                    disabled={busyId === entry.household.id}
                    className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-700 disabled:opacity-50"
                  >
                    {busyId === entry.household.id ? "Saving..." : "Save household settings"}
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
