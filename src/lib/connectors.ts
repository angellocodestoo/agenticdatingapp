import type { ConnectedSource } from "@/lib/types";

export type ConnectorInfo = {
  id: ConnectedSource;
  label: string;
  icon: string;
  desc: string;
  /** What the agent learns — shown when suggesting this connector. */
  unlocks: string;
  /** Contribution to profile confidence (see lib/confidence.ts). */
  weight: number;
  /** Primary connectors appear in onboarding; the rest are suggested later. */
  primary: boolean;
  /** When set, the user picks which provider/device they use before connecting. */
  providers?: string[];
};

export const ACTIVITY_PROVIDERS = [
  "Strava",
  "WHOOP",
  "Fitbit",
  "Oura Ring",
  "Garmin",
  "Apple Health",
];

export const AI_PROVIDERS = ["Claude", "ChatGPT", "Gemini", "Perplexity"];

/**
 * The prompt a user pastes into their own AI assistant. The assistant's reply
 * is what they paste back into Soulmate. Mirrors Anthropic's memory-import
 * pattern: no OAuth or export files — works with any assistant on day one.
 */
export const AI_IMPORT_PROMPT = `Please summarize everything you know about me from our past conversations as a structured list I can share with another service. Include: my values and what matters most to me, my lifestyle and daily rhythms, my interests and hobbies, my relationship goals and how I approach the people I care about, my health and wellness context, and any recurring questions or themes I come back to. Be honest and specific — write it as a portrait of who I actually am, not a flattering bio. Leave out anything you think I'd consider too private to share.`;

export const CONNECTORS: ConnectorInfo[] = [
  {
    id: "google_calendar",
    label: "Google Calendar",
    icon: "📅",
    desc: "Reveals schedule style, priorities, and lifestyle rhythm.",
    unlocks: "When you actually have time — and what you protect.",
    weight: 12,
    primary: true,
  },
  {
    id: "spotify",
    label: "Spotify",
    icon: "🎵",
    desc: "Shows personality through music taste and listening habits.",
    unlocks: "Your emotional register and taste fingerprint.",
    weight: 8,
    primary: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    desc: "Gives context on career, ambition, and professional identity.",
    unlocks: "Ambition level and how work shapes your life.",
    weight: 10,
    primary: true,
  },
  {
    id: "strava",
    label: "Activity data",
    icon: "🏃",
    desc: "Real activity data: how you move, when, and how consistently.",
    unlocks: "Your actual energy and fitness rhythm — not the aspirational one.",
    weight: 12,
    primary: true,
    providers: ACTIVITY_PROVIDERS,
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "📸",
    desc: "Social energy, travel history, and how you spend time with people.",
    unlocks: "Social battery, aesthetics, and the places you keep returning to.",
    weight: 9,
    primary: false,
  },
  {
    id: "goodreads",
    label: "Goodreads",
    icon: "📚",
    desc: "What you read and how deeply — intellectual taste at a glance.",
    unlocks: "Curiosity fingerprint and endless first-date conversation fuel.",
    weight: 8,
    primary: false,
  },
  {
    id: "ai_assistant",
    label: "AI assistant",
    icon: "🤖",
    desc: "Import what your AI already knows about you from your conversations.",
    unlocks: "The questions you actually ask when no one's watching — the deepest signal there is.",
    weight: 20,
    primary: false,
    providers: AI_PROVIDERS,
  },
];

export const PRIMARY_CONNECTORS = CONNECTORS.filter((c) => c.primary);
export const SECONDARY_CONNECTORS = CONNECTORS.filter((c) => !c.primary);
