"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Dealbreaker, ValuePreference } from "@/lib/types";
import { AI_IMPORT_PROMPT, CONNECTORS } from "@/lib/connectors";

const AI_CONNECTOR = CONNECTORS.find((c) => c.id === "ai_assistant")!;

type Insights = {
  confidence: {
    score: number;
    factors: Array<{ label: string; points: number; max: number }>;
  };
  suggestedConnectors: Array<{
    id: string;
    label: string;
    icon: string;
    unlocks: string;
    boost: number;
    providers?: string[];
  }>;
  connectedConnectors: Array<{ id: string; label: string; icon: string }>;
  aiProvider: string | null;
  persona: {
    values: ValuePreference[];
    interests: string[];
    dealbreakers: Dealbreaker[];
  } | null;
  accuracy: {
    total: number;
    rated: number;
    accurate: number;
    somewhat: number;
    wrong: number;
  };
  scoreTrend: Array<{ at: number; bestScore: number; qualified: number }>;
  stats: {
    runs: number;
    candidatesReviewed: number;
    datesBooked: number;
    feedbackCount: number;
    avgRating: number | null;
  };
  learnings: Array<{ at: number; text: string; candidateName?: string }>;
};

const STRENGTH_WIDTH = { low: "33%", medium: "66%", high: "100%" } as const;

function ConfidenceRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f5f5f4" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-stone-800">{score}%</span>
        <span className="text-[10px] text-stone-400 uppercase tracking-wide">confidence</span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [providerChoice, setProviderChoice] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  function refresh() {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(refresh, []);

  async function connect(sourceId: string, provider?: string) {
    setConnecting(sourceId);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect_source", source: sourceId, provider }),
    });
    // Rebuild the persona so the new source immediately shapes the profile.
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "build_persona" }),
    });
    setConnecting(null);
    refresh();
  }

  async function importAiMemory(provider: string) {
    setImportError(null);
    setConnecting("ai_assistant");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import_ai_memory", provider, content: importText }),
    });
    setConnecting(null);
    if (!res.ok) {
      const d = await res.json();
      setImportError(d.error ?? "Import failed");
      return;
    }
    setImportOpen(false);
    setImportText("");
    refresh();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_artifact", label: "Personal note", content: noteText }),
    });
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "build_persona" }),
    });
    setSavingNote(false);
    setNoteText("");
    setNoteOpen(false);
    refresh();
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable; the prompt is selectable as fallback.
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const maxScore = Math.max(100, ...data.scoreTrend.map((s) => s.bestScore));

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">What your agent knows</h1>
          <p className="text-sm text-stone-500">
            A transparent look at what your agent has learned about you, and how it&apos;s performing.
          </p>
        </div>

        {data.persona && (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ConfidenceRing score={data.confidence.score} />
              <div className="flex-1 w-full space-y-2">
                <h2 className="text-sm font-semibold text-stone-700">
                  How well your agent knows you
                </h2>
                {data.confidence.factors.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="text-xs text-stone-500 w-44 flex-shrink-0">{f.label}</span>
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-300 rounded-full transition-all duration-500"
                        style={{ width: `${f.max > 0 ? (f.points / f.max) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-400 w-12 text-right">
                      {f.points}/{f.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100 space-y-3">
              {data.connectedConnectors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 uppercase tracking-wide mr-1">
                    Connected
                  </span>
                  {data.connectedConnectors.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 text-xs bg-stone-50 border border-stone-150 text-stone-600 rounded-full px-2.5 py-1"
                    >
                      {c.icon} {c.id === "ai_assistant" && data.aiProvider ? data.aiProvider : c.label}
                    </span>
                  ))}
                  {data.connectedConnectors.some((c) => c.id === "ai_assistant") && (
                    <button
                      onClick={() => setImportOpen((o) => !o)}
                      className="text-[11px] text-rose-400 hover:text-rose-500 underline ml-1"
                    >
                      Update AI import
                    </button>
                  )}
                </div>
              )}

              {data.suggestedConnectors.length > 0 && (
                <p className="text-sm text-stone-600">
                  Want a sharper read? Each connector teaches your agent something it can&apos;t
                  infer otherwise:
                </p>
              )}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {data.suggestedConnectors.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-150 bg-stone-50 px-3.5 py-3"
                    >
                      <span className="text-xl flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700">{c.label}</p>
                        <p className="text-[11px] text-stone-400 leading-snug">{c.unlocks}</p>
                        {c.providers && (
                          <select
                            value={providerChoice[c.id] ?? c.providers[0]}
                            onChange={(e) =>
                              setProviderChoice((p) => ({ ...p, [c.id]: e.target.value }))
                            }
                            className="mt-1.5 text-[11px] border border-stone-200 rounded-lg px-1.5 py-1 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-rose-300"
                          >
                            {c.providers.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          c.id === "ai_assistant"
                            ? setImportOpen((o) => !o)
                            : connect(c.id, c.providers ? providerChoice[c.id] ?? c.providers[0] : undefined)
                        }
                        disabled={connecting !== null}
                        className="text-xs font-medium rounded-full bg-stone-900 text-white px-3 py-1.5 hover:bg-stone-700 disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                      >
                        {connecting === c.id ? "…" : `+${c.boost}%`}
                      </button>
                    </div>
                  ))}
                </div>
                {noteOpen ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                      placeholder="Tell your agent something it can't learn from your accounts — what you're looking for, past patterns, dealbreakers…"
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={addNote}
                        disabled={savingNote || !noteText.trim()}
                        className="rounded-full bg-stone-900 text-white text-xs font-medium px-4 py-2 hover:bg-stone-700 disabled:opacity-40"
                      >
                        {savingNote ? "Teaching your agent…" : "Add note (+5%)"}
                      </button>
                      <button
                        onClick={() => setNoteOpen(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNoteOpen(true)}
                    className="text-xs text-stone-400 hover:text-rose-500 underline"
                  >
                    Or write your agent a personal note (+5%)
                  </button>
                )}

                {importOpen && (() => {
                  const ai = data.suggestedConnectors.find((c) => c.id === "ai_assistant") ?? {
                    boost: AI_CONNECTOR.weight,
                    providers: AI_CONNECTOR.providers,
                  };
                  const provider =
                    providerChoice["ai_assistant"] ?? data.aiProvider ?? ai.providers?.[0] ?? "Claude";
                  return (
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">
                          Import your {provider} memory
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                          No account linking needed — your AI writes the summary, you bring it here.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-stone-500">
                          1 · Copy this prompt and send it to {provider}
                        </p>
                        <div className="rounded-xl bg-stone-50 border border-stone-100 p-3.5 text-xs text-stone-600 leading-relaxed select-all">
                          {AI_IMPORT_PROMPT}
                        </div>
                        <button
                          onClick={copyPrompt}
                          className="text-xs font-medium rounded-full border border-stone-200 px-3.5 py-1.5 text-stone-600 hover:border-stone-300"
                        >
                          {copied ? "Copied ✓" : "Copy prompt"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-stone-500">
                          2 · Paste {provider}&apos;s reply here
                        </p>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          rows={6}
                          placeholder={`Paste the summary ${provider} gave you…`}
                          className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                        <p className="text-[11px] text-stone-400 leading-relaxed">
                          Review it before importing — leave out anything you&apos;d rather your agent
                          not know. Every inference it makes will be visible (and correctable) on your
                          persona page.
                        </p>
                      </div>
                      {importError && <p className="text-xs text-red-500">{importError}</p>}
                      <button
                        onClick={() => importAiMemory(provider)}
                        disabled={connecting !== null || importText.trim().length === 0}
                        className="rounded-full bg-stone-900 text-white text-sm font-medium px-5 py-2 hover:bg-stone-700 disabled:opacity-40"
                      >
                        {connecting === "ai_assistant" ? "Importing…" : `Import & teach my agent (+${ai.boost}%)`}
                      </button>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-stone-100" />
                  <span className="text-[11px] text-stone-400 uppercase tracking-wide">or</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>
                <Link
                  href="/agent-run"
                  className="block text-center rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2.5 hover:bg-rose-600 transition-colors"
                >
                  Good enough — send my agent out as-is →
                </Link>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Agent runs", value: data.stats.runs },
            { label: "People reviewed", value: data.stats.candidatesReviewed },
            { label: "Dates booked", value: data.stats.datesBooked },
            {
              label: "Avg date rating",
              value: data.stats.avgRating !== null ? `${data.stats.avgRating}★` : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center"
            >
              <p className="text-2xl font-bold text-stone-800">{s.value}</p>
              <p className="text-xs text-stone-400 mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        {data.persona ? (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700">
              Your value weights — what the agent optimizes for
            </h2>
            <div className="space-y-2.5">
              {[...data.persona.values]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return order[a.strength] - order[b.strength];
                })
                .map((v) => (
                  <div key={v.key} className="flex items-center gap-3">
                    <span className="text-sm text-stone-600 w-24 capitalize">{v.key}</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          v.strength === "high"
                            ? "bg-rose-400"
                            : v.strength === "medium"
                              ? "bg-rose-300"
                              : "bg-rose-200"
                        }`}
                        style={{ width: STRENGTH_WIDTH[v.strength] }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 w-14">{v.strength}</span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-stone-400">
              These shift automatically when you rate dates — that&apos;s your agent learning.
            </p>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center space-y-3">
            <p className="text-sm text-stone-500">No persona yet — your agent knows nothing!</p>
            <Link
              href="/onboarding"
              className="inline-block rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Build my profile
            </Link>
          </section>
        )}

        {data.accuracy.rated > 0 && (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">
              How accurate are your agent&apos;s reads?
            </h2>
            <div className="flex h-3 rounded-full overflow-hidden">
              {data.accuracy.accurate > 0 && (
                <div
                  className="bg-emerald-400"
                  style={{ width: `${(data.accuracy.accurate / data.accuracy.rated) * 100}%` }}
                />
              )}
              {data.accuracy.somewhat > 0 && (
                <div
                  className="bg-amber-300"
                  style={{ width: `${(data.accuracy.somewhat / data.accuracy.rated) * 100}%` }}
                />
              )}
              {data.accuracy.wrong > 0 && (
                <div
                  className="bg-red-300"
                  style={{ width: `${(data.accuracy.wrong / data.accuracy.rated) * 100}%` }}
                />
              )}
            </div>
            <p className="text-xs text-stone-500">
              Of {data.accuracy.rated} assumptions you rated: {data.accuracy.accurate} accurate ·{" "}
              {data.accuracy.somewhat} somewhat · {data.accuracy.wrong} wrong
            </p>
          </section>
        )}

        {data.scoreTrend.length > 0 && (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700">Match quality per run</h2>
            <div className="flex items-end gap-2 h-32">
              {data.scoreTrend.map((s, i) => (
                <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-stone-400">{s.bestScore}</span>
                  <div
                    className={`w-full rounded-t-md ${
                      s.qualified > 0 ? "bg-rose-400" : "bg-stone-200"
                    }`}
                    style={{ height: `${(s.bestScore / maxScore) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400">
              Best compatibility score per agent run. Pink bars produced at least one qualified
              match.
            </p>
          </section>
        )}

        {data.learnings.length > 0 && (
          <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">Recent learnings from dates</h2>
            {data.learnings.slice(0, 8).map((l, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-base flex-shrink-0">🤖</span>
                <div>
                  <p className="text-sm text-stone-600 leading-relaxed">{l.text}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {l.candidateName ? `After date with ${l.candidateName} · ` : ""}
                    {new Date(l.at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
