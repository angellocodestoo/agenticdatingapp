import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLatestRun } from "@/lib/store";
import { seededCandidates } from "@/data/candidates";

export async function GET() {
  const user = await requireUser();
  // Prefer the user's most recent agent-run pool; fall back to seed data.
  const run = getLatestRun(user.id);
  const candidates = run?.candidates?.length ? run.candidates : seededCandidates;
  return NextResponse.json(candidates);
}
