import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  AgentRunRecord,
  AgentSettings,
  AppNotification,
  CandidateProfile,
  DateFeedback,
  DateProposal,
  MatchLifecycleRecord,
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
