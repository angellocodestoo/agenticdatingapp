import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAnalyticsSummary,
  getFeedback,
  getHouseholdInsightSummary,
  getHouseholdsForUser,
  getProfile,
  getProposals,
  getRelationshipInsightSummary,
  getRelationshipsForUser,
  getRuns,
} from "@/lib/store";
import { computeProfileConfidence } from "@/lib/confidence";
import { CONNECTORS } from "@/lib/connectors";

export async function GET() {
  const user = await requireUser();
  const profile = getProfile(user.id);
  const runs = getRuns(user.id, 50);
  const feedback = getFeedback(user.id);
  const proposals = getProposals(user.id);
  const analytics = getAnalyticsSummary(user.id);
  const householdInsights = getHouseholdsForUser(user.id)
    .map((entry) => {
      const result = getHouseholdInsightSummary(user.id, entry.household.id);
      return result.summary
        ? {
            status: entry.household.status,
            stage: entry.household.stage,
            ...result.summary,
          }
        : null;
    })
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  const relationshipInsights = getRelationshipsForUser(user.id)
    .map((entry) => {
      const result = getRelationshipInsightSummary(user.id, entry.relationship.id);
      return result.summary
        ? {
            partnerUserIds: entry.relationship.partnerUserIds,
            status: entry.relationship.status,
            stage: entry.relationship.stage,
            ...result.summary,
          }
        : null;
    })
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null);

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
  const scoreByCandidate = new Map<string, number>();
  for (const run of runs) {
    for (const candidate of run.candidates) {
      const score = run.reports[candidate.id]?.score.overall;
      if (score !== undefined && !scoreByCandidate.has(candidate.id)) {
        scoreByCandidate.set(candidate.id, score);
      }
    }
  }
  const outcomeRows = feedback
    .map((f) => {
      const predicted = f.candidateId ? scoreByCandidate.get(f.candidateId) : undefined;
      if (predicted === undefined) return null;
      const actual = Math.round(((f.rating - 1) / 4) * 100);
      const predictedPositive = predicted >= 80;
      const actualPositive = f.wouldSeeAgain && f.rating >= 4;
      return {
        candidateName: f.candidateName ?? "Unknown",
        predicted,
        actual,
        rating: f.rating,
        wouldSeeAgain: f.wouldSeeAgain,
        correct: predictedPositive === actualPositive,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const predictionAccuracy = {
    ratedDates: outcomeRows.length,
    correct: outcomeRows.filter((row) => row.correct).length,
    averagePredictionError:
      outcomeRows.length > 0
        ? Math.round(
            (outcomeRows.reduce((sum, row) => sum + Math.abs(row.predicted - row.actual), 0) /
              outcomeRows.length) *
              10
          ) / 10
        : null,
    outcomes: outcomeRows.slice(0, 8),
  };

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
    analytics,
    householdInsights,
    relationshipInsights,
    predictionAccuracy,
    learnings,
  });
}
