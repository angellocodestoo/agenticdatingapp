import { NextRequest } from "next/server";
import { getState } from "@/lib/store";
import { scriptedEngine } from "@/lib/agent/scriptedEngine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");

  if (!candidateId) {
    return new Response(JSON.stringify({ error: "candidateId required" }), {
      status: 400,
    });
  }

  const state = getState();
  if (!state.me.persona) {
    return new Response(JSON.stringify({ error: "Build your persona first" }), {
      status: 400,
    });
  }

  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return new Response(JSON.stringify({ error: "Candidate not found" }), {
      status: 404,
    });
  }

  const { turns, report } = await scriptedEngine.converse(
    state.me.persona,
    candidate
  );

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
  const body = await req.json();
  const candidateId = body.candidateId as string;

  const state = getState();
  if (!state.me.persona) {
    return new Response(JSON.stringify({ error: "Build your persona first" }), {
      status: 400,
    });
  }

  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return new Response(JSON.stringify({ error: "Candidate not found" }), {
      status: 404,
    });
  }

  const { report } = await scriptedEngine.converse(state.me.persona, candidate);
  return new Response(JSON.stringify(report), {
    headers: { "Content-Type": "application/json" },
  });
}
