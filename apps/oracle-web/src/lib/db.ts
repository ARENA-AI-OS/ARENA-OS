import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

/**
 * Minimal server-side persistence — a single SQLite file. Hackathon-grade:
 * enough that a page refresh doesn't lose onboarding progress, not a real
 * accounts system. See README for the honesty note on scope.
 */

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "oracle.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS onboarding_sessions (
    bmoni_user_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    owner_address TEXT,
    smart_wallet_id TEXT,
    smart_wallet_address TEXT,
    step TEXT NOT NULL DEFAULT 'created',
    bvn TEXT,
    onboarding_status_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS processed_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface OnboardingSession {
  bmoni_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  owner_address: string | null;
  smart_wallet_id: string | null;
  smart_wallet_address: string | null;
  step: string;
  bvn: string | null;
  onboarding_status_json: string | null;
  created_at: string;
  updated_at: string;
}

export function createSession(input: {
  bmoniUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}) {
  db.prepare(
    `INSERT INTO onboarding_sessions (bmoni_user_id, first_name, last_name, email, phone_number)
     VALUES (@bmoniUserId, @firstName, @lastName, @email, @phoneNumber)`,
  ).run(input);
}

export function getSession(bmoniUserId: string): OnboardingSession | undefined {
  return db
    .prepare(`SELECT * FROM onboarding_sessions WHERE bmoni_user_id = ?`)
    .get(bmoniUserId) as OnboardingSession | undefined;
}

export function updateSession(
  bmoniUserId: string,
  patch: Partial<
    Pick<
      OnboardingSession,
      | "owner_address"
      | "smart_wallet_id"
      | "smart_wallet_address"
      | "step"
      | "bvn"
      | "onboarding_status_json"
    >
  >,
) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = @${f}`).join(", ");
  db.prepare(
    `UPDATE onboarding_sessions SET ${setClause}, updated_at = datetime('now') WHERE bmoni_user_id = @bmoniUserId`,
  ).run({ ...patch, bmoniUserId });
}

export function hasProcessedWebhookEvent(eventId: string): boolean {
  return !!db
    .prepare(`SELECT 1 FROM processed_webhook_events WHERE event_id = ?`)
    .get(eventId);
}

export function markWebhookEventProcessed(eventId: string, eventType: string) {
  db.prepare(
    `INSERT OR IGNORE INTO processed_webhook_events (event_id, event_type) VALUES (?, ?)`,
  ).run(eventId, eventType);
}

export default db;
