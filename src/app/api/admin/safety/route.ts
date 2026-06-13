import { NextRequest, NextResponse } from "next/server";
import { listSafetyReviewQueue, saveSafetyReview, type SafetyReviewStatus } from "@/lib/store";

const STATUSES = new Set<SafetyReviewStatus>(["open", "reviewed", "action_taken"]);

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return req.headers.get("x-admin-token") === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }
  return NextResponse.json({ reports: listSafetyReviewQueue() });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }
  const body = await req.json();
  const safetyEventId = String(body.safetyEventId ?? "");
  const status = String(body.status ?? "reviewed") as SafetyReviewStatus;
  if (!safetyEventId) {
    return NextResponse.json({ error: "safetyEventId required" }, { status: 400 });
  }
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
  }
  const review = saveSafetyReview(safetyEventId, {
    status,
    reviewedBy: body.reviewedBy ? String(body.reviewedBy).slice(0, 120) : "admin",
    notes: body.notes ? String(body.notes).slice(0, 1000) : undefined,
  });
  if (!review) return NextResponse.json({ error: "Safety event not found" }, { status: 404 });
  return NextResponse.json({ review });
}
