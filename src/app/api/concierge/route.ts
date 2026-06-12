import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getLatestRun,
  getProfile,
  getProposal,
  getSettings,
  saveCall,
  saveProposal,
} from "@/lib/store";
import {
  getMockFreeBusy,
  getVenueRecommendation,
  getMockMaskedNumber,
} from "@/lib/integrations/mock";
import type { DateProposal, WarmupCall } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const action = body.action as string;

  if (action === "propose_date") {
    const profile = getProfile(user.id);
    const run = getLatestRun(user.id);
    const candidateId = String(body.candidateId ?? "");
    if (!run || !candidateId) {
      return NextResponse.json({ error: "No active match found" }, { status: 400 });
    }

    const candidate = run?.candidates.find(
      (c) => c.id === candidateId
    );
    const report = run.reports[candidateId];
    if (!candidate || !report) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const threshold = getSettings(user.id).threshold;
    if (report.score.overall <= threshold) {
      return NextResponse.json(
        {
          error: `Score must be above ${threshold}% to book a date`,
          score: report.score.overall,
        },
        { status: 400 }
      );
    }

    const slots = getMockFreeBusy();
    const slot = slots[0];

    const sharedInterests = [
      ...(profile.persona?.interests ?? []),
      ...candidate.persona.interests,
    ];
    const venue = getVenueRecommendation(sharedInterests);

    const proposal: DateProposal = {
      proposalId: `dp_${uid()}`,
      matchId: report.matchId,
      candidateId,
      when: slot,
      where: {
        venueName: venue.name,
        addressLine: venue.neighborhood,
      },
      activity: `${venue.type} at ${venue.name}`,
      status: "proposed",
    };

    saveProposal(user.id, proposal);
    return NextResponse.json({ proposal });
  }

  if (action === "respond_proposal") {
    const proposalId = body.proposalId as string;
    const response = body.response as "accepted" | "declined";
    const proposal = getProposal(user.id, proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    proposal.status = response;
    saveProposal(user.id, proposal);

    if (response === "accepted") {
      const slot = getMockFreeBusy()[1] ?? getMockFreeBusy()[0];
      const callSlot = { ...slot };
      const start = new Date(callSlot.start);
      start.setDate(start.getDate() - 1);
      start.setHours(20, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(30);

      const call: WarmupCall = {
        callId: `call_${uid()}`,
        matchId: proposal.matchId,
        when: {
          start: start.toISOString(),
          end: end.toISOString(),
          timezone: "America/New_York",
        },
        maskedNumberA: getMockMaskedNumber("persona_a"),
        maskedNumberB: getMockMaskedNumber("persona_b"),
        status: "scheduled",
        topics: [],
      };
      saveCall(user.id, call);
      return NextResponse.json({ proposal, call });
    }

    return NextResponse.json({ proposal });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
