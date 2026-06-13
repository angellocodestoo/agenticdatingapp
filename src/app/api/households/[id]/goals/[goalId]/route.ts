import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateHouseholdGoal } from "@/lib/store";
import type { HouseholdGoal } from "@/lib/types";

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_goal_updates", { limit: 80, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id, goalId } = await params;
  const body = await req.json();
  const partnerNotes = clean(body.partnerNotes, 600);
  const check = moderateText(partnerNotes);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const status = ["active", "completed", "paused"].includes(String(body.status))
    ? String(body.status) as HouseholdGoal["status"]
    : undefined;
  const result = updateHouseholdGoal(user.id, id, goalId, {
    ...(status ? { status } : {}),
    ...(body.targetAt ? { targetAt: String(body.targetAt) } : {}),
    ...(partnerNotes ? { partnerNotes } : {}),
    ...(Array.isArray(body.milestones) ? { milestones: body.milestones } : {}),
  });
  if (!result.goal) return NextResponse.json({ error: result.error ?? "Could not update goal" }, { status: 400 });
  return NextResponse.json({ goal: result.goal });
}
