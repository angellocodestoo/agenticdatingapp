"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  RelationshipCheckIn,
  RelationshipGuidance,
  RelationshipRecord,
  RelationshipSharingLevel,
} from "@/lib/types";

type RelationshipEntry = {
  relationship: RelationshipRecord;
  partnerName: string;
};

type Draft = {
  sharingLevel: RelationshipSharingLevel;
  mood: number;
  closeness: number;
  energy: number;
  stress: number;
  appreciation: string;
  need: string;
  note: string;
};

const DEFAULT_DRAFT: Draft = {
  sharingLevel: "summary",
  mood: 3,
  closeness: 3,
  energy: 3,
  stress: 3,
  appreciation: "",
  need: "",
  note: "",
};

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-500">{label}</span>
        <span className="text-stone-400">{value}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-rose-500"
      />
    </label>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RelationshipCheckInPage() {
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [checkIns, setCheckIns] = useState<Record<string, RelationshipCheckIn[]>>({});
  const [guidance, setGuidance] = useState<Record<string, RelationshipGuidance | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/relationships")
      .then((res) => res.json())
      .then(async (data) => {
        if (!active) return;
        const entries = (data.relationships ?? []) as RelationshipEntry[];
        const results = await Promise.all(
          entries.map(async (entry) => {
            const res = await fetch(`/api/relationships/${entry.relationship.id}/check-ins`);
            const payload = await res.json();
            return [entry.relationship.id, payload] as const;
          })
        );
        if (!active) return;
        setRelationships(entries);
        setDrafts(Object.fromEntries(entries.map((entry) => [entry.relationship.id, DEFAULT_DRAFT])));
        setCheckIns(Object.fromEntries(results.map(([id, data]) => [id, data.checkIns ?? []])));
        setGuidance(Object.fromEntries(results.map(([id, data]) => [id, data.guidance ?? null])));
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
        ...(current[id] ?? DEFAULT_DRAFT),
        ...patch,
      },
    }));
  }

  async function submit(relationshipId: string) {
    const draft = drafts[relationshipId] ?? DEFAULT_DRAFT;
    setBusyId(relationshipId);
    setMessage(null);
    const res = await fetch(`/api/relationships/${relationshipId}/check-ins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save check-in.");
      return;
    }
    setMessage("Check-in saved.");
    setDrafts((current) => ({ ...current, [relationshipId]: DEFAULT_DRAFT }));
    setCheckIns((current) => ({ ...current, [relationshipId]: data.checkIns ?? [] }));
    setGuidance((current) => ({ ...current, [relationshipId]: data.guidance ?? null }));
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
          <h1 className="text-2xl font-bold tracking-tight">Relationship check-in</h1>
          <p className="text-sm text-stone-500">
            Share only what you choose. Red String uses check-ins to suggest smaller, better next moves.
          </p>
        </div>

        {message && (
          <p className="rounded-2xl bg-stone-900 text-white text-xs px-4 py-2.5">{message}</p>
        )}

        {relationships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">Open relationship mode before checking in.</p>
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
              const id = entry.relationship.id;
              const draft = drafts[id] ?? DEFAULT_DRAFT;
              const currentGuidance = guidance[id];
              const currentCheckIns = checkIns[id] ?? [];
              return (
                <div key={id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-5">
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Checking in with</p>
                    <h2 className="text-lg font-semibold text-stone-900 mt-1">{entry.partnerName}</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Slider label="Mood" value={draft.mood} onChange={(mood) => updateDraft(id, { mood })} />
                    <Slider
                      label="Closeness"
                      value={draft.closeness}
                      onChange={(closeness) => updateDraft(id, { closeness })}
                    />
                    <Slider label="Energy" value={draft.energy} onChange={(energy) => updateDraft(id, { energy })} />
                    <Slider label="Stress" value={draft.stress} onChange={(stress) => updateDraft(id, { stress })} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Sharing</span>
                      <select
                        value={draft.sharingLevel}
                        onChange={(e) =>
                          updateDraft(id, {
                            sharingLevel: e.target.value as RelationshipSharingLevel,
                          })
                        }
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <option value="private">Private</option>
                        <option value="summary">Summary</option>
                        <option value="shared">Shared</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Appreciation</span>
                      <input
                        value={draft.appreciation}
                        onChange={(e) => updateDraft(id, { appreciation: e.target.value })}
                        placeholder="Something you appreciated"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Need</span>
                      <input
                        value={draft.need}
                        onChange={(e) => updateDraft(id, { need: e.target.value })}
                        placeholder="Something you need more or less of"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-stone-500">Private note</span>
                      <input
                        value={draft.note}
                        onChange={(e) => updateDraft(id, { note: e.target.value })}
                        placeholder="Optional context for your agent"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => submit(id)}
                    disabled={busyId === id}
                    className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-700 disabled:opacity-50"
                  >
                    {busyId === id ? "Saving..." : "Save check-in"}
                  </button>

                  {currentGuidance && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 space-y-3">
                      <p className="text-sm font-semibold text-rose-800">{currentGuidance.headline}</p>
                      <div className="space-y-1.5">
                        {currentGuidance.suggestions.map((item) => (
                          <p key={item} className="text-sm text-rose-700">
                            {item}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs text-rose-600">Next: {currentGuidance.nextAction}</p>
                    </div>
                  )}

                  {currentCheckIns.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-400 uppercase tracking-wide">Recent check-ins</p>
                      {currentCheckIns.slice(0, 3).map((item) => (
                        <div key={item.id} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                          <p className="text-xs text-stone-400">
                            {formatDate(item.createdAt)} - {item.sharingLevel}
                          </p>
                          <p className="text-sm text-stone-600 mt-1">
                            Mood {item.mood}/5, closeness {item.closeness}/5, energy {item.energy}/5,
                            stress {item.stress}/5
                          </p>
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
