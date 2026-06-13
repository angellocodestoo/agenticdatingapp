import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateRelationshipPlanStatus } from "@/lib/store";
import type { RelationshipPlanStatus } from "@/lib/types";

const STATUS_BY_ACTION: Record<string, RelationshipPlanStatus> = {
  accept: "accepted",
  decline: "declined",
  complete: "completed",
  suggest: "suggested",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationship_plan_updates",
    { limit: 60, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id, planId } = await params;
  const body = await req.json();
  const action = String(body.action ?? "");
  const status = STATUS_BY_ACTION[action];
  if (!status && action !== "reschedule") {
    return NextResponse.json({ error: "Unknown plan action" }, { status: 400 });
  }

  const notes = body.notes ? String(body.notes).trim().slice(0, 500) : undefined;
  const textCheck = moderateText(notes ?? "");
  if (!textCheck.ok) {
    return NextResponse.json({ error: textCheck.error }, { status: 400 });
  }

  const result = updateRelationshipPlanStatus(user.id, id, planId, {
    status,
    scheduledFor: body.scheduledFor ? String(body.scheduledFor) : undefined,
    notes,
  });
  if (!result.plan) {
    return NextResponse.json(
      { error: result.error ?? "Could not update relationship plan" },
      { status: 400 }
    );
  }

  return NextResponse.json({ plan: result.plan });
}
