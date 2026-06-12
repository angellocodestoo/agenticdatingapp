import { CONNECTORS } from "@/lib/connectors";
import type { UserProfileState } from "@/lib/types";

export type ProfileConfidence = {
  /** 0..100 — how well the agent thinks it knows the user. */
  score: number;
  /** Per-factor breakdown for transparency in the UI. */
  factors: Array<{ label: string; points: number; max: number }>;
};

/**
 * Heuristic confidence in the persona. Monotonic: connecting sources, adding
 * notes, and rating assumptions only ever raise it. Capped below 100 — the
 * agent should never claim to fully know someone.
 */
export function computeProfileConfidence(profile: UserProfileState): ProfileConfidence {
  const factors: ProfileConfidence["factors"] = [];

  const personaPoints = profile.persona ? 15 : 0;
  factors.push({ label: "Profile built", points: personaPoints, max: 15 });

  const connectorMax = CONNECTORS.reduce((n, c) => n + c.weight, 0);
  const connectorPoints = CONNECTORS.filter((c) =>
    profile.connectedSources.includes(c.id)
  ).reduce((n, c) => n + c.weight, 0);
  factors.push({ label: "Connected sources", points: connectorPoints, max: connectorMax });

  const artifactPoints = Math.min(10, (profile.artifacts?.length ?? 0) * 5);
  factors.push({ label: "Personal notes", points: artifactPoints, max: 10 });

  const assumptions = profile.persona?.assumptions ?? [];
  const rated = assumptions.filter((a) => a.userRating).length;
  const ratedPoints =
    assumptions.length > 0 ? Math.round((rated / assumptions.length) * 8) : 0;
  factors.push({ label: "Assumptions you've verified", points: ratedPoints, max: 8 });

  // Additive: each factor contributes its points directly, so the "+N%" on a
  // suggested connector is literal. Capped below 100 — the agent never claims
  // to fully know someone.
  const raw = factors.reduce((n, f) => n + f.points, 0);
  const score = Math.min(95, Math.round(raw));

  return { score, factors };
}
