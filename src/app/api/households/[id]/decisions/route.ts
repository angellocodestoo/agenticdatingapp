import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { createHouseholdDecision, getHouseholdDecisions } from "@/lib/store";

const clean = (v: unknown, max = 220) => String(v ?? "").trim().slice(0, max);
const list = (v: unknown) => Array.isArray(v) ? v.map((x) => clean(x, 160)).filter(Boolean).slice(0, 8) : [];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = getHouseholdDecisions(user.id, id);
  if (!result.decisions) return NextResponse.json({ error: result.error ?? "Could not load decisions" }, { status: 400 });
  return NextResponse.json({ decisions: result.decisions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const limited = enforceRateLimit(req, "household_decisions", { limit: 50, windowMs: 60 * 60 * 1000 }, user.id);
  if (limited) return limited;
  const { id } = await params;
  const body = await req.json();
  const title = clean(body.title, 160);
  const content = [title, body.domain, body.options, body.pros, body.concerns].flatMap((x) => Array.isArray(x) ? x : [x]).join("\n");
  const check = moderateText(content);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const result = createHouseholdDecision(user.id, id, {
    domain: clean(body.domain, 80) || "shared life",
    status: "open",
    title,
    options: list(body.options),
    pros: list(body.pros),
    concerns: list(body.concerns),
    deadlineAt: body.deadlineAt ? String(body.deadlineAt) : undefined,
  });
  if (!result.decision) return NextResponse.json({ error: result.error ?? "Could not create decision" }, { status: 400 });
  return NextResponse.json({ decision: result.decision });
}
