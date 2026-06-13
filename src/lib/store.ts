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
  HouseholdMember,
  HouseholdRecord,
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
