-- Arena OS — PostgreSQL schema (authoritative DDL)
-- Apply with: psql "$DATABASE_URL" -f src/db/schema.sql
-- Or use Drizzle: npm run db:push

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  repository TEXT,
  integrations JSONB,
  environment TEXT NOT NULL DEFAULT 'development',
  budget_xlm REAL NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  phase_order JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  workspace_id TEXT NOT NULL,
  project_id TEXT,
  tasks JSONB,
  agents JSONB,
  models_used JSONB,
  tools_used JSONB,
  cost_usd REAL NOT NULL DEFAULT 0,
  payments_xlm REAL NOT NULL DEFAULT 0,
  files_changed INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  deployment_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  final_result TEXT,
  receipt_hash TEXT,
  stellar_tx TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  mission_id TEXT,
  service TEXT NOT NULL,
  purpose TEXT NOT NULL,
  amount_xlm REAL NOT NULL,
  asset TEXT NOT NULL,
  network TEXT NOT NULL,
  wallet TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash TEXT,
  receipt_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stellar_transactions (
  id TEXT PRIMARY KEY,
  mission_id TEXT,
  kind TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_xlm REAL,
  receipt_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  hash TEXT PRIMARY KEY,
  mission_digest TEXT NOT NULL,
  submitter TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_reference TEXT,
  anchor_tx TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  mission_id TEXT,
  detail JSONB
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  environment TEXT NOT NULL,
  prefix TEXT NOT NULL,
  scopes JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS model_providers (
  provider TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  models JSONB
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  role TEXT NOT NULL,
  model TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS tool_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT,
  tool TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_missions_workspace ON missions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_mission ON audit_events(mission_id);
CREATE INDEX IF NOT EXISTS idx_payments_mission ON payments(mission_id);
CREATE INDEX IF NOT EXISTS idx_toolruns_mission ON tool_runs(mission_id);
