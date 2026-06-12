import { seededCandidates } from "@/data/candidates";
import { generateCandidates } from "@/lib/candidateGen";
import { ageAlignment, personaAge } from "@/lib/ageModel";
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

function valueWeight(strength: "low" | "medium" | "high"): number {
  if (strength === "high") return 3;
  if (strength === "medium") return 2;
  return 1;
}

function rankCandidate(me: Persona, candidate: CandidateProfile): number {
  const myValues = new Map(me.values.map((v) => [v.key, valueWeight(v.strength)]));
  const valueScore = candidate.persona.values.reduce((sum, v) => {
    const mine = myValues.get(v.key);
    return sum + (mine ? mine * valueWeight(v.strength) : 0);
  }, 0);

  const myInterests = me.interests.map((i) => i.toLowerCase());
  const interestScore = candidate.persona.interests.reduce((sum, interest) => {
    const lower = interest.toLowerCase();
    return sum + (myInterests.some((mine) => mine.includes(lower) || lower.includes(mine)) ? 4 : 0);
  }, 0);

  const ageScore = ageAlignment(
    {
      age: personaAge(me),
      gender: me.gender,
      seeking: me.seeking,
      wantsKids: me.wantsKids,
      dealbreakers: me.dealbreakers,
      agePrefOffset: me.agePrefOffset,
    },
    personaAge(candidate.persona)
  ).score;
  const scheduleScore =
    candidate.persona.scheduleStyle === me.scheduleStyle || candidate.persona.scheduleStyle === "mixed"
      ? 10
      : 0;
  const realUserBoost = candidate.source === "user" ? 12 : 0;
  const freshnessPenalty = Math.min(10, Math.max(0, (Date.now() - candidate.updatedAt) / 86400000));

  return valueScore + interestScore + ageScore * 0.35 + scheduleScore + realUserBoost - freshnessPenalty;
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
    .sort((a, b) => rankCandidate(me, b) - rankCandidate(me, a))
    .slice(0, count)
    .map(({ id, persona }) => ({ id, persona }));
}
