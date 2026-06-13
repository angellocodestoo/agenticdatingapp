import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/guardrails";
import {
  createHouseholdInvitation,
  getHouseholdEligibility,
  getHouseholdsForUser,
  getProfile,
} from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  const households = getHouseholdsForUser(user.id).map((entry) => {
    const partnerUserId = entry.household.partnerUserIds.find((id) => id !== user.id);
    const partnerName = partnerUserId
      ? getProfile(partnerUserId).persona?.displayName
      : undefined;
    return {
      ...entry,
      currentMember: entry.members.find((member) => member.userId === user.id) ?? null,
      partnerName: partnerName ?? "Your partner",
    };
  });
  return NextResponse.json({ households });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "households",
    { limit: 20, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const body = await req.json();
  const relationshipId = String(body.relationshipId ?? "");
  if (!relationshipId) {
    return NextResponse.json({ error: "relationshipId required" }, { status: 400 });
  }

  const eligibility = getHouseholdEligibility(user.id, relationshipId);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: eligibility.reason ?? "This relationship is not eligible for household mode",
        eligible: false,
      },
      { status: 400 }
    );
  }

  const result = createHouseholdInvitation(user.id, relationshipId);
  if (!result.household || !result.members) {
    return NextResponse.json(
      { error: result.error ?? "Could not create household invitation" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    household: result.household,
    members: result.members,
    eligible: true,
  });
}
