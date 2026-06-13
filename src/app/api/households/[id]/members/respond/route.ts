import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/guardrails";
import { respondToHouseholdMembership } from "@/lib/store";

const ACTIONS = new Set(["accept", "decline", "pause", "resume", "leave"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "household_membership",
    { limit: 30, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action ?? "");
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown household action" }, { status: 400 });
  }

  const result = respondToHouseholdMembership(
    user.id,
    id,
    action as "accept" | "decline" | "pause" | "resume" | "leave"
  );
  if (!result.household || !result.members) {
    return NextResponse.json(
      { error: result.error ?? "Could not update household membership" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    household: result.household,
    members: result.members,
  });
}
