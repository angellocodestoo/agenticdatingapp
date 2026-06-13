import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { availabilityProvider, venueProvider } from "@/lib/logisticsProviders";
import {
  createRelationshipPlan,
  getRelationship,
  getRelationshipPlans,
} from "@/lib/store";
import type { RelationshipPlanType } from "@/lib/types";

const PLAN_TYPES = new Set(["date_night", "check_in", "quality_time", "custom"]);

function cleanText(value: unknown, max = 160): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const result = getRelationshipPlans(user.id, id);
  if (!result.plans) {
    return NextResponse.json({ error: result.error ?? "Could not load plans" }, { status: 400 });
  }
  return NextResponse.json({ plans: result.plans });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationship_plans",
    { limit: 40, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();
  const relationship = getRelationship(id);
  if (!relationship) {
    return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
  }

  const typeInput = String(body.type ?? "date_night");
  const type: RelationshipPlanType = PLAN_TYPES.has(typeInput)
    ? (typeInput as RelationshipPlanType)
    : "date_night";
  const notes = cleanText(body.notes, 500);
  const titleInput = cleanText(body.title);
  const textCheck = moderateText(`${titleInput}\n${notes}`);
  if (!textCheck.ok) {
    return NextResponse.json({ error: textCheck.error }, { status: 400 });
  }

  const suggested = body.mode === "suggest" || !titleInput;
  const slot =
    cleanText(body.scheduledFor) ||
    availabilityProvider.getFreeBusy().find((item) => {
      const days = (new Date(item.start).getTime() - Date.now()) / 86400000;
      return days >= 3;
    })?.start;
  const venue = venueProvider.recommend([
    ...relationship.profile.qualityTimePreferences,
    ...relationship.profile.sharedValues,
  ]);

  const result = createRelationshipPlan(user.id, id, {
    type,
    status: "suggested",
    scheduledFor: slot,
    title: titleInput || (suggested ? `${venue.type} at ${venue.name}` : "Shared plan"),
    location:
      type === "date_night" || suggested
        ? {
            venueName: venue.name,
            addressLine: venue.neighborhood,
          }
        : undefined,
    notes: notes || venue.why,
  });

  if (!result.plan) {
    return NextResponse.json(
      { error: result.error ?? "Could not create relationship plan" },
      { status: 400 }
    );
  }
  return NextResponse.json({ plan: result.plan });
}
