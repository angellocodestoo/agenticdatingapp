import { NextResponse } from "next/server";
import { getState } from "@/lib/store";
import { scriptedEngine } from "@/lib/agent/scriptedEngine";
import { generateCandidates } from "@/lib/candidateGen";
import { MATCH_DATE_THRESHOLD } from "@/lib/matchThreshold";
import {
  getMockFreeBusy,
  getVenueRecommendation,
  getMockMaskedNumber,
} from "@/lib/integrations/mock";
import type {
  CallTopic,
  Candidate,
  DateProposal,
  MatchReport,
  Persona,
  WarmupCall,
} from "@/lib/types";

type AgentRunSession = {
  candidates: Candidate[];
  reports: Record<string, MatchReport>;
};

declare global {
  // eslint-disable-next-line no-var
  var __agentRunProposals: Record<string, DateProposal>;
  // eslint-disable-next-line no-var
  var __agentRunCalls: Record<string, WarmupCall>;
  // eslint-disable-next-line no-var
  var __agentRunSession: AgentRunSession | undefined;
}
globalThis.__agentRunProposals ??= {};
globalThis.__agentRunCalls ??= {};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function send(controller: ReadableStreamDefaultController, encoder: TextEncoder, payload: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const FUN_TOPICS: Array<{
  keys: string[];
  prompt: string;
  why: (k: string) => string;
}> = [
  {
    keys: ["jazz", "live jazz", "music"],
    prompt: "What's the most unexpected place you've heard great live music — the kind that stopped you in your tracks?",
    why: (k) => `You both love ${k}. This gets you trading stories, not resumes.`,
  },
  {
    keys: ["hiking", "running", "outdoor"],
    prompt: "Tell me your best terrible outdoor adventure story — the one you swore you'd never repeat but secretly kind of want to.",
    why: (k) => `You're both into ${k}. Shared misadventures are instant bonding material.`,
  },
  {
    keys: ["fine dining", "cooking", "restaurants", "food", "farmers markets"],
    prompt: "What's the best meal you've ever had, and what made it memorable — the food, the place, or the company?",
    why: (k) => `You both care about food and ${k}. Food memories are surprisingly revealing.`,
  },
  {
    keys: ["travel", "weekend getaways", "adventure"],
    prompt: "Where's a place you've been once that you think about more than you expected to?",
    why: (k) => `You both value ${k}. The places we keep returning to mentally say a lot.`,
  },
  {
    keys: ["tennis", "pickup sports", "fitness", "health"],
    prompt: "If you had to compete in one ridiculous sport you've never trained for, what would you pick and why?",
    why: (k) => `You're both active. Playful competitiveness is a good early read.`,
  },
  {
    keys: ["standup comedy", "comedy shows", "podcasts"],
    prompt: "What's something genuinely funny that's happened to you recently — the kind you've already retold twice?",
    why: () => `Shared humor is one of the strongest predictors of long-term compatibility.`,
  },
  {
    keys: ["modern art", "museums", "cinema", "books"],
    prompt: "What's the last thing — a book, film, exhibit — that genuinely surprised you or changed how you think about something?",
    why: (k) => `You both enjoy ${k}. Intellectual taste is more revealing than small talk.`,
  },
];

const PHILOSOPHICAL_TOPICS: Array<{
  keys: string[];
  prompt: string;
  why: (k: string) => string;
}> = [
  {
    keys: ["growth", "ambition"],
    prompt: "What does the best version of yourself look like in five years — and what's the one thing standing between here and there?",
    why: (k) => `You both prioritize ${k}. This gets honest fast without being an interview.`,
  },
  {
    keys: ["family"],
    prompt: "What's something your family got right that you want to carry forward — and something you consciously want to do differently?",
    why: () => `You both value family. How people relate to their upbringing is deeply revealing.`,
  },
  {
    keys: ["kindness", "community"],
    prompt: "Who's someone outside your inner circle who's quietly shaped how you treat people — and how?",
    why: (k) => `You both care about ${k}. This reveals character without asking about it directly.`,
  },
  {
    keys: ["curiosity", "learning"],
    prompt: "What's a belief you held five years ago that you've since completely reversed — what changed?",
    why: () => `Intellectual honesty and the willingness to be wrong are rare and attractive.`,
  },
  {
    keys: ["stability", "faith"],
    prompt: "What does feeling genuinely settled in your life look like to you — is it a feeling, a circumstance, or something else?",
    why: (k) => `You both value ${k}. This opens up how they think about security and peace.`,
  },
  {
    keys: ["health"],
    prompt: "What's the relationship between how you take care of your body and how you feel about everything else in your life?",
    why: () => `You're both health-oriented. This question reveals how self-aware they are about their own patterns.`,
  },
  {
    keys: ["adventure", "travel"],
    prompt: "If you could trade your current life for a completely different one for one year — different career, city, everything — would you? What would you learn?",
    why: () => `Both adventurous spirits. This surfaces risk tolerance and what they actually want from life.`,
  },
];

function pickTopic(
  bank: typeof FUN_TOPICS,
  sharedInterests: string[],
  sharedValueKeys: string[]
): { prompt: string; why: string } {
  const combined = [
    ...sharedInterests.map((i) => i.toLowerCase()),
    ...sharedValueKeys.map((k) => k.toLowerCase()),
  ];

  for (const entry of bank) {
    const match = entry.keys.find((k) => combined.some((c) => c.includes(k)));
    if (match) return { prompt: entry.prompt, why: entry.why(match) };
  }

  // Fallback — generic but still good.
  const fallback = bank[bank.length - 1];
  return { prompt: fallback.prompt, why: fallback.why("shared interests") };
}

function generateCallTopics(me: Persona, them: Persona): CallTopic[] {
  const sharedInterests = me.interests.filter((i) =>
    them.interests.some(
      (t) => t.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(t.toLowerCase())
    )
  );
  const sharedValueKeys = me.values
    .map((v) => v.key)
    .filter((k) => them.values.some((v) => v.key === k));

  const fun = pickTopic(FUN_TOPICS, sharedInterests, sharedValueKeys);
  const phil = pickTopic(PHILOSOPHICAL_TOPICS, sharedInterests, sharedValueKeys);

  return [
    { kind: "fun", prompt: fun.prompt, why: fun.why },
    { kind: "philosophical", prompt: phil.prompt, why: phil.why },
  ];
}

export async function GET() {
  const state = getState();

  if (!state.me.persona) {
    return NextResponse.json({ error: "Build your persona first" }, { status: 400 });
  }

  const me = state.me.persona;
  const candidates = generateCandidates(me, 5);
  const encoder = new TextEncoder();
  const reports: Record<string, MatchReport> = {};

  const stream = new ReadableStream({
    async start(controller) {
      send(controller, encoder, {
        type: "status",
        message: `Your agent found ${candidates.length} new people nearby to review…`,
      });
      await sleep(1100);

      // ── Phase 1: Quick red-flag screen ──
      send(controller, encoder, { type: "phase", phase: "scanning" });
      await sleep(500);

      const passing: typeof candidates = [];
      for (const candidate of candidates) {
        await sleep(650);
        const { report } = await scriptedEngine.converse(me, candidate);

        if (report.redFlagEliminatedReason) {
          send(controller, encoder, {
            type: "scan_result",
            candidateId: candidate.id,
            candidateName: candidate.persona.displayName,
            eliminated: true,
            reason: report.redFlagEliminatedReason,
          });
        } else {
          passing.push(candidate);
          send(controller, encoder, {
            type: "scan_result",
            candidateId: candidate.id,
            candidateName: candidate.persona.displayName,
            eliminated: false,
          });
        }
      }

      await sleep(800);

      if (passing.length === 0) {
        send(controller, encoder, {
          type: "no_matches",
          message: "No one cleared your dealbreakers this round. Try loosening a filter.",
        });
        controller.close();
        return;
      }

      // ── Phase 2: Score everyone who passed ──
      send(controller, encoder, {
        type: "phase",
        phase: "evaluating",
        message: `${passing.length} cleared screening. Your agent is weighing compatibility…`,
      });
      await sleep(900);

      const results: Array<{ candidate: Candidate; report: MatchReport }> = [];
      for (const candidate of passing) {
        const { report } = await scriptedEngine.converse(me, candidate);
        reports[candidate.id] = report;
        results.push({ candidate, report });
        send(controller, encoder, {
          type: "scored",
          candidateId: candidate.id,
          candidateName: candidate.persona.displayName,
          score: report.score.overall,
          qualifiesForDate: report.score.overall > MATCH_DATE_THRESHOLD,
        });
        await sleep(750);
      }

      results.sort((a, b) => b.report.score.overall - a.report.score.overall);
      const qualified = results.filter(
        (r) => r.report.score.overall > MATCH_DATE_THRESHOLD
      );

      globalThis.__agentRunSession = { candidates, reports };

      // ── Phase 3: Human-paced agent conversations with everyone who passed ──
      send(controller, encoder, {
        type: "phase",
        phase: "deep",
        message:
          passing.length === 1
            ? `Having a real conversation with ${passing[0].persona.displayName}'s agent…`
            : `Your agent is talking with ${passing.length} agents — one at a time…`,
      });
      await sleep(1000);

      for (const { candidate, report } of results) {
        const name = candidate.persona.displayName;
        send(controller, encoder, {
          type: "deep_start",
          candidateId: candidate.id,
          candidateName: name,
          score: report.score.overall,
          qualifiesForDate: report.score.overall > MATCH_DATE_THRESHOLD,
        });
        await sleep(800);

        for (const turn of report.transcript) {
          if (turn.role === "system") {
            send(controller, encoder, {
              type: "turn",
              candidateId: candidate.id,
              candidateName: name,
              turn,
            });
            await sleep(900);
            continue;
          }

          send(controller, encoder, {
            type: "typing",
            role: turn.role,
            candidateId: candidate.id,
            candidateName: name,
          });

          const typingMs = Math.min(2800, Math.max(1200, turn.content.length * 24));
          await sleep(typingMs);

          send(controller, encoder, {
            type: "turn",
            candidateId: candidate.id,
            candidateName: name,
            turn,
          });

          const readMs = Math.min(1600, Math.max(700, turn.content.length * 10));
          await sleep(readMs);
        }

        send(controller, encoder, {
          type: "conversation_complete",
          candidateId: candidate.id,
          candidateName: name,
          score: report.score.overall,
          qualifiesForDate: report.score.overall > MATCH_DATE_THRESHOLD,
          summary: report.summary,
          highlights: report.highlights,
        });
        await sleep(1100);
      }

      // ── Phase 4: Present options (only >80% qualify for a date) ──
      if (qualified.length === 0) {
        send(controller, encoder, {
          type: "no_qualified",
          message: `No one cleared the ${MATCH_DATE_THRESHOLD}% bar for a date this round. Your agent's notes are above — try adjusting dealbreakers or adding more context.`,
          threshold: MATCH_DATE_THRESHOLD,
          allScores: results.map((r) => ({
            candidateId: r.candidate.id,
            candidateName: r.candidate.persona.displayName,
            score: r.report.score.overall,
          })),
        });
        controller.close();
        return;
      }

      send(controller, encoder, {
        type: "phase",
        phase: "choose",
        message:
          qualified.length === 1
            ? `One strong match above ${MATCH_DATE_THRESHOLD}% — review and choose if you want a date.`
            : `${qualified.length} people cleared ${MATCH_DATE_THRESHOLD}%+. Pick who you want your agent to set up.`,
      });
      await sleep(600);

      send(controller, encoder, {
        type: "qualified_matches",
        threshold: MATCH_DATE_THRESHOLD,
        matches: qualified.map((r) => ({
          candidateId: r.candidate.id,
          candidateName: r.candidate.persona.displayName,
          persona: r.candidate.persona,
          report: r.report,
          score: r.report.score.overall,
          venueName: r.report.suggestedFirstDate.venueName,
          venueWhy: r.report.suggestedFirstDate.why,
        })),
        allScores: results.map((r) => ({
          candidateId: r.candidate.id,
          candidateName: r.candidate.persona.displayName,
          score: r.report.score.overall,
        })),
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Schedules the warm-up call 3-5 days BEFORE the date. The agent prefers the
 * largest buffer (5 days) but walks inward, skipping days that land on the
 * weekend (treated as busy/travel) to find a weekday evening that works.
 */
function scheduleWarmupCall(dateStartIso: string): {
  start: Date;
  end: Date;
  reason: string;
} {
  const dateStart = new Date(dateStartIso);

  let chosen: Date | null = null;
  let chosenBuffer = 0;
  for (let daysBefore = 5; daysBefore >= 3; daysBefore--) {
    const candidate = new Date(dateStart);
    candidate.setDate(candidate.getDate() - daysBefore);
    const dow = candidate.getDay();
    // Skip weekends — assume both people are busier/traveling then.
    if (dow === 0 || dow === 6) continue;
    candidate.setHours(19, 30, 0, 0);
    chosen = candidate;
    chosenBuffer = daysBefore;
    break;
  }

  // Fallback: exactly 4 days before, even if a weekend.
  if (!chosen) {
    chosen = new Date(dateStart);
    chosen.setDate(chosen.getDate() - 4);
    chosen.setHours(19, 30, 0, 0);
    chosenBuffer = 4;
  }

  const end = new Date(chosen);
  end.setMinutes(end.getMinutes() + 30);

  const dayName = chosen.toLocaleDateString("en-US", { weekday: "long" });
  const reason = `Scheduled ${chosenBuffer} days ahead — both calendars are clear that ${dayName} evening, giving you breathing room before the date without losing momentum.`;

  return { start: chosen, end, reason };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action, proposalId, response, candidateId } = body;

  if (action === "select_match") {
    const session = globalThis.__agentRunSession;
    if (!session) {
      return NextResponse.json({ error: "No active agent run" }, { status: 400 });
    }

    const report = session.reports[candidateId as string];
    const candidate = session.candidates.find((c) => c.id === candidateId);
    if (!report || !candidate) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (report.score.overall <= MATCH_DATE_THRESHOLD) {
      return NextResponse.json(
        {
          error: `Score must be above ${MATCH_DATE_THRESHOLD}% to book a date`,
          score: report.score.overall,
        },
        { status: 400 }
      );
    }

    const state = getState();
    const me = state.me.persona;
    if (!me) {
      return NextResponse.json({ error: "No persona" }, { status: 400 });
    }

    const slots = getMockFreeBusy();
    const slot =
      slots.find((s) => {
        const days = (new Date(s.start).getTime() - Date.now()) / 86400000;
        return days >= 8;
      }) ?? slots[slots.length - 1] ?? slots[0];

    const sharedInterests = [...me.interests, ...candidate.persona.interests];
    const venue = getVenueRecommendation(sharedInterests);

    const proposal: DateProposal = {
      proposalId: `dp_${uid()}`,
      matchId: report.matchId,
      candidateId: candidate.id,
      when: slot,
      where: {
        venueName: venue.name,
        addressLine: venue.neighborhood,
      },
      activity: `${venue.type} at ${venue.name}`,
      status: "proposed",
    };

    globalThis.__agentRunProposals[proposal.proposalId] = proposal;

    return NextResponse.json({
      proposal,
      venueWhy: venue.why,
      candidateName: candidate.persona.displayName,
      report,
    });
  }

  if (action === "respond_proposal") {
    const proposal = globalThis.__agentRunProposals[proposalId];
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    proposal.status = response;

    if (response === "accepted") {
      const { start, end, reason } = scheduleWarmupCall(proposal.when.start);

      const state = getState();
      const session = globalThis.__agentRunSession;
      const candidate =
        session?.candidates.find((c) => c.id === proposal.candidateId) ??
        state.candidates.find((c) => c.id === proposal.candidateId);
      const topics =
        state.me.persona && candidate
          ? generateCallTopics(state.me.persona, candidate.persona)
          : [];

      const call: WarmupCall = {
        callId: `call_${uid()}`,
        matchId: proposal.matchId,
        when: {
          start: start.toISOString(),
          end: end.toISOString(),
          timezone: "America/New_York",
        },
        maskedNumberA: getMockMaskedNumber("run_a"),
        maskedNumberB: getMockMaskedNumber("run_b"),
        status: "scheduled",
        topics,
      };
      globalThis.__agentRunCalls[call.callId] = call;
      return NextResponse.json({ proposal, call, reason });
    }

    return NextResponse.json({ proposal });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
