import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getBlockedCandidateIds,
  getLatestRun,
  getProfile,
  publishUserCandidateProfile,
} from "@/lib/store";
import { getMarketplaceCandidates } from "@/lib/marketplace";

export async function GET() {
  const user = await requireUser();
  // Prefer the user's most recent agent-run pool; fall back to seed data.
  const run = getLatestRun(user.id);
  const profile = getProfile(user.id);
  const blocked = getBlockedCandidateIds(user.id);
  if (profile.persona) publishUserCandidateProfile(user.id);
  const candidates = (run?.candidates?.length
    ? run.candidates
    : profile.persona
      ? getMarketplaceCandidates(user.id, profile.persona, 12)
      : []
  ).filter((candidate) => !blocked.has(candidate.id));
  return NextResponse.json(candidates);
}
