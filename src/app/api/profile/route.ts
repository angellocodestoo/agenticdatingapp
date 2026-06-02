import { NextRequest, NextResponse } from "next/server";
import { getState, updateMe } from "@/lib/store";
import { getMockSourceData } from "@/lib/integrations/mock";
import { scriptedEngine } from "@/lib/agent/scriptedEngine";
import type { ConnectedSource, UserArtifact } from "@/lib/types";

export async function GET() {
  const state = getState();
  return NextResponse.json(state.me);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "connect_source") {
    const source = body.source as ConnectedSource;
    const state = getState();
    const existing = state.me.connectedSources;
    if (!existing.includes(source)) {
      updateMe({ connectedSources: [...existing, source] });
    }
    return NextResponse.json(getState().me);
  }

  if (action === "disconnect_source") {
    const source = body.source as ConnectedSource;
    const state = getState();
    updateMe({
      connectedSources: state.me.connectedSources.filter((s) => s !== source),
    });
    return NextResponse.json(getState().me);
  }

  if (action === "add_artifact") {
    const artifact: UserArtifact = {
      id: `art_${Date.now()}`,
      label: body.label ?? "Personal note",
      content: body.content,
      addedAt: Date.now(),
    };
    const state = getState();
    updateMe({ artifacts: [...(state.me.artifacts ?? []), artifact] });
    return NextResponse.json(getState().me);
  }

  if (action === "remove_artifact") {
    const id = body.id as string;
    const state = getState();
    updateMe({
      artifacts: (state.me.artifacts ?? []).filter((a) => a.id !== id),
    });
    return NextResponse.json(getState().me);
  }

  if (action === "build_persona") {
    const state = getState();
    const sources = getMockSourceData(state.me.connectedSources);
    const artifactTexts = (state.me.artifacts ?? []).map((a) => a.content);
    const persona = await scriptedEngine.buildPersona({
      sources,
      artifacts: artifactTexts,
      existingPersona: state.me.persona,
    });
    updateMe({ persona, lastProfiledAt: Date.now() });
    return NextResponse.json(getState().me);
  }

  if (action === "update_persona") {
    const patch = body.persona;
    const state = getState();
    if (!state.me.persona) {
      return NextResponse.json({ error: "No persona to update" }, { status: 400 });
    }
    updateMe({ persona: { ...state.me.persona, ...patch } });
    return NextResponse.json(getState().me);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
