-- Arena OS — PostgreSQL schema (authoritative DDL)
-- Apply with: psql "$DATABASE_URL" -f apps/web/src/db/schema.sql
-- Or use Drizzle: pnpm --filter @arena-os/web db:push

-- --- Users & Workspaces ---------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- --- Projects & Missions --------------------------------------------------

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
  user_id TEXT NOT NULL DEFAULT 'dev',
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

-- --- Tasks ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  depends_on JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  result JSONB,
  error TEXT
);

-- --- Agents ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
  role TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_capabilities JSONB,
  default_model_role TEXT NOT NULL DEFAULT 'any',
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- --- Models & Providers ---------------------------------------------------

CREATE TABLE IF NOT EXISTS model_providers (
  provider TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  models JSONB
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  label TEXT NOT NULL,
  task_kinds JSONB,
  max_tokens INTEGER,
  cost_per_1k_input REAL,
  cost_per_1k_output REAL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- --- Tools & Permissions --------------------------------------------------

CREATE TABLE IF NOT EXISTS tools (
  name TEXT PRIMARY KEY,
  capability TEXT NOT NULL,
  description TEXT NOT NULL,
  requires_provider TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tool_permissions (
  id TEXT PRIMARY KEY,
  agent_role TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE
);

-- --- Secrets (encrypted store) --------------------------------------------

CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  last_accessed_by TEXT,
  expires_at TIMESTAMPTZ
);

-- --- Workflows & Workflow Runs --------------------------------------------

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  triggers JSONB,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_by TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT
);

-- --- Integrations ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB
);

-- --- API Keys -------------------------------------------------------------

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

-- --- Agent & Tool Runs (execution logs) -----------------------------------

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

-- --- Payments & Stellar ---------------------------------------------------

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

CREATE TABLE IF NOT EXISTS payment_policies (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  per_request_xlm REAL NOT NULL DEFAULT 1,
  per_mission_xlm REAL NOT NULL DEFAULT 5,
  per_day_xlm REAL NOT NULL DEFAULT 20,
  allowed_services JSONB,
  allowed_recipients JSONB,
  approval_threshold_xlm REAL NOT NULL DEFAULT 0.5,
  asset TEXT NOT NULL DEFAULT 'XLM',
  network TEXT NOT NULL DEFAULT 'testnet',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
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

-- --- Audit & Memory -------------------------------------------------------

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

-- --- Indexes --------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_missions_workspace ON missions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_missions_user ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mission ON tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_audit_mission ON audit_events(mission_id);
CREATE INDEX IF NOT EXISTS idx_payments_mission ON payments(mission_id);
CREATE INDEX IF NOT EXISTS idx_toolruns_mission ON tool_runs(mission_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
