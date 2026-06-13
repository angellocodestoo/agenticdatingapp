import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import {
  getRelationshipGuidance,
  saveRelationshipCheckIn,
} from "@/lib/store";
import type { RelationshipSharingLevel } from "@/lib/types";

const SHARING = new Set(["private", "summary", "shared"]);

function score(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function text(value: unknown, max = 500): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const result = getRelationshipGuidance(user.id, id);
  if (!result.guidance || !result.checkIns) {
    return NextResponse.json(
      { error: result.error ?? "Could not load check-ins" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    checkIns: result.checkIns,
    guidance: result.guidance,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(
    req,
    "relationship_check_ins",
    { limit: 40, windowMs: 60 * 60 * 1000 },
    user.id
  );
  if (limited) return limited;

  const { id } = await params;
  const body = await req.json();
  const appreciation = text(body.appreciation, 240);
  const need = text(body.need, 240);
  const note = text(body.note, 1000);
  const check = moderateText(`${appreciation ?? ""}\n${need ?? ""}\n${note ?? ""}`);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  const rawSharing = String(body.sharingLevel ?? "summary");
  const sharingLevel: RelationshipSharingLevel = SHARING.has(rawSharing)
    ? (rawSharing as RelationshipSharingLevel)
    : "summary";

  const result = saveRelationshipCheckIn(user.id, id, {
    sharingLevel,
    mood: score(body.mood),
    closeness: score(body.closeness),
    energy: score(body.energy),
    stress: score(body.stress),
    appreciation,
    need,
    note,
  });
  if (!result.checkIn) {
    return NextResponse.json(
      { error: result.error ?? "Could not save check-in" },
      { status: 400 }
    );
  }
  const guidance = getRelationshipGuidance(user.id, id);
  return NextResponse.json({
    checkIn: result.checkIn,
    checkIns: guidance.checkIns ?? [],
    guidance: guidance.guidance,
  });
}
