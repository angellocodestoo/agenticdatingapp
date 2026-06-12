import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  addNotification,
  getFeedback,
  getFeedbackForProposal,
  getProfile,
  getProposal,
  getRuns,
  newFeedbackId,
  saveFeedback,
  updateProfile,
} from "@/lib/store";
import type {
  Candidate,
  DateFeedback,
  Persona,
  PreferenceStrength,
  ValuePreference,
} from "@/lib/types";

const STRENGTH_UP: Record<PreferenceStrength, PreferenceStrength> = {
  low: "medium",
  medium: "high",
  high: "high",
};
const STRENGTH_DOWN: Record<PreferenceStrength, PreferenceStrength> = {
  high: "medium",
  medium: "low",
  low: "low",
};

/**
 * The learning step: a good date strengthens the values you share with that
 * person; a bad date softens values that were unique to them. Returns the
 * patched persona plus human-readable descriptions of what changed.
 */
function applyLearnings(
  persona: Persona,
  candidate: Candidate,
  positive: boolean
): { persona: Persona; learnings: string[] } {
  const learnings: string[] = [];
  const candidateValueKeys = new Set(candidate.persona.values.map((v) => v.key));

  const values: ValuePreference[] = persona.values.map((v) => {
    if (!candidateValueKeys.has(v.key)) return v;
    if (positive) {
      const next = STRENGTH_UP[v.strength];
      if (next !== v.strength) {
        learnings.push(
          `Raised "${v.key}" from ${v.strength} to ${next} — it showed up strongly on a date that went well.`
        );
        return { ...v, strength: next };
      }
    } else {
      const next = STRENGTH_DOWN[v.strength];
      if (next !== v.strength) {
        learnings.push(
          `Softened "${v.key}" from ${v.strength} to ${next} — alignment there didn't translate to chemistry.`
        );
        return { ...v, strength: next };
      }
    }
    return v;
  });

  if (learnings.length === 0) {
    learnings.push(
      positive
        ? "Confirmed your current value weights — this match validated what your agent already believed."
        : "Noted the mismatch. Your agent will weight conversational chemistry higher in future scoring."
    );
  }

  return { persona: { ...persona, values }, learnings };
}

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(getFeedback(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const proposalId = String(body.proposalId ?? "");

  const proposal = getProposal(user.id, proposalId);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (getFeedbackForProposal(user.id, proposalId)) {
    return NextResponse.json(
      { error: "Feedback already submitted for this date" },
      { status: 409 }
    );
  }

  const clamp = (n: unknown) => Math.max(1, Math.min(5, Math.round(Number(n) || 3)));
  const rating = clamp(body.rating);
  const chemistry = clamp(body.chemistry);
  const conversation = clamp(body.conversation);
  const wouldSeeAgain = Boolean(body.wouldSeeAgain);

  // Locate the candidate so the agent can learn from their profile.
  const runs = getRuns(user.id, 50);
  let candidate: Candidate | undefined;
  for (const run of runs) {
    candidate = run.candidates.find((c) => c.id === proposal.candidateId);
    if (candidate) break;
  }

  let learnings: string[] = [];
  const profile = getProfile(user.id);
  if (profile.persona && candidate) {
    const positive = wouldSeeAgain && rating >= 4;
    const negative = !wouldSeeAgain && rating <= 2;
    if (positive || negative) {
      const result = applyLearnings(profile.persona, candidate, positive);
      updateProfile(user.id, { persona: result.persona });
      learnings = result.learnings;
    } else {
      learnings = [
        "Mixed signal recorded. Your agent keeps current weights but flags this profile shape as uncertain.",
      ];
    }
  }

  const feedback: DateFeedback = {
    id: newFeedbackId(),
    proposalId,
    candidateId: proposal.candidateId,
    candidateName: candidate?.persona.displayName,
    rating,
    chemistry,
    conversation,
    wouldSeeAgain,
    notes: body.notes ? String(body.notes).slice(0, 2000) : undefined,
    agentLearnings: learnings,
    createdAt: Date.now(),
  };
  saveFeedback(user.id, feedback);

  addNotification(user.id, {
    type: "agent_update",
    title: "Your agent learned from your date",
    body: learnings[0] ?? "Feedback recorded.",
    href: "/insights",
  });

  return NextResponse.json({ feedback, learnings });
}
