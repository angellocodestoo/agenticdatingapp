import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLatestRun, getProfile } from "@/lib/store";
import { getEngine } from "@/lib/agent/llmEngine";
import { seededCandidates } from "@/data/candidates";
import type { Candidate } from "@/lib/types";

function findCandidate(userId: string, candidateId: string): Candidate | undefined {
  const run = getLatestRun(userId);
  return (
    run?.candidates.find((c) => c.id === candidateId) ??
    seededCandidates.find((c) => c.id === candidateId)
  );
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");

  if (!candidateId) {
    return new Response(JSON.stringify({ error: "candidateId required" }), {
      status: 400,
    });
  }

  const profile = getProfile(user.id);
  if (!profile.persona) {
    return new Response(JSON.stringify({ error: "Build your persona first" }), {
      status: 400,
    });
  }

  const candidate = findCandidate(user.id, candidateId);
  if (!candidate) {
    return new Response(JSON.stringify({ error: "Candidate not found" }), {
      status: 404,
    });
  }

  const engine = await getEngine();
  const { turns, report } = await engine.converse(profile.persona, candidate);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const turn of turns) {
        const data = `data: ${JSON.stringify({ type: "turn", turn })}\n\n`;
        controller.enqueue(encoder.encode(data));
        await new Promise((r) => setTimeout(r, 400));
      }
      const done = `data: ${JSON.stringify({ type: "report", report })}\n\n`;
      controller.enqueue(encoder.encode(done));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const candidateId = body.candidateId as string;

  const profile = getProfile(user.id);
  if (!profile.persona) {
    return new Response(JSON.stringify({ error: "Build your persona first" }), {
      status: 400,
    });
  }

  const candidate = findCandidate(user.id, candidateId);
  if (!candidate) {
    return new Response(JSON.stringify({ error: "Candidate not found" }), {
      status: 404,
    });
  }

  const engine = await getEngine();
  const { report } = await engine.converse(profile.persona, candidate);
  return new Response(JSON.stringify(report), {
    headers: { "Content-Type": "application/json" },
  });
}
