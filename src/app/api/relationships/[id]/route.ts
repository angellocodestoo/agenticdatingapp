import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import {
  updateRelationshipMemberPreferences,
  updateRelationshipProfile,
} from "@/lib/store";
import type {
  RelationshipMember,
  RelationshipRecord,
  RelationshipSharingLevel,
  RelationshipStage,
} from "@/lib/types";

const STAGES = new Set(["early_dating", "exclusive", "committed", "paused"]);
const SHARING_LEVELS = new Set(["private", "summary", "shared"]);

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => item.slice(0, 120));
}

function text(value: unknown, max = 160): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function moderatePayload(values: unknown[]): string | null {
  const content = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(Boolean)
    .map((value) => String(value))
    .join("\n");
  const check = moderateText(content);
  return check.ok ? null : check.error;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationship_settings",
    { limit: 40, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();

  const profileInput = body.profile ?? {};
  const preferencesInput = body.preferences ?? {};
  const moderationError = moderatePayload([
    profileInput.planningCadence,
    profileInput.nextThirtyDayGoal,
    profileInput.sharedValues,
    profileInput.qualityTimePreferences,
    profileInput.communicationNorms,
    preferencesInput.communicationChannel,
    preferencesInput.responseExpectation,
    preferencesInput.planningStyle,
    preferencesInput.affectionStyle,
    preferencesInput.repairPreference,
    preferencesInput.dateNightPreferences,
    preferencesInput.aloneTimeNeeds,
    preferencesInput.sensitiveTopics,
  ]);
  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }

  let relationshipResult:
    | {
        relationship?: RelationshipRecord;
        members?: RelationshipMember[];
        error?: string;
      }
    | null = null;

  if (body.profile) {
    const rawStage = String(profileInput.stage ?? "");
    const profilePatch: Partial<RelationshipRecord["profile"]> & {
      stage?: RelationshipStage;
    } = {
      sharedValues: list(profileInput.sharedValues),
      qualityTimePreferences: list(profileInput.qualityTimePreferences),
      communicationNorms: list(profileInput.communicationNorms),
      planningCadence: text(profileInput.planningCadence),
      nextThirtyDayGoal: text(profileInput.nextThirtyDayGoal, 240),
    };
    if (STAGES.has(rawStage)) profilePatch.stage = rawStage as RelationshipStage;
    relationshipResult = updateRelationshipProfile(user.id, id, profilePatch);
    if (!relationshipResult.relationship || !relationshipResult.members) {
      return NextResponse.json(
        { error: relationshipResult.error ?? "Could not update relationship profile" },
        { status: 400 }
      );
    }
  }

  if (body.preferences) {
    const rawSharingLevel = String(preferencesInput.sharingLevel ?? "");
    const preferencePatch: Partial<RelationshipMember["preferences"]> & {
      sharingLevel?: RelationshipSharingLevel;
    } = {
      communicationChannel: text(preferencesInput.communicationChannel),
      responseExpectation: text(preferencesInput.responseExpectation),
      planningStyle: text(preferencesInput.planningStyle),
      affectionStyle: text(preferencesInput.affectionStyle),
      repairPreference: text(preferencesInput.repairPreference),
      dateNightPreferences: list(preferencesInput.dateNightPreferences),
      aloneTimeNeeds: text(preferencesInput.aloneTimeNeeds),
      sensitiveTopics: list(preferencesInput.sensitiveTopics),
    };
    if (SHARING_LEVELS.has(rawSharingLevel)) {
      preferencePatch.sharingLevel = rawSharingLevel as RelationshipSharingLevel;
    }
    relationshipResult = updateRelationshipMemberPreferences(user.id, id, preferencePatch);
    if (!relationshipResult.relationship || !relationshipResult.members) {
      return NextResponse.json(
        { error: relationshipResult.error ?? "Could not update partner preferences" },
        { status: 400 }
      );
    }
  }

  if (!relationshipResult) {
    return NextResponse.json({ error: "No relationship updates provided" }, { status: 400 });
  }

  return NextResponse.json({
    relationship: relationshipResult.relationship,
    members: relationshipResult.members,
  });
}
