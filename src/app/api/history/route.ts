import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getCalls,
  getFeedback,
  getProposals,
  getRuns,
} from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  const runs = getRuns(user.id, 50);
  const proposals = getProposals(user.id);
  const calls = getCalls(user.id);
  const feedback = getFeedback(user.id);

  // Resolve candidate names + reports from the run each proposal came from.
  const candidateIndex = new Map<
    string,
    { name: string; score: number }
  >();
  for (const run of runs) {
    for (const c of run.candidates) {
      if (!candidateIndex.has(c.id)) {
        candidateIndex.set(c.id, {
          name: c.persona.displayName,
          score: run.reports[c.id]?.score.overall ?? 0,
        });
      }
    }
  }

  const dates = proposals.map((proposal) => {
    const candidate = proposal.candidateId
      ? candidateIndex.get(proposal.candidateId)
      : undefined;
    const call = calls.find((c) => c.matchId === proposal.matchId) ?? null;
    const fb =
      feedback.find((f) => f.proposalId === proposal.proposalId) ?? null;
    const isPast = new Date(proposal.when.start).getTime() < Date.now();
    return {
      proposal,
      candidateName: candidate?.name ?? "Unknown",
      score: candidate?.score ?? null,
      call,
      feedback: fb,
      isPast,
      needsFeedback: proposal.status === "accepted" && !fb,
    };
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      candidateCount: r.candidates.length,
      qualifiedCount: r.qualifiedIds.length,
      bestScore: r.bestScore,
      qualified: r.qualifiedIds.map((id) => ({
        candidateId: id,
        candidateName: candidateIndex.get(id)?.name ?? "Unknown",
        score: r.reports[id]?.score.overall ?? 0,
      })),
    })),
    dates,
  });
}
