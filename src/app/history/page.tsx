"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { DateFeedback, DateProposal, WarmupCall } from "@/lib/types";

type DateEntry = {
  proposal: DateProposal;
  candidateName: string;
  score: number | null;
  call: WarmupCall | null;
  feedback: DateFeedback | null;
  isPast: boolean;
  needsFeedback: boolean;
};

type RunEntry = {
  id: string;
  createdAt: number;
  candidateCount: number;
  qualifiedCount: number;
  bestScore: number;
  qualified: Array<{ candidateId: string; candidateName: string; score: number }>;
};

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition-transform hover:scale-110 ${
            n <= value ? "" : "grayscale opacity-30"
          }`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

function FeedbackForm({
  entry,
  onDone,
}: {
  entry: DateEntry;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [chemistry, setChemistry] = useState(0);
  const [conversation, setConversation] = useState(0);
  const [wouldSeeAgain, setWouldSeeAgain] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [learnings, setLearnings] = useState<string[] | null>(null);

  async function submit() {
    if (!rating || wouldSeeAgain === null) return;
    setBusy(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId: entry.proposal.proposalId,
        rating,
        chemistry: chemistry || rating,
        conversation: conversation || rating,
        wouldSeeAgain,
        notes: notes || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setLearnings(data.learnings ?? []);
    }
  }

  if (learnings) {
    return (
      <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
        <p className="text-sm font-medium text-emerald-700">🤖 Your agent learned:</p>
        {learnings.map((l, i) => (
          <p key={i} className="text-sm text-emerald-600 leading-relaxed">
            {l}
          </p>
        ))}
        <button onClick={onDone} className="text-sm text-emerald-700 font-medium underline">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-stone-50 border border-stone-100 p-4 space-y-4">
      <p className="text-sm font-medium text-stone-700">
        How was your date with {entry.candidateName}?
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Overall</p>
          <Stars value={rating} onChange={setRating} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Chemistry</p>
          <Stars value={chemistry} onChange={setChemistry} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-stone-500">Conversation</p>
          <Stars value={conversation} onChange={setConversation} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-stone-500">Would you see them again?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setWouldSeeAgain(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              wouldSeeAgain === true
                ? "bg-emerald-500 text-white"
                : "bg-white border border-stone-200 text-stone-600"
            }`}
          >
            Yes 💚
          </button>
          <button
            onClick={() => setWouldSeeAgain(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              wouldSeeAgain === false
                ? "bg-stone-700 text-white"
                : "bg-white border border-stone-200 text-stone-600"
            }`}
          >
            No
          </button>
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything your agent should know? (optional)"
        rows={2}
        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
      />
      <button
        onClick={submit}
        disabled={busy || !rating || wouldSeeAgain === null}
        className="rounded-full bg-rose-500 text-white font-medium px-5 py-2 text-sm hover:bg-rose-600 disabled:opacity-40 transition-colors"
      >
        {busy ? "Teaching your agent…" : "Submit & teach your agent"}
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openFeedback, setOpenFeedback] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        setDates(data.dates ?? []);
        setRuns(data.runs ?? []);
        setLoaded(true);
      });
  }, []);

  useEffect(refresh, [refresh]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = dates.filter((d) => d.proposal.status === "accepted" && !d.isPast);
  const past = dates.filter((d) => d.proposal.status !== "accepted" || d.isPast);

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Your dates</h1>
          <p className="text-sm text-stone-500">
            Everything your agent has set up — and what it learned from each one.
          </p>
        </div>

        {dates.length === 0 && runs.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center space-y-3">
            <p className="text-3xl">🤖</p>
            <p className="text-sm text-stone-500">
              No history yet. Send your agent out to find someone.
            </p>
            <Link
              href="/agent-run"
              className="inline-block rounded-full bg-rose-500 text-white text-sm font-medium px-5 py-2 hover:bg-rose-600"
            >
              Run my agent
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Upcoming
            </h2>
            {upcoming.map((d) => (
              <div
                key={d.proposal.proposalId}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-stone-800">{d.candidateName}</p>
                  {d.score !== null && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      {d.score}% match
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-600">{d.proposal.activity}</p>
                <p className="text-sm text-stone-500">
                  📅 {formatDatetime(d.proposal.when.start)}
                </p>
                {d.call && (
                  <p className="text-sm text-stone-500">
                    📞 Warm-up call {formatDatetime(d.call.when.start)}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Past & pending
            </h2>
            {past.map((d) => (
              <div
                key={d.proposal.proposalId}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">{d.candidateName}</p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {d.proposal.activity} · {formatDatetime(d.proposal.when.start)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      d.proposal.status === "accepted"
                        ? "bg-emerald-50 text-emerald-600"
                        : d.proposal.status === "declined"
                          ? "bg-stone-100 text-stone-500"
                          : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {d.proposal.status}
                  </span>
                </div>

                {d.feedback && (
                  <div className="mt-3 rounded-xl bg-stone-50 p-3.5 space-y-1.5">
                    <p className="text-xs text-stone-500">
                      You rated this {"⭐".repeat(d.feedback.rating)} ·{" "}
                      {d.feedback.wouldSeeAgain ? "would see again 💚" : "not a repeat"}
                    </p>
                    {d.feedback.agentLearnings.slice(0, 1).map((l, i) => (
                      <p key={i} className="text-xs text-stone-600">
                        🤖 {l}
                      </p>
                    ))}
                  </div>
                )}

                {d.proposal.status === "proposed" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        await fetch("/api/agent-run", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "respond_proposal",
                            proposalId: d.proposal.proposalId,
                            response: "accepted",
                          }),
                        });
                        refresh();
                      }}
                      className="rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 transition-colors"
                    >
                      Confirm date 💕
                    </button>
                    <button
                      onClick={async () => {
                        await fetch("/api/agent-run", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "respond_proposal",
                            proposalId: d.proposal.proposalId,
                            response: "declined",
                          }),
                        });
                        refresh();
                      }}
                      className="rounded-full border border-stone-200 text-stone-500 text-sm px-4 py-2 hover:border-stone-300 transition-colors"
                    >
                      Pass
                    </button>
                  </div>
                )}

                {d.needsFeedback &&
                  (openFeedback === d.proposal.proposalId ? (
                    <FeedbackForm
                      entry={d}
                      onDone={() => {
                        setOpenFeedback(null);
                        refresh();
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setOpenFeedback(d.proposal.proposalId)}
                      className="mt-3 rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2 hover:bg-stone-700 transition-colors"
                    >
                      Rate this date → teach your agent
                    </button>
                  ))}
              </div>
            ))}
          </section>
        )}

        {runs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
              Agent runs
            </h2>
            {runs.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-stone-700">
                    Reviewed <strong>{r.candidateCount}</strong> people ·{" "}
                    <strong>{r.qualifiedCount}</strong> qualified
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(r.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {r.qualified.length > 0 &&
                      ` — ${r.qualified.map((q) => `${q.candidateName} (${q.score}%)`).join(", ")}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    r.bestScore > 80 ? "text-emerald-600" : "text-stone-400"
                  }`}
                >
                  {r.bestScore}%
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
