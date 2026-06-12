import { seededCandidates } from "@/data/candidates";
import { generateCandidates } from "@/lib/candidateGen";
import {
  getBlockedCandidateIds,
  getVisibleCandidateProfiles,
  saveCandidateProfile,
} from "@/lib/store";
import type { Candidate, CandidateProfile, Persona } from "@/lib/types";

function nowProfile(candidate: Candidate, source: CandidateProfile["source"]): CandidateProfile {
  const now = Date.now();
  return {
    ...candidate,
    source,
    visibility: "visible",
    createdAt: now,
    updatedAt: now,
  };
}

function fitsSeeking(me: Persona, candidate: CandidateProfile): boolean {
  if (!candidate.persona.gender) return true;
  if (me.seeking === "everyone" || !me.seeking) return true;
  if (me.seeking === "men") return candidate.persona.gender === "man";
  if (me.seeking === "women") return candidate.persona.gender === "woman";
  return true;
}

export function ensureSeedCandidateProfiles(): void {
  for (const candidate of seededCandidates) {
    saveCandidateProfile(nowProfile(candidate, "seed"));
  }
}

export function getMarketplaceCandidates(
  userId: string,
  me: Persona,
  count: number
): Candidate[] {
  ensureSeedCandidateProfiles();
  const blocked = getBlockedCandidateIds(userId);

  const existing = getVisibleCandidateProfiles(userId, Math.max(50, count * 4))
    .filter((candidate) => !blocked.has(candidate.id))
    .filter((candidate) => fitsSeeking(me, candidate));

  if (existing.length < count) {
    const generated = generateCandidates(me, count - existing.length).map((candidate) =>
      nowProfile(candidate, "demo_generated")
    );
    for (const candidate of generated) saveCandidateProfile(candidate);
    existing.push(...generated);
  }

  return existing
    .filter((candidate) => !blocked.has(candidate.id))
    .slice(0, count)
    .map(({ id, persona }) => ({ id, persona }));
}
