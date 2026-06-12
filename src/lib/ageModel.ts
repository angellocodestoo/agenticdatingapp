import type { Dealbreaker, Gender, KidsIntent, Persona, SeekingPreference } from "@/lib/types";

/**
 * Life-stage alignment model.
 *
 * Goes beyond "within N years of each other" by modeling the demographic
 * patterns of who actually pairs well, and why:
 *
 * - Kids intent changes the calculus. A man who wants kids has no biological
 *   clock but his partner does, so his window skews younger as he ages. A
 *   woman in her late 20s who wants kids is best matched with men at
 *   family-readiness — typically established by ~35 — so her window skews
 *   older, not symmetric.
 * - Maturity asymmetry: men on average mature later, so even kids aside,
 *   woman-seeking-man windows tilt slightly older and man-seeking-woman
 *   windows slightly younger.
 * - Explicitly NOT wanting kids removes the biological-timing pressure and
 *   re-centers the window on the user's own age — same-stage companionship
 *   dominates.
 * - The half-your-age-plus-seven floor is a hard guard: no skew may push a
 *   match below it, in either direction.
 * - Gap tolerance grows with age: 26↔32 is a bigger stage gap than 40↔46.
 */

export type AgeWindow = {
  min: number;
  max: number;
  /** Where the model thinks the sweet spot is. */
  center: number;
};

export type LifeStage = "exploring" | "establishing" | "consolidating" | "seasoned";

export function lifeStage(age: number): LifeStage {
  if (age < 28) return "exploring";
  if (age < 35) return "establishing";
  if (age < 45) return "consolidating";
  return "seasoned";
}

const STAGE_LABEL: Record<LifeStage, string> = {
  exploring: "exploring (figuring out what they want)",
  establishing: "establishing (career and identity solidifying)",
  consolidating: "consolidating (established, building a life)",
  seasoned: "seasoned (knows exactly who they are)",
};

/** Infer kids intent from explicit field, falling back to dealbreaker semantics. */
export function kidsIntent(p: Pick<Persona, "wantsKids" | "dealbreakers">): KidsIntent {
  if (p.wantsKids) return p.wantsKids;
  const keys = (p.dealbreakers ?? []).map((d: Dealbreaker) => d.key);
  // "Partner not wanting kids is a dealbreaker" → they want kids.
  if (keys.includes("wants_kids_no")) return "yes";
  // "Partner wanting kids is a dealbreaker" → they don't.
  if (keys.includes("wants_kids_yes")) return "no";
  return "open";
}

function halfPlusSeven(age: number): number {
  return Math.ceil(age / 2 + 7);
}

/** The oldest partner for whom *I* clear *their* half-plus-seven floor. */
function reverseHalfPlusSeven(age: number): number {
  return Math.floor((age - 7) * 2);
}

export function preferredAgeWindow(p: {
  age: number;
  gender?: Gender;
  seeking?: SeekingPreference;
  wantsKids?: KidsIntent;
  dealbreakers?: Dealbreaker[];
  /** Learned per-user adjustment from date feedback (years, ±5 max). */
  agePrefOffset?: number;
}): AgeWindow {
  const age = p.age;
  const kids = kidsIntent({ wantsKids: p.wantsKids, dealbreakers: p.dealbreakers ?? [] });
  const seekingWomen = p.seeking === "women";
  const seekingMen = p.seeking === "men";

  // Gap tolerance grows with age: ±4 at 25, roughly ±7 at 45.
  const halfWidth = 4 + Math.max(0, (age - 25) * 0.15);

  let center = age;

  // Maturity asymmetry (small, applies regardless of kids intent).
  if (seekingMen) center += 2;
  if (seekingWomen) center -= 2;

  if (kids === "yes" || kids === "open") {
    const strength = kids === "yes" ? 1 : 0.5;
    if (seekingWomen && age >= 31) {
      // Family-minded man: window skews younger as he ages — biological
      // timing lives on his partner's side. Calibrated to the kids-
      // conditional gap data (couples who go on to have children run
      // 4-7 years man-older), not the overall-marriage average:
      // 36 → sweet spot ~28-29.
      center -= Math.min(8, (age - 29) * 0.8) * strength;
    }
    if (seekingMen && age <= 33) {
      // Family-minded woman: skew toward men at family-readiness (~35,
      // established career, done exploring).
      center += Math.min(7, Math.max(0, 35 - age) * 0.6) * strength;
    }
  }

  // Personal calibration learned from rated dates overrides the population
  // prior, capped so one great outlier date can't swing the whole window.
  if (p.agePrefOffset) {
    center += Math.max(-5, Math.min(5, p.agePrefOffset));
  }
  // kids === "no": timing pressure gone; same-stage companionship dominates.
  // The maturity offset above is the only remaining skew.

  const floor = Math.max(21, halfPlusSeven(age));
  const ceiling = reverseHalfPlusSeven(age);

  const min = Math.round(Math.max(floor, center - halfWidth));
  const max = Math.round(Math.min(ceiling, center + halfWidth));
  return { min, max, center: Math.round(Math.min(Math.max(center, floor), ceiling)) };
}

export type AgeAlignment = {
  /** 0..100 */
  score: number;
  /** Why — used in match-report highlights/risks. */
  note: string;
  window: AgeWindow;
};

export function ageAlignment(
  me: {
    age: number;
    gender?: Gender;
    seeking?: SeekingPreference;
    wantsKids?: KidsIntent;
    dealbreakers?: Dealbreaker[];
    agePrefOffset?: number;
  },
  themAge: number
): AgeAlignment {
  const window = preferredAgeWindow(me);

  // Hard guard in both directions.
  if (themAge < halfPlusSeven(me.age) || me.age < halfPlusSeven(themAge)) {
    return {
      score: 15,
      note: `The age gap (${Math.abs(me.age - themAge)} years) is past the point where life stages reliably mesh.`,
      window,
    };
  }

  const myStage = lifeStage(me.age);
  const theirStage = lifeStage(themAge);

  let score: number;
  if (themAge >= window.min && themAge <= window.max) {
    // Inside the window: 85 at the edges, 100 at the center.
    const span = Math.max(1, (window.max - window.min) / 2);
    score = Math.round(100 - (Math.abs(themAge - window.center) / span) * 15);
  } else {
    // Outside: decay ~7 points per year beyond the window edge.
    const overshoot =
      themAge < window.min ? window.min - themAge : themAge - window.max;
    score = Math.max(25, 85 - overshoot * 7);
  }

  const kids = kidsIntent({ wantsKids: me.wantsKids, dealbreakers: me.dealbreakers ?? [] });
  let note: string;
  if (score >= 85) {
    note =
      kids === "yes" && themAge !== me.age
        ? `Age ${themAge} sits in the sweet spot for your family timeline — ${STAGE_LABEL[theirStage]}.`
        : `Life stages mesh well: you're ${STAGE_LABEL[myStage]}, they're ${STAGE_LABEL[theirStage]}.`;
  } else if (score >= 60) {
    note = `Workable age fit, slightly outside your modeled sweet spot of ${window.min}–${window.max}.`;
  } else {
    note = `Life-stage mismatch: ${STAGE_LABEL[myStage]} vs ${STAGE_LABEL[theirStage]} — different chapters.`;
  }

  return { score, note, window };
}

/** Resolve a usable age from a persona, falling back to its range midpoint. */
export function personaAge(p: Persona): number {
  return p.age ?? Math.round((p.ageRange.min + p.ageRange.max) / 2);
}
