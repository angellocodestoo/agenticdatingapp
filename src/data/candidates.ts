import type { Candidate } from "@/lib/types";

export const seededCandidates: Candidate[] = [
  {
    id: "c_ava",
    persona: {
      id: "p_ava",
      displayName: "Ava",
      headline: "Optimistic builder who protects her weekends.",
      bio: "I like ambitious people with kind hearts. I’m a product-minded operator who loves museums, small dinner parties, and long walks after a great meal.",
      location: { city: "New York", region: "NY", country: "US" },
      ageRange: { min: 30, max: 38 },
      scheduleStyle: "structured",
      interests: ["modern art", "tennis", "fine dining", "podcasts", "weekend getaways"],
      values: [
        { key: "kindness", strength: "high" },
        { key: "growth", strength: "high" },
        { key: "community", strength: "medium" },
        { key: "ambition", strength: "medium" },
      ],
      dealbreakers: [{ key: "non_monogamy" }],
      yellowFlags: [{ key: "busy_schedule", note: "Quarterly travel for work." }],
      assumptions: [
        {
          id: "a1",
          label: "Prefers intentional dating over casual",
          evidence: ["bio tone", "dealbreakers set"],
          confidence: 0.82,
        },
      ],
    },
  },
  {
    id: "c_maya",
    persona: {
      id: "p_maya",
      displayName: "Maya",
      headline: "Curious, outdoorsy, and big on family.",
      bio: "If we can talk for hours and still laugh, we’re in a good place. I’ll say yes to hiking, live jazz, and trying new cuisines.",
      location: { city: "New York", region: "NY", country: "US" },
      ageRange: { min: 29, max: 36 },
      scheduleStyle: "mixed",
      interests: ["hiking", "live jazz", "travel", "cooking", "books"],
      values: [
        { key: "family", strength: "high" },
        { key: "curiosity", strength: "high" },
        { key: "health", strength: "medium" },
        { key: "adventure", strength: "medium" },
      ],
      dealbreakers: [{ key: "smoking" }],
      yellowFlags: [{ key: "travel_frequency", note: "Often gone for long weekends." }],
      assumptions: [
        {
          id: "a1",
          label: "Wants a partner who is emotionally available",
          evidence: ["values: family", "bio emphasis on conversation"],
          confidence: 0.78,
        },
      ],
    },
  },
  {
    id: "c_sofia",
    persona: {
      id: "p_sofia",
      displayName: "Sofia",
      headline: "Warm, grounded, and serious about health.",
      bio: "I’m a runner and a foodie—yes, both. I want a partner who’s ambitious but present, and who enjoys building a life, not just a career.",
      location: { city: "Brooklyn", region: "NY", country: "US" },
      ageRange: { min: 31, max: 40 },
      scheduleStyle: "structured",
      interests: ["running", "farmers markets", "design", "coffee", "comedy shows"],
      values: [
        { key: "health", strength: "high" },
        { key: "stability", strength: "medium" },
        { key: "growth", strength: "high" },
        { key: "kindness", strength: "medium" },
      ],
      dealbreakers: [{ key: "heavy_drinking" }],
      yellowFlags: [{ key: "diet_lifestyle", note: "Mostly vegan; flexible for great restaurants." }],
      assumptions: [
        {
          id: "a1",
          label: "Prefers consistent communication",
          evidence: ["scheduleStyle: structured", "values: stability"],
          confidence: 0.7,
        },
      ],
    },
  },
  {
    id: "c_jordan",
    persona: {
      id: "p_jordan",
      displayName: "Jordan",
      headline: "Social extrovert with a calm core.",
      bio: "I love hosting friends and finding the best spots in the city. Looking for someone who’s driven, playful, and down for a real partnership.",
      location: { city: "New York", region: "NY", country: "US" },
      ageRange: { min: 30, max: 39 },
      scheduleStyle: "flexible",
      interests: ["hosting", "standup comedy", "restaurants", "music", "pickup sports"],
      values: [
        { key: "community", strength: "high" },
        { key: "ambition", strength: "medium" },
        { key: "kindness", strength: "medium" },
        { key: "adventure", strength: "low" },
      ],
      dealbreakers: [{ key: "wants_kids_no", note: "Wants kids in the future." }],
      yellowFlags: [{ key: "social_media_presence", note: "Public-facing creator brand." }],
      assumptions: [
        {
          id: "a1",
          label: "Enjoys high-social-energy partners",
          evidence: ["hosting", "bio emphasis on social life"],
          confidence: 0.75,
        },
      ],
    },
  },
  {
    id: "c_riley",
    persona: {
      id: "p_riley",
      displayName: "Riley",
      headline: "Thoughtful minimalist who loves deep talks.",
      bio: "More into one great conversation than ten small ones. I care about kindness, long-term growth, and building a life with intention.",
      location: { city: "Jersey City", region: "NJ", country: "US" },
      ageRange: { min: 30, max: 42 },
      scheduleStyle: "mixed",
      interests: ["philosophy", "tea", "museums", "long walks", "cinema"],
      values: [
        { key: "kindness", strength: "high" },
        { key: "growth", strength: "high" },
        { key: "stability", strength: "medium" },
        { key: "curiosity", strength: "medium" },
      ],
      dealbreakers: [{ key: "non_monogamy" }],
      yellowFlags: [{ key: "communication_style", note: "Prefers long-form text over rapid replies." }],
      assumptions: [
        {
          id: "a1",
          label: "Likely compatible with busy professionals",
          evidence: ["communication style preference", "values: stability"],
          confidence: 0.66,
        },
      ],
    },
  },
];

