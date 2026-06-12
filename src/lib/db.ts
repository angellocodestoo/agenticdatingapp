import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

declare global {
  var __redstringDb: Database.Database | undefined;
}

function open(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  // Migrate from the pre-rename database file if it exists.
  const oldPath = path.join(dir, "soulmate.db");
  const newPath = path.join(dir, "redstring.db");
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    fs.renameSync(oldPath, newPath);
    for (const suffix of ["-wal", "-shm"]) {
      if (fs.existsSync(oldPath + suffix)) fs.renameSync(oldPath + suffix, newPath + suffix);
    }
  }
  const db = new Database(newPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id),
      source TEXT NOT NULL,
      visibility TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS match_lifecycles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      candidate_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      status TEXT NOT NULL,
      candidate_consent TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS safety_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      candidate_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      proposal_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_candidate_profiles_visible ON candidate_profiles(visibility, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_candidate_profiles_owner ON candidate_profiles(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_match_lifecycles_user ON match_lifecycles(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_match_lifecycles_candidate ON match_lifecycles(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_safety_events_user ON safety_events(user_id, candidate_id, action);
    CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
  `);
  return db;
}

export function getDb(): Database.Database {
  // Reuse across hot reloads in dev to avoid exhausting file handles.
  if (!globalThis.__redstringDb) {
    globalThis.__redstringDb = open();
  }
  return globalThis.__redstringDb;
}
