import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { getHouseholdMemory, saveHouseholdMemory } from "@/lib/store";
import type { HouseholdMemoryType, HouseholdSharingLevel } from "@/lib/types";

const TYPES = new Set(["milestone", "decision", "repair", "gratitude", "ritual", "goal", "context"]);
const SHARING = new Set(["private", "summary", "shared"]);
const text = (v: unknown, max = 800) => {
  const normalized = String(v ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdMemory(user.id, id);
  if (!result.memory) return NextResponse.json({ error: result.error ?? "Could not load memory" }, { status: 400 });
  return NextResponse.json({ memory: result.memory });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_memory", { limit: 60, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const title = text(body.title, 160);
  const bodyText = text(body.body, 1000);
  const check = moderateText(`${title ?? ""}\n${bodyText ?? ""}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const rawType = String(body.type ?? "context");
  const rawSharing = String(body.sharingLevel ?? "shared");
  const result = saveHouseholdMemory(user.id, id, {
    type: TYPES.has(rawType) ? rawType as HouseholdMemoryType : "context",
    sharingLevel: SHARING.has(rawSharing) ? rawSharing as HouseholdSharingLevel : "shared",
    title,
    body: bodyText,
  });
  if (!result.memory) return NextResponse.json({ error: result.error ?? "Could not save memory" }, { status: 400 });
  return NextResponse.json({ memory: result.memory });
}
