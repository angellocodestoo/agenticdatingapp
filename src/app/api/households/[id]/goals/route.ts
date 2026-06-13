import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { createHouseholdGoal, getHouseholdGoals } from "@/lib/store";

const clean = (v: unknown, max = 220) => String(v ?? "").trim().slice(0, max);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdGoals(user.id, id);
  if (!result.goals) return NextResponse.json({ error: result.error ?? "Could not load goals" }, { status: 400 });
  return NextResponse.json({ goals: result.goals });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_goals", { limit: 50, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const title = clean(body.title, 160);
  const partnerNotes = clean(body.partnerNotes, 600);
  const check = moderateText(`${title}\n${partnerNotes}`);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const result = createHouseholdGoal(user.id, id, {
    category: clean(body.category, 80) || "shared life",
    status: "active",
    title,
    targetAt: body.targetAt ? String(body.targetAt) : undefined,
    milestones: [],
    partnerNotes,
  });
  if (!result.goal) return NextResponse.json({ error: result.error ?? "Could not create goal" }, { status: 400 });
  return NextResponse.json({ goal: result.goal });
}
