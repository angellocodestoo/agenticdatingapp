import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/guardrails";
import {
  createRelationshipInvitation,
  getRelationshipEligibility,
  getRelationshipsForUser,
} from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({
    relationships: getRelationshipsForUser(user.id),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationships",
    { limit: 20, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const body = await req.json();
  const matchLifecycleId = String(body.matchLifecycleId ?? "");
  if (!matchLifecycleId) {
    return NextResponse.json({ error: "matchLifecycleId required" }, { status: 400 });
  }

  const eligibility = getRelationshipEligibility(user.id, matchLifecycleId);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: eligibility.reason ?? "This match is not eligible for relationship mode",
        eligible: false,
      },
      { status: 400 }
    );
  }

  const result = createRelationshipInvitation(user.id, matchLifecycleId);
  if (!result.relationship || !result.members) {
    return NextResponse.json(
      { error: result.error ?? "Could not create relationship invitation" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    relationship: result.relationship,
    members: result.members,
    eligible: true,
  });
}
