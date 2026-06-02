import type { AgentEngine, BuildPersonaInput, ConverseOutput } from "./engine";
import type {
  Persona,
  Candidate,
  ConversationTurn,
  MatchReport,
  ValuePreference,
  Dealbreaker,
  YellowFlag,
  PersonaAssumption,
} from "@/lib/types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function overlap<T>(a: T[], b: T[]): T[] {
  return a.filter((x) => b.includes(x));
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function scoreValues(
  myValues: ValuePreference[],
  theirValues: ValuePreference[]
): number {
  if (!myValues.length || !theirValues.length) return 50;
  const myKeys = myValues.map((v) => v.key);
  const theirKeys = theirValues.map((v) => v.key);
  const shared = overlap(myKeys, theirKeys);
  const highMatches = shared.filter(
    (k) =>
      myValues.find((v) => v.key === k)?.strength === "high" &&
      theirValues.find((v) => v.key === k)?.strength === "high"
  );
  return clamp(
    Math.round((shared.length / Math.max(myKeys.length, 1)) * 70 + highMatches.length * 10)
  );
}

function scoreLifestyle(me: Persona, them: Persona): number {
  let score = 60;
  if (me.scheduleStyle === them.scheduleStyle) score += 20;
  else if (
    me.scheduleStyle === "mixed" ||
    them.scheduleStyle === "mixed"
  )
    score += 10;
  const sharedInterests = overlap(
    me.interests.map((i) => i.toLowerCase()),
    them.interests.map((i) => i.toLowerCase())
  );
  score += Math.min(sharedInterests.length * 5, 20);
  return clamp(score);
}

function scoreLogistics(me: Persona, them: Persona): number {
  let score = 70;
  const meAge = (me.ageRange.min + me.ageRange.max) / 2;
  const themAge = (them.ageRange.min + them.ageRange.max) / 2;
  if (Math.abs(meAge - themAge) <= 5) score += 20;
  else if (Math.abs(meAge - themAge) <= 10) score += 10;
  const sameCity =
    me.location.city.toLowerCase() === them.location.city.toLowerCase() ||
    me.location.region === them.location.region;
  if (sameCity) score += 10;
  return clamp(score);
}

function checkDealbreaker(
  myDealbreakers: Dealbreaker[],
  theirFlags: YellowFlag[],
  theirDealbreakers: Dealbreaker[]
): string | null {
  const theirFlagKeys = theirFlags.map((f) => f.key);
  const theirBreakers = theirDealbreakers.map((d) => d.key);

  for (const db of myDealbreakers) {
    if (db.key === "non_monogamy" && theirBreakers.includes("non_monogamy")) {
      return null;
    }
    if (db.key === "smoking" && theirFlagKeys.includes("diet_lifestyle")) {
      return null;
    }
    if (db.key === "wants_kids_no" && theirBreakers.includes("wants_kids_no")) {
      return "Dealbreaker: one person does not want kids and the other does.";
    }
    if (db.key === "wants_kids_yes" && theirBreakers.includes("wants_kids_yes")) {
      return null;
    }
    if (db.key === "heavy_drinking") {
      return null;
    }
    if (db.key === "non_monogamy") {
      const theirHas = theirBreakers.some(
        (k) => k === "non_monogamy"
      );
      if (!theirHas) {
        return "Dealbreaker: one person is open to non-monogamy, the other is not.";
      }
    }
  }
  return null;
}

function resolvedYellowFlag(flag: YellowFlag, context: Persona): boolean {
  if (flag.key === "busy_schedule" && context.scheduleStyle === "structured")
    return true;
  if (flag.key === "travel_frequency" && context.interests.includes("travel"))
    return true;
  if (flag.key === "communication_style" && context.scheduleStyle !== "flexible")
    return false;
  if (flag.key === "diet_lifestyle" && context.interests.some((i) => i.includes("run") || i.includes("health")))
    return true;
  return false;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildConversation(
  me: Persona,
  them: Persona,
  yellowFlags: YellowFlag[],
  sharedInterests: string[]
): ConversationTurn[] {
  const now = Date.now();
  const turns: ConversationTurn[] = [];
  let t = now;
  const tick = (ms: number) => (t += ms);

  const myHigh = me.values.filter((v) => v.strength === "high").map((v) => v.key);
  const theirHigh = them.values.filter((v) => v.strength === "high").map((v) => v.key);
  const A = (content: string, ms = 1600) => turns.push({ role: "agent_a", content, ts: tick(ms) });
  const B = (content: string, ms = 1700) => turns.push({ role: "agent_b", content, ts: tick(ms) });

  turns.push({
    role: "system",
    content: rand([
      `Connecting with ${them.displayName}'s agent…`,
      `Opening a channel to ${them.displayName}'s agent.`,
      `${me.displayName}'s agent reached out to ${them.displayName}'s agent.`,
    ]),
    ts: tick(0),
  });

  // Opener
  A(
    rand([
      `Hi! I represent ${me.displayName}. They care most about ${myHigh.join(", ") || "depth and growth"}. What's ${them.displayName} actually looking for right now?`,
      `Hey — ${me.displayName}'s agent here. Before anything else: ${me.displayName} is after genuine alignment on ${myHigh.slice(0, 2).join(" and ") || "values"}. Where's ${them.displayName}'s head at?`,
      `Good to meet you. ${me.displayName} isn't looking for a pen pal — they want something real, anchored in ${myHigh[0] ?? "shared values"}. What matters to ${them.displayName}?`,
    ]),
    1200
  );
  B(
    rand([
      `Likewise. ${them.displayName} wants a partner who's ${theirHigh.join(" and ") || "kind and driven"} — something built to last, not surface-level.`,
      `${them.displayName} is done with casual. They value ${theirHigh.slice(0, 2).join(" and ") || "honesty and growth"} and want a real partnership.`,
      `Straight answer: ${them.displayName} is looking for depth. ${theirHigh[0] ? `${theirHigh[0][0].toUpperCase()}${theirHigh[0].slice(1)} is non-negotiable for them.` : "Substance over noise."}`,
    ]),
    1500
  );

  // Shared interests
  if (sharedInterests.length > 0) {
    const ints = sharedInterests.slice(0, 2).join(" and ");
    A(
      rand([
        `Nice overlap — they both light up around ${ints}. Does ${them.displayName} actually make time for that, or is it aspirational?`,
        `I noticed shared ground in ${ints}. Real part of ${them.displayName}'s life, or just on the profile?`,
        `${ints} came up on both sides. How central is that to ${them.displayName}'s week?`,
      ])
    );
    B(
      rand([
        `Very real. ${them.displayName} guards that time — the calendar bends around it, not the reverse.`,
        `It's genuine. ${them.displayName} says it's how they stay grounded when work gets loud.`,
        `Not aspirational at all — it's a weekly ritual for ${them.displayName}.`,
      ])
    );
  }

  // Yellow flags
  for (const flag of yellowFlags.slice(0, 2)) {
    const resolved = resolvedYellowFlag(flag, me);
    const label = flag.key.replace(/_/g, " ");
    A(
      rand([
        `Let me probe a possible yellow flag — ${label}. ${flag.note ?? ""} How does ${them.displayName} handle it?`,
        `One thing I want to pressure-test: ${label}. ${flag.note ?? ""} Honest read?`,
        `Flag worth raising: ${label}. ${flag.note ?? ""} Is this a real friction point for ${them.displayName}?`,
      ]),
      1900
    );
    if (resolved) {
      B(
        rand([
          `Honestly, that aligns well here. On paper it reads as a concern, but in practice it creates complementary rhythm. Context beats the label.`,
          `Less of an issue than it looks. ${them.displayName} has thought about this a lot — it actually fits ${me.displayName}'s style.`,
          `That one resolves itself. Their patterns are compatible — it's a green light, not a yellow one, once you see the detail.`,
        ])
      );
    } else {
      B(
        rand([
          `Fair flag. ${them.displayName} won't pretend it disappears — it'd take real communication, and they're open to that.`,
          `That's legitimate. It's workable, but only with intention on both sides. ${them.displayName} knows that.`,
          `Won't sugarcoat it — this needs explicit conversation. ${them.displayName} is willing, but it's not automatic.`,
        ])
      );
    }
  }

  // Values deep-dive
  const valOverlap = overlap(me.values.map((v) => v.key), them.values.map((v) => v.key));
  if (valOverlap.length >= 2) {
    A(
      rand([
        `Both profiles emphasize ${valOverlap.slice(0, 2).join(" and ")}. How does ${them.displayName} actually live those?`,
        `Strong shared signal on ${valOverlap.slice(0, 2).join(" and ")}. Give me the day-to-day, not the bio version.`,
      ]),
      2000
    );
    B(
      rand([
        `${valOverlap[0]} shows up in how ${them.displayName} treats people — even strangers. ${valOverlap[1] ? `And ${valOverlap[1]} drove a real career choice: they left a bigger paycheck for work that mattered.` : ""}`,
        `For ${them.displayName}, ${valOverlap[0]} isn't a word — it's a pattern. ${valOverlap[1] ? `${valOverlap[1].charAt(0).toUpperCase()}${valOverlap[1].slice(1)} too; it shapes who they spend time with.` : ""}`,
      ]),
      2000
    );
  }

  // Close
  A(
    rand([
      `I've got what I need. The alignment is substantive and the friction looks manageable. Synthesizing the report now.`,
      `Good conversation. Strong signal on the things that matter — putting together the compatibility read.`,
    ]),
    1500
  );
  B(
    rand([
      `Agreed — ${them.displayName}'s agent sees a real match here. Over to the concierge.`,
      `Same read on our end. This one's worth pursuing. Handing off.`,
    ]),
    1200
  );

  return turns;
}

/** Stable slug so re-running the profiler keeps the same assumption IDs
 *  (and therefore the user's accurate/wrong ratings survive a rebuild). */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Maps free-text "About me" keywords to interests + value preferences so the
 *  artifact ALWAYS shapes the profile, not just a couple of hard-coded words. */
const ARTIFACT_INTEREST_MAP: Array<{ kws: string[]; interests: string[] }> = [
  { kws: ["travel", "adventure", "explore", "wander"], interests: ["travel", "adventure"] },
  { kws: ["hike", "hiking", "outdoor", "mountain", "trail", "camp"], interests: ["hiking", "the outdoors"] },
  { kws: ["run", "running", "marathon", "fitness", "gym", "workout", "health"], interests: ["fitness", "running"] },
  { kws: ["food", "foodie", "restaurant", "cook", "cooking", "dining", "wine"], interests: ["fine dining", "cooking"] },
  { kws: ["music", "concert", "jazz", "vinyl", "festival", "guitar"], interests: ["live music"] },
  { kws: ["art", "museum", "gallery", "design", "architecture"], interests: ["art & design"] },
  { kws: ["read", "reading", "book", "books", "literature", "writing"], interests: ["reading"] },
  { kws: ["film", "movie", "cinema", "photography", "photo"], interests: ["film & photography"] },
  { kws: ["dog", "dogs", "cat", "pet", "pets", "animal"], interests: ["animals"] },
  { kws: ["coffee", "cafe", "espresso"], interests: ["coffee culture"] },
  { kws: ["yoga", "meditation", "mindful", "wellness"], interests: ["wellness"] },
];

const ARTIFACT_VALUE_MAP: Array<{ kws: string[]; key: ValuePreference["key"]; strength: ValuePreference["strength"] }> = [
  { kws: ["family", "kids", "children", "home"], key: "family", strength: "high" },
  { kws: ["ambition", "ambitious", "driven", "career", "build", "founder"], key: "ambition", strength: "high" },
  { kws: ["kind", "kindness", "caring", "compassion", "thoughtful"], key: "kindness", strength: "high" },
  { kws: ["grow", "growth", "learn", "curious", "improve"], key: "growth", strength: "high" },
  { kws: ["health", "fit", "wellness", "active"], key: "health", strength: "medium" },
  { kws: ["adventure", "spontaneous", "travel"], key: "adventure", strength: "medium" },
  { kws: ["faith", "spiritual", "religion"], key: "faith", strength: "medium" },
  { kws: ["community", "friends", "social", "give back"], key: "community", strength: "medium" },
  { kws: ["stable", "stability", "settle", "grounded", "calm"], key: "stability", strength: "medium" },
  { kws: ["curious", "curiosity", "ideas", "learning"], key: "curiosity", strength: "medium" },
];

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^.*?[.!?](\s|$)/);
  const s = (m ? m[0] : trimmed).trim();
  return s.length > 160 ? s.slice(0, 157).trimEnd() + "…" : s;
}

function buildPersonaFromSources(input: BuildPersonaInput): Persona {
  const { sources, artifacts, existingPersona } = input;

  const interests: string[] = [];
  const assumptions: PersonaAssumption[] = [];
  const valueMap = new Map<ValuePreference["key"], ValuePreference>();

  const addValue = (key: ValuePreference["key"], strength: ValuePreference["strength"]) => {
    const rank = { low: 1, medium: 2, high: 3 } as const;
    const existing = valueMap.get(key);
    if (!existing || rank[strength] > rank[existing.strength]) {
      valueMap.set(key, { key, strength });
    }
  };

  // Baseline values
  addValue("growth", "high");
  addValue("ambition", "high");
  addValue("kindness", "medium");
  addValue("curiosity", "medium");

  if (sources.linkedin) {
    interests.push("strategic thinking", "mentorship");
    assumptions.push({
      id: "linkedin-role",
      label: `${sources.linkedin.role} at ${sources.linkedin.company} — a high-output professional`,
      evidence: ["LinkedIn: role", "LinkedIn: industry"],
      confidence: 0.9,
    });
    assumptions.push({
      id: "meaningful-work",
      label: "Values intellectual peers and meaningful work over pure prestige",
      evidence: ["LinkedIn: mission-driven skill profile"],
      confidence: 0.72,
    });
  }

  if (sources.spotify) {
    interests.push(...sources.spotify.topGenres.map((g) => `${g} music`));
    assumptions.push({
      id: "listening-mood",
      label: `Music taste reads as "${sources.spotify.listeningMood}" — leans introspective`,
      evidence: ["Spotify: top genres", "Spotify: artist curation"],
      confidence: 0.68,
    });
  }

  if (sources.calendar) {
    const morningPerson = sources.calendar.some((e) => parseInt(e.time) < 9);
    const hasWeekendActivities = sources.calendar.some(
      (e) => e.dayOfWeek.includes("Saturday") || e.dayOfWeek.includes("Sunday")
    );
    if (morningPerson) {
      assumptions.push({
        id: "early-riser",
        label: "Early riser with a morning-anchored routine",
        evidence: ["Calendar: recurring early events"],
        confidence: 0.82,
      });
      interests.push("fitness");
    }
    if (hasWeekendActivities) {
      assumptions.push({
        id: "protects-weekends",
        label: "Protects weekends as personal, non-work time",
        evidence: ["Calendar: weekend recurring events"],
        confidence: 0.75,
      });
      interests.push("weekend exploration");
    }
    assumptions.push({
      id: "busy-weekdays",
      label: "Genuinely busy — weekdays are nearly full",
      evidence: ["Calendar: weekday density"],
      confidence: 0.88,
    });
  }

  // ── "About me" free text ALWAYS shapes the profile ──
  const artifactText = artifacts.join(" ").trim();
  if (artifactText.length > 0) {
    const lower = artifactText.toLowerCase();

    for (const { kws, interests: ints } of ARTIFACT_INTEREST_MAP) {
      if (kws.some((k) => lower.includes(k))) interests.push(...ints);
    }
    for (const { kws, key, strength } of ARTIFACT_VALUE_MAP) {
      if (kws.some((k) => lower.includes(k))) addValue(key, strength);
    }

    // Always surface that the user shared context, quoting their own words.
    assumptions.push({
      id: "about-me-summary",
      label: `In their words: "${firstSentence(artifactText)}"`,
      evidence: ["Personal note you wrote"],
      confidence: 0.95,
    });
  }

  // Dedupe interests case-insensitively, preserving first-seen casing.
  const seen = new Set<string>();
  const dedupedInterests = interests.filter((i) => {
    const k = i.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Dedupe assumptions by id, and carry over prior user ratings on rebuild.
  const ratingById = new Map(
    (existingPersona?.assumptions ?? []).map((a) => [a.id, a.userRating])
  );
  const assumptionSeen = new Set<string>();
  const dedupedAssumptions = assumptions
    .filter((a) => {
      if (assumptionSeen.has(a.id)) return false;
      assumptionSeen.add(a.id);
      return true;
    })
    .map((a) => ({ ...a, userRating: ratingById.get(a.id) ?? a.userRating }));

  // Compose a bio that incorporates the "About me" note when present.
  const baseBio = sources.linkedin
    ? `A ${sources.linkedin.role} at ${sources.linkedin.company} with ${sources.linkedin.yearsExperience} years in ${sources.linkedin.industry}. Looking for a partner with substance — ambitious, kind, and present.`
    : "Looking for a genuine partner — someone to build a life with, not just pass time with.";

  const bio = artifactText.length > 0 ? `${baseBio} ${firstSentence(artifactText)}` : baseBio;

  // Preserve any dealbreakers/values the user already tailored on a rebuild.
  const baseValues = Array.from(valueMap.values());
  const mergedValues = existingPersona
    ? mergeValues(baseValues, existingPersona.values)
    : baseValues;

  return {
    id: existingPersona?.id ?? `p_me_${uid()}`,
    displayName: "You",
    headline: sources.linkedin
      ? `${sources.linkedin.role} who invests with conviction and lives with intention.`
      : "Thoughtful, driven, and building something meaningful.",
    bio,
    location: existingPersona?.location ?? { city: "New York", region: "NY", country: "US" },
    ageRange: existingPersona?.ageRange ?? { min: 30, max: 42 },
    scheduleStyle: sources.calendar ? "structured" : "mixed",
    interests: dedupedInterests.slice(0, 12),
    values: mergedValues,
    dealbreakers: existingPersona?.dealbreakers ?? [],
    yellowFlags: [{ key: "busy_schedule", note: "A demanding career leaves little margin." }],
    assumptions: dedupedAssumptions,
  };
}

/** Keep the strongest strength per value key when merging derived + tailored. */
function mergeValues(
  derived: ValuePreference[],
  tailored: ValuePreference[]
): ValuePreference[] {
  const rank = { low: 1, medium: 2, high: 3 } as const;
  const map = new Map<ValuePreference["key"], ValuePreference>();
  for (const v of [...derived, ...tailored]) {
    const existing = map.get(v.key);
    if (!existing || rank[v.strength] > rank[existing.strength]) map.set(v.key, v);
  }
  return Array.from(map.values());
}

export const scriptedEngine: AgentEngine = {
  async buildPersona(input: BuildPersonaInput): Promise<Persona> {
    return buildPersonaFromSources(input);
  },

  async converse(me: Persona, candidate: Candidate): Promise<ConverseOutput> {
    const them = candidate.persona;

    const dealbreakerReason = checkDealbreaker(
      me.dealbreakers,
      them.yellowFlags,
      them.dealbreakers
    );

    if (dealbreakerReason) {
      const eliminatedReport: MatchReport = {
        matchId: `m_${uid()}`,
        createdAt: Date.now(),
        summary: `This match was filtered before the conversation started due to a hard incompatibility.`,
        highlights: [],
        risks: [dealbreakerReason],
        suggestedFirstDate: { activity: "", venueName: "", why: "" },
        score: {
          overall: 0,
          breakdown: { values: 0, lifestyle: 0, logistics: 0, yellowFlagsPenalty: 0 },
        },
        redFlagEliminatedReason: dealbreakerReason,
        transcript: [
          {
            role: "system",
            content: `Match evaluation terminated: ${dealbreakerReason}`,
            ts: Date.now(),
          },
        ],
      };
      return { turns: eliminatedReport.transcript, report: eliminatedReport };
    }

    const sharedInterests = overlap(
      me.interests.map((i) => i.toLowerCase()),
      them.interests.map((i) => i.toLowerCase())
    );

    const theirYellowFlags = them.yellowFlags;
    const unresolvedFlags = theirYellowFlags.filter(
      (f) => !resolvedYellowFlag(f, me)
    );

    const valScore = scoreValues(me.values, them.values);
    const lifeScore = scoreLifestyle(me, them);
    const logScore = scoreLogistics(me, them);
    const penalty = clamp(unresolvedFlags.length * 8, 0, 30);
    const overall = clamp(
      Math.round((valScore * 0.45 + lifeScore * 0.35 + logScore * 0.2) - penalty)
    );

    const turns = buildConversation(me, them, theirYellowFlags, sharedInterests);

    const highlights: string[] = [];
    const risks: string[] = [];

    const sharedValueKeys = overlap(
      me.values.map((v) => v.key),
      them.values.map((v) => v.key)
    );
    if (sharedValueKeys.length) {
      highlights.push(
        rand([
          `Both prioritize ${sharedValueKeys.slice(0, 2).join(" and ")} — that's rare.`,
          `Real overlap on ${sharedValueKeys.slice(0, 2).join(" and ")}; not just profile talk.`,
          `Shared core values: ${sharedValueKeys.slice(0, 2).join(" and ")}.`,
        ])
      );
    }
    if (sharedInterests.length) {
      highlights.push(
        rand([
          `You'd actually enjoy the same things — ${sharedInterests.slice(0, 2).join(" and ")}.`,
          `Shared interests in ${sharedInterests.slice(0, 2).join(" and ")} give you easy first-date chemistry.`,
          `Both light up around ${sharedInterests.slice(0, 2).join(" and ")}.`,
        ])
      );
    }
    if (me.scheduleStyle === them.scheduleStyle) {
      highlights.push(
        rand([
          `Compatible rhythms — both run a ${me.scheduleStyle} schedule.`,
          `Your calendars likely mesh; both ${me.scheduleStyle} planners.`,
        ])
      );
    }

    for (const flag of unresolvedFlags) {
      risks.push(
        rand([
          `Worth a direct conversation: ${flag.key.replace(/_/g, " ")}. ${flag.note ?? ""}`,
          `Yellow flag — ${flag.key.replace(/_/g, " ")}. ${flag.note ?? "Not a dealbreaker, but don't ignore it."}`,
        ])
      );
    }

    const venueInterests = [...sharedInterests, ...me.interests, ...them.interests];

    const { getVenueRecommendation } = await import("@/lib/integrations/mock");
    const venue = getVenueRecommendation(venueInterests);

    const report: MatchReport = {
      matchId: `m_${uid()}`,
      createdAt: Date.now(),
      summary:
        overall >= 80
          ? rand([
              `Your agents found strong alignment — values, lifestyle, and logistics all line up. This is worth a real date.`,
              `Rare signal: substantive values overlap and a lifestyle fit that should feel easy in person.`,
              `${them.displayName} cleared the bar. The conversation surfaced real compatibility, not just shared keywords.`,
            ])
          : overall >= 65
          ? rand([
              `Good overlap with a few areas to discuss openly before committing to a date.`,
              `Promising, but not above the 80% date threshold — yellow flags need a real conversation first.`,
            ])
          : rand([
              `Some interesting overlap, but friction points would need direct attention.`,
              `Not enough alignment for a confident date recommendation right now.`,
            ]),
      highlights,
      risks,
      suggestedFirstDate: {
        activity: venue.type,
        venueName: venue.name,
        neighborhood: venue.neighborhood,
        why: venue.why,
      },
      score: {
        overall,
        breakdown: {
          values: valScore,
          lifestyle: lifeScore,
          logistics: logScore,
          yellowFlagsPenalty: penalty,
        },
      },
      transcript: turns,
    };

    return { turns, report };
  },
};
