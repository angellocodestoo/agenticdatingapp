"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  HouseholdMember,
  HouseholdRecord,
  LegacyAnniversary,
  LegacyAnniversaryKind,
  LegacyChapter,
  LegacyChapterType,
  LegacyInsightSummary,
} from "@/lib/types";

type LegacyEntry = {
  household: HouseholdRecord;
  members: HouseholdMember[];
  partnerName: string;
  chapters: LegacyChapter[];
  anniversaries: LegacyAnniversary[];
  legacyInsights: LegacyInsightSummary | null;
};

const chapterTypes: LegacyChapterType[] = [
  "dating_era",
  "engagement",
  "wedding",
  "first_home",
  "family",
  "career_pivot",
  "move",
  "caregiving",
  "empty_nest",
  "retirement",
  "renewal",
  "custom",
];

const anniversaryKinds: LegacyAnniversaryKind[] = [
  "first_date",
  "commitment",
  "engagement",
  "wedding",
  "renewal",
  "family",
  "custom",
];

const pretty = (value: string) => value.replace(/_/g, " ");

export default function LegacyPage() {
  const [entries, setEntries] = useState<LegacyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [chapterTitle, setChapterTitle] = useState<Record<string, string>>({});
  const [chapterType, setChapterType] = useState<Record<string, LegacyChapterType>>({});
  const [anniversaryTitle, setAnniversaryTitle] = useState<Record<string, string>>({});
  const [anniversaryDate, setAnniversaryDate] = useState<Record<string, string>>({});
  const [anniversaryKind, setAnniversaryKind] = useState<Record<string, LegacyAnniversaryKind>>({});

  function refresh() {
    fetch("/api/legacy")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.households ?? []);
        setLoaded(true);
      });
  }

  useEffect(refresh, []);

  async function addChapter(householdId: string) {
    const title = chapterTitle[householdId]?.trim();
    if (!title) return;
    await fetch("/api/legacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        householdId,
        mode: "chapter",
        title,
        type: chapterType[householdId] ?? "custom",
      }),
    });
    setChapterTitle((current) => ({ ...current, [householdId]: "" }));
    refresh();
  }

  async function addAnniversary(householdId: string) {
    const title = anniversaryTitle[householdId]?.trim();
    const date = anniversaryDate[householdId];
    if (!title || !date) return;
    await fetch("/api/legacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        householdId,
        mode: "anniversary",
        title,
        date,
        kind: anniversaryKind[householdId] ?? "custom",
      }),
    });
    setAnniversaryTitle((current) => ({ ...current, [householdId]: "" }));
    setAnniversaryDate((current) => ({ ...current, [householdId]: "" }));
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
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Phase 4</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-950">Legacy</h1>
          <p className="text-sm text-stone-500 max-w-2xl">
            Preserve the chapters, anniversaries, repairs, gratitude, and long-arc rituals that make the thread stronger over time.
          </p>
        </div>

        {entries.length === 0 ? (
          <section className="bg-white border border-stone-100 rounded-lg p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">Open household mode first, then Legacy becomes the decades layer.</p>
            <Link
              href="/household"
              className="inline-flex rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700"
            >
              Go to household mode
            </Link>
          </section>
        ) : (
          entries.map((entry) => {
            const id = entry.household.id;
            const insights = entry.legacyInsights;
            return (
              <section key={id} className="bg-white border border-stone-100 rounded-lg shadow-sm p-5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">You and {entry.partnerName}</h2>
                    <p className="text-xs text-stone-400 capitalize">
                      {pretty(entry.household.stage)} - {entry.household.status}
                    </p>
                  </div>
                  {insights?.nextAnniversary ? (
                    <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {insights.nextAnniversary.title} in {insights.nextAnniversary.daysAway} days
                    </div>
                  ) : (
                    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                      No protected anniversary yet
                    </div>
                  )}
                </div>

                {insights && (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-stone-50 border border-stone-100 p-3">
                      <p className="text-2xl font-bold text-stone-900">{insights.chapterCount}</p>
                      <p className="text-xs text-stone-400">chapters</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 border border-stone-100 p-3">
                      <p className="text-2xl font-bold text-stone-900">{insights.anniversaryCount}</p>
                      <p className="text-xs text-stone-400">anniversaries</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 border border-stone-100 p-3">
                      <p className="text-sm font-medium text-stone-700">{insights.renewalPrompt}</p>
                    </div>
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-700">Life chapters</h3>
                    <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
                      <input
                        value={chapterTitle[id] ?? ""}
                        onChange={(e) => setChapterTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Name this chapter"
                        className="min-w-0 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <select
                        value={chapterType[id] ?? "custom"}
                        onChange={(e) => setChapterType((current) => ({ ...current, [id]: e.target.value as LegacyChapterType }))}
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white capitalize"
                      >
                        {chapterTypes.map((item) => (
                          <option key={item} value={item}>{pretty(item)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addChapter(id)}
                        className="rounded-full bg-rose-500 text-white text-sm font-medium px-4 py-2 hover:bg-rose-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {entry.chapters.length === 0 ? (
                        <p className="text-sm text-stone-500">No chapters yet.</p>
                      ) : (
                        entry.chapters.map((chapter) => (
                          <div key={chapter.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                            <p className="text-sm font-medium text-stone-800">{chapter.title}</p>
                            <p className="text-xs text-stone-400 capitalize">
                              {pretty(chapter.type)} - {chapter.status}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-700">Anniversaries</h3>
                    <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                      <input
                        value={anniversaryTitle[id] ?? ""}
                        onChange={(e) => setAnniversaryTitle((current) => ({ ...current, [id]: e.target.value }))}
                        placeholder="Name the date"
                        className="min-w-0 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                      <input
                        type="date"
                        value={anniversaryDate[id] ?? ""}
                        onChange={(e) => setAnniversaryDate((current) => ({ ...current, [id]: e.target.value }))}
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
                      />
                      <select
                        value={anniversaryKind[id] ?? "custom"}
                        onChange={(e) => setAnniversaryKind((current) => ({ ...current, [id]: e.target.value as LegacyAnniversaryKind }))}
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white capitalize"
                      >
                        {anniversaryKinds.map((item) => (
                          <option key={item} value={item}>{pretty(item)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => addAnniversary(id)}
                        className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {entry.anniversaries.length === 0 ? (
                        <p className="text-sm text-stone-500">No anniversaries yet.</p>
                      ) : (
                        entry.anniversaries.map((anniversary) => (
                          <div key={anniversary.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                            <p className="text-sm font-medium text-stone-800">{anniversary.title}</p>
                            <p className="text-xs text-stone-400 capitalize">
                              {pretty(anniversary.kind)} - {new Date(`${anniversary.date}T00:00:00`).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
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
