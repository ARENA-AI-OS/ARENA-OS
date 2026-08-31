import {
  pgTable,
  text,
  jsonb,
  timestamp,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import type { Json } from "@core/types";

// ---------------------------------------------------------------------------
// Drizzle schema for PostgreSQL — Arena OS
// All tables and relations for the full domain model.
// ---------------------------------------------------------------------------

// --- Users & Workspaces ---------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("member"), // owner | admin | member
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(), // references users.id
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

// --- Projects & Missions --------------------------------------------------

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  repository: text("repository"),
  integrations: jsonb("integrations").$type<Json[]>(),
  environment: text("environment").notNull().default("development"),
  budgetXlm: real("budget_xlm").notNull().default(5),
});

export const missions = pgTable("missions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  phaseOrder: jsonb("phase_order").$type<Json[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  workspaceId: text("workspace_id").notNull(),
  projectId: text("project_id"),
  userId: text("user_id").notNull().default("dev"), // references users.id
  tasks: jsonb("tasks").$type<Json[]>(),
  agents: jsonb("agents").$type<Json[]>(),
  modelsUsed: jsonb("models_used").$type<string[]>(),
  toolsUsed: jsonb("tools_used").$type<string[]>(),
  costUsd: real("cost_usd").notNull().default(0),
  paymentsXlm: real("payments_xlm").notNull().default(0),
  filesChanged: integer("files_changed").notNull().default(0),
  testsPassed: integer("tests_passed").notNull().default(0),
  testsFailed: integer("tests_failed").notNull().default(0),
  deploymentUrl: text("deployment_url"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  finalResult: text("final_result"),
  receiptHash: text("receipt_hash"),
  stellarTx: text("stellar_tx"),
});

// --- Tasks (standalone, linked to missions) -------------------------------

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  missionId: text("mission_id").notNull(),
  type: text("type").notNull(), // plan | research | code | qa | deploy | stellar | payment | verify
  title: text("title").notNull(),
  agentRole: text("agent_role").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | done | failed | skipped
  dependsOn: jsonb("depends_on").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  result: jsonb("result").$type<Json>(),
  error: text("error"),
});

// --- Agents (registry of available agents) --------------------------------

export const agents = pgTable("agents", {
  role: text("role").primaryKey(), // commander | research | code | qa | deployment | stellar
  name: text("name").notNull(),
  description: text("description").notNull(),
  defaultCapabilities: jsonb("default_capabilities").$type<string[]>(),
  defaultModelRole: text("default_model_role").notNull().default("any"),
  enabled: boolean("enabled").notNull().default(true),
});

// --- Models & Providers ---------------------------------------------------

export const modelProviders = pgTable("model_providers", {
  provider: text("provider").primaryKey(),
  label: text("label").notNull(),
  connected: boolean("connected").notNull().default(false),
  models: jsonb("models").$type<string[]>(),
});

export const models = pgTable("models", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  label: text("label").notNull(),
  taskKinds: jsonb("task_kinds").$type<string[]>(), // research | code | simple | reasoning | any
  maxTokens: integer("max_tokens"),
  costPer1kInput: real("cost_per_1k_input"),
  costPer1kOutput: real("cost_per_1k_output"),
  enabled: boolean("enabled").notNull().default(true),
});

// --- Tools & Permissions --------------------------------------------------

export const tools = pgTable("tools", {
  name: text("name").primaryKey(),
  capability: text("capability").notNull(),
  description: text("description").notNull(),
  requiresProvider: text("requires_provider"),
  enabled: boolean("enabled").notNull().default(true),
});

export const toolPermissions = pgTable("tool_permissions", {
  id: text("id").primaryKey(),
  agentRole: text("agent_role").notNull(),
  toolName: text("tool_name").notNull(),
  allowed: boolean("allowed").notNull().default(true),
  requiresApproval: boolean("requires_approval").notNull().default(false),
});

// --- Secrets (encrypted store metadata) -----------------------------------

export const secrets = pgTable("secrets", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  lastAccessedBy: text("last_accessed_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// --- Workflows & Workflow Runs --------------------------------------------

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").$type<Json[]>().notNull(), // ordered list of step definitions
  triggers: jsonb("triggers").$type<Json[]>(), // what triggers this workflow
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | completed | failed
  triggeredBy: text("triggered_by").notNull(), // user_id or "system"
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  stepsCompleted: integer("steps_completed").notNull().default(0),
  stepsTotal: integer("steps_total").notNull().default(0),
  result: jsonb("result").$type<Json>(),
  error: text("error"),
});

// --- Integrations ---------------------------------------------------------

export const integrations = pgTable("integrations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  connected: boolean("connected").notNull().default(false),
  meta: jsonb("meta").$type<Json>(),
});

// --- API Keys -------------------------------------------------------------

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  environment: text("environment").notNull(),
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revoked: boolean("revoked").notNull().default(false),
});

// --- Agent & Tool Runs (execution logs) -----------------------------------

export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),
  missionId: text("mission_id").notNull(),
  role: text("role").notNull(),
  model: text("model"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull(),
  summary: text("summary"),
});

export const toolRuns = pgTable("tool_runs", {
  id: text("id").primaryKey(),
  missionId: text("mission_id"),
  tool: text("tool").notNull(),
  input: jsonb("input").$type<Json>(),
  output: jsonb("output").$type<Json>(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  error: text("error"),
});

// --- Payments & Stellar ---------------------------------------------------

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  missionId: text("mission_id"),
  service: text("service").notNull(),
  purpose: text("purpose").notNull(),
  amountXlm: real("amount_xlm").notNull(),
  asset: text("asset").notNull(),
  network: text("network").notNull(),
  wallet: text("wallet").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  txHash: text("tx_hash"),
  receiptHash: text("receipt_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const paymentPolicies = pgTable("payment_policies", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  perRequestXlm: real("per_request_xlm").notNull().default(1),
  perMissionXlm: real("per_mission_xlm").notNull().default(5),
  perDayXlm: real("per_day_xlm").notNull().default(20),
  allowedServices: jsonb("allowed_services").$type<string[]>(),
  allowedRecipients: jsonb("allowed_recipients").$type<string[]>(),
  approvalThresholdXlm: real("approval_threshold_xlm").notNull().default(0.5),
  asset: text("asset").notNull().default("XLM"),
  network: text("network").notNull().default("testnet"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const stellarTransactions = pgTable("stellar_transactions", {
  id: text("id").primaryKey(),
  missionId: text("mission_id"),
  kind: text("kind").notNull(),
  txHash: text("tx_hash").notNull(),
  network: text("network").notNull(),
  status: text("status").notNull(),
  amountXlm: real("amount_xlm"),
  receiptHash: text("receipt_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const receipts = pgTable("receipts", {
  hash: text("hash").primaryKey(),
  missionDigest: text("mission_digest").notNull(),
  submitter: text("submitter").notNull(),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull(),
  paymentReference: text("payment_reference"),
  anchorTx: text("anchor_tx"),
});

// --- Audit & Memory -------------------------------------------------------

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  missionId: text("mission_id"),
  detail: jsonb("detail").$type<Json>(),
});

export const memories = pgTable("memories", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  scopeId: text("scope_id").notNull(),
  source: text("source").notNull(),
  content: text("content").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
