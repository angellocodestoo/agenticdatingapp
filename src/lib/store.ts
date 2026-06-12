import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  AgentRunRecord,
  AgentSettings,
  AppNotification,
  DateFeedback,
  DateProposal,
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

export function newRunId(): string {
  return uid("run");
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
