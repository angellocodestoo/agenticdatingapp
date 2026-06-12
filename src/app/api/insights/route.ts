import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getFeedback, getProfile, getProposals, getRuns } from "@/lib/store";
import { computeProfileConfidence } from "@/lib/confidence";
import { CONNECTORS } from "@/lib/connectors";

export async function GET() {
  const user = await requireUser();
  const profile = getProfile(user.id);
  const runs = getRuns(user.id, 50);
  const feedback = getFeedback(user.id);
  const proposals = getProposals(user.id);

  const persona = profile.persona ?? null;

  // Score trend, oldest → newest, so the chart reads left to right.
  const scoreTrend = [...runs]
    .reverse()
    .map((r) => ({ at: r.createdAt, bestScore: r.bestScore, qualified: r.qualifiedIds.length }));

  const assumptions = persona?.assumptions ?? [];
  const rated = assumptions.filter((a) => a.userRating);
  const accuracy = {
    total: assumptions.length,
    rated: rated.length,
    accurate: rated.filter((a) => a.userRating === "accurate").length,
    somewhat: rated.filter((a) => a.userRating === "somewhat").length,
    wrong: rated.filter((a) => a.userRating === "wrong").length,
  };

  const totalCandidatesReviewed = runs.reduce((n, r) => n + r.candidates.length, 0);
  const datesBooked = proposals.filter((p) => p.status === "accepted").length;

  const learnings = feedback.flatMap((f) =>
    f.agentLearnings.map((l) => ({ at: f.createdAt, text: l, candidateName: f.candidateName }))
  );

  const confidence = computeProfileConfidence(profile);
  const connectedConnectors = CONNECTORS.filter((c) =>
    profile.connectedSources.includes(c.id)
  ).map((c) => ({ id: c.id, label: c.label, icon: c.icon }));
  const suggestedConnectors = CONNECTORS.filter(
    (c) => !profile.connectedSources.includes(c.id)
  ).map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    unlocks: c.unlocks,
    boost: c.weight,
    providers: c.providers,
  }));

  return NextResponse.json({
    confidence,
    suggestedConnectors,
    connectedConnectors,
    aiProvider: profile.aiProvider ?? null,
    persona: persona && {
      values: persona.values,
      interests: persona.interests,
      dealbreakers: persona.dealbreakers,
    },
    accuracy,
    scoreTrend,
    stats: {
      runs: runs.length,
      candidatesReviewed: totalCandidatesReviewed,
      datesBooked,
      feedbackCount: feedback.length,
      avgRating:
        feedback.length > 0
          ? Math.round(
              (feedback.reduce((n, f) => n + f.rating, 0) / feedback.length) * 10
            ) / 10
          : null,
    },
    learnings,
  });
}
