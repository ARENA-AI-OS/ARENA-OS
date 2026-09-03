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

  CREATE TABLE IF NOT EXISTS savings_rules (
    bmoni_user_id TEXT PRIMARY KEY,
    smart_wallet_id TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'percentage' | 'roundup'
    param REAL NOT NULL,      -- percentage: bps (e.g. 1000 = 10%). roundup: round up to nearest N.
    destination_address TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pending_savings_actions (
    id TEXT PRIMARY KEY,
    bmoni_user_id TEXT NOT NULL,
    proposal_id TEXT NOT NULL,
    trigger_deposit_amount TEXT NOT NULL,
    save_amount TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_signature', -- 'awaiting_signature' | 'signed' | 'dismissed'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

// ---------------------------------------------------------------------------
// Auto-save rules
// ---------------------------------------------------------------------------

export interface SavingsRule {
  bmoni_user_id: string;
  smart_wallet_id: string;
  rule_type: "percentage" | "roundup";
  param: number;
  destination_address: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export function upsertSavingsRule(input: {
  bmoniUserId: string;
  smartWalletId: string;
  ruleType: "percentage" | "roundup";
  param: number;
  destinationAddress: string;
}) {
  db.prepare(
    `INSERT INTO savings_rules (bmoni_user_id, smart_wallet_id, rule_type, param, destination_address, active)
     VALUES (@bmoniUserId, @smartWalletId, @ruleType, @param, @destinationAddress, 1)
     ON CONFLICT(bmoni_user_id) DO UPDATE SET
       smart_wallet_id = excluded.smart_wallet_id,
       rule_type = excluded.rule_type,
       param = excluded.param,
       destination_address = excluded.destination_address,
       active = 1,
       updated_at = datetime('now')`,
  ).run(input);
}

export function getSavingsRule(bmoniUserId: string): SavingsRule | undefined {
  return db
    .prepare(`SELECT * FROM savings_rules WHERE bmoni_user_id = ? AND active = 1`)
    .get(bmoniUserId) as SavingsRule | undefined;
}

export function deactivateSavingsRule(bmoniUserId: string) {
  db.prepare(`UPDATE savings_rules SET active = 0, updated_at = datetime('now') WHERE bmoni_user_id = ?`).run(bmoniUserId);
}

// ---------------------------------------------------------------------------
// Pending savings actions — auto-created + auto-approved, awaiting the
// user's signature. See lib/autosave.ts for why the signature step can't
// also be automated without a shared server-side co-signer key.
// ---------------------------------------------------------------------------

export interface PendingSavingsAction {
  id: string;
  bmoni_user_id: string;
  proposal_id: string;
  trigger_deposit_amount: string;
  save_amount: string;
  status: "awaiting_signature" | "signed" | "dismissed";
  created_at: string;
}

export function createPendingSavingsAction(input: {
  id: string;
  bmoniUserId: string;
  proposalId: string;
  triggerDepositAmount: string;
  saveAmount: string;
}) {
  db.prepare(
    `INSERT INTO pending_savings_actions (id, bmoni_user_id, proposal_id, trigger_deposit_amount, save_amount)
     VALUES (@id, @bmoniUserId, @proposalId, @triggerDepositAmount, @saveAmount)`,
  ).run(input);
}

export function listPendingSavingsActions(bmoniUserId: string): PendingSavingsAction[] {
  return db
    .prepare(`SELECT * FROM pending_savings_actions WHERE bmoni_user_id = ? AND status = 'awaiting_signature' ORDER BY created_at DESC`)
    .all(bmoniUserId) as PendingSavingsAction[];
}

export function markPendingSavingsActionStatus(id: string, status: "signed" | "dismissed") {
  db.prepare(`UPDATE pending_savings_actions SET status = ? WHERE id = ?`).run(status, id);
}

export default db;
