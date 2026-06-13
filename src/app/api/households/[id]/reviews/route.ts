import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { getHouseholdReviews, saveHouseholdReview } from "@/lib/store";
import type { HouseholdSharingLevel } from "@/lib/types";

const SHARING = new Set(["private", "summary", "shared"]);
const score = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v) || 3)));
const text = (v: unknown, max = 500) => {
  const normalized = String(v ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdReviews(user.id, id);
  if (!result.reviews) return NextResponse.json({ error: result.error ?? "Could not load reviews" }, { status: 400 });
  return NextResponse.json({ reviews: result.reviews });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_reviews", { limit: 40, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const appreciation = text(body.appreciation, 300);
  const frictionPoint = text(body.frictionPoint, 500);
  const nextWeekPriority = text(body.nextWeekPriority, 300);
  const check = moderateText(`${appreciation ?? ""}\n${frictionPoint ?? ""}\n${nextWeekPriority ?? ""}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const rawSharing = String(body.sharingLevel ?? "summary");
  const result = saveHouseholdReview(user.id, id, {
    sharingLevel: SHARING.has(rawSharing) ? rawSharing as HouseholdSharingLevel : "summary",
    relationshipEnergy: score(body.relationshipEnergy),
    logisticsLoad: score(body.logisticsLoad),
    fairnessSense: score(body.fairnessSense),
    connectionSense: score(body.connectionSense),
    appreciation,
    frictionPoint,
    nextWeekPriority,
  });
  if (!result.review) return NextResponse.json({ error: result.error ?? "Could not save review" }, { status: 400 });
  return NextResponse.json({ review: result.review });
}
