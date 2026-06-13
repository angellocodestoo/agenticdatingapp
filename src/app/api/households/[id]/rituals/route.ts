import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { createHouseholdRitual, getHouseholdRituals } from "@/lib/store";

function text(value: unknown, max = 300): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdRituals(user.id, id);
  if (!result.rituals) {
    return NextResponse.json({ error: result.error ?? "Could not load rituals" }, { status: 400 });
  }
  return NextResponse.json({ rituals: result.rituals });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_rituals", { limit: 50, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const title = text(body.title, 160);
  const why = text(body.why, 600);
  const check = moderateText(`${title ?? ""}\n${why ?? ""}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const result = createHouseholdRitual(user.id, id, {
    status: "active",
    title,
    cadence: text(body.cadence, 120),
    nextAt: body.nextAt ? String(body.nextAt) : undefined,
    why,
  });
  if (!result.ritual) {
    return NextResponse.json({ error: result.error ?? "Could not create ritual" }, { status: 400 });
  }
  return NextResponse.json({ ritual: result.ritual });
}
