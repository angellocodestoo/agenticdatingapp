import type { Persona } from "@/lib/types";

const GRADIENTS = [
  "linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #f472b6 0%, #c084fc 100%)",
  "linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)",
  "linear-gradient(135deg, #34d399 0%, #2dd4bf 100%)",
  "linear-gradient(135deg, #818cf8 0%, #ec4899 100%)",
  "linear-gradient(135deg, #f87171 0%, #fbbf24 100%)",
  "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Deterministic gradient + initial for a person, used as a stand-in for a photo. */
export function avatarFor(seed: string, name: string) {
  const gradient = GRADIENTS[hash(seed) % GRADIENTS.length];
  return { gradient, initial: name.trim().charAt(0).toUpperCase() || "?" };
}

export function ageFromPersona(p: Persona): number {
  if (p.age) return p.age;
  // Fallback: stable per-persona age within the declared range.
  const mid = Math.round((p.ageRange.min + p.ageRange.max) / 2);
  const jitter = hash(p.id) % 3;
  return Math.min(p.ageRange.max, mid + jitter - 1);
}

/** Deterministic distance for a candidate, bounded by the user's search radius. */
export function distanceFor(seed: string, maxMiles = 12): number {
  return 1 + (hash(seed + "dist") % Math.max(1, maxMiles));
}
