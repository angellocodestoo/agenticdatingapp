import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateHouseholdRitual } from "@/lib/store";
import type { HouseholdRitual } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ritualId: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_ritual_updates", { limit: 80, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id, ritualId } = await params;
  const body = await req.json();
  const why = body.why ? String(body.why).slice(0, 600) : undefined;
  const check = moderateText(why ?? "");
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const status = ["active", "completed", "paused"].includes(String(body.status))
    ? String(body.status) as HouseholdRitual["status"]
    : undefined;
  const result = updateHouseholdRitual(user.id, id, ritualId, {
    ...(status ? { status } : {}),
    ...(body.nextAt ? { nextAt: String(body.nextAt) } : {}),
    ...(body.cadence ? { cadence: String(body.cadence).slice(0, 120) } : {}),
    ...(why ? { why } : {}),
  });
  if (!result.ritual) {
    return NextResponse.json({ error: result.error ?? "Could not update ritual" }, { status: 400 });
  }
  return NextResponse.json({ ritual: result.ritual });
}
