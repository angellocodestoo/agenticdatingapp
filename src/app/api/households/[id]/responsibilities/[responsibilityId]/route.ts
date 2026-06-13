import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateHouseholdResponsibility } from "@/lib/store";
import type { HouseholdResponsibility } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; responsibilityId: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_responsibility_updates", { limit: 80, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id, responsibilityId } = await params;
  const body = await req.json();
  const notes = body.handoffNotes ? String(body.handoffNotes).slice(0, 600) : undefined;
  const check = moderateText(notes ?? "");
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const status = ["open", "completed", "paused"].includes(String(body.status))
    ? String(body.status) as HouseholdResponsibility["status"]
    : undefined;
  const result = updateHouseholdResponsibility(user.id, id, responsibilityId, {
    ...(status ? { status } : {}),
    ...(body.ownerUserId ? { ownerUserId: String(body.ownerUserId) } : {}),
    ...(body.backupUserId ? { backupUserId: String(body.backupUserId) } : {}),
    ...(body.dueAt ? { dueAt: String(body.dueAt) } : {}),
    ...(notes ? { handoffNotes: notes } : {}),
  });
  if (!result.responsibility) {
    return NextResponse.json({ error: result.error ?? "Could not update responsibility" }, { status: 400 });
  }
  return NextResponse.json({ responsibility: result.responsibility });
}
