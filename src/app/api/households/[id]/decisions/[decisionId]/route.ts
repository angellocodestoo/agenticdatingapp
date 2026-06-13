import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateHouseholdDecision } from "@/lib/store";
import type { HouseholdDecision } from "@/lib/types";

const clean = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_decision_updates", { limit: 80, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id, decisionId } = await params;
  const body = await req.json();
  const outcome = clean(body.outcome, 600);
  const check = moderateText(outcome);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const status = ["open", "resolved", "archived"].includes(String(body.status))
    ? String(body.status) as HouseholdDecision["status"]
    : undefined;
  const result = updateHouseholdDecision(user.id, id, decisionId, {
    ...(status ? { status } : {}),
    ...(body.deadlineAt ? { deadlineAt: String(body.deadlineAt) } : {}),
    ...(outcome ? { outcome } : {}),
  });
  if (!result.decision) return NextResponse.json({ error: result.error ?? "Could not update decision" }, { status: 400 });
  return NextResponse.json({ decision: result.decision });
}
