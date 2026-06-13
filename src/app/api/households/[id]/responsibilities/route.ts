import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import {
  createHouseholdResponsibility,
  getHouseholdResponsibilities,
} from "@/lib/store";

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
  const result = getHouseholdResponsibilities(user.id, id);
  if (!result.responsibilities) {
    return NextResponse.json({ error: result.error ?? "Could not load responsibilities" }, { status: 400 });
  }
  return NextResponse.json({ responsibilities: result.responsibilities });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_responsibilities", { limit: 50, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const title = text(body.title, 160);
  const handoffNotes = text(body.handoffNotes, 600);
  const check = moderateText(`${title ?? ""}\n${handoffNotes ?? ""}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const result = createHouseholdResponsibility(user.id, id, {
    ownerUserId: String(body.ownerUserId || user.id),
    backupUserId: body.backupUserId ? String(body.backupUserId) : undefined,
    type: body.type === "recurring" ? "recurring" : "one_time",
    status: "open",
    title,
    dueAt: body.dueAt ? String(body.dueAt) : undefined,
    cadence: text(body.cadence, 120),
    emotionalLoad: ["low", "medium", "high"].includes(String(body.emotionalLoad))
      ? String(body.emotionalLoad) as "low" | "medium" | "high"
      : "medium",
    handoffNotes,
  });
  if (!result.responsibility) {
    return NextResponse.json({ error: result.error ?? "Could not create responsibility" }, { status: 400 });
  }
  return NextResponse.json({ responsibility: result.responsibility });
}
