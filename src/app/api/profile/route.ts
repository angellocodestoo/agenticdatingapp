import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getProfile,
  publishUserCandidateProfile,
  setUserCandidateVisibility,
  trackEvent,
  updateProfile,
} from "@/lib/store";
import { enforceRateLimit, moderateText } from "@/lib/guardrails";
import { getMockSourceData } from "@/lib/integrations/mock";
import { getEngine } from "@/lib/agent/llmEngine";
import type { ConnectedSource, UserArtifact } from "@/lib/types";

const GENDERS = new Set(["man", "woman", "nonbinary"]);
const SEEKING = new Set(["men", "women", "everyone"]);
const KIDS_INTENTS = new Set(["yes", "no", "open"]);

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(getProfile(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const action = body.action as string;
  const limited = enforceRateLimit(
    req,
    action === "build_persona" || action === "import_ai_memory" ? "profile_build" : "profile_write",
    {
      limit: action === "build_persona" || action === "import_ai_memory" ? 12 : 80,
      windowMs: action === "build_persona" || action === "import_ai_memory" ? 60 * 60 * 1000 : 10 * 60 * 1000,
    },
    user.id
  );
  if (limited) return limited;

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
    trackEvent(user.id, "profile_source_connected", { source, provider: body.provider ?? null });
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
    const content = String(body.content ?? "").trim();
    const contentCheck = moderateText(content);
    if (!contentCheck.ok) {
      return NextResponse.json({ error: contentCheck.error }, { status: 400 });
    }
    if (content.length < 2) {
      return NextResponse.json({ error: "Add a little more detail first." }, { status: 400 });
    }
    const artifact: UserArtifact = {
      id: `art_${Date.now()}`,
      label: body.label ? String(body.label).slice(0, 80) : "Personal note",
      content: content.slice(0, 10000),
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
    if (!GENDERS.has(gender)) {
      return NextResponse.json({ error: "Choose a valid gender" }, { status: 400 });
    }
    if (!SEEKING.has(seeking)) {
      return NextResponse.json({ error: "Choose who you want to meet" }, { status: 400 });
    }
    if (!KIDS_INTENTS.has(wantsKids)) {
      return NextResponse.json({ error: "Choose a valid kids preference" }, { status: 400 });
    }
    updateProfile(user.id, {
      basics: {
        age,
        gender: gender as "man" | "woman" | "nonbinary",
        seeking: seeking as "men" | "women" | "everyone",
        wantsKids: wantsKids as "yes" | "no" | "open",
      },
    });
    trackEvent(user.id, "profile_basics_saved", { age, gender, seeking, wantsKids });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "set_discoverability") {
    const discoverable = Boolean(body.discoverable);
    updateProfile(user.id, { discoverable });
    if (discoverable) {
      publishUserCandidateProfile(user.id);
    } else {
      setUserCandidateVisibility(user.id, "paused");
    }
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "import_ai_memory") {
    const provider = String(body.provider ?? "Claude");
    const content = String(body.content ?? "").trim();
    const contentCheck = moderateText(content);
    if (!contentCheck.ok) {
      return NextResponse.json({ error: contentCheck.error }, { status: 400 });
    }
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
    // Real OAuth data beats the mock when the user actually connected.
    if (updated.spotifyData) sources.spotify = updated.spotifyData;
    const engine = await getEngine();
    const persona = await engine.buildPersona({
      sources,
      artifacts: (updated.artifacts ?? []).map((a) => a.content),
      existingPersona: updated.persona,
      basics: updated.basics,
    });
    updateProfile(user.id, { persona, lastProfiledAt: Date.now() });
    publishUserCandidateProfile(user.id);
    trackEvent(user.id, "persona_built", {
      source: "ai_memory_import",
      connectedSources: updated.connectedSources.length,
    });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "build_persona") {
    const profile = getProfile(user.id);
    const sources = getMockSourceData(
      profile.connectedSources,
      profile.fitnessProvider,
      profile.aiProvider
    );
    if (profile.spotifyData) sources.spotify = profile.spotifyData;
    const artifactTexts = (profile.artifacts ?? []).map((a) => a.content);
    const engine = await getEngine();
    const persona = await engine.buildPersona({
      sources,
      artifacts: artifactTexts,
      existingPersona: profile.persona,
      basics: profile.basics,
    });
    updateProfile(user.id, { persona, lastProfiledAt: Date.now() });
    publishUserCandidateProfile(user.id);
    trackEvent(user.id, "persona_built", {
      source: "build_persona",
      connectedSources: profile.connectedSources.length,
    });
    return NextResponse.json(getProfile(user.id));
  }

  if (action === "update_persona") {
    const patch = body.persona;
    const profile = getProfile(user.id);
    if (!profile.persona) {
      return NextResponse.json({ error: "No persona to update" }, { status: 400 });
    }
    updateProfile(user.id, { persona: { ...profile.persona, ...patch } });
    publishUserCandidateProfile(user.id);
    trackEvent(user.id, "persona_updated", { fields: Object.keys(patch ?? {}) });
    return NextResponse.json(getProfile(user.id));
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
