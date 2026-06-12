import type {
  Candidate,
  Persona,
  ValueKey,
  ValuePreference,
  YellowFlagKey,
  DealbreakerKey,
} from "@/lib/types";
import { personaAge, preferredAgeWindow } from "@/lib/ageModel";

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

const MALE_NAMES = [
  "Liam", "Noah", "Ethan", "Mateo", "Julian", "Marcus", "Adrian", "Theo",
  "Caleb", "Dev", "Andre", "Felix", "Jonas", "Rafael", "Owen", "Miles",
  "Dante", "Elias", "Hugo", "Nico", "Sam", "Aiden", "Lucas", "Gabriel",
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
  "has_kids", "divorced",
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

  // Life-stage model: candidates are drawn from the user's modeled age window,
  // not symmetrically around their own age. Most cluster near the sweet spot;
  // a tail lands outside so the agent has real screening decisions to make.
  const myAge = personaAge(me);
  const window = preferredAgeWindow({
    age: myAge,
    gender: me.gender,
    seeking: me.seeking,
    wantsKids: me.wantsKids,
    dealbreakers: me.dealbreakers,
    agePrefOffset: me.agePrefOffset,
  });
  const sampleAge = (): number => {
    const r = Math.random();
    if (r < 0.5) {
      // Cluster around the sweet spot.
      const spread = Math.max(1, (window.max - window.min) / 2);
      const offset = (Math.random() + Math.random() - 1) * spread;
      return Math.round(Math.min(window.max, Math.max(window.min, window.center + offset)));
    }
    if (r < 0.85) {
      // Uniform across the full window so the edges genuinely occur —
      // a 25-36 window should actually surface 25-year-olds.
      return window.min + Math.floor(Math.random() * (window.max - window.min + 1));
    }
    // Outside the window: 1-4 years past an edge.
    const past = 1 + Math.floor(Math.random() * 4);
    return Math.max(21, Math.random() < 0.5 ? window.min - past : window.max + past);
  };

  const candidateGender =
    me.seeking === "men" ? "man" : me.seeking === "everyone"
      ? (Math.random() < 0.5 ? "man" : "woman")
      : "woman";
  const namePool = candidateGender === "man" ? MALE_NAMES : NAMES;

  const usedNames = new Set<string>();
  const pickName = () => {
    let n = pick(namePool);
    let guard = 0;
    while (usedNames.has(n) && guard++ < 20) n = pick(namePool);
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
      interests = sample(INTEREST_POOL, 5);
      loc = pick(CITIES);
    }
    const age = sampleAge();
    const yellowFlags = sample(YELLOW_FLAGS, 1 + Math.floor(Math.random() * 2));

    // Kids intent skews with the candidate's own life stage: late-20s/early-30s
    // candidates mostly want kids or are open; it tapers with age.
    const wantsKids: Persona["wantsKids"] =
      age < 36
        ? pick(["yes", "yes", "open", "open", "no"])
        : age < 42
          ? pick(["yes", "open", "open", "no"])
          : pick(["open", "no", "no"]);

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
      age,
      gender: candidateGender,
      wantsKids,
      ageRange: { min: age - 1, max: age + 1 },
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
