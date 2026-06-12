import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCandidateProfile, saveSafetyEvent, trackEvent } from "@/lib/store";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const candidateId = String(body.candidateId ?? "");
  const action = String(body.action ?? "");
  const reason = body.reason ? String(body.reason).slice(0, 120) : undefined;
  const notes = body.notes ? String(body.notes).slice(0, 1000) : undefined;

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }
  if (action !== "block" && action !== "report") {
    return NextResponse.json({ error: "Unknown safety action" }, { status: 400 });
  }

  const candidate = getCandidateProfile(candidateId);
  const event = saveSafetyEvent(user.id, {
    candidateId,
    action,
    reason,
    notes,
  });
  trackEvent(user.id, "safety_action_created", {
    candidateId,
    action,
    reason: reason ?? null,
  });

  return NextResponse.json({
    event,
    candidateName: candidate?.persona.displayName ?? "this person",
  });
}
