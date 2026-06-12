"use client";

import { useState, useEffect, useRef } from "react";
import type { ConversationTurn, DateProposal, MatchReport, Persona } from "@/lib/types";
import { avatarFor, ageFromPersona, distanceFor } from "@/lib/avatar";
import { MATCH_DATE_THRESHOLD } from "@/lib/matchThreshold";

type ScanResult = { candidateId: string; candidateName: string; eliminated: boolean; reason?: string };
type ScoreResult = {
  candidateId: string;
  candidateName: string;
  score: number;
  qualifiesForDate?: boolean;
  initialScore?: number;
};
type LiveTurn = ConversationTurn & { candidateName: string; candidateId: string };
type PhaseId = "idle" | "scanning" | "evaluating" | "deep" | "choose" | "scheduling" | "done";

type QualifiedMatch = {
  candidateId: string;
  candidateName: string;
  persona: Persona;
  report: MatchReport;
  score: number;
  venueName: string;
  venueWhy: string;
};

type CallTopic = { kind: "fun" | "philosophical"; prompt: string; why: string };
type WarmupCall = {
  callId: string;
  when: { start: string; end: string; timezone: string };
  maskedNumberA: string;
  maskedNumberB: string;
  status: string;
  topics: CallTopic[];
};

function fmtShort(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function Avatar({ seed, name, size = 40 }: { seed: string; name: string; size?: number }) {
  const { gradient, initial } = avatarFor(seed, name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm"
      style={{ background: gradient, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export default function AgentRunPage() {
  const [phase, setPhase] = useState<PhaseId>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [liveTurns, setLiveTurns] = useState<LiveTurn[]>([]);
  const [activeDeepId, setActiveDeepId] = useState<string | null>(null);
  const [typingRole, setTypingRole] = useState<"agent_a" | "agent_b" | null>(null);
  const [scores, setScores] = useState<ScoreResult[]>([]);
  const [personaMap, setPersonaMap] = useState<Record<string, Persona>>({});
  const [qualifiedMatches, setQualifiedMatches] = useState<QualifiedMatch[]>([]);
  const [noQualifiedMsg, setNoQualifiedMsg] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<QualifiedMatch | null>(null);
  const [proposal, setProposal] = useState<DateProposal | null>(null);
  const [venueWhy, setVenueWhy] = useState("");
  const [call, setCall] = useState<WarmupCall | null>(null);
  const [callReason, setCallReason] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [responding, setResponding] = useState(false);
  const [hasPersona, setHasPersona] = useState<boolean | null>(null);
  const [needsBasics, setNeedsBasics] = useState(false);
  const [threshold, setThreshold] = useState(MATCH_DATE_THRESHOLD);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [pausedMsg, setPausedMsg] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const convoRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      setHasPersona(!!d.persona);
      // Personas built before basics existed can't drive life-stage matching.
      setNeedsBasics(!!d.persona && !d.persona.age);
    });
    fetch("/api/settings").then(r => r.json()).then(s => {
      if (typeof s.threshold === "number") setThreshold(s.threshold);
      if (typeof s.radiusMiles === "number") setRadiusMiles(s.radiusMiles);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    convoRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTurns, typingRole]);

  async function startRun() {
    if (started.current) return;
    // The agent can be paused from Settings — check before opening the stream.
    const settings = await fetch("/api/settings").then((r) => r.json()).catch(() => null);
    if (settings?.paused) {
      setPausedMsg("Your agent is paused. Resume it in Settings to start a new run.");
      return;
    }
    if (typeof settings?.threshold === "number") setThreshold(settings.threshold);
    setPausedMsg(null);
    setStreamError(null);
    finished.current = false;
    started.current = true;
    setPhase("scanning");
    setStatusMsg("Waking up your agent…");
    setScanResults([]);
    setScores([]);
    setLiveTurns([]);
    setQualifiedMatches([]);
    setNoQualifiedMsg(null);
    setSelectedMatch(null);
    setProposal(null);
    setCall(null);

    const es = new EventSource("/api/agent-run");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "status") setStatusMsg(data.message);
      else if (data.type === "phase") { setPhase(data.phase); if (data.message) setStatusMsg(data.message); }
      else if (data.type === "scan_result") {
        setScanResults(p => [...p, data]);
        if (data.persona) setPersonaMap(m => ({ ...m, [data.candidateId]: data.persona }));
      }
      else if (data.type === "scored") {
        setScores(p => [...p, {
          candidateId: data.candidateId,
          candidateName: data.candidateName,
          score: data.score,
          qualifiesForDate: data.qualifiesForDate,
        }]);
        if (data.persona) setPersonaMap(m => ({ ...m, [data.candidateId]: data.persona }));
      }
      else if (data.type === "deep_start") {
        setActiveDeepId(data.candidateId);
        setLiveTurns([]);
        if (data.persona) setPersonaMap(m => ({ ...m, [data.candidateId]: data.persona }));
      }
      else if (data.type === "typing") setTypingRole(data.role);
      else if (data.type === "turn") {
        setTypingRole(null);
        setLiveTurns(p => [...p, { ...data.turn, candidateName: data.candidateName, candidateId: data.candidateId }]);
      }
      else if (data.type === "conversation_complete") {
        if (data.persona) setPersonaMap(m => ({ ...m, [data.candidateId]: data.persona }));
        // The conversation may have moved the score — update to the final read.
        setScores(prev => prev.map(s =>
          s.candidateId === data.candidateId
            ? {
                ...s,
                score: data.score,
                qualifiesForDate: data.qualifiesForDate,
                initialScore: data.initialScore ?? (data.initialScore === 0 ? 0 : s.initialScore),
              }
            : s
        ));
      }
      else if (data.type === "no_matches") {
        setNoQualifiedMsg(data.message);
        setStatusMsg("Run complete — no one cleared screening.");
        setPhase("done");
        finished.current = true;
        es.close();
      }
      else if (data.type === "no_qualified") {
        setNoQualifiedMsg(data.message);
        setPhase("done");
        finished.current = true;
        es.close();
      }
      else if (data.type === "qualified_matches") {
        const matches = data.matches as QualifiedMatch[];
        setQualifiedMatches(matches);
        const map: Record<string, Persona> = {};
        matches.forEach(m => { map[m.candidateId] = m.persona; });
        setPersonaMap(m => ({ ...m, ...map }));
        setPhase("choose");
        finished.current = true;
        es.close();
      }
    };
    es.onerror = () => {
      es.close();
      if (!finished.current) {
        setStreamError("Lost connection to your agent mid-run.");
        setPhase("done");
      }
    };
  }

  /** Reset everything and send the agent out again. */
  function runAgain() {
    started.current = false;
    setPhase("idle");
    setStatusMsg("");
    setNoQualifiedMsg(null);
    setStreamError(null);
    setProposal(null);
    setSelectedMatch(null);
    setCall(null);
    // Let React paint the idle state, then immediately relaunch.
    setTimeout(() => startRun(), 50);
  }

  async function chooseMatch(match: QualifiedMatch) {
    setSelecting(true);
    setSelectedMatch(match);
    const res = await fetch("/api/agent-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select_match", candidateId: match.candidateId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSelecting(false);
      alert(data.error ?? "Could not book date");
      return;
    }
    setProposal(data.proposal);
    setVenueWhy(data.venueWhy ?? "");
    setPhase("scheduling");
    setSelecting(false);
  }

  async function respondProposal(response: "accepted" | "declined") {
    if (!proposal) return;
    setResponding(true);
    const res = await fetch("/api/agent-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond_proposal", proposalId: proposal.proposalId, response }),
    });
    const data = await res.json();
    setResponding(false);
    if (response === "accepted") {
      setProposal(data.proposal);
      if (data.call) setCall(data.call);
      if (data.reason) setCallReason(data.reason);
      setPhase("done");
      return;
    }
    // Declined: return to the qualified list so they can pick someone else.
    setProposal(null);
    setSelectedMatch(null);
    setPhase("choose");
    setStatusMsg("No problem — pick someone else, or send your agent back out.");
  }

  if (hasPersona === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!hasPersona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-stone-500 text-sm">Build your profile first.</p>
        <a href="/onboarding" className="text-rose-500 text-sm font-medium underline">Go to onboarding</a>
      </div>
    );
  }

  const working = phase !== "idle" && phase !== "choose" && phase !== "done" && phase !== "scheduling";
  const activeName = activeDeepId
    ? scores.find(s => s.candidateId === activeDeepId)?.candidateName ?? ""
    : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 relative overflow-x-hidden pb-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-rose-200/40 rounded-full blur-3xl animate-orb-float" />
        <div className="absolute top-1/3 -right-32 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl animate-orb-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative max-w-md mx-auto px-5 py-10 space-y-7">
        <a href="/persona" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-500 transition-colors">
          ← Your profile
        </a>

        {phase === "idle" && (
          <div className="animate-fade-up flex flex-col items-center text-center pt-10 space-y-7">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-4xl shadow-xl shadow-rose-300/50 animate-orb-float">💘</div>
              <span className="absolute inset-0 rounded-full ring-4 ring-rose-300/40 animate-ping" />
            </div>
            <div className="space-y-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 leading-tight">Ready when you are.</h1>
              <p className="text-[15px] text-stone-500 max-w-xs mx-auto leading-relaxed">
                Fresh people nearby every time. Your agent talks to everyone who passes screening — you pick who gets a date ({threshold}%+ only).
              </p>
              <p className="text-xs text-stone-400">
                Searching within <span className="font-semibold text-stone-500">{radiusMiles} miles</span>
                {" · "}
                <a href="/settings" className="text-rose-400 hover:text-rose-500 underline">adjust</a>
              </p>
            </div>
            <button
              onClick={startRun}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 text-white py-4 text-[15px] font-semibold shadow-lg shadow-rose-300/50 hover:-translate-y-0.5 transition-all"
            >
              Send my agent out 💌
            </button>
            {needsBasics && (
              <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800 leading-relaxed text-left">
                Your profile predates life-stage matching — add your{" "}
                <a href="/onboarding" className="font-semibold underline">basics</a>{" "}
                (age, who you&apos;re seeking, kids) and rebuild so your agent can match on
                life stage, not just interests.
              </div>
            )}
            {pausedMsg && (
              <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800 leading-relaxed">
                💤 {pausedMsg}{" "}
                <a href="/settings" className="font-semibold underline">Open Settings</a>
              </div>
            )}
          </div>
        )}

        {phase !== "idle" && statusMsg && (
          <div className="animate-fade-in flex items-center gap-3 bg-white/80 backdrop-blur rounded-2xl px-4 py-3 border border-rose-100 shadow-sm">
            {working ? (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
            )}
            <span className="text-sm text-stone-600 font-medium">{statusMsg}</span>
          </div>
        )}

        {scanResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-400 px-1">Screening</p>
            <div className="space-y-2">
              {scanResults.map((r, i) => {
                const p = personaMap[r.candidateId];
                return (
                  <div key={r.candidateId} className={`animate-scan-line flex items-center gap-3 px-3.5 py-3 rounded-2xl border shadow-sm ${r.eliminated ? "bg-white/60 border-stone-100" : "bg-white border-rose-100"}`} style={{ animationDelay: `${i * 90}ms` }}>
                    <div className={r.eliminated ? "opacity-40 grayscale" : ""}>
                      <Avatar seed={r.candidateId} name={r.candidateName} size={38} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold ${r.eliminated ? "text-stone-400 line-through" : "text-stone-800"}`}>
                        {r.candidateName}{p ? `, ${ageFromPersona(p)}` : ""}
                      </span>
                      {p && !r.eliminated && <p className="text-[11px] text-stone-400 truncate">{p.headline}</p>}
                      {r.eliminated && r.reason && <p className="text-[11px] text-red-400 truncate">{r.reason}</p>}
                    </div>
                    <span className={`text-xs font-semibold ${r.eliminated ? "text-red-400" : "text-emerald-500"}`}>
                      {r.eliminated ? "No" : "✓"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {scores.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-400 px-1">
              Compatibility · {threshold}%+ qualifies for a date
            </p>
            <div className="space-y-2">
              {[...scores].sort((a, b) => b.score - a.score).map(s => {
                const p = personaMap[s.candidateId];
                return (
                <div key={s.candidateId} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border shadow-sm ${s.qualifiesForDate ? "bg-rose-50/80 border-rose-200" : "bg-white border-stone-100"}`}>
                  <Avatar seed={s.candidateId} name={s.candidateName} size={36} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-stone-800">
                      {s.candidateName}{p ? `, ${ageFromPersona(p)}` : ""}
                    </span>
                    <p className={`text-[10px] font-medium ${s.qualifiesForDate ? "text-rose-500" : "text-stone-400"}`}>
                      {p ? `${distanceFor(s.candidateId, radiusMiles)} mi away` : ""}
                      {s.qualifiesForDate ? `${p ? " · " : ""}Date eligible` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${s.score > threshold ? "text-emerald-600" : "text-stone-400"}`}>
                      {s.score}%
                    </span>
                    {s.initialScore !== undefined && s.initialScore !== s.score && (
                      <p className={`text-[10px] font-medium tabular-nums ${s.score > s.initialScore ? "text-emerald-500" : "text-amber-500"}`}>
                        {s.score > s.initialScore ? "↑" : "↓"} was {s.initialScore}%
                      </p>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {activeDeepId && (liveTurns.length > 0 || typingRole) && (
          <div className="animate-fade-up space-y-2">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-400 px-1">
              Live · {activeName}&apos;s agent
            </p>
            <div className="rounded-3xl bg-white border border-rose-100 shadow-md overflow-hidden">
              <div className="px-4 py-4 space-y-3 max-h-72 overflow-y-auto">
                {liveTurns.map((turn, i) => {
                  if (turn.role === "system") return (
                    <div key={i} className="text-center">
                      <span className="text-[11px] text-stone-400 bg-stone-50 px-3 py-1 rounded-full">{turn.content}</span>
                    </div>
                  );
                  const isMine = turn.role === "agent_a";
                  return (
                    <div key={i} className={`flex gap-2 items-end ${isMine ? "flex-row-reverse" : ""}`}>
                      {isMine
                        ? <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white text-xs font-bold">Y</div>
                        : <Avatar seed={turn.candidateId} name={turn.candidateName} size={28} />}
                      <div className={`max-w-[76%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${isMine ? "bg-gradient-to-br from-rose-500 to-rose-400 text-white rounded-br-sm" : "bg-stone-100 text-stone-700 rounded-bl-sm"}`}>
                        {turn.content}
                      </div>
                    </div>
                  );
                })}
                {typingRole && (
                  <div className={`flex gap-2 items-end ${typingRole === "agent_a" ? "flex-row-reverse" : ""}`}>
                    {typingRole === "agent_a"
                      ? <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white text-xs font-bold">Y</div>
                      : activeDeepId ? <Avatar seed={activeDeepId} name={activeName} size={28} /> : null}
                    <div className="rounded-2xl px-4 py-3 flex gap-1 bg-stone-100">
                      {[0, 160, 320].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={convoRef} />
              </div>
            </div>
          </div>
        )}

        {noQualifiedMsg && (
          <div className="animate-fade-up space-y-3">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800 leading-relaxed">
              {noQualifiedMsg}
            </div>
            <button
              onClick={runAgain}
              className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 text-white py-4 text-[15px] font-semibold shadow-lg shadow-rose-300/50 hover:-translate-y-0.5 transition-all"
            >
              Send my agent out again 💌
            </button>
            <div className="flex justify-center gap-5 text-xs text-stone-400">
              <a href="/settings" className="hover:text-rose-500 underline">Lower your match threshold</a>
              <a href="/settings" className="hover:text-rose-500 underline">Widen your radius</a>
              <a href="/persona" className="hover:text-rose-500 underline">Refine your profile</a>
            </div>
          </div>
        )}

        {streamError && (
          <div className="animate-fade-up space-y-3">
            <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 leading-relaxed">
              {streamError}
            </div>
            <button
              onClick={runAgain}
              className="w-full rounded-2xl bg-stone-900 text-white py-3.5 text-sm font-semibold hover:bg-stone-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {qualifiedMatches.length > 0 && (phase === "choose" || phase === "scheduling" || phase === "done") && (
          <div className="animate-fade-up space-y-3">
            <div className="px-1">
              <h2 className="text-lg font-bold text-stone-900">Your agent recommends</h2>
              <p className="text-sm text-stone-500">Based on the conversations — only matches above {threshold}%.</p>
            </div>
            {qualifiedMatches.map((m) => {
              const isSelected = selectedMatch?.candidateId === m.candidateId;
              return (
                <div
                  key={m.candidateId}
                  className={`rounded-[28px] bg-white shadow-lg overflow-hidden border transition-all ${isSelected ? "border-rose-400 ring-2 ring-rose-200" : "border-rose-100"}`}
                >
                  <div className="relative h-40 flex items-end" style={{ background: avatarFor(m.candidateId, m.candidateName).gradient }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 right-3 bg-white/95 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      {m.score}% match
                    </div>
                    <div className="relative px-5 pb-3 text-white">
                      <h3 className="text-2xl font-bold">
                        {m.candidateName}<span className="font-light">, {ageFromPersona(m.persona)}</span>
                      </h3>
                      <p className="text-xs text-white/85">{m.persona.location.city} · {distanceFor(m.candidateId, radiusMiles)} mi</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-sm text-stone-600 leading-relaxed">{m.report.summary}</p>
                    {m.report.highlights.slice(0, 2).map((h, i) => (
                      <p key={i} className="text-xs text-stone-500 flex gap-2"><span className="text-emerald-500">✓</span>{h}</p>
                    ))}
                    {m.venueName && (
                      <p className="text-xs text-stone-400 border-l-2 border-rose-100 pl-3">
                        Suggested date: <span className="font-medium text-stone-600">{m.venueName}</span>
                        {m.venueWhy && <> — {m.venueWhy}</>}
                      </p>
                    )}
                    {!proposal && (
                      <button
                        onClick={() => chooseMatch(m)}
                        disabled={selecting}
                        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 text-white py-3.5 text-sm font-semibold shadow-md shadow-rose-200 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                      >
                        {selecting && isSelected ? "Setting up your date…" : `Set up a date with ${m.candidateName}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {proposal && proposal.status === "proposed" && (
          <div className="animate-scale-in rounded-[28px] bg-white shadow-xl border border-rose-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-rose-400 via-rose-500 to-amber-400" />
            <div className="px-6 pt-6 pb-2">
              <p className="text-[11px] tracking-wider uppercase text-rose-400 font-semibold">Date on the books</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">{proposal.where.venueName}</h3>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4 border-t border-stone-100 text-sm">
              <div>
                <p className="text-[10px] uppercase text-stone-400 mb-1">When</p>
                <p className="font-semibold text-stone-800">{fmtShort(proposal.when.start)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-stone-400 mb-1">Activity</p>
                <p className="font-semibold text-stone-800 capitalize">{proposal.activity}</p>
              </div>
            </div>
            {venueWhy && <p className="px-6 pb-4 text-xs text-stone-400 italic">&ldquo;{venueWhy}&rdquo;</p>}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => respondProposal("accepted")} disabled={responding}
                className="flex-1 rounded-2xl bg-stone-900 text-white py-3.5 text-sm font-semibold disabled:opacity-50">
                {responding ? "…" : "Confirm date 💕"}
              </button>
              <button onClick={() => respondProposal("declined")} disabled={responding}
                className="px-6 rounded-2xl border border-stone-200 text-stone-500 py-3.5 text-sm">
                Pass
              </button>
            </div>
          </div>
        )}

        {call && proposal?.status === "accepted" && (
          <div className="animate-fade-up space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">✓</div>
              <div>
                <p className="text-sm font-bold text-emerald-700">You&apos;re all set</p>
                <p className="text-xs text-emerald-600">{proposal.where.venueName}</p>
              </div>
            </div>
            <div className="rounded-[28px] bg-white border border-rose-100 shadow-lg p-5 space-y-4">
              <p className="text-sm font-bold text-stone-800">Warm-up call</p>
              <p className="text-xs text-stone-500">{fmtShort(call.when.start)} · {call.maskedNumberA}</p>
              {callReason && <p className="text-xs text-stone-400 italic border-l-2 border-rose-100 pl-3">{callReason}</p>}
              {call.topics.map((topic, i) => (
                <div key={i} className={`rounded-2xl p-4 border ${topic.kind === "fun" ? "bg-amber-50 border-amber-100" : "bg-indigo-50 border-indigo-100"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    {topic.kind === "fun" ? "Light & fun" : "Go deeper"}
                  </p>
                  <p className="text-sm font-semibold text-stone-800">&ldquo;{topic.prompt}&rdquo;</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <a
                href="/history"
                className="block text-center rounded-2xl bg-stone-900 text-white py-3.5 text-sm font-semibold hover:bg-stone-700 transition-colors"
              >
                View in your dates →
              </a>
              <button
                onClick={runAgain}
                className="w-full text-center text-xs text-stone-400 hover:text-rose-500 underline"
              >
                Send my agent out again
              </button>
            </div>
          </div>
        )}

        {phase === "choose" && qualifiedMatches.length > 0 && !proposal && (
          <button
            onClick={runAgain}
            className="w-full text-center text-xs text-stone-400 hover:text-rose-500 underline pt-1"
          >
            None of these? Send my agent back out
          </button>
        )}
      </div>
    </main>
  );
}
