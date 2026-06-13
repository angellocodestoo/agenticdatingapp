import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { updateHouseholdProfile } from "@/lib/store";
import type { HouseholdMember, HouseholdRecord } from "@/lib/types";

const STAGES = new Set(["shared_life", "engaged", "married", "family", "legacy"]);
const SHARING_LEVELS = new Set(["private", "summary", "shared"]);

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((item) => item.slice(0, 140));
}

function text(value: unknown, max = 200): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "household_settings",
    { limit: 40, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();
  const profile = body.profile ?? {};
  const preferences = body.preferences ?? {};
  const content = [
    profile.homeBase,
    profile.commitmentStage,
    profile.planningCadence,
    profile.protectedRituals,
    profile.responsibilityAreas,
    profile.sensitiveDomains,
    profile.longTermGoals,
    profile.legacyNotes,
    preferences.loadPreference,
    preferences.planningRole,
    preferences.reviewCadence,
    preferences.privateNotes,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .join("\n");
  const check = moderateText(content);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const rawStage = String(profile.stage ?? "");
  const rawSharing = String(preferences.sharingLevel ?? "");
  const result = updateHouseholdProfile(user.id, id, {
    ...(STAGES.has(rawStage) ? { stage: rawStage as HouseholdRecord["stage"] } : {}),
    homeBase: text(profile.homeBase),
    commitmentStage: text(profile.commitmentStage),
    planningCadence: text(profile.planningCadence),
    protectedRituals: list(profile.protectedRituals),
    responsibilityAreas: list(profile.responsibilityAreas),
    sensitiveDomains: list(profile.sensitiveDomains),
    longTermGoals: list(profile.longTermGoals),
    legacyNotes: text(profile.legacyNotes, 1000),
    ...(SHARING_LEVELS.has(rawSharing)
      ? { sharingLevel: rawSharing as HouseholdMember["sharingLevel"] }
      : {}),
    preferences: {
      loadPreference: text(preferences.loadPreference),
      planningRole: text(preferences.planningRole),
      reviewCadence: text(preferences.reviewCadence),
      privateNotes: text(preferences.privateNotes, 1000),
    },
  });

  if (!result.household || !result.members) {
    return NextResponse.json(
      { error: result.error ?? "Could not update household settings" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    household: result.household,
    members: result.members,
  });
}
