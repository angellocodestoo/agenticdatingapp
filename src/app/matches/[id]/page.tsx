"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type {
  ConversationTurn,
  MatchReport,
  DateProposal,
  WarmupCall,
  Candidate,
} from "@/lib/types";

type Phase =
  | "idle"
  | "streaming"
  | "report"
  | "eliminated"
  | "proposed"
  | "accepted"
  | "declined";

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color =
    pct >= 70 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-stone-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TurnBubble({ turn }: { turn: ConversationTurn }) {
  if (turn.role === "system") {
    return (
      <div className="text-center">
        <span className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
          {turn.content}
        </span>
      </div>
    );
  }
  const isA = turn.role === "agent_a";
  return (
    <div className={`flex gap-2.5 ${isA ? "flex-row" : "flex-row-reverse"}`}>
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isA ? "bg-rose-100 text-rose-600" : "bg-stone-100 text-stone-600"
        }`}
      >
        {isA ? "A" : "B"}
      </div>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isA
            ? "bg-rose-50 text-stone-700 rounded-tl-sm"
            : "bg-stone-100 text-stone-700 rounded-tr-sm"
        }`}
      >
        {turn.content}
      </div>
    </div>
  );
}

function formatDatetime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [proposal, setProposal] = useState<DateProposal | null>(null);
  const [call, setCall] = useState<WarmupCall | null>(null);
  const [proposing, setProposing] = useState(false);
  const [responding, setResponding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((cands: Candidate[]) => {
        const found = cands.find((c) => c.id === id);
        setCandidate(found ?? null);
      });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function startConversation() {
    setPhase("streaming");
    setTurns([]);
    setReport(null);

    const es = new EventSource(`/api/match?candidateId=${id}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "turn") {
        setTurns((prev) => [...prev, data.turn as ConversationTurn]);
      } else if (data.type === "report") {
        const r = data.report as MatchReport;
        setReport(r);
        es.close();
        if (r.redFlagEliminatedReason) {
          setPhase("eliminated");
        } else {
          setPhase("report");
        }
      }
    };
    es.onerror = () => {
      es.close();
      setPhase("idle");
    };
  }

  async function proposeDate() {
    if (!report) return;
    setProposing(true);
    const res = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "propose_date",
        report,
        candidateId: id,
      }),
    });
    const data = await res.json();
    setProposal(data.proposal);
    setPhase("proposed");
    setProposing(false);
  }

  async function respondProposal(response: "accepted" | "declined") {
    if (!proposal) return;
    setResponding(true);
    const res = await fetch("/api/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "respond_proposal",
        proposalId: proposal.proposalId,
        response,
      }),
    });
    const data = await res.json();
    setProposal(data.proposal);
    if (data.call) setCall(data.call);
    setPhase(response);
    setResponding(false);
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const p = candidate.persona;
  const overall = report?.score.overall ?? 0;
  const overallColor =
    overall >= 75 ? "text-emerald-600" : overall >= 55 ? "text-amber-600" : "text-red-500";

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50 to-amber-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-1">
          <a href="/matches" className="text-xs text-rose-400 hover:text-rose-600 transition-colors">
            ← All matches
          </a>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-xl flex-shrink-0">
              {p.displayName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900">{p.displayName}</h1>
              <p className="text-xs text-stone-400 italic">{p.headline}</p>
            </div>
          </div>
        </div>

        {/* Candidate mini profile */}
        {phase === "idle" && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 shadow-sm">
            <p className="text-sm text-stone-600 leading-relaxed">{p.bio}</p>
            <div className="flex flex-wrap gap-2">
              {p.values
                .filter((v) => v.strength === "high")
                .map((v) => (
                  <span key={v.key} className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full capitalize">
                    {v.key}
                  </span>
                ))}
              {p.interests.slice(0, 4).map((i) => (
                <span key={i} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                  {i}
                </span>
              ))}
            </div>
            {p.yellowFlags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.yellowFlags.map((f) => (
                  <span key={f.key} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    ⚡ {f.key.replace(/_/g, " ")} {f.note ? `— ${f.note}` : ""}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={startConversation}
              className="w-full mt-2 rounded-full bg-rose-500 text-white py-3 text-sm font-medium hover:bg-rose-600 transition-colors"
            >
              Let the agents talk →
            </button>
          </div>
        )}

        {/* Conversation stream */}
        {(phase === "streaming" || turns.length > 0) && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-xs font-medium text-stone-600">Agent conversation</span>
              {phase === "streaming" && (
                <span className="ml-auto text-xs text-stone-400">Live…</span>
              )}
            </div>
            <div className="px-5 py-4 space-y-4 max-h-80 overflow-y-auto">
              {turns.map((turn, i) => (
                <TurnBubble key={i} turn={turn} />
              ))}
              {phase === "streaming" && (
                <div className="flex gap-1 pl-9">
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Eliminated */}
        {phase === "eliminated" && report && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <span>✕</span>
              <span>Match eliminated</span>
            </div>
            <p className="text-sm text-red-500">{report.redFlagEliminatedReason}</p>
            <a href="/matches" className="text-xs text-stone-500 underline">
              Back to candidates
            </a>
          </div>
        )}

        {/* Match report */}
        {phase !== "idle" && phase !== "streaming" && phase !== "eliminated" && report && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800">Match Report</span>
              <span className={`text-2xl font-bold tabular-nums ${overallColor}`}>
                {overall}
                <span className="text-sm font-normal text-stone-400">/100</span>
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-stone-600 leading-relaxed">{report.summary}</p>

              <div className="space-y-2.5">
                <ScoreBar label="Values alignment" value={report.score.breakdown.values} />
                <ScoreBar label="Lifestyle fit" value={report.score.breakdown.lifestyle} />
                <ScoreBar label="Logistics" value={report.score.breakdown.logistics} />
                {report.score.breakdown.yellowFlagsPenalty > 0 && (
                  <ScoreBar label="Yellow flag penalty" value={report.score.breakdown.yellowFlagsPenalty} />
                )}
              </div>

              {report.highlights.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Highlights</div>
                  <ul className="space-y-1">
                    {report.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stone-600">
                        <span className="text-emerald-500 flex-shrink-0">✓</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.risks.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">Watch out</div>
                  <ul className="space-y-1">
                    {report.risks.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stone-600">
                        <span className="text-amber-500 flex-shrink-0">⚡</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.suggestedFirstDate.venueName && (
                <div className="bg-stone-50 rounded-xl p-4 space-y-1 border border-stone-100">
                  <div className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                    Suggested first date
                  </div>
                  <div className="text-sm font-semibold text-stone-800">
                    {report.suggestedFirstDate.venueName}
                  </div>
                  {report.suggestedFirstDate.neighborhood && (
                    <div className="text-xs text-stone-400">{report.suggestedFirstDate.neighborhood}</div>
                  )}
                  <p className="text-xs text-stone-500 leading-relaxed">{report.suggestedFirstDate.why}</p>
                </div>
              )}
            </div>

            {phase === "report" && (
              <div className="px-5 pb-5">
                <button
                  onClick={proposeDate}
                  disabled={proposing}
                  className="w-full rounded-full bg-stone-900 text-white py-3 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {proposing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Finding the perfect time…
                    </>
                  ) : (
                    "Have your concierge propose a date →"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Date proposal */}
        {proposal && (phase === "proposed" || phase === "accepted" || phase === "declined") && (
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              phase === "accepted"
                ? "bg-emerald-50 border-emerald-200"
                : phase === "declined"
                ? "bg-stone-50 border-stone-200 opacity-70"
                : "bg-white border-stone-200"
            }`}
          >
            <div className="px-5 py-4 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800">Date Proposal</span>
                {phase === "accepted" && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    Accepted
                  </span>
                )}
                {phase === "declined" && (
                  <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                    Declined
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-stone-400">When</div>
                <div className="text-sm font-medium text-stone-800">
                  {formatDatetime(proposal.when.start)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-stone-400">Where</div>
                <div className="text-sm font-medium text-stone-800">{proposal.where.venueName}</div>
                {proposal.where.addressLine && (
                  <div className="text-xs text-stone-400">{proposal.where.addressLine}</div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs text-stone-400">Activity</div>
                <div className="text-sm text-stone-600">{proposal.activity}</div>
              </div>
            </div>

            {phase === "proposed" && (
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => respondProposal("accepted")}
                  disabled={responding}
                  className="flex-1 rounded-full bg-emerald-500 text-white py-3 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {responding ? "…" : "Accept"}
                </button>
                <button
                  onClick={() => respondProposal("declined")}
                  disabled={responding}
                  className="flex-1 rounded-full border border-stone-200 text-stone-600 py-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Warm-up call card */}
        {call && phase === "accepted" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
              <span className="text-base">📞</span>
              <span className="text-sm font-semibold text-stone-800">Warm-up call scheduled</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-stone-500 leading-relaxed">
                A 30-minute phone call has been scheduled the day before your date. You&apos;ll each receive
                a masked number — so the conversation feels real before you meet.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Call time</span>
                  <span className="font-medium text-stone-700">{formatDatetime(call.when.start)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Your masked number</span>
                  <span className="font-mono text-stone-700">{call.maskedNumberA}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-400">Their masked number</span>
                  <span className="font-mono text-stone-700">{call.maskedNumberB}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  Your agent will brief you with conversation starters and key talking points before the call.
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === "accepted" && (
          <a
            href="/matches"
            className="block text-center text-sm text-stone-400 hover:text-rose-500 transition-colors"
          >
            See other matches →
          </a>
        )}
      </div>
    </main>
  );
}
