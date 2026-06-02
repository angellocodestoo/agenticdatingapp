import type {
  Candidate,
  Persona,
  ValueKey,
  ValuePreference,
  YellowFlagKey,
  DealbreakerKey,
} from "@/lib/types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

const NAMES = [
  "Ava", "Maya", "Sofia", "Jordan", "Riley", "Emma", "Olivia", "Chloe",
  "Nina", "Priya", "Zoe", "Lena", "Aria", "Quinn", "Sage", "Nora",
  "Iris", "Tessa", "Mia", "Lucia", "Hana", "Dahlia", "Esme", "Margot",
  "Camila", "Frankie", "Stella", "Daniela", "Cleo", "Juniper",
];

const HEADLINES = [
  "Optimistic builder who protects her weekends.",
  "Curious, outdoorsy, and big on family.",
  "Warm, grounded, and serious about her craft.",
  "Social extrovert with a calm core.",
  "Thoughtful minimalist who loves deep talks.",
  "Driven by day, playful by night.",
  "Equal parts ambitious and present.",
  "Looking for a real partner, not a project.",
  "Runs on espresso, good books, and big ideas.",
  "Quietly competitive, endlessly curious.",
];

const BIOS = [
  "I like ambitious people with kind hearts. I want something built to last, not just to pass time.",
  "If we can talk for hours and still laugh, we're in a good place.",
  "I want a partner who's driven but present — someone who builds a life, not just a career.",
  "I love hosting friends and finding the best hidden spots in the city.",
  "More into one great conversation than ten small ones.",
  "I care about kindness, growth, and showing up for the people I love.",
  "Adventure is better shared. Let's go find some.",
  "I'm happiest outdoors, around good food, or lost in a great album.",
];

const CITIES: Array<{ city: string; region: string }> = [
  { city: "New York", region: "NY" },
  { city: "Brooklyn", region: "NY" },
  { city: "Jersey City", region: "NJ" },
  { city: "Hoboken", region: "NJ" },
  { city: "Queens", region: "NY" },
];

const INTEREST_POOL = [
  "modern art", "tennis", "fine dining", "podcasts", "weekend getaways",
  "hiking", "live jazz", "travel", "cooking", "books", "running",
  "farmers markets", "design", "coffee", "comedy shows", "hosting",
  "music", "pickup sports", "philosophy", "tea", "museums", "long walks",
  "cinema", "photography", "wine", "yoga", "live music", "the outdoors",
];

const VALUE_KEYS: ValueKey[] = [
  "family", "ambition", "kindness", "growth", "health",
  "curiosity", "faith", "community", "adventure", "stability",
];

const YELLOW_FLAGS: Array<{ key: YellowFlagKey; note: string }> = [
  { key: "busy_schedule", note: "Quarterly travel for work." },
  { key: "travel_frequency", note: "Often gone for long weekends." },
  { key: "communication_style", note: "Prefers long-form text over rapid replies." },
  { key: "social_media_presence", note: "Public-facing creator brand." },
  { key: "career_intensity", note: "In a demanding growth phase at work." },
  { key: "diet_lifestyle", note: "Mostly plant-based; flexible for great food." },
  { key: "sleep_schedule", note: "Early to bed, early to rise." },
];

const DEALBREAKERS: DealbreakerKey[] = [
  "non_monogamy", "smoking", "wants_kids_no", "heavy_drinking",
];

/**
 * Generates a fresh, randomized pool of candidates each run. Some are biased to
 * share the user's high values/interests so a few can realistically clear the
 * 80% match threshold, while others are weaker — producing variety every time.
 */
export function generateCandidates(me: Persona, count = 5): Candidate[] {
  const myHighValues = me.values.filter((v) => v.strength === "high").map((v) => v.key);
  const myValueKeys = me.values.map((v) => v.key);
  const myInterests = me.interests;

  const usedNames = new Set<string>();
  const pickName = () => {
    let n = pick(NAMES);
    let guard = 0;
    while (usedNames.has(n) && guard++ < 20) n = pick(NAMES);
    usedNames.add(n);
    return n;
  };

  return Array.from({ length: count }).map((_, idx) => {
    // First two slots skew strong so at least 1–2 can clear the 80% date bar.
    const strong = idx < 2 ? true : Math.random() < 0.45;

    // Values & interests: strong profiles mirror the user so they can clear 80%+.
    let values: ValuePreference[];
    let interests: string[];
    let loc: { city: string; region: string };

    if (strong && myValueKeys.length > 0) {
      const shared = sample(myValueKeys, Math.min(myValueKeys.length, 3 + Math.floor(Math.random() * 2)));
      values = [
        ...shared.map((key) => ({
          key,
          strength: (myHighValues.includes(key) ? "high" : "medium") as ValuePreference["strength"],
        })),
        ...sample(
          VALUE_KEYS.filter((k) => !shared.includes(k)),
          1
        ).map((key) => ({ key, strength: "low" as const })),
      ];
      const sharedInterests = sample(myInterests, Math.min(3, myInterests.length));
      interests = [
        ...new Set([
          ...sharedInterests,
          ...sample(INTEREST_POOL.filter((i) => !sharedInterests.includes(i)), 2),
        ]),
      ].slice(0, 6);
      loc = me.location.city
        ? { city: me.location.city, region: me.location.region ?? "NY" }
        : pick(CITIES);
    } else {
      const sharedCount = Math.floor(Math.random() * 2);
      const shared = sample(myValueKeys.length ? myValueKeys : VALUE_KEYS, sharedCount);
      const extra = sample(
        VALUE_KEYS.filter((k) => !shared.includes(k)),
        2 + Math.floor(Math.random() * 2)
      );
      values = [
        ...shared.map((key) => ({
          key,
          strength: pick(["medium", "low"]) as ValuePreference["strength"],
        })),
        ...extra.map((key) => ({ key, strength: pick(["low", "medium"]) as ValuePreference["strength"] })),
      ];
      const sharedInterests: string[] = [];
      interests = sample(INTEREST_POOL, 5);
      loc = pick(CITIES);
    }
    const minAge = 28 + Math.floor(Math.random() * 6);
    const yellowFlags = sample(YELLOW_FLAGS, 1 + Math.floor(Math.random() * 2));

    // Occasionally give a candidate a dealbreaker trait (only matters if the
    // user set the matching dealbreaker).
    const dealbreakers =
      Math.random() < 0.25 ? [{ key: pick(DEALBREAKERS) }] : [];

    const name = pickName();
    const persona: Persona = {
      id: `pg_${uid()}`,
      displayName: name,
      headline: pick(HEADLINES),
      bio: pick(BIOS),
      location: { ...loc, country: "US" },
      ageRange: { min: minAge, max: minAge + 6 + Math.floor(Math.random() * 4) },
      scheduleStyle: strong ? me.scheduleStyle : pick(["structured", "flexible", "mixed"]),
      interests,
      values,
      dealbreakers,
      yellowFlags,
      assumptions: [],
    };

    return { id: `cg_${idx}_${uid()}`, persona };
  });
}
