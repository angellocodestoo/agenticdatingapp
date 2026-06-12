/**
 * LLM adapter backed by the Anthropic Messages API. Activated automatically
 * when ANTHROPIC_API_KEY is set; every call falls back to the scripted engine
 * on failure so the app never breaks if the key is missing/invalid or the
 * model returns malformed output.
 */
import type { AgentEngine, BuildPersonaInput, ConverseOutput } from "./engine";
import type { Candidate, MatchReport, Persona, ConversationTurn } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function callClaude(system: string, user: string, maxTokens = 4000): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [
        // Cache the static system prompt — persona context repeats across candidates.
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("No text block in response");
  return text;
}

/** Extract the first JSON object/array from a model reply that may include prose or fences. */
function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(start)) as T;
}

const PERSONA_SYSTEM = `You are the profile-builder for an agentic dating app. You infer a dating persona from a user's connected data sources and free-text notes. Be specific and grounded in the evidence — never invent facts. Output ONLY valid JSON.`;

async function buildPersonaLLM(input: BuildPersonaInput): Promise<Persona> {
  const user = `Build a dating persona from this data.

USER BASICS (authoritative — copy these into the persona verbatim):
${JSON.stringify(input.basics ?? {})}

SOURCES (connected integrations):
${JSON.stringify(input.sources, null, 2)}

FREE-TEXT NOTES FROM THE USER:
${input.artifacts.map((a, i) => `[${i + 1}] ${a}`).join("\n") || "(none)"}

${input.existingPersona ? `EXISTING PERSONA (preserve the user's prior edits to values/dealbreakers/assumption ratings):\n${JSON.stringify(input.existingPersona)}` : ""}

Return JSON exactly matching this TypeScript type (no extra keys):
{
  "id": string, "displayName": "You", "headline": string, "bio": string,
  "location": {"city": string, "region"?: string, "country": string},
  "age"?: number, "gender"?: "man"|"woman"|"nonbinary", "seeking"?: "men"|"women"|"everyone", "wantsKids"?: "yes"|"no"|"open",
  "ageRange": {"min": number, "max": number},
  "scheduleStyle": "structured" | "flexible" | "mixed",
  "interests": string[],            // max 12
  "values": [{"key": "family"|"ambition"|"kindness"|"growth"|"health"|"curiosity"|"faith"|"community"|"adventure"|"stability", "strength": "low"|"medium"|"high"}],
  "dealbreakers": [{"key": string, "note"?: string}],
  "yellowFlags": [{"key": string, "note"?: string}],
  "assumptions": [{"id": string, "label": string, "evidence": string[], "confidence": number}]
}
Each assumption must cite real evidence from the sources/notes. Confidence is 0..1.
IMPORTANT: dealbreakers means "things this user will NOT accept in a partner". Only include a dealbreaker if the user explicitly stated it in their notes — never infer or invent them. When in doubt, return an empty dealbreakers array; the user sets these themselves on the persona page.`;

  const text = await callClaude(PERSONA_SYSTEM, user);
  const persona = extractJson<Persona>(text);
  if (!persona.interests || !persona.values || !persona.assumptions) {
    throw new Error("Persona JSON missing required fields");
  }
  // Preserve user edits exactly as the scripted engine does.
  if (input.existingPersona) {
    persona.dealbreakers = input.existingPersona.dealbreakers;
    const priorRatings = new Map(
      input.existingPersona.assumptions.map((a) => [a.label, a])
    );
    persona.assumptions = persona.assumptions.map((a) => {
      const prior = priorRatings.get(a.label);
      return prior ? { ...a, userRating: prior.userRating, userOverride: prior.userOverride } : a;
    });
  }
  return persona;
}

const CONVERSE_SYSTEM = `You simulate a conversation between two dating-app AI agents negotiating on behalf of their humans (agent_a represents the user, agent_b the candidate), then score compatibility. Agents are warm but efficient, probe yellow flags honestly, and never reveal private details beyond what profiles contain. Output ONLY valid JSON.`;

async function converseLLM(
  me: Persona,
  candidate: Candidate,
  threshold?: number
): Promise<ConverseOutput> {
  const user = `USER'S DATE THRESHOLD: a candidate qualifies for a date only above ${threshold ?? 80}%. Reference this number (never any other) when the report discusses clearing or missing the bar.

USER PERSONA (agent_a represents them):
${JSON.stringify(me)}

CANDIDATE PERSONA (agent_b represents them):
${JSON.stringify(candidate.persona)}

Simulate a 10-16 turn agent-to-agent conversation, then produce a match report. Score honestly, with weights conditional on the user's kids intent: if the user definitely wants kids ("wantsKids":"yes"), age/life-stage is structural — values 40%, lifestyle 28%, logistics 32%; otherwise values 45%, lifestyle 35%, logistics 20%. Subtract a yellow-flag penalty (0-30).

LOGISTICS = life-stage alignment, not raw age proximity. Consider: kids intent changes the calculus (a family-minded man's window skews younger as he ages; a family-minded woman in her late 20s pairs best with established men around 33-38, not her own age); explicitly not wanting kids removes timing pressure and re-centers on same-stage companionship; men on average mature later, so woman-seeking-man pairings tolerate the man being a few years older; never score well below the half-your-age-plus-seven line in either direction. Reference the life-stage reasoning in highlights or risks.

SCORING IS DYNAMIC: start from a cautious initial score where every yellow flag counts against the match. As the conversation probes each flag, decide whether it's genuinely workable or a real risk. Workable flags refund their penalty; real risks keep it. The final "overall" reflects these adjustments, and "initial" records the pre-conversation estimate. When you adjust, add a system turn narrating it (e.g. "Agent reassessed career intensity — workable. +6."). Adjustments can go down too, if the conversation surfaces something worse than the profile suggested.

Return JSON:
{
  "turns": [{"role": "agent_a"|"agent_b"|"system", "content": string}],
  "report": {
    "summary": string,
    "highlights": string[],
    "risks": string[],
    "suggestedFirstDate": {"activity": string, "venueName": string, "neighborhood"?: string, "why": string},
    "score": {
      "overall": number,
      "initial": number,
      "adjustments": [{"flag": string, "delta": number, "reason": string}],
      "breakdown": {"values": number, "lifestyle": number, "logistics": number, "yellowFlagsPenalty": number}
    }
  }
}`;

  const text = await callClaude(CONVERSE_SYSTEM, user, 6000);
  const parsed = extractJson<{
    turns: Array<Pick<ConversationTurn, "role" | "content">>;
    report: Omit<MatchReport, "matchId" | "createdAt" | "transcript">;
  }>(text);
  if (!parsed.turns?.length || !parsed.report?.score) {
    throw new Error("Converse JSON missing required fields");
  }

  let ts = Date.now();
  const turns: ConversationTurn[] = parsed.turns.map((t) => {
    ts += 1600 + Math.floor(Math.random() * 200);
    return { role: t.role, content: t.content, ts };
  });

  const report: MatchReport = {
    ...parsed.report,
    matchId: `m_${candidate.id}_${Date.now().toString(36)}`,
    createdAt: Date.now(),
    transcript: turns,
    score: {
      ...parsed.report.score,
      overall: Math.max(0, Math.min(100, Math.round(parsed.report.score.overall))),
    },
  };
  return { turns, report };
}

export const llmEngine: AgentEngine = {
  async buildPersona(input) {
    return buildPersonaLLM(input);
  },
  async converse(me, candidate, opts) {
    return converseLLM(me, candidate, opts?.threshold);
  },
};

/**
 * Returns the LLM engine when an API key is configured, wrapped with a
 * scripted-engine fallback per call. Otherwise returns the scripted engine.
 */
export async function getEngine(): Promise<AgentEngine> {
  const { scriptedEngine } = await import("./scriptedEngine");
  if (!llmConfigured()) return scriptedEngine;

  return {
    async buildPersona(input) {
      try {
        return await llmEngine.buildPersona(input);
      } catch (err) {
        console.error("LLM buildPersona failed, falling back to scripted:", err);
        return scriptedEngine.buildPersona(input);
      }
    },
    async converse(me, candidate, opts) {
      try {
        return await llmEngine.converse(me, candidate, opts);
      } catch (err) {
        console.error("LLM converse failed, falling back to scripted:", err);
        return scriptedEngine.converse(me, candidate, opts);
      }
    },
  };
}
