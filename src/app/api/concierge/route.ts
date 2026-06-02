import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/store";
import {
  getMockFreeBusy,
  getVenueRecommendation,
  getMockMaskedNumber,
} from "@/lib/integrations/mock";
import type { DateProposal, WarmupCall, MatchReport } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __proposals: Record<string, DateProposal>;
  // eslint-disable-next-line no-var
  var __calls: Record<string, WarmupCall>;
}
globalThis.__proposals ??= {};
globalThis.__calls ??= {};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "propose_date") {
    const report = body.report as MatchReport;
    if (!report?.matchId) {
      return NextResponse.json({ error: "report required" }, { status: 400 });
    }

    const slots = getMockFreeBusy();
    const slot = slots[0];

    const state = getState();
    const candidate = state.candidates.find(
      (c) => body.candidateId && c.id === body.candidateId
    );

    const sharedInterests = [
      ...(state.me.persona?.interests ?? []),
      ...(candidate?.persona.interests ?? []),
    ];
    const venue = getVenueRecommendation(sharedInterests);

    const proposal: DateProposal = {
      proposalId: `dp_${uid()}`,
      matchId: report.matchId,
      when: slot,
      where: {
        venueName: venue.name,
        addressLine: venue.neighborhood,
      },
      activity: `${venue.type} at ${venue.name}`,
      status: "proposed",
    };

    globalThis.__proposals[proposal.proposalId] = proposal;
    return NextResponse.json({ proposal });
  }

  if (action === "respond_proposal") {
    const proposalId = body.proposalId as string;
    const response = body.response as "accepted" | "declined";
    const proposal = globalThis.__proposals[proposalId];
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    proposal.status = response;

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
      globalThis.__calls[call.callId] = call;
      return NextResponse.json({ proposal, call });
    }

    return NextResponse.json({ proposal });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
