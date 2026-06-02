export type ConnectedSource = "google_calendar" | "spotify" | "linkedin";

export type ValueKey =
  | "family"
  | "ambition"
  | "kindness"
  | "growth"
  | "health"
  | "curiosity"
  | "faith"
  | "community"
  | "adventure"
  | "stability";

export type DealbreakerKey =
  | "smoking"
  | "heavy_drinking"
  | "wants_kids_no"
  | "wants_kids_yes"
  | "politics_mismatch"
  | "religion_mismatch"
  | "non_monogamy"
  | "worklife_incompatible"
  | "distance_too_far";

export type YellowFlagKey =
  | "busy_schedule"
  | "travel_frequency"
  | "communication_style"
  | "social_media_presence"
  | "career_intensity"
  | "pets"
  | "sleep_schedule"
  | "diet_lifestyle";

export type PreferenceStrength = "low" | "medium" | "high";

export type ValuePreference = {
  key: ValueKey;
  strength: PreferenceStrength;
  note?: string;
};

export type Dealbreaker = {
  key: DealbreakerKey;
  note?: string;
};

export type YellowFlag = {
  key: YellowFlagKey;
  note?: string;
};

export type PersonaAssumption = {
  id: string;
  label: string;
  evidence: string[];
  confidence: number; // 0..1
  userRating?: "accurate" | "somewhat" | "wrong";
  userOverride?: string;
};

export type Persona = {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  location: {
    city: string;
    region?: string;
    country: string;
  };
  ageRange: {
    min: number;
    max: number;
  };
  scheduleStyle: "structured" | "flexible" | "mixed";
  interests: string[];
  values: ValuePreference[];
  dealbreakers: Dealbreaker[];
  yellowFlags: YellowFlag[];
  assumptions: PersonaAssumption[];
};

export type Candidate = {
  id: string;
  persona: Persona;
};

export type ConversationTurn = {
  role: "agent_a" | "agent_b" | "system";
  content: string;
  ts: number;
};

export type MatchScoreBreakdown = {
  values: number; // 0..100
  lifestyle: number; // 0..100
  logistics: number; // 0..100
  yellowFlagsPenalty: number; // 0..100
};

export type MatchReport = {
  matchId: string;
  createdAt: number;
  summary: string;
  highlights: string[];
  risks: string[];
  suggestedFirstDate: {
    activity: string;
    venueName: string;
    neighborhood?: string;
    why: string;
  };
  score: {
    overall: number; // 0..100
    breakdown: MatchScoreBreakdown;
  };
  redFlagEliminatedReason?: string;
  transcript: ConversationTurn[];
};

export type DateProposal = {
  proposalId: string;
  matchId: string;
  candidateId?: string;
  when: {
    start: string; // ISO
    end: string; // ISO
    timezone: string;
  };
  where: {
    venueName: string;
    addressLine?: string;
  };
  activity: string;
  status: "proposed" | "accepted" | "declined";
};

export type CallTopic = {
  kind: "fun" | "philosophical";
  prompt: string;
  why: string;
};

export type WarmupCall = {
  callId: string;
  matchId: string;
  when: {
    start: string; // ISO
    end: string; // ISO
    timezone: string;
  };
  maskedNumberA: string;
  maskedNumberB: string;
  status: "scheduled" | "completed" | "cancelled";
  topics: CallTopic[];
};

export type UserArtifact = {
  id: string;
  label: string;
  content: string;
  addedAt: number;
};

export type UserProfileState = {
  userId: string;
  connectedSources: ConnectedSource[];
  artifacts: UserArtifact[];
  persona?: Persona;
  lastProfiledAt?: number;
};

