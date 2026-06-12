import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "sm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

export type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: number;
};

type UserRow = {
  id: string;
  email: string | null;
  password_hash: string | null;
  display_name: string | null;
  created_at: number;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createSession(userId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, now, now + SESSION_TTL_MS);
  return token;
}

export function getUserForToken(token: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, Date.now()) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function createGuestUser(): User {
  const db = getDb();
  const id = `u_${randomBytes(8).toString("hex")}`;
  const now = Date.now();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, NULL, NULL, NULL, ?)"
  ).run(id, now);
  return { id, email: null, displayName: null, createdAt: now };
}

export function findUserByEmail(email: string): (User & { passwordHash: string | null }) | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

/** Attach an email + password to an existing (guest) user, "claiming" the account. */
export function claimAccount(
  userId: string,
  email: string,
  password: string,
  displayName?: string
): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET email = ?, password_hash = ?, display_name = COALESCE(?, display_name) WHERE id = ?"
  ).run(email.toLowerCase().trim(), hashPassword(password), displayName ?? null, userId);
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

/** Read the session cookie and return the current user, or null. Does not create anything. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserForToken(token);
}

/**
 * Route-handler helper: return the current user, creating a guest user +
 * session cookie on first contact so the app works with zero signup friction.
 * Only call from Route Handlers (cookie writes are not allowed during render).
 */
export async function requireUser(): Promise<User> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = getUserForToken(token);
    if (user) return user;
  }
  const user = createGuestUser();
  const newToken = createSession(user.id);
  store.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
  return user;
}
