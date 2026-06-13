import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  AgentRunRecord,
  AgentSettings,
  AppNotification,
  AnalyticsEvent,
  AnalyticsEventName,
  CandidateProfile,
  DateFeedback,
  DateProposal,
  HouseholdEligibility,
  HouseholdDecision,
  HouseholdGoal,
  HouseholdInsightSummary,
  HouseholdMemory,
  HouseholdMember,
  HouseholdRecord,
  HouseholdReview,
  HouseholdResilienceSignal,
  HouseholdResponsibility,
  HouseholdRitual,
  LegacyAnniversary,
  LegacyAnniversaryKind,
  LegacyChapter,
  LegacyChapterStatus,
  LegacyChapterType,
  LegacyInsightSummary,
  MatchLifecycleRecord,
  RelationshipCheckIn,
  RelationshipEligibility,
  RelationshipFrictionSignal,
  RelationshipGuidance,
  RelationshipInsightSummary,
  RelationshipMember,
  RelationshipPlan,
  RelationshipRecord,
  SafetyEvent,
  UserProfileState,
  WarmupCall,
} from "@/lib/types";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

// ── Profile ──────────────────────────────────────────────────────────

export function getProfile(userId: string): UserProfileState {
  const row = getDb()
    .prepare("SELECT json FROM profiles WHERE user_id = ?")
    .get(userId) as { json: string } | undefined;
  if (row) return JSON.parse(row.json) as UserProfileState;
  return {
    userId,
    connectedSources: [],
    artifacts: [],
    persona: undefined,
    lastProfiledAt: undefined,
  };
}

export function saveProfile(profile: UserProfileState): UserProfileState {
  getDb()
    .prepare(
      `INSERT INTO profiles (user_id, json) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET json = excluded.json`
    )
    .run(profile.userId, JSON.stringify(profile));
  return profile;
}

export function updateProfile(
  userId: string,
  patch: Partial<UserProfileState>
): UserProfileState {
  const current = getProfile(userId);
  return saveProfile({ ...current, ...patch, userId });
}

export type ProfileReadiness = {
  ready: boolean;
  missing: string[];
};

export function getProfileReadiness(profile: UserProfileState): ProfileReadiness {
  const missing: string[] = [];
  if (!profile.basics) missing.push("Add your basics");
  if (!profile.persona) missing.push("Build your agent profile");
  if (profile.connectedSources.length === 0 && (profile.artifacts ?? []).length === 0) {
    missing.push("Connect one source or add personal context");
  }
  if (profile.persona && !profile.persona.age) {
    missing.push("Rebuild your profile with life-stage basics");
  }
  return { ready: missing.length === 0, missing };
}

// ── Agent settings ───────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AgentSettings = {
  threshold: 80,
  poolSize: 5,
  radiusMiles: 10,
  paused: false,
};

export function getSettings(userId: string): AgentSettings {
  const row = getDb()
    .prepare("SELECT json FROM settings WHERE user_id = ?")
    .get(userId) as { json: string } | undefined;
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.json) as Partial<AgentSettings>) };
}

export function saveSettings(userId: string, settings: AgentSettings): AgentSettings {
  getDb()
    .prepare(
      `INSERT INTO settings (user_id, json) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET json = excluded.json`
    )
    .run(userId, JSON.stringify(settings));
  return settings;
}

// ── Agent runs ───────────────────────────────────────────────────────

export function saveRun(userId: string, run: AgentRunRecord): AgentRunRecord {
  getDb()
    .prepare("INSERT INTO runs (id, user_id, created_at, json) VALUES (?, ?, ?, ?)")
    .run(run.id, userId, run.createdAt, JSON.stringify(run));
  return run;
}

export function getRuns(userId: string, limit = 20): AgentRunRecord[] {
  const rows = getDb()
    .prepare("SELECT json FROM runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as AgentRunRecord);
}

export function getLatestRun(userId: string): AgentRunRecord | null {
  return getRuns(userId, 1)[0] ?? null;
}

export function getRun(userId: string, runId: string): AgentRunRecord | null {
  const row = getDb()
    .prepare("SELECT json FROM runs WHERE id = ? AND user_id = ?")
    .get(runId, userId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as AgentRunRecord) : null;
}

export function newRunId(): string {
  return uid("run");
}

// Candidate marketplace

export function saveCandidateProfile(candidate: CandidateProfile): CandidateProfile {
  getDb()
    .prepare(
      `INSERT INTO candidate_profiles
       (id, owner_user_id, source, visibility, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_user_id = excluded.owner_user_id,
         source = excluded.source,
         visibility = excluded.visibility,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      candidate.id,
      candidate.ownerUserId ?? null,
      candidate.source,
      candidate.visibility,
      candidate.createdAt,
      candidate.updatedAt,
      JSON.stringify(candidate)
    );
  return candidate;
}

export function getCandidateProfile(candidateId: string): CandidateProfile | null {
  const row = getDb()
    .prepare("SELECT json FROM candidate_profiles WHERE id = ?")
    .get(candidateId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as CandidateProfile) : null;
}

export function getVisibleCandidateProfiles(
  userId: string,
  limit = 50
): CandidateProfile[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM candidate_profiles
       WHERE visibility = 'visible' AND (owner_user_id IS NULL OR owner_user_id != ?)
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as CandidateProfile);
}

export function publishUserCandidateProfile(userId: string): CandidateProfile | null {
  const profile = getProfile(userId);
  if (!profile.persona) return null;
  if (profile.discoverable === false) {
    setUserCandidateVisibility(userId, "paused");
    return null;
  }
  const now = Date.now();
  return saveCandidateProfile({
    id: `usercand_${userId}`,
    ownerUserId: userId,
    source: "user",
    visibility: "visible",
    persona: profile.persona,
    createdAt: now,
    updatedAt: now,
  });
}

export function setUserCandidateVisibility(
  userId: string,
  visibility: CandidateProfile["visibility"]
): CandidateProfile | null {
  const current = getCandidateProfile(`usercand_${userId}`);
  if (!current) return null;
  return saveCandidateProfile({
    ...current,
    visibility,
    updatedAt: Date.now(),
  });
}

// Match lifecycle

export function saveMatchLifecycle(record: MatchLifecycleRecord): MatchLifecycleRecord {
  getDb()
    .prepare(
      `INSERT INTO match_lifecycles
       (id, user_id, candidate_id, run_id, match_id, status, candidate_consent, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         candidate_consent = excluded.candidate_consent,
         match_id = excluded.match_id,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      record.id,
      record.userId,
      record.candidateId,
      record.runId,
      record.matchId,
      record.status,
      record.candidateConsent,
      record.createdAt,
      record.updatedAt,
      JSON.stringify(record)
    );
  return record;
}

export function getMatchLifecycle(userId: string, id: string): MatchLifecycleRecord | null {
  const row = getDb()
    .prepare("SELECT json FROM match_lifecycles WHERE id = ? AND user_id = ?")
    .get(id, userId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as MatchLifecycleRecord) : null;
}

export function getMatchLifecycleForCandidate(
  userId: string,
  candidateId: string
): MatchLifecycleRecord | null {
  const row = getDb()
    .prepare(
      `SELECT json FROM match_lifecycles
       WHERE user_id = ? AND candidate_id = ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(userId, candidateId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as MatchLifecycleRecord) : null;
}

export function getMatchLifecycles(userId: string, limit = 50): MatchLifecycleRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM match_lifecycles
       WHERE user_id = ?
       ORDER BY updated_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as MatchLifecycleRecord);
}

export function getIncomingMatchRequests(ownerUserId: string): MatchLifecycleRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM match_lifecycles
       WHERE candidate_consent = 'pending'
       ORDER BY updated_at DESC`
    )
    .all() as Array<{ json: string }>;
  return rows
    .map((r) => JSON.parse(r.json) as MatchLifecycleRecord)
    .filter((record) => record.candidateOwnerUserId === ownerUserId);
}

export function newMatchLifecycleId(): string {
  return uid("mlc");
}

// Relationship mode

export function saveRelationship(record: RelationshipRecord): RelationshipRecord {
  getDb()
    .prepare(
      `INSERT INTO relationships
       (id, source_match_lifecycle_id, created_by_user_id, stage, status, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         stage = excluded.stage,
         status = excluded.status,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      record.id,
      record.sourceMatchLifecycleId,
      record.createdByUserId,
      record.stage,
      record.status,
      record.createdAt,
      record.updatedAt,
      JSON.stringify(record)
    );
  return record;
}

export function saveRelationshipMember(member: RelationshipMember): RelationshipMember {
  getDb()
    .prepare(
      `INSERT INTO relationship_members
       (id, relationship_id, user_id, candidate_id, status, sharing_level, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         sharing_level = excluded.sharing_level,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      member.id,
      member.relationshipId,
      member.userId,
      member.candidateId,
      member.status,
      member.sharingLevel,
      member.createdAt,
      member.updatedAt,
      JSON.stringify(member)
    );
  return member;
}

export function getRelationship(id: string): RelationshipRecord | null {
  const row = getDb()
    .prepare("SELECT json FROM relationships WHERE id = ?")
    .get(id) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as RelationshipRecord) : null;
}

export function getRelationshipMembers(relationshipId: string): RelationshipMember[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM relationship_members
       WHERE relationship_id = ?
       ORDER BY created_at ASC`
    )
    .all(relationshipId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as RelationshipMember);
}

export function getRelationshipMember(
  relationshipId: string,
  userId: string
): RelationshipMember | null {
  const row = getDb()
    .prepare(
      `SELECT json FROM relationship_members
       WHERE relationship_id = ? AND user_id = ?
       LIMIT 1`
    )
    .get(relationshipId, userId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as RelationshipMember) : null;
}

export function getRelationshipsForUser(userId: string): Array<{
  relationship: RelationshipRecord;
  members: RelationshipMember[];
}> {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT r.json
       FROM relationships r
       INNER JOIN relationship_members m ON m.relationship_id = r.id
       WHERE m.user_id = ?
       ORDER BY r.updated_at DESC`
    )
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => {
    const relationship = JSON.parse(r.json) as RelationshipRecord;
    return {
      relationship,
      members: getRelationshipMembers(relationship.id),
    };
  });
}

export function getRelationshipBySourceMatch(
  sourceMatchLifecycleId: string
): RelationshipRecord | null {
  const row = getDb()
    .prepare(
      `SELECT json FROM relationships
       WHERE source_match_lifecycle_id = ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(sourceMatchLifecycleId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as RelationshipRecord) : null;
}

export function getRelationshipEligibility(
  userId: string,
  matchLifecycleId: string
): RelationshipEligibility {
  const lifecycle = getMatchLifecycle(userId, matchLifecycleId);
  if (!lifecycle) return { eligible: false, reason: "Match not found" };
  if (!lifecycle.candidateOwnerUserId) {
    return { eligible: false, reason: "Relationship mode requires a real user match", lifecycle };
  }
  if (lifecycle.candidateConsent !== "accepted") {
    return { eligible: false, reason: "Mutual interest must be accepted first", lifecycle };
  }
  if (!["date_proposed", "accepted"].includes(lifecycle.status)) {
    return { eligible: false, reason: "Create or accept a date proposal first", lifecycle };
  }
  if (!lifecycle.proposalId) {
    return { eligible: false, reason: "A date proposal is required before relationship mode", lifecycle };
  }
  if (getRelationshipBySourceMatch(lifecycle.id)) {
    return { eligible: false, reason: "Relationship mode already exists for this match", lifecycle };
  }
  const userBlockedCandidate = getSafetyEvents(userId).some(
    (event) => event.candidateId === lifecycle.candidateId && event.action === "block"
  );
  if (userBlockedCandidate) {
    return { eligible: false, reason: "Blocked matches cannot enter relationship mode", lifecycle };
  }
  const initiatorCandidateId = `usercand_${userId}`;
  const candidateBlockedUser = getSafetyEvents(lifecycle.candidateOwnerUserId).some(
    (event) => event.candidateId === initiatorCandidateId && event.action === "block"
  );
  if (candidateBlockedUser) {
    return { eligible: false, reason: "This match is unavailable for relationship mode", lifecycle };
  }
  return { eligible: true, lifecycle };
}

export function createRelationshipInvitation(
  userId: string,
  matchLifecycleId: string
): {
  relationship?: RelationshipRecord;
  members?: RelationshipMember[];
  error?: string;
} {
  const eligibility = getRelationshipEligibility(userId, matchLifecycleId);
  if (!eligibility.eligible || !eligibility.lifecycle) {
    return { error: eligibility.reason ?? "This match is not eligible" };
  }

  const lifecycle = eligibility.lifecycle;
  const now = Date.now();
  const relationship: RelationshipRecord = {
    id: uid("rel"),
    sourceMatchLifecycleId: lifecycle.id,
    createdByUserId: userId,
    partnerUserIds: [userId, lifecycle.candidateOwnerUserId!],
    stage: "early_dating",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    profile: {
      sharedValues: [],
      qualityTimePreferences: [],
      communicationNorms: [],
    },
  };
  const members: RelationshipMember[] = [
    {
      id: uid("relm"),
      relationshipId: relationship.id,
      userId,
      candidateId: `usercand_${userId}`,
      status: "accepted",
      sharingLevel: "summary",
      createdAt: now,
      updatedAt: now,
      preferences: {
        dateNightPreferences: [],
        sensitiveTopics: [],
      },
    },
    {
      id: uid("relm"),
      relationshipId: relationship.id,
      userId: lifecycle.candidateOwnerUserId!,
      candidateId: lifecycle.candidateId,
      status: "invited",
      sharingLevel: "summary",
      createdAt: now,
      updatedAt: now,
      preferences: {
        dateNightPreferences: [],
        sensitiveTopics: [],
      },
    },
  ];

  saveRelationship(relationship);
  for (const member of members) saveRelationshipMember(member);
  trackEvent(userId, "relationship_invitation_created", {
    relationshipId: relationship.id,
    lifecycleId: lifecycle.id,
    candidateId: lifecycle.candidateId,
    partnerUserId: lifecycle.candidateOwnerUserId,
  });
  return { relationship, members };
}

// Household mode

export function saveHousehold(record: HouseholdRecord): HouseholdRecord {
  getDb()
    .prepare(
      `INSERT INTO households
       (id, source_relationship_id, created_by_user_id, stage, status, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         stage = excluded.stage,
         status = excluded.status,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      record.id,
      record.sourceRelationshipId,
      record.createdByUserId,
      record.stage,
      record.status,
      record.createdAt,
      record.updatedAt,
      JSON.stringify(record)
    );
  return record;
}

export function saveHouseholdMember(member: HouseholdMember): HouseholdMember {
  getDb()
    .prepare(
      `INSERT INTO household_members
       (id, household_id, user_id, status, sharing_level, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         sharing_level = excluded.sharing_level,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      member.id,
      member.householdId,
      member.userId,
      member.status,
      member.sharingLevel,
      member.createdAt,
      member.updatedAt,
      JSON.stringify(member)
    );
  return member;
}

export function getHousehold(id: string): HouseholdRecord | null {
  const row = getDb()
    .prepare("SELECT json FROM households WHERE id = ?")
    .get(id) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as HouseholdRecord) : null;
}

export function getHouseholdMembers(householdId: string): HouseholdMember[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_members
       WHERE household_id = ?
       ORDER BY created_at ASC`
    )
    .all(householdId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as HouseholdMember);
}

export function getHouseholdMember(
  householdId: string,
  userId: string
): HouseholdMember | null {
  const row = getDb()
    .prepare(
      `SELECT json FROM household_members
       WHERE household_id = ? AND user_id = ?
       LIMIT 1`
    )
    .get(householdId, userId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as HouseholdMember) : null;
}

export function getHouseholdsForUser(userId: string): Array<{
  household: HouseholdRecord;
  members: HouseholdMember[];
}> {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT h.json
       FROM households h
       INNER JOIN household_members m ON m.household_id = h.id
       WHERE m.user_id = ?
       ORDER BY h.updated_at DESC`
    )
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => {
    const household = JSON.parse(r.json) as HouseholdRecord;
    return {
      household,
      members: getHouseholdMembers(household.id),
    };
  });
}

export function getHouseholdBySourceRelationship(
  sourceRelationshipId: string
): HouseholdRecord | null {
  const row = getDb()
    .prepare(
      `SELECT json FROM households
       WHERE source_relationship_id = ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .get(sourceRelationshipId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as HouseholdRecord) : null;
}

export function getHouseholdEligibility(
  userId: string,
  relationshipId: string
): HouseholdEligibility {
  const relationship = getRelationship(relationshipId);
  if (!relationship) return { eligible: false, reason: "Relationship not found" };
  const currentMember = getRelationshipMember(relationshipId, userId);
  if (!currentMember) {
    return { eligible: false, reason: "Relationship membership not found", relationship };
  }
  if (relationship.status !== "active") {
    return { eligible: false, reason: "Relationship mode must be active first", relationship };
  }
  if (relationship.partnerUserIds.length < 2) {
    return { eligible: false, reason: "Household mode requires both partners", relationship };
  }
  const members = getRelationshipMembers(relationshipId);
  if (members.length < 2 || !members.every((member) => member.status === "accepted")) {
    return { eligible: false, reason: "Both partners must accept relationship mode first", relationship };
  }
  if (getHouseholdBySourceRelationship(relationshipId)) {
    return { eligible: false, reason: "Household mode already exists for this relationship", relationship };
  }
  if (members.some((member) => member.status === "removed_for_safety")) {
    return { eligible: false, reason: "Safety-disabled relationships cannot upgrade", relationship };
  }
  return { eligible: true, relationship };
}

export function createHouseholdInvitation(
  userId: string,
  relationshipId: string
): {
  household?: HouseholdRecord;
  members?: HouseholdMember[];
  error?: string;
} {
  const eligibility = getHouseholdEligibility(userId, relationshipId);
  if (!eligibility.eligible || !eligibility.relationship) {
    return { error: eligibility.reason ?? "This relationship is not eligible" };
  }
  const relationship = eligibility.relationship;
  const now = Date.now();
  const household: HouseholdRecord = {
    id: uid("hh"),
    sourceRelationshipId: relationship.id,
    createdByUserId: userId,
    partnerUserIds: relationship.partnerUserIds,
    stage: "shared_life",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    profile: {
      planningCadence: relationship.profile.planningCadence,
      protectedRituals: relationship.profile.qualityTimePreferences,
      responsibilityAreas: [],
      sensitiveDomains: [],
      longTermGoals: relationship.profile.nextThirtyDayGoal
        ? [relationship.profile.nextThirtyDayGoal]
        : [],
      legacyNotes: undefined,
    },
  };
  saveHousehold(household);
  const members = relationship.partnerUserIds.map((partnerUserId) =>
    saveHouseholdMember({
      id: uid("hhm"),
      householdId: household.id,
      userId: partnerUserId,
      status: partnerUserId === userId ? "accepted" : "invited",
      sharingLevel: "summary",
      createdAt: now,
      updatedAt: now,
      preferences: {},
    })
  );
  trackEvent(userId, "household_invitation_created", {
    householdId: household.id,
    relationshipId,
    partnerUserIds: relationship.partnerUserIds,
  });
  return { household, members };
}

function householdStatusFromMembers(
  members: HouseholdMember[]
): HouseholdRecord["status"] {
  if (members.some((member) => member.status === "removed_for_safety")) {
    return "safety_disabled";
  }
  if (members.some((member) => member.status === "left" || member.status === "declined")) {
    return "ended";
  }
  if (members.some((member) => member.status === "paused")) {
    return "paused";
  }
  if (members.length >= 2 && members.every((member) => member.status === "accepted")) {
    return "active";
  }
  return "pending";
}

export function respondToHouseholdMembership(
  userId: string,
  householdId: string,
  action: "accept" | "decline" | "pause" | "resume" | "leave"
): {
  household?: HouseholdRecord;
  members?: HouseholdMember[];
  error?: string;
} {
  const household = getHousehold(householdId);
  if (!household) return { error: "Household not found" };
  const member = getHouseholdMember(householdId, userId);
  if (!member) return { error: "Household membership not found" };
  if (household.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Household mode is disabled for safety" };
  }
  if (member.status === "left") return { error: "You already left this household space" };

  const nextStatusByAction = {
    accept: "accepted",
    decline: "declined",
    pause: "paused",
    resume: "accepted",
    leave: "left",
  } as const;
  if (action === "accept" && member.status !== "invited" && member.status !== "paused") {
    return { error: "Only invited or paused members can accept" };
  }
  if (action === "resume" && member.status !== "paused") {
    return { error: "Only paused members can resume" };
  }
  if (action === "decline" && member.status !== "invited") {
    return { error: "Only invited members can decline" };
  }
  if (action === "pause" && member.status !== "accepted") {
    return { error: "Only accepted members can pause" };
  }

  const now = Date.now();
  const updatedMember = saveHouseholdMember({
    ...member,
    status: nextStatusByAction[action],
    updatedAt: now,
  });
  const members = getHouseholdMembers(householdId).map((existing) =>
    existing.id === updatedMember.id ? updatedMember : existing
  );
  const updatedHousehold = saveHousehold({
    ...household,
    status: householdStatusFromMembers(members),
    updatedAt: now,
  });
  const eventByAction = {
    accept: "household_invitation_accepted",
    decline: "household_invitation_declined",
    pause: "household_mode_paused",
    resume: "household_mode_resumed",
    leave: "household_mode_left",
  } as const;
  trackEvent(userId, eventByAction[action], {
    householdId,
    sourceRelationshipId: household.sourceRelationshipId,
  });
  return {
    household: updatedHousehold,
    members,
  };
}

export function disableHouseholdsForSafety(
  userId: string,
  candidateId: string
): HouseholdRecord[] {
  const candidate = getCandidateProfile(candidateId);
  const blockedUserId = candidate?.ownerUserId;
  if (!blockedUserId) return [];
  const disabled: HouseholdRecord[] = [];
  for (const { household, members } of getHouseholdsForUser(userId)) {
    if (!household.partnerUserIds.includes(blockedUserId)) continue;
    const now = Date.now();
    for (const member of members) {
      saveHouseholdMember({
        ...member,
        status:
          member.userId === userId || member.userId === blockedUserId
            ? "removed_for_safety"
            : member.status,
        updatedAt: now,
      });
    }
    const updated = saveHousehold({
      ...household,
      status: "safety_disabled",
      updatedAt: now,
    });
    trackEvent(userId, "household_mode_safety_disabled", {
      householdId: household.id,
      candidateId,
      blockedUserId,
    });
    disabled.push(updated);
  }
  return disabled;
}

function canUseHousehold(userId: string, householdId: string): {
  household?: HouseholdRecord;
  member?: HouseholdMember;
  error?: string;
} {
  const household = getHousehold(householdId);
  if (!household) return { error: "Household not found" };
  const member = getHouseholdMember(householdId, userId);
  if (!member) return { error: "Household membership not found" };
  if (household.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Household mode is disabled for safety" };
  }
  if (member.status === "left" || member.status === "declined") {
    return { error: "You are no longer active in this household space" };
  }
  return { household, member };
}

export function updateHouseholdProfile(
  userId: string,
  householdId: string,
  patch: Partial<HouseholdRecord["profile"]> & {
    stage?: HouseholdRecord["stage"];
    sharingLevel?: HouseholdMember["sharingLevel"];
    preferences?: Partial<HouseholdMember["preferences"]>;
  }
): {
  household?: HouseholdRecord;
  members?: HouseholdMember[];
  error?: string;
} {
  const access = canUseHousehold(userId, householdId);
  if (!access.household || !access.member) return { error: access.error };
  const { stage, sharingLevel, preferences, ...profilePatch } = patch;
  const now = Date.now();
  const household = saveHousehold({
    ...access.household,
    stage: stage ?? access.household.stage,
    profile: {
      ...access.household.profile,
      ...profilePatch,
    },
    updatedAt: now,
  });
  const member = saveHouseholdMember({
    ...access.member,
    sharingLevel: sharingLevel ?? access.member.sharingLevel,
    preferences: {
      ...access.member.preferences,
      ...(preferences ?? {}),
    },
    updatedAt: now,
  });
  const members = getHouseholdMembers(householdId).map((existing) =>
    existing.id === member.id ? member : existing
  );
  trackEvent(userId, "household_profile_updated", {
    householdId,
    stage: household.stage,
    sharingLevel: member.sharingLevel,
  });
  return { household, members };
}

export function saveHouseholdResponsibility(
  responsibility: HouseholdResponsibility
): HouseholdResponsibility {
  getDb()
    .prepare(
      `INSERT INTO household_responsibilities
       (id, household_id, owner_user_id, backup_user_id, type, status, due_at, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_user_id = excluded.owner_user_id,
         backup_user_id = excluded.backup_user_id,
         status = excluded.status,
         due_at = excluded.due_at,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      responsibility.id,
      responsibility.householdId,
      responsibility.ownerUserId,
      responsibility.backupUserId ?? null,
      responsibility.type,
      responsibility.status,
      responsibility.dueAt ?? null,
      responsibility.createdAt,
      responsibility.updatedAt,
      JSON.stringify(responsibility)
    );
  return responsibility;
}

export function getHouseholdResponsibilities(
  userId: string,
  householdId: string
): { responsibilities?: HouseholdResponsibility[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_responsibilities
       WHERE household_id = ?
       ORDER BY COALESCE(due_at, updated_at) ASC`
    )
    .all(householdId) as Array<{ json: string }>;
  return { responsibilities: rows.map((r) => JSON.parse(r.json) as HouseholdResponsibility) };
}

export function createHouseholdResponsibility(
  userId: string,
  householdId: string,
  input: Omit<HouseholdResponsibility, "id" | "householdId" | "createdAt" | "updatedAt">
): { responsibility?: HouseholdResponsibility; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const responsibility = saveHouseholdResponsibility({
    ...input,
    id: uid("hhr"),
    householdId,
    createdAt: now,
    updatedAt: now,
  });
  trackEvent(userId, "household_responsibility_created", {
    householdId,
    responsibilityId: responsibility.id,
    ownerUserId: responsibility.ownerUserId,
  });
  return { responsibility };
}

export function updateHouseholdResponsibility(
  userId: string,
  householdId: string,
  responsibilityId: string,
  patch: Partial<HouseholdResponsibility>
): { responsibility?: HouseholdResponsibility; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const row = getDb()
    .prepare("SELECT json FROM household_responsibilities WHERE id = ? AND household_id = ?")
    .get(responsibilityId, householdId) as { json: string } | undefined;
  if (!row) return { error: "Responsibility not found" };
  const current = JSON.parse(row.json) as HouseholdResponsibility;
  const responsibility = saveHouseholdResponsibility({
    ...current,
    ...patch,
    id: current.id,
    householdId,
    updatedAt: Date.now(),
  });
  if (responsibility.status === "completed") {
    trackEvent(userId, "household_responsibility_completed", {
      householdId,
      responsibilityId,
    });
  }
  return { responsibility };
}

export function saveHouseholdRitual(ritual: HouseholdRitual): HouseholdRitual {
  getDb()
    .prepare(
      `INSERT INTO household_rituals
       (id, household_id, created_by_user_id, status, cadence, next_at, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         cadence = excluded.cadence,
         next_at = excluded.next_at,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      ritual.id,
      ritual.householdId,
      ritual.createdByUserId,
      ritual.status,
      ritual.cadence ?? null,
      ritual.nextAt ?? null,
      ritual.createdAt,
      ritual.updatedAt,
      JSON.stringify(ritual)
    );
  return ritual;
}

export function getHouseholdRituals(
  userId: string,
  householdId: string
): { rituals?: HouseholdRitual[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_rituals
       WHERE household_id = ?
       ORDER BY COALESCE(next_at, updated_at) ASC`
    )
    .all(householdId) as Array<{ json: string }>;
  return { rituals: rows.map((r) => JSON.parse(r.json) as HouseholdRitual) };
}

export function createHouseholdRitual(
  userId: string,
  householdId: string,
  input: Omit<HouseholdRitual, "id" | "householdId" | "createdByUserId" | "createdAt" | "updatedAt">
): { ritual?: HouseholdRitual; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const ritual = saveHouseholdRitual({
    ...input,
    id: uid("hrit"),
    householdId,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });
  trackEvent(userId, "household_ritual_created", {
    householdId,
    ritualId: ritual.id,
  });
  return { ritual };
}

export function updateHouseholdRitual(
  userId: string,
  householdId: string,
  ritualId: string,
  patch: Partial<HouseholdRitual>
): { ritual?: HouseholdRitual; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const row = getDb()
    .prepare("SELECT json FROM household_rituals WHERE id = ? AND household_id = ?")
    .get(ritualId, householdId) as { json: string } | undefined;
  if (!row) return { error: "Ritual not found" };
  const current = JSON.parse(row.json) as HouseholdRitual;
  const ritual = saveHouseholdRitual({
    ...current,
    ...patch,
    id: current.id,
    householdId,
    updatedAt: Date.now(),
  });
  if (ritual.status === "completed") {
    trackEvent(userId, "household_ritual_completed", {
      householdId,
      ritualId,
    });
  }
  return { ritual };
}

export function saveHouseholdDecision(decision: HouseholdDecision): HouseholdDecision {
  getDb()
    .prepare(
      `INSERT INTO household_decisions
       (id, household_id, created_by_user_id, domain, status, deadline_at, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         domain = excluded.domain,
         status = excluded.status,
         deadline_at = excluded.deadline_at,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      decision.id,
      decision.householdId,
      decision.createdByUserId,
      decision.domain,
      decision.status,
      decision.deadlineAt ?? null,
      decision.createdAt,
      decision.updatedAt,
      JSON.stringify(decision)
    );
  return decision;
}

export function getHouseholdDecisions(
  userId: string,
  householdId: string
): { decisions?: HouseholdDecision[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_decisions
       WHERE household_id = ?
       ORDER BY COALESCE(deadline_at, updated_at) ASC`
    )
    .all(householdId) as Array<{ json: string }>;
  return { decisions: rows.map((r) => JSON.parse(r.json) as HouseholdDecision) };
}

export function createHouseholdDecision(
  userId: string,
  householdId: string,
  input: Omit<HouseholdDecision, "id" | "householdId" | "createdByUserId" | "createdAt" | "updatedAt">
): { decision?: HouseholdDecision; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const decision = saveHouseholdDecision({
    ...input,
    id: uid("hdec"),
    householdId,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });
  trackEvent(userId, "household_decision_created", { householdId, decisionId: decision.id });
  return { decision };
}

export function updateHouseholdDecision(
  userId: string,
  householdId: string,
  decisionId: string,
  patch: Partial<HouseholdDecision>
): { decision?: HouseholdDecision; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const row = getDb()
    .prepare("SELECT json FROM household_decisions WHERE id = ? AND household_id = ?")
    .get(decisionId, householdId) as { json: string } | undefined;
  if (!row) return { error: "Decision not found" };
  const current = JSON.parse(row.json) as HouseholdDecision;
  const decision = saveHouseholdDecision({
    ...current,
    ...patch,
    id: current.id,
    householdId,
    updatedAt: Date.now(),
  });
  if (decision.status === "resolved") {
    trackEvent(userId, "household_decision_resolved", { householdId, decisionId });
  }
  return { decision };
}

export function saveHouseholdGoal(goal: HouseholdGoal): HouseholdGoal {
  getDb()
    .prepare(
      `INSERT INTO household_goals
       (id, household_id, created_by_user_id, category, status, target_at, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category,
         status = excluded.status,
         target_at = excluded.target_at,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      goal.id,
      goal.householdId,
      goal.createdByUserId,
      goal.category,
      goal.status,
      goal.targetAt ?? null,
      goal.createdAt,
      goal.updatedAt,
      JSON.stringify(goal)
    );
  return goal;
}

export function getHouseholdGoals(
  userId: string,
  householdId: string
): { goals?: HouseholdGoal[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_goals
       WHERE household_id = ?
       ORDER BY COALESCE(target_at, updated_at) ASC`
    )
    .all(householdId) as Array<{ json: string }>;
  return { goals: rows.map((r) => JSON.parse(r.json) as HouseholdGoal) };
}

export function createHouseholdGoal(
  userId: string,
  householdId: string,
  input: Omit<HouseholdGoal, "id" | "householdId" | "createdByUserId" | "createdAt" | "updatedAt">
): { goal?: HouseholdGoal; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const goal = saveHouseholdGoal({
    ...input,
    id: uid("hgoal"),
    householdId,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });
  trackEvent(userId, "household_goal_created", { householdId, goalId: goal.id });
  return { goal };
}

export function updateHouseholdGoal(
  userId: string,
  householdId: string,
  goalId: string,
  patch: Partial<HouseholdGoal>
): { goal?: HouseholdGoal; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const row = getDb()
    .prepare("SELECT json FROM household_goals WHERE id = ? AND household_id = ?")
    .get(goalId, householdId) as { json: string } | undefined;
  if (!row) return { error: "Goal not found" };
  const current = JSON.parse(row.json) as HouseholdGoal;
  const goal = saveHouseholdGoal({
    ...current,
    ...patch,
    id: current.id,
    householdId,
    updatedAt: Date.now(),
  });
  if (goal.status === "completed") {
    trackEvent(userId, "household_goal_completed", { householdId, goalId });
  }
  return { goal };
}

export function saveHouseholdReview(
  userId: string,
  householdId: string,
  input: Omit<HouseholdReview, "id" | "householdId" | "userId" | "createdAt">
): { review?: HouseholdReview; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const review: HouseholdReview = {
    ...input,
    id: uid("hrev"),
    householdId,
    userId,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO household_reviews (id, household_id, user_id, sharing_level, created_at, json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(review.id, householdId, userId, review.sharingLevel, review.createdAt, JSON.stringify(review));
  trackEvent(userId, "household_weekly_review_submitted", {
    householdId,
    sharingLevel: review.sharingLevel,
  });
  return { review };
}

export function getHouseholdReviews(
  userId: string,
  householdId: string,
  limit = 30
): { reviews?: HouseholdReview[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_reviews
       WHERE household_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(householdId, limit) as Array<{ json: string }>;
  return {
    reviews: rows
      .map((r) => JSON.parse(r.json) as HouseholdReview)
      .filter((review) => review.userId === userId || review.sharingLevel !== "private"),
  };
}

export function saveHouseholdMemory(
  userId: string,
  householdId: string,
  input: Omit<HouseholdMemory, "id" | "householdId" | "userId" | "createdAt">
): { memory?: HouseholdMemory; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const memory: HouseholdMemory = {
    ...input,
    id: uid("hmem"),
    householdId,
    userId,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO household_memory (id, household_id, user_id, type, sharing_level, created_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(memory.id, householdId, userId, memory.type, memory.sharingLevel, memory.createdAt, JSON.stringify(memory));
  trackEvent(userId, "household_memory_created", {
    householdId,
    memoryId: memory.id,
    type: memory.type,
    sharingLevel: memory.sharingLevel,
  });
  return { memory };
}

export function getHouseholdMemory(
  userId: string,
  householdId: string,
  limit = 50
): { memory?: HouseholdMemory[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM household_memory
       WHERE household_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(householdId, limit) as Array<{ json: string }>;
  return {
    memory: rows
      .map((r) => JSON.parse(r.json) as HouseholdMemory)
      .filter((item) => item.userId === userId || item.sharingLevel !== "private"),
  };
}

export function createLegacyChapter(
  userId: string,
  householdId: string,
  input: {
    type: LegacyChapterType;
    status?: LegacyChapterStatus;
    title: string;
    startedAt?: string;
    endedAt?: string;
    highlights?: string[];
    lessons?: string[];
    gratitude?: string;
  }
): { chapter?: LegacyChapter; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const chapter: LegacyChapter = {
    id: uid("legc"),
    householdId,
    createdByUserId: userId,
    type: input.type,
    status: input.status ?? "active",
    title: input.title,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    highlights: input.highlights ?? [],
    lessons: input.lessons ?? [],
    gratitude: input.gratitude,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO legacy_chapters
       (id, household_id, created_by_user_id, type, status, started_at, ended_at, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      chapter.id,
      householdId,
      userId,
      chapter.type,
      chapter.status,
      chapter.startedAt ?? null,
      chapter.endedAt ?? null,
      chapter.createdAt,
      chapter.updatedAt,
      JSON.stringify(chapter)
    );
  trackEvent(userId, "legacy_chapter_created", {
    householdId,
    chapterId: chapter.id,
    type: chapter.type,
  });
  return { chapter };
}

export function getLegacyChapters(
  userId: string,
  householdId: string,
  limit = 50
): { chapters?: LegacyChapter[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM legacy_chapters
       WHERE household_id = ?
       ORDER BY COALESCE(started_at, created_at) DESC LIMIT ?`
    )
    .all(householdId, limit) as Array<{ json: string }>;
  return { chapters: rows.map((r) => JSON.parse(r.json) as LegacyChapter) };
}

export function createLegacyAnniversary(
  userId: string,
  householdId: string,
  input: {
    kind: LegacyAnniversaryKind;
    date: string;
    title: string;
    ritual?: string;
    reflectionPrompt?: string;
  }
): { anniversary?: LegacyAnniversary; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const now = Date.now();
  const anniversary: LegacyAnniversary = {
    id: uid("lega"),
    householdId,
    createdByUserId: userId,
    kind: input.kind,
    date: input.date,
    title: input.title,
    ritual: input.ritual,
    reflectionPrompt: input.reflectionPrompt,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO legacy_anniversaries
       (id, household_id, created_by_user_id, kind, date, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      anniversary.id,
      householdId,
      userId,
      anniversary.kind,
      anniversary.date,
      anniversary.createdAt,
      anniversary.updatedAt,
      JSON.stringify(anniversary)
    );
  trackEvent(userId, "legacy_anniversary_created", {
    householdId,
    anniversaryId: anniversary.id,
    kind: anniversary.kind,
  });
  return { anniversary };
}

export function getLegacyAnniversaries(
  userId: string,
  householdId: string,
  limit = 50
): { anniversaries?: LegacyAnniversary[]; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM legacy_anniversaries
       WHERE household_id = ?
       ORDER BY date ASC LIMIT ?`
    )
    .all(householdId, limit) as Array<{ json: string }>;
  return { anniversaries: rows.map((r) => JSON.parse(r.json) as LegacyAnniversary) };
}

function nextOccurrenceDaysAway(date: string): number | null {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const target = new Date(now.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (target.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    target.setFullYear(target.getFullYear() + 1);
  }
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getLegacyInsightSummary(
  userId: string,
  householdId: string
): { summary?: LegacyInsightSummary; error?: string } {
  const chapters = getLegacyChapters(userId, householdId).chapters;
  const anniversaries = getLegacyAnniversaries(userId, householdId).anniversaries;
  if (!chapters || !anniversaries) return { error: "Could not load legacy data" };
  const upcoming = anniversaries
    .map((item) => ({ item, daysAway: nextOccurrenceDaysAway(item.date) }))
    .filter((entry): entry is { item: LegacyAnniversary; daysAway: number } => entry.daysAway !== null)
    .sort((a, b) => a.daysAway - b.daysAway)[0];
  const longArcSignals: string[] = [];
  if (chapters.some((chapter) => chapter.lessons.length > 0)) {
    longArcSignals.push("Lessons are being preserved alongside milestones.");
  }
  if (chapters.length >= 3) {
    longArcSignals.push("This relationship has multiple preserved life chapters to revisit.");
  }
  if (anniversaries.length === 0) {
    longArcSignals.push("No anniversaries are protected yet.");
  }
  return {
    summary: {
      householdId,
      chapterCount: chapters.length,
      activeChapterCount: chapters.filter((chapter) => chapter.status === "active").length,
      anniversaryCount: anniversaries.length,
      nextAnniversary: upcoming
        ? {
            id: upcoming.item.id,
            title: upcoming.item.title,
            date: upcoming.item.date,
            daysAway: upcoming.daysAway,
          }
        : undefined,
      renewalPrompt:
        upcoming && upcoming.daysAway <= 45
          ? `Use ${upcoming.item.title} to name what you want to protect this year.`
          : "Choose one chapter worth honoring before planning the next one.",
      longArcSignals,
    },
  };
}

export function getHouseholdInsightSummary(
  userId: string,
  householdId: string
): { summary?: HouseholdInsightSummary; error?: string } {
  const access = canUseHousehold(userId, householdId);
  if (!access.household) return { error: access.error };
  const responsibilities = getHouseholdResponsibilities(userId, householdId).responsibilities ?? [];
  const rituals = getHouseholdRituals(userId, householdId).rituals ?? [];
  const decisions = getHouseholdDecisions(userId, householdId).decisions ?? [];
  const goals = getHouseholdGoals(userId, householdId).goals ?? [];
  const reviews = getHouseholdReviews(userId, householdId, 10).reviews ?? [];
  const memory = getHouseholdMemory(userId, householdId, 50).memory ?? [];
  const openResponsibilities = responsibilities.filter((item) => item.status === "open").length;
  const completedResponsibilities = responsibilities.filter((item) => item.status === "completed").length;
  const activeRituals = rituals.filter((item) => item.status === "active").length;
  const completedRituals = rituals.filter((item) => item.status === "completed").length;
  const openDecisions = decisions.filter((item) => item.status === "open").length;
  const resolvedDecisions = decisions.filter((item) => item.status === "resolved").length;
  const activeGoals = goals.filter((item) => item.status === "active").length;
  const completedGoals = goals.filter((item) => item.status === "completed").length;
  const signals: HouseholdResilienceSignal[] = [];
  const avgLoad = average(reviews.map((item) => item.logisticsLoad));
  const avgConnection = average(reviews.map((item) => item.connectionSense));
  const avgFairness = average(reviews.map((item) => item.fairnessSense));

  if (openResponsibilities >= 5) {
    signals.push({
      id: "many_open_responsibilities",
      severity: "medium",
      label: "Many open responsibilities",
      reason: "The household has several open obligations at once.",
      repairAction: "Pick one owner and one backup for the top two responsibilities this week.",
    });
  }
  if (activeRituals > 0 && completedRituals === 0) {
    signals.push({
      id: "rituals_not_completed",
      severity: "low",
      label: "Protected rituals need follow-through",
      reason: "Rituals exist, but none have been completed yet.",
      repairAction: "Choose the smallest ritual and protect it before adding new logistics.",
    });
  }
  if (openDecisions >= 3) {
    signals.push({
      id: "decision_backlog",
      severity: "medium",
      label: "Decision backlog",
      reason: "Multiple household decisions are open.",
      repairAction: "Resolve, archive, or assign research for one decision before opening another.",
    });
  }
  if (avgLoad !== null && avgLoad >= 4) {
    signals.push({
      id: "high_logistics_load",
      severity: "medium",
      label: "High logistics load",
      reason: "Recent reviews show household load feeling heavy.",
      repairAction: "Do a 15-minute load audit and remove one nonessential task.",
    });
  }
  if (avgConnection !== null && avgConnection <= 2.5) {
    signals.push({
      id: "low_connection",
      severity: "medium",
      label: "Connection needs protection",
      reason: "Recent reviews show connection feeling lower.",
      repairAction: "Schedule one no-logistics ritual before the next planning conversation.",
    });
  }
  if (avgFairness !== null && avgFairness <= 2.5) {
    signals.push({
      id: "fairness_pressure",
      severity: "medium",
      label: "Fairness pressure",
      reason: "Recent reviews suggest the load may not feel balanced.",
      repairAction: "Name the invisible work and make one explicit handoff.",
    });
  }

  for (const signal of signals) {
    trackEvent(userId, "household_resilience_signal_surfaced", {
      householdId,
      signalId: signal.id,
      severity: signal.severity,
    });
  }
  trackEvent(userId, "household_guidance_viewed", {
    householdId,
    signalCount: signals.length,
  });

  return {
    summary: {
      householdId,
      responsibilityOpenCount: openResponsibilities,
      responsibilityCompletedCount: completedResponsibilities,
      ritualActiveCount: activeRituals,
      ritualCompletedCount: completedRituals,
      decisionOpenCount: openDecisions,
      decisionResolvedCount: resolvedDecisions,
      goalActiveCount: activeGoals,
      goalCompletedCount: completedGoals,
      reviewCount: reviews.length,
      memoryCount: memory.length,
      signals,
      guidance:
        signals[0]?.repairAction ??
        "Protect one ritual, clarify one responsibility, and record one memory this week.",
    },
  };
}

function relationshipStatusFromMembers(
  members: RelationshipMember[]
): RelationshipRecord["status"] {
  if (members.some((member) => member.status === "removed_for_safety")) {
    return "safety_disabled";
  }
  if (members.some((member) => member.status === "left" || member.status === "declined")) {
    return "ended";
  }
  if (members.some((member) => member.status === "paused")) {
    return "paused";
  }
  if (members.length >= 2 && members.every((member) => member.status === "accepted")) {
    return "active";
  }
  return "pending";
}

export function respondToRelationshipMembership(
  userId: string,
  relationshipId: string,
  action: "accept" | "decline" | "pause" | "resume" | "leave"
): {
  relationship?: RelationshipRecord;
  members?: RelationshipMember[];
  error?: string;
} {
  const relationship = getRelationship(relationshipId);
  if (!relationship) return { error: "Relationship not found" };
  const member = getRelationshipMember(relationshipId, userId);
  if (!member) return { error: "Relationship membership not found" };
  if (relationship.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Relationship mode is disabled for safety" };
  }
  if (member.status === "left") return { error: "You already left this relationship space" };

  const nextStatusByAction = {
    accept: "accepted",
    decline: "declined",
    pause: "paused",
    resume: "accepted",
    leave: "left",
  } as const;
  if (action === "accept" && member.status !== "invited" && member.status !== "paused") {
    return { error: "Only invited or paused members can accept" };
  }
  if (action === "resume" && member.status !== "paused") {
    return { error: "Only paused members can resume" };
  }
  if (action === "decline" && member.status !== "invited") {
    return { error: "Only invited members can decline" };
  }
  if (action === "pause" && member.status !== "accepted") {
    return { error: "Only accepted members can pause" };
  }

  const now = Date.now();
  const updatedMember = saveRelationshipMember({
    ...member,
    status: nextStatusByAction[action],
    updatedAt: now,
  });
  const members = getRelationshipMembers(relationshipId).map((existing) =>
    existing.id === updatedMember.id ? updatedMember : existing
  );
  const updatedRelationship = saveRelationship({
    ...relationship,
    status: relationshipStatusFromMembers(members),
    updatedAt: now,
  });
  const eventByAction = {
    accept: "relationship_invitation_accepted",
    decline: "relationship_invitation_declined",
    pause: "relationship_mode_paused",
    resume: "relationship_mode_resumed",
    leave: "relationship_mode_left",
  } as const;
  trackEvent(userId, eventByAction[action], {
    relationshipId,
    sourceMatchLifecycleId: relationship.sourceMatchLifecycleId,
  });
  return {
    relationship: updatedRelationship,
    members,
  };
}

export function disableRelationshipsForSafety(
  userId: string,
  candidateId: string
): RelationshipRecord[] {
  const disabled: RelationshipRecord[] = [];
  for (const { relationship, members } of getRelationshipsForUser(userId)) {
    const targetMember = members.find((member) => member.candidateId === candidateId);
    if (!targetMember) continue;
    const now = Date.now();
    for (const member of members) {
      saveRelationshipMember({
        ...member,
        status:
          member.id === targetMember.id || member.userId === userId
            ? "removed_for_safety"
            : member.status,
        updatedAt: now,
      });
    }
    const updated = saveRelationship({
      ...relationship,
      status: "safety_disabled",
      updatedAt: now,
    });
    trackEvent(userId, "relationship_mode_safety_disabled", {
      relationshipId: relationship.id,
      candidateId,
    });
    disabled.push(updated);
  }
  return disabled;
}

export function updateRelationshipProfile(
  userId: string,
  relationshipId: string,
  patch: Partial<RelationshipRecord["profile"]> & {
    stage?: RelationshipRecord["stage"];
  }
): {
  relationship?: RelationshipRecord;
  members?: RelationshipMember[];
  error?: string;
} {
  const relationship = getRelationship(relationshipId);
  if (!relationship) return { error: "Relationship not found" };
  const member = getRelationshipMember(relationshipId, userId);
  if (!member) return { error: "Relationship membership not found" };
  if (relationship.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Relationship mode is disabled for safety" };
  }
  if (member.status === "left" || member.status === "declined") {
    return { error: "You are no longer active in this relationship space" };
  }

  const { stage, ...profilePatch } = patch;
  const updated = saveRelationship({
    ...relationship,
    stage: stage ?? relationship.stage,
    profile: {
      ...relationship.profile,
      ...profilePatch,
    },
    updatedAt: Date.now(),
  });
  trackEvent(userId, "relationship_preferences_updated", {
    relationshipId,
    scope: "shared_profile",
  });
  return {
    relationship: updated,
    members: getRelationshipMembers(relationshipId),
  };
}

export function updateRelationshipMemberPreferences(
  userId: string,
  relationshipId: string,
  patch: Partial<RelationshipMember["preferences"]> & {
    sharingLevel?: RelationshipMember["sharingLevel"];
  }
): {
  relationship?: RelationshipRecord;
  members?: RelationshipMember[];
  error?: string;
} {
  const relationship = getRelationship(relationshipId);
  if (!relationship) return { error: "Relationship not found" };
  const member = getRelationshipMember(relationshipId, userId);
  if (!member) return { error: "Relationship membership not found" };
  if (relationship.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Relationship mode is disabled for safety" };
  }
  if (member.status === "left" || member.status === "declined") {
    return { error: "You are no longer active in this relationship space" };
  }

  const { sharingLevel, ...preferencePatch } = patch;
  const updatedMember = saveRelationshipMember({
    ...member,
    sharingLevel: sharingLevel ?? member.sharingLevel,
    preferences: {
      ...member.preferences,
      ...preferencePatch,
    },
    updatedAt: Date.now(),
  });
  const members = getRelationshipMembers(relationshipId).map((existing) =>
    existing.id === updatedMember.id ? updatedMember : existing
  );
  trackEvent(userId, "relationship_preferences_updated", {
    relationshipId,
    scope: "member_preferences",
    sharingLevel: updatedMember.sharingLevel,
  });
  return {
    relationship,
    members,
  };
}

function canUseRelationship(userId: string, relationshipId: string): {
  relationship?: RelationshipRecord;
  member?: RelationshipMember;
  error?: string;
} {
  const relationship = getRelationship(relationshipId);
  if (!relationship) return { error: "Relationship not found" };
  const member = getRelationshipMember(relationshipId, userId);
  if (!member) return { error: "Relationship membership not found" };
  if (relationship.status === "safety_disabled" || member.status === "removed_for_safety") {
    return { error: "Relationship mode is disabled for safety" };
  }
  if (member.status === "left" || member.status === "declined") {
    return { error: "You are no longer active in this relationship space" };
  }
  return { relationship, member };
}

export function saveRelationshipPlan(plan: RelationshipPlan): RelationshipPlan {
  getDb()
    .prepare(
      `INSERT INTO relationship_plans
       (id, relationship_id, created_by_user_id, type, status, scheduled_for, created_at, updated_at, json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         scheduled_for = excluded.scheduled_for,
         updated_at = excluded.updated_at,
         json = excluded.json`
    )
    .run(
      plan.id,
      plan.relationshipId,
      plan.createdByUserId,
      plan.type,
      plan.status,
      plan.scheduledFor ?? null,
      plan.createdAt,
      plan.updatedAt,
      JSON.stringify(plan)
    );
  return plan;
}

export function getRelationshipPlans(
  userId: string,
  relationshipId: string
): {
  plans?: RelationshipPlan[];
  error?: string;
} {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM relationship_plans
       WHERE relationship_id = ?
       ORDER BY COALESCE(scheduled_for, updated_at) ASC`
    )
    .all(relationshipId) as Array<{ json: string }>;
  return { plans: rows.map((r) => JSON.parse(r.json) as RelationshipPlan) };
}

export function getRelationshipPlan(
  userId: string,
  relationshipId: string,
  planId: string
): RelationshipPlan | null {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return null;
  const row = getDb()
    .prepare("SELECT json FROM relationship_plans WHERE id = ? AND relationship_id = ?")
    .get(planId, relationshipId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as RelationshipPlan) : null;
}

export function createRelationshipPlan(
  userId: string,
  relationshipId: string,
  plan: Omit<RelationshipPlan, "id" | "relationshipId" | "createdByUserId" | "createdAt" | "updatedAt">
): {
  plan?: RelationshipPlan;
  error?: string;
} {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return { error: access.error };
  const now = Date.now();
  const saved = saveRelationshipPlan({
    ...plan,
    id: uid("rplan"),
    relationshipId,
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });
  trackEvent(userId, "relationship_plan_suggested", {
    relationshipId,
    planId: saved.id,
    type: saved.type,
  });
  return { plan: saved };
}

export function updateRelationshipPlanStatus(
  userId: string,
  relationshipId: string,
  planId: string,
  patch: Pick<Partial<RelationshipPlan>, "status" | "scheduledFor" | "notes">
): {
  plan?: RelationshipPlan;
  error?: string;
} {
  const current = getRelationshipPlan(userId, relationshipId, planId);
  if (!current) return { error: "Plan not found" };
  const updated = saveRelationshipPlan({
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.scheduledFor ? { scheduledFor: patch.scheduledFor } : {}),
    ...(patch.notes ? { notes: patch.notes } : {}),
    updatedAt: Date.now(),
  });
  const eventByStatus = {
    accepted: "relationship_plan_accepted",
    declined: "relationship_plan_declined",
    completed: "relationship_plan_completed",
    suggested: "relationship_plan_suggested",
  } as const;
  trackEvent(userId, eventByStatus[updated.status], {
    relationshipId,
    planId,
    type: updated.type,
  });
  return { plan: updated };
}

export function saveRelationshipCheckIn(
  userId: string,
  relationshipId: string,
  checkIn: Omit<RelationshipCheckIn, "id" | "relationshipId" | "userId" | "createdAt">
): {
  checkIn?: RelationshipCheckIn;
  error?: string;
} {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return { error: access.error };
  const saved: RelationshipCheckIn = {
    ...checkIn,
    id: uid("rci"),
    relationshipId,
    userId,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO relationship_check_ins
       (id, relationship_id, user_id, sharing_level, created_at, json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      saved.id,
      relationshipId,
      userId,
      saved.sharingLevel,
      saved.createdAt,
      JSON.stringify(saved)
    );
  trackEvent(userId, "relationship_check_in_submitted", {
    relationshipId,
    sharingLevel: saved.sharingLevel,
    mood: saved.mood,
    closeness: saved.closeness,
    energy: saved.energy,
    stress: saved.stress,
  });
  return { checkIn: saved };
}

export function getRelationshipCheckIns(
  userId: string,
  relationshipId: string,
  limit = 30
): {
  checkIns?: RelationshipCheckIn[];
  error?: string;
} {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return { error: access.error };
  const rows = getDb()
    .prepare(
      `SELECT json FROM relationship_check_ins
       WHERE relationship_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(relationshipId, limit) as Array<{ json: string }>;
  const checkIns = rows
    .map((r) => JSON.parse(r.json) as RelationshipCheckIn)
    .filter((item) => item.userId === userId || item.sharingLevel !== "private");
  return { checkIns };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function getRelationshipGuidance(
  userId: string,
  relationshipId: string
): {
  guidance?: RelationshipGuidance;
  checkIns?: RelationshipCheckIn[];
  error?: string;
} {
  const access = canUseRelationship(userId, relationshipId);
  if (!access.relationship) return { error: access.error };
  const checkInsResult = getRelationshipCheckIns(userId, relationshipId, 10);
  const checkIns = checkInsResult.checkIns ?? [];
  const myMember = getRelationshipMember(relationshipId, userId);
  const shared = access.relationship.profile;
  const stress = average(checkIns.map((item) => item.stress));
  const closeness = average(checkIns.map((item) => item.closeness));
  const suggestions = [
    myMember?.preferences.repairPreference
      ? `Use your repair preference: ${myMember.preferences.repairPreference}.`
      : "Keep repair small: name the moment, ask one honest question, and give the conversation room.",
    shared.planningCadence
      ? `Protect the cadence you chose: ${shared.planningCadence}.`
      : "Put one low-pressure quality-time window on the calendar.",
    myMember?.preferences.communicationChannel
      ? `Use the channel that works best for you: ${myMember.preferences.communicationChannel}.`
      : "Choose the channel before the topic so logistics do not become the conflict.",
  ];
  if (stress !== null && stress >= 4) {
    suggestions.unshift("Lead with capacity before content: say what kind of day you are having first.");
  }
  if (closeness !== null && closeness <= 2.5) {
    suggestions.unshift("Ask for a small reconnection moment before discussing logistics.");
  }
  const guidance: RelationshipGuidance = {
    headline:
      checkIns.length > 0
        ? "Based on the latest check-ins, keep the next move simple and explicit."
        : "Start with one lightweight check-in so guidance can become more personal.",
    suggestions: suggestions.slice(0, 4),
    nextAction:
      shared.nextThirtyDayGoal ??
      "Schedule a 20-minute check-in and end with one plan you both actually want.",
  };
  trackEvent(userId, "relationship_guidance_viewed", {
    relationshipId,
    checkInCount: checkIns.length,
  });
  return { guidance, checkIns };
}

export function getRelationshipInsightSummary(
  userId: string,
  relationshipId: string
): {
  summary?: RelationshipInsightSummary;
  error?: string;
} {
  const guidanceResult = getRelationshipGuidance(userId, relationshipId);
  if (!guidanceResult.guidance || !guidanceResult.checkIns) {
    return { error: guidanceResult.error ?? "Could not build relationship insights" };
  }
  const plansResult = getRelationshipPlans(userId, relationshipId);
  if (!plansResult.plans) {
    return { error: plansResult.error ?? "Could not load relationship plans" };
  }
  const checkIns = guidanceResult.checkIns;
  const plans = plansResult.plans;
  const stress = average(checkIns.map((item) => item.stress));
  const closeness = average(checkIns.map((item) => item.closeness));
  const acceptedPlanCount = plans.filter((plan) => plan.status === "accepted").length;
  const completedPlanCount = plans.filter((plan) => plan.status === "completed").length;
  const declinedPlanCount = plans.filter((plan) => plan.status === "declined").length;
  const signals: RelationshipFrictionSignal[] = [];

  if (checkIns.length === 0) {
    signals.push({
      id: "no_check_ins",
      severity: "low",
      label: "No shared rhythm yet",
      reason: "Red String has no recent check-ins to learn from.",
      repairAction: "Start with one private check-in, then choose what to share.",
    });
  }
  if (stress !== null && stress >= 4) {
    signals.push({
      id: "high_stress",
      severity: "medium",
      label: "High stress trend",
      reason: "Recent check-ins show stress running high.",
      repairAction: "Ask for a lower-effort plan and name capacity before making requests.",
    });
  }
  if (closeness !== null && closeness <= 2.5) {
    signals.push({
      id: "low_closeness",
      severity: "medium",
      label: "Lower closeness trend",
      reason: "Recent check-ins suggest connection has felt less close.",
      repairAction: "Schedule one short reconnection moment before logistics or problem solving.",
    });
  }
  if (declinedPlanCount >= 2) {
    signals.push({
      id: "plan_mismatch",
      severity: "medium",
      label: "Plan mismatch",
      reason: "Multiple shared plans were declined.",
      repairAction: "Ask what kind of plan would feel easy this week and suggest only one option.",
    });
  }
  if (plans.length > 0 && acceptedPlanCount === 0 && completedPlanCount === 0) {
    signals.push({
      id: "no_accepted_plans",
      severity: "low",
      label: "Plans need confirmation",
      reason: "Plans exist, but none are accepted or completed yet.",
      repairAction: "Pick the smallest plan and confirm a yes, no, or reschedule.",
    });
  }

  for (const signal of signals) {
    trackEvent(userId, "relationship_friction_signal_surfaced", {
      relationshipId,
      signalId: signal.id,
      severity: signal.severity,
    });
  }

  return {
    summary: {
      relationshipId,
      checkInCount: checkIns.length,
      sharedCheckInCount: checkIns.filter((item) => item.sharingLevel !== "private").length,
      acceptedPlanCount,
      completedPlanCount,
      declinedPlanCount,
      signals,
      guidance: guidanceResult.guidance,
    },
  };
}

// Safety

export function saveSafetyEvent(
  userId: string,
  event: Omit<SafetyEvent, "id" | "userId" | "createdAt">
): SafetyEvent {
  const safetyEvent: SafetyEvent = {
    ...event,
    id: uid("safe"),
    userId,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO safety_events (id, user_id, candidate_id, action, created_at, json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      safetyEvent.id,
      safetyEvent.userId,
      safetyEvent.candidateId,
      safetyEvent.action,
      safetyEvent.createdAt,
      JSON.stringify(safetyEvent)
    );
  if (safetyEvent.action === "block") {
    disableRelationshipsForSafety(userId, safetyEvent.candidateId);
    disableHouseholdsForSafety(userId, safetyEvent.candidateId);
  }
  return safetyEvent;
}

export function getSafetyEvents(userId: string): SafetyEvent[] {
  const rows = getDb()
    .prepare("SELECT json FROM safety_events WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as SafetyEvent);
}

export function getBlockedCandidateIds(userId: string): Set<string> {
  return new Set(
    getSafetyEvents(userId)
      .filter((event) => event.action === "block")
      .map((event) => event.candidateId)
  );
}

export type SafetyReviewStatus = "open" | "reviewed" | "action_taken";

export type SafetyReviewRecord = {
  event: SafetyEvent;
  status: SafetyReviewStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
};

export function listSafetyReviewQueue(limit = 100): SafetyReviewRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT e.json, r.status, r.reviewed_by, r.reviewed_at, r.notes
       FROM safety_events e
       LEFT JOIN safety_reviews r ON r.safety_event_id = e.id
       ORDER BY e.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    json: string;
    status: SafetyReviewStatus | null;
    reviewed_by: string | null;
    reviewed_at: number | null;
    notes: string | null;
  }>;
  return rows.map((row) => ({
    event: JSON.parse(row.json) as SafetyEvent,
    status: row.status ?? "open",
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    notes: row.notes ?? undefined,
  }));
}

export function saveSafetyReview(
  safetyEventId: string,
  input: {
    status: SafetyReviewStatus;
    reviewedBy?: string;
    notes?: string;
  }
): SafetyReviewRecord | null {
  const row = getDb()
    .prepare("SELECT json FROM safety_events WHERE id = ?")
    .get(safetyEventId) as { json: string } | undefined;
  if (!row) return null;
  const reviewedAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO safety_reviews (safety_event_id, status, reviewed_by, reviewed_at, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(safety_event_id) DO UPDATE SET
         status = excluded.status,
         reviewed_by = excluded.reviewed_by,
         reviewed_at = excluded.reviewed_at,
         notes = excluded.notes`
    )
    .run(
      safetyEventId,
      input.status,
      input.reviewedBy ?? null,
      reviewedAt,
      input.notes ?? null
    );
  return {
    event: JSON.parse(row.json) as SafetyEvent,
    status: input.status,
    reviewedBy: input.reviewedBy,
    reviewedAt,
    notes: input.notes,
  };
}

function jsonRows(query: string, ...params: unknown[]): unknown[] {
  const rows = getDb().prepare(query).all(...params) as Array<{ json: string }>;
  return rows.map((row) => JSON.parse(row.json));
}

export function exportUserData(userId: string) {
  const db = getDb();
  const user = db
    .prepare("SELECT id, email, display_name, created_at FROM users WHERE id = ?")
    .get(userId);
  return {
    exportedAt: new Date().toISOString(),
    user,
    profile: getProfile(userId),
    settings: getSettings(userId),
    runs: getRuns(userId, 500),
    candidateProfile: getCandidateProfile(`usercand_${userId}`),
    matchLifecycles: jsonRows(
      "SELECT json FROM match_lifecycles WHERE user_id = ? ORDER BY updated_at DESC",
      userId
    ),
    relationships: getRelationshipsForUser(userId),
    households: getHouseholdsForUser(userId).map((entry) => ({
      ...entry,
      responsibilities: getHouseholdResponsibilities(userId, entry.household.id).responsibilities ?? [],
      rituals: getHouseholdRituals(userId, entry.household.id).rituals ?? [],
      decisions: getHouseholdDecisions(userId, entry.household.id).decisions ?? [],
      goals: getHouseholdGoals(userId, entry.household.id).goals ?? [],
      reviews: getHouseholdReviews(userId, entry.household.id).reviews ?? [],
      memory: getHouseholdMemory(userId, entry.household.id).memory ?? [],
      legacyChapters: getLegacyChapters(userId, entry.household.id).chapters ?? [],
      legacyAnniversaries: getLegacyAnniversaries(userId, entry.household.id).anniversaries ?? [],
    })),
    proposals: getProposals(userId),
    calls: getCalls(userId),
    feedback: getFeedback(userId),
    notifications: getNotifications(userId, 500),
    safetyEvents: getSafetyEvents(userId),
    analytics: getAnalyticsEvents(userId, 2000),
  };
}

export function deleteUserAccount(userId: string): void {
  const db = getDb();
  const householdIds = getHouseholdsForUser(userId).map((entry) => entry.household.id);
  const relationshipIds = getRelationshipsForUser(userId).map((entry) => entry.relationship.id);
  const candidateId = `usercand_${userId}`;
  const tx = db.transaction(() => {
    for (const householdId of householdIds) {
      db.prepare("DELETE FROM legacy_anniversaries WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM legacy_chapters WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_memory WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_reviews WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_goals WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_decisions WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_rituals WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_responsibilities WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM household_members WHERE household_id = ?").run(householdId);
      db.prepare("DELETE FROM households WHERE id = ?").run(householdId);
    }
    for (const relationshipId of relationshipIds) {
      db.prepare("DELETE FROM relationship_check_ins WHERE relationship_id = ?").run(relationshipId);
      db.prepare("DELETE FROM relationship_plans WHERE relationship_id = ?").run(relationshipId);
      db.prepare("DELETE FROM relationship_members WHERE relationship_id = ?").run(relationshipId);
      db.prepare("DELETE FROM relationships WHERE id = ?").run(relationshipId);
    }
    const safetyIds = db
      .prepare("SELECT id FROM safety_events WHERE user_id = ?")
      .all(userId) as Array<{ id: string }>;
    for (const row of safetyIds) {
      db.prepare("DELETE FROM safety_reviews WHERE safety_event_id = ?").run(row.id);
    }
    db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM feedback WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM calls WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM proposals WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM analytics_events WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM safety_events WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM match_lifecycles WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM runs WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM settings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM profiles WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM candidate_profiles WHERE id = ? OR owner_user_id = ?").run(candidateId, userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
  trackEvent(userId, "account_deleted", {});
  tx();
}

// Analytics

export function trackEvent(
  userId: string,
  name: AnalyticsEventName,
  properties: Record<string, unknown> = {}
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: uid("evt"),
    userId,
    name,
    properties,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO analytics_events (id, user_id, name, created_at, json)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(event.id, userId, name, event.createdAt, JSON.stringify(event));
  return event;
}

export function getAnalyticsEvents(userId: string, limit = 500): AnalyticsEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT json FROM analytics_events
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, limit) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as AnalyticsEvent);
}

export function getAnalyticsSummary(userId: string) {
  const events = getAnalyticsEvents(userId, 1000);
  const counts = new Map<AnalyticsEventName, number>();
  for (const event of events) counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
  const count = (name: AnalyticsEventName) => counts.get(name) ?? 0;
  return {
    totalEvents: events.length,
    counts: Object.fromEntries(counts.entries()),
    funnel: {
      profileStarted: count("profile_basics_saved") + count("profile_source_connected"),
      personaBuilt: count("persona_built"),
      agentRuns: count("agent_run_started"),
      matchesSelected: count("match_selected"),
      mutualAccepted: count("mutual_interest_accepted"),
      datesProposed: count("date_proposed"),
      datesAccepted: count("date_accepted"),
      feedbackSubmitted: count("feedback_submitted"),
    },
    relationship: {
      invitationsCreated: count("relationship_invitation_created"),
      invitationsAccepted: count("relationship_invitation_accepted"),
      plansSuggested: count("relationship_plan_suggested"),
      plansAccepted: count("relationship_plan_accepted"),
      plansCompleted: count("relationship_plan_completed"),
      checkInsSubmitted: count("relationship_check_in_submitted"),
      guidanceViews: count("relationship_guidance_viewed"),
      frictionSignals: count("relationship_friction_signal_surfaced"),
      safetyDisabled: count("relationship_mode_safety_disabled"),
    },
    household: {
      invitationsCreated: count("household_invitation_created"),
      invitationsAccepted: count("household_invitation_accepted"),
      profileUpdated: count("household_profile_updated"),
      responsibilitiesCreated: count("household_responsibility_created"),
      responsibilitiesCompleted: count("household_responsibility_completed"),
      ritualsCreated: count("household_ritual_created"),
      ritualsCompleted: count("household_ritual_completed"),
      decisionsCreated: count("household_decision_created"),
      decisionsResolved: count("household_decision_resolved"),
      goalsCreated: count("household_goal_created"),
      goalsCompleted: count("household_goal_completed"),
      reviewsSubmitted: count("household_weekly_review_submitted"),
      memoryCreated: count("household_memory_created"),
      resilienceSignals: count("household_resilience_signal_surfaced"),
      guidanceViews: count("household_guidance_viewed"),
      safetyDisabled: count("household_mode_safety_disabled"),
    },
    recent: events.slice(0, 12),
  };
}

// ── Date proposals ───────────────────────────────────────────────────

export function saveProposal(userId: string, proposal: DateProposal): DateProposal {
  getDb()
    .prepare(
      `INSERT INTO proposals (id, user_id, created_at, json) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET json = excluded.json`
    )
    .run(proposal.proposalId, userId, Date.now(), JSON.stringify(proposal));
  return proposal;
}

export function getProposal(userId: string, proposalId: string): DateProposal | null {
  const row = getDb()
    .prepare("SELECT json FROM proposals WHERE id = ? AND user_id = ?")
    .get(proposalId, userId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as DateProposal) : null;
}

export function getProposals(userId: string): DateProposal[] {
  const rows = getDb()
    .prepare("SELECT json FROM proposals WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as DateProposal);
}

// ── Warmup calls ─────────────────────────────────────────────────────

export function saveCall(userId: string, call: WarmupCall): WarmupCall {
  getDb()
    .prepare(
      `INSERT INTO calls (id, user_id, created_at, json) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET json = excluded.json`
    )
    .run(call.callId, userId, Date.now(), JSON.stringify(call));
  return call;
}

export function getCalls(userId: string): WarmupCall[] {
  const rows = getDb()
    .prepare("SELECT json FROM calls WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as WarmupCall);
}

// ── Post-date feedback ───────────────────────────────────────────────

export function saveFeedback(userId: string, feedback: DateFeedback): DateFeedback {
  getDb()
    .prepare(
      "INSERT INTO feedback (id, user_id, proposal_id, created_at, json) VALUES (?, ?, ?, ?, ?)"
    )
    .run(feedback.id, userId, feedback.proposalId, feedback.createdAt, JSON.stringify(feedback));
  return feedback;
}

export function getFeedback(userId: string): DateFeedback[] {
  const rows = getDb()
    .prepare("SELECT json FROM feedback WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Array<{ json: string }>;
  return rows.map((r) => JSON.parse(r.json) as DateFeedback);
}

export function getFeedbackForProposal(
  userId: string,
  proposalId: string
): DateFeedback | null {
  const rows = getDb()
    .prepare(
      "SELECT json FROM feedback WHERE user_id = ? AND proposal_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .all(userId, proposalId) as Array<{ json: string }>;
  return rows[0] ? (JSON.parse(rows[0].json) as DateFeedback) : null;
}

export function newFeedbackId(): string {
  return uid("fb");
}

// ── Notifications ────────────────────────────────────────────────────

export function addNotification(
  userId: string,
  n: Omit<AppNotification, "id" | "read" | "createdAt">
): AppNotification {
  const notification: AppNotification = {
    ...n,
    id: uid("ntf"),
    read: false,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, href, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      notification.id,
      userId,
      notification.type,
      notification.title,
      notification.body,
      notification.href ?? null,
      notification.createdAt
    );
  return notification;
}

export function getNotifications(userId: string, limit = 30): AppNotification[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, limit) as Array<{
    id: string;
    type: AppNotification["type"];
    title: string;
    body: string;
    href: string | null;
    read: number;
    created_at: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    href: r.href ?? undefined,
    read: r.read === 1,
    createdAt: r.created_at,
  }));
}

export function markAllNotificationsRead(userId: string): void {
  getDb().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
}
