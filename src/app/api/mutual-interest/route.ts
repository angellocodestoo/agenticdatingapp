import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  addNotification,
  getIncomingMatchRequests,
  getProfile,
  getRun,
  saveMatchLifecycle,
  saveProposal,
  trackEvent,
} from "@/lib/store";
import { getMockFreeBusy, getVenueRecommendation } from "@/lib/integrations/mock";
import type { DateProposal } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function proposalFor(record: ReturnType<typeof getIncomingMatchRequests>[number]): {
  proposal?: DateProposal;
  error?: string;
  candidateName?: string;
  venueWhy?: string;
} {
  const run = getRun(record.userId, record.runId);
  const candidate = run?.candidates.find((c) => c.id === record.candidateId);
  const report = run?.reports[record.candidateId];
  const profile = getProfile(record.userId);
  const me = profile.persona;
  if (!run || !candidate || !report || !me) return { error: "Original match context not found" };

  const slots = getMockFreeBusy();
  const slot =
    slots.find((s) => {
      const days = (new Date(s.start).getTime() - Date.now()) / 86400000;
      return days >= 8;
    }) ?? slots[slots.length - 1] ?? slots[0];
  const venue = getVenueRecommendation([...me.interests, ...candidate.persona.interests]);

  return {
    candidateName: candidate.persona.displayName,
    venueWhy: venue.why,
    proposal: {
      proposalId: `dp_${uid()}`,
      matchId: report.matchId,
      candidateId: candidate.id,
      when: slot,
      where: {
        venueName: venue.name,
        addressLine: venue.neighborhood,
      },
      activity: `${venue.type} at ${venue.name}`,
      status: "proposed",
    },
  };
}

export async function GET() {
  const user = await requireUser();
  const requests = getIncomingMatchRequests(user.id).map((record) => {
    const run = getRun(record.userId, record.runId);
    const requester = getProfile(record.userId).persona;
    const report = run?.reports[record.candidateId];
    return {
      id: record.id,
      status: record.status,
      score: record.score,
      updatedAt: record.updatedAt,
      requesterName: requester?.displayName ?? "Someone",
      requesterHeadline: requester?.headline ?? "Their agent found a strong fit.",
      requesterBio: requester?.bio ?? "",
      reportSummary: report?.summary ?? "",
      highlights: report?.highlights?.slice(0, 3) ?? [],
    };
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const id = String(body.id ?? "");
  const decision = String(body.decision ?? "");
  const record = getIncomingMatchRequests(user.id).find((r) => r.id === id);
  if (!record) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (decision === "decline") {
    const updated = saveMatchLifecycle({
      ...record,
      status: "declined",
      candidateConsent: "declined",
      updatedAt: Date.now(),
    });
    trackEvent(record.userId, "mutual_interest_declined", {
      lifecycleId: record.id,
      candidateId: record.candidateId,
    });
    trackEvent(user.id, "mutual_interest_declined", {
      lifecycleId: record.id,
      requesterUserId: record.userId,
    });
    addNotification(record.userId, {
      type: "agent_update",
      title: "A match request was declined",
      body: "Their agent did not confirm mutual interest this time.",
      href: "/history",
    });
    return NextResponse.json({ request: updated });
  }

  if (decision === "accept") {
    const result = proposalFor(record);
    if (!result.proposal) {
      return NextResponse.json({ error: result.error ?? "Could not create proposal" }, { status: 400 });
    }
    saveProposal(record.userId, result.proposal);
    trackEvent(record.userId, "mutual_interest_accepted", {
      lifecycleId: record.id,
      candidateId: record.candidateId,
    });
    trackEvent(user.id, "mutual_interest_accepted", {
      lifecycleId: record.id,
      requesterUserId: record.userId,
    });
    trackEvent(record.userId, "date_proposed", {
      proposalId: result.proposal.proposalId,
      candidateId: record.candidateId,
      consentRequired: true,
    });
    const updated = saveMatchLifecycle({
      ...record,
      status: "date_proposed",
      candidateConsent: "accepted",
      proposalId: result.proposal.proposalId,
      updatedAt: Date.now(),
    });
    addNotification(record.userId, {
      type: "match_found",
      title: "Mutual interest confirmed",
      body: `${result.candidateName ?? "Your match"} confirmed. Red String proposed a date.`,
      href: "/agent-run",
    });
    return NextResponse.json({
      request: updated,
      proposal: result.proposal,
      venueWhy: result.venueWhy,
    });
  }

  return NextResponse.json({ error: "Unknown decision" }, { status: 400 });
}
