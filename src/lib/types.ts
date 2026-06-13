export type ConnectedSource =
  | "google_calendar"
  | "spotify"
  | "linkedin"
  | "strava"
  | "instagram"
  | "goodreads"
  | "ai_assistant"
  // Legacy: replaced by OS location permission; kept so old profiles parse.
  | "google_maps";

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
  | "distance_too_far"
  | "has_kids"
  | "divorced";

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

export type Gender = "man" | "woman" | "nonbinary";
export type SeekingPreference = "men" | "women" | "everyone";
export type KidsIntent = "yes" | "no" | "open";

export type Persona = {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  /** Concrete age; ageRange is kept for back-compat and display fallback. */
  age?: number;
  gender?: Gender;
  seeking?: SeekingPreference;
  wantsKids?: KidsIntent;
  /** Learned per-user shift of the age sweet spot, from date feedback (±5). */
  agePrefOffset?: number;
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

export type CandidateProfile = Candidate & {
  ownerUserId?: string;
  source: "seed" | "demo_generated" | "user";
  visibility: "visible" | "paused" | "blocked";
  createdAt: number;
  updatedAt: number;
};

export type ConversationTurn = {
  role: "agent_a" | "agent_b" | "system";
  content: string;
  ts: number;
};

export type ScoreAdjustment = {
  flag: string;
  delta: number;
  reason: string;
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
    overall: number; // 0..100 — final, after conversation adjustments
    /** Pre-conversation estimate, when the agent adjusted it mid-conversation. */
    initial?: number;
    /** How the conversation moved the score, flag by flag. */
    adjustments?: ScoreAdjustment[];
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

export type MatchLifecycleStatus =
  | "screened"
  | "qualified"
  | "user_selected"
  | "candidate_pending"
  | "mutual"
  | "date_proposed"
  | "accepted"
  | "declined";

export type MatchLifecycleRecord = {
  id: string;
  userId: string;
  candidateId: string;
  runId: string;
  matchId: string;
  proposalId?: string;
  status: MatchLifecycleStatus;
  score: number;
  candidateOwnerUserId?: string;
  candidateConsent: "pending" | "accepted" | "declined" | "not_required";
  createdAt: number;
  updatedAt: number;
};

export type RelationshipStage =
  | "early_dating"
  | "exclusive"
  | "committed"
  | "paused";

export type RelationshipStatus =
  | "pending"
  | "active"
  | "paused"
  | "ended"
  | "safety_disabled";

export type RelationshipMemberStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "paused"
  | "left"
  | "removed_for_safety";

export type RelationshipSharingLevel = "private" | "summary" | "shared";

export type RelationshipRecord = {
  id: string;
  sourceMatchLifecycleId: string;
  createdByUserId: string;
  partnerUserIds: string[];
  stage: RelationshipStage;
  status: RelationshipStatus;
  createdAt: number;
  updatedAt: number;
  profile: {
    startDate?: string;
    sharedValues: string[];
    qualityTimePreferences: string[];
    communicationNorms: string[];
    planningCadence?: string;
    nextThirtyDayGoal?: string;
  };
};

export type RelationshipMember = {
  id: string;
  relationshipId: string;
  userId: string;
  candidateId: string;
  status: RelationshipMemberStatus;
  sharingLevel: RelationshipSharingLevel;
  createdAt: number;
  updatedAt: number;
  preferences: {
    communicationChannel?: string;
    responseExpectation?: string;
    planningStyle?: string;
    affectionStyle?: string;
    repairPreference?: string;
    dateNightPreferences: string[];
    aloneTimeNeeds?: string;
    sensitiveTopics: string[];
  };
};

export type RelationshipPlanType = "date_night" | "check_in" | "quality_time" | "custom";

export type RelationshipPlanStatus =
  | "suggested"
  | "accepted"
  | "declined"
  | "completed";

export type RelationshipPlan = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  type: RelationshipPlanType;
  status: RelationshipPlanStatus;
  scheduledFor?: string;
  title: string;
  location?: {
    venueName?: string;
    addressLine?: string;
  };
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type RelationshipEligibility = {
  eligible: boolean;
  reason?: string;
  lifecycle?: MatchLifecycleRecord;
};

export type SafetyAction = "block" | "report";

export type SafetyEvent = {
  id: string;
  userId: string;
  candidateId: string;
  action: SafetyAction;
  reason?: string;
  notes?: string;
  createdAt: number;
};

export type AnalyticsEventName =
  | "signup_completed"
  | "login_completed"
  | "profile_source_connected"
  | "profile_basics_saved"
  | "persona_built"
  | "persona_updated"
  | "agent_run_started"
  | "agent_run_completed"
  | "match_selected"
  | "mutual_interest_pending"
  | "mutual_interest_accepted"
  | "mutual_interest_declined"
  | "date_proposed"
  | "date_accepted"
  | "date_declined"
  | "feedback_submitted"
  | "safety_action_created"
  | "relationship_invitation_created"
  | "relationship_invitation_accepted"
  | "relationship_invitation_declined"
  | "relationship_mode_paused"
  | "relationship_mode_resumed"
  | "relationship_mode_left"
  | "relationship_mode_safety_disabled"
  | "relationship_preferences_updated"
  | "relationship_plan_suggested"
  | "relationship_plan_accepted"
  | "relationship_plan_declined"
  | "relationship_plan_completed";

export type AnalyticsEvent = {
  id: string;
  userId: string;
  name: AnalyticsEventName;
  properties: Record<string, unknown>;
  createdAt: number;
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

export type UserPhoto = {
  id: string;
  /** Stored filename under data/uploads. */
  filename: string;
  addedAt: number;
};

export type UserArtifact = {
  id: string;
  label: string;
  content: string;
  addedAt: number;
};

export type UserProfileState = {
  userId: string;
  /** Whether this user's persona can be considered by other users' agents. */
  discoverable?: boolean;
  connectedSources: ConnectedSource[];
  /** Which device/app backs the "strava" activity slot (Strava, WHOOP, Fitbit, …). */
  fitnessProvider?: string;
  /** Which assistant backs the "ai_assistant" slot (Claude, ChatGPT, …). */
  aiProvider?: string;
  /** Demographic basics collected at onboarding; drive life-stage matching. */
  basics?: {
    age: number;
    gender: Gender;
    seeking: SeekingPreference;
    wantsKids: KidsIntent;
  };
  artifacts: UserArtifact[];
  /** Uploaded profile photos; the first is the primary. */
  photos?: UserPhoto[];
  /** Real Spotify listening data from OAuth; overrides the mock when present. */
  spotifyData?: {
    topArtists: string[];
    topGenres: string[];
    listeningMood: string;
    fetchedAt: number;
  };
  persona?: Persona;
  lastProfiledAt?: number;
};

export type AgentSettings = {
  /** Minimum score (exclusive) a candidate needs to qualify for a date. */
  threshold: number;
  /** How many candidates the agent reviews per run. */
  poolSize: number;
  /** Search radius in miles for candidate screening. */
  radiusMiles: number;
  /** When paused the agent refuses to start new runs. */
  paused: boolean;
};

export type AgentRunRecord = {
  id: string;
  createdAt: number;
  candidates: Candidate[];
  reports: Record<string, MatchReport>;
  qualifiedIds: string[];
  bestScore: number;
};

export type DateFeedback = {
  id: string;
  proposalId: string;
  candidateId?: string;
  candidateName?: string;
  /** 1..5 overall */
  rating: number;
  chemistry: number;
  conversation: number;
  wouldSeeAgain: boolean;
  notes?: string;
  /** Human-readable description of how the agent adjusted the persona. */
  agentLearnings: string[];
  createdAt: number;
};

export type AppNotification = {
  id: string;
  type:
    | "match_found"
    | "proposal_accepted"
    | "call_reminder"
    | "feedback_request"
    | "agent_update";
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: number;
};

