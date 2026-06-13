import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/guardrails";
import { respondToRelationshipMembership } from "@/lib/store";

const ACTIONS = new Set(["accept", "decline", "pause", "resume", "leave"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationship_membership",
    { limit: 30, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action ?? "");
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown relationship action" }, { status: 400 });
  }

  const result = respondToRelationshipMembership(
    user.id,
    id,
    action as "accept" | "decline" | "pause" | "resume" | "leave"
  );
  if (!result.relationship || !result.members) {
    return NextResponse.json(
      { error: result.error ?? "Could not update relationship membership" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    relationship: result.relationship,
    members: result.members,
  });
}
