import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/store";
import { getMockSourceData } from "@/lib/integrations/mock";
import { getEngine } from "@/lib/agent/llmEngine";
import type { ConnectedSource, UserArtifact } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(getProfile(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const action = body.action as string;

  if (action === "connect_source") {
    const source = body.source as ConnectedSource;
    const profile = getProfile(user.id);
    const patch: Partial<typeof profile> = {};
    if (!profile.connectedSources.includes(source)) {
      patch.connectedSources = [...profile.connectedSources, source];
    }
    // Provider-backed slots remember which app/device the user picked.
    if (source === "strava" && body.provider) {
      patch.fitnessProvider = String(body.provider);
    }
    if (source === "ai_assistant" && body.provider) {
      patch.aiProvider = String(body.provider);
    }
    if (Object.keys(patch).length > 0) updateProfile(user.id, patch);
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "disconnect_source") {
    const source = body.source as ConnectedSource;
    const profile = getProfile(user.id);
    updateProfile(user.id, {
      connectedSources: profile.connectedSources.filter((s) => s !== source),
    });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "add_artifact") {
    const artifact: UserArtifact = {
      id: `art_${Date.now()}`,
      label: body.label ?? "Personal note",
      content: body.content,
      addedAt: Date.now(),
    };
    const profile = getProfile(user.id);
    updateProfile(user.id, { artifacts: [...(profile.artifacts ?? []), artifact] });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "remove_artifact") {
    const id = body.id as string;
    const profile = getProfile(user.id);
    updateProfile(user.id, {
      artifacts: (profile.artifacts ?? []).filter((a) => a.id !== id),
    });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "set_basics") {
    const age = Number(body.age);
    if (Number.isNaN(age) || age < 18 || age > 99) {
      return NextResponse.json({ error: "Enter an age between 18 and 99" }, { status: 400 });
    }
    const gender = String(body.gender ?? "man");
    const seeking = String(body.seeking ?? "women");
    const wantsKids = String(body.wantsKids ?? "open");
    updateProfile(user.id, {
      basics: {
        age,
        gender: gender as "man" | "woman" | "nonbinary",
        seeking: seeking as "men" | "women" | "everyone",
        wantsKids: wantsKids as "yes" | "no" | "open",
      },
    });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "import_ai_memory") {
    const provider = String(body.provider ?? "Claude");
    const content = String(body.content ?? "").trim();
    if (content.length < 40) {
      return NextResponse.json(
        { error: "That looks too short — paste the full summary your AI gave you." },
        { status: 400 }
      );
    }
    const profile = getProfile(user.id);
    const artifact: UserArtifact = {
      id: `art_${Date.now()}`,
      label: `${provider} memory import`,
      content: content.slice(0, 20000),
      addedAt: Date.now(),
    };
    const connectedSources = profile.connectedSources.includes("ai_assistant")
      ? profile.connectedSources
      : [...profile.connectedSources, "ai_assistant" as const];
    updateProfile(user.id, {
      connectedSources,
      aiProvider: provider,
      artifacts: [...(profile.artifacts ?? []), artifact],
    });
    // Rebuild immediately so the import visibly reshapes the persona.
    const updated = getProfile(user.id);
    const sources = getMockSourceData(
      updated.connectedSources,
      updated.fitnessProvider,
      updated.aiProvider
    );
    const engine = await getEngine();
    const persona = await engine.buildPersona({
      sources,
      artifacts: (updated.artifacts ?? []).map((a) => a.content),
      existingPersona: updated.persona,
      basics: updated.basics,
    });
    updateProfile(user.id, { persona, lastProfiledAt: Date.now() });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "build_persona") {
    const profile = getProfile(user.id);
    const sources = getMockSourceData(
      profile.connectedSources,
      profile.fitnessProvider,
      profile.aiProvider
    );
    const artifactTexts = (profile.artifacts ?? []).map((a) => a.content);
    const engine = await getEngine();
    const persona = await engine.buildPersona({
      sources,
      artifacts: artifactTexts,
      existingPersona: profile.persona,
      basics: profile.basics,
    });
    updateProfile(user.id, { persona, lastProfiledAt: Date.now() });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "update_persona") {
    const patch = body.persona;
    const profile = getProfile(user.id);
    if (!profile.persona) {
      return NextResponse.json({ error: "No persona to update" }, { status: 400 });
    }
    updateProfile(user.id, { persona: { ...profile.persona, ...patch } });
    return NextResponse.json(getProfile(user.id));
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
