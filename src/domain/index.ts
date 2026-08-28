import type { Capability, Environment, Json } from "@core/types";
import { nowIso, shortId, uuid } from "@core/ids";

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

export type MissionStatus =
  | "planning"
  | "research"
  | "coding"
  | "testing"
  | "deployment"
  | "verification"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "verified";

export type TaskType =
  | "plan"
  | "research"
  | "code"
  | "qa"
  | "deploy"
  | "stellar"
  | "payment"
  | "verify";

export type TaskStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface Task {
  id: string;
  missionId: string;
  type: TaskType;
  title: string;
  agentRole: AgentRole;
  status: TaskStatus;
  dependsOn: string[];
  createdAt: string;
  updatedAt: string;
  result?: Json;
  error?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  phaseOrder: MissionStatus[];
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  projectId?: string;
  tasks: Task[];
  agents: AgentRole[];
  modelsUsed: string[];
  toolsUsed: string[];
  costUsd: number;
  paymentsXlm: number;
  filesChanged: number;
  testsPassed: number;
  testsFailed: number;
  deploymentUrl?: string;
  verificationStatus: "unverified" | "verified" | "failed";
  finalResult?: string;
  receiptHash?: string;
  stellarTx?: string;
  // Pipeline control for staged execution + payment approval (spec §29-§31).
  pipelineStage?: MissionStage;
  pendingPayment?: Json | null;
  approvedPayments?: string[];
  allowPaidApi?: boolean;
  paidService?: string;
  paidAmountXlm?: number;
  budgetXlm?: number;
}

export type MissionStage =
  | "commander"
  | "research"
  | "payment"
  | "code"
  | "qa"
  | "deployment"
  | "verification"
  | "stellar"
  | "done";

export function newMission(input: {
  title: string;
  description: string;
  workspaceId: string;
  projectId?: string;
}): Mission {
  return {
    id: shortId("AOS"),
    title: input.title,
    description: input.description,
    status: "planning",
    phaseOrder: ["planning", "research", "coding", "testing", "deployment", "verification"],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    tasks: [],
    agents: [],
    modelsUsed: [],
    toolsUsed: [],
    costUsd: 0,
    paymentsXlm: 0,
    filesChanged: 0,
    testsPassed: 0,
    testsFailed: 0,
    verificationStatus: "unverified",
  };
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentRole =
  | "commander"
  | "research"
  | "code"
  | "qa"
  | "deployment"
  | "stellar";

export interface AgentSpec {
  role: AgentRole;
  name: string;
  description: string;
  defaultCapabilities: Capability[];
  defaultModelRole: TaskType | "any";
}

export const AGENT_REGISTRY: Record<AgentRole, AgentSpec> = {
  commander: {
    role: "commander",
    name: "Commander Agent",
    description: "Understands intent, builds the task graph and assigns agents.",
    defaultCapabilities: ["mission:plan", "agent:assign"],
    defaultModelRole: "any",
  },
  research: {
    role: "research",
    name: "Research Agent",
    description: "Searches docs, inspects repos and APIs, compares approaches.",
    defaultCapabilities: ["github:read_repository", "github:read_issue", "web:search"],
    defaultModelRole: "research",
  },
  code: {
    role: "code",
    name: "Code Agent",
    description: "Inspects, writes and refactors code, prepares pull requests.",
    defaultCapabilities: [
      "github:read_repository",
      "github:create_branch",
      "github:write_files",
      "github:create_commit",
      "github:create_pull_request",
      "terminal:run",
    ],
    defaultModelRole: "code",
  },
  qa: {
    role: "qa",
    name: "QA Agent",
    description: "Runs tests, reviews diffs and verifies requirements.",
    defaultCapabilities: ["github:read_repository", "terminal:run", "github:read_checks"],
    defaultModelRole: "research",
  },
  deployment: {
    role: "deployment",
    name: "Deployment Agent",
    description: "Creates previews, inspects deployments and promotes approved ones.",
    defaultCapabilities: ["railway:read_project", "railway:deploy_preview", "railway:read_logs"],
    defaultModelRole: "any",
  },
  stellar: {
    role: "stellar",
    name: "Stellar Agent",
    description: "Inspects wallets, prepares and submits Soroban transactions.",
    defaultCapabilities: ["stellar:read_wallet", "stellar:prepare_transaction", "stellar:submit_transaction", "stellar:spend"],
    defaultModelRole: "any",
  },
};

export interface AgentRun {
  id: string;
  missionId: string;
  role: AgentRole;
  model?: string;
  startedAt: string;
  endedAt?: string;
  status: "running" | "done" | "failed";
  summary?: string;
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type ModelProvider = "openai" | "gemini" | "claude" | "mock";
export type ModelTaskKind = "research" | "code" | "simple" | "reasoning" | "any";

export interface ModelProviderConfig {
  provider: ModelProvider;
  label: string;
  connected: boolean;
  models: string[];
}

export interface ModelRequest {
  prompt: string;
  system?: string;
  taskKind?: ModelTaskKind;
  temperature?: number;
  maxTokens?: number;
  structured?: boolean;
}

export interface ModelResponse {
  provider: ModelProvider;
  model: string;
  text: string;
  // When structured is requested, parsed object if available.
  json?: Json;
  usageUsd: number;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export type ToolName =
  | "github.read_issue"
  | "github.create_branch"
  | "github.modify_files"
  | "github.create_commit"
  | "github.create_pr"
  | "github.read_checks"
  | "terminal.run"
  | "supabase.query"
  | "railway.deploy_preview"
  | "payment.request"
  | "stellar.anchor_receipt";

export interface ToolSpec {
  name: ToolName;
  capability: Capability;
  description: string;
  // Provider that must be configured for this tool to run for real.
  requiresProvider?: "github" | "supabase" | "railway" | "stellar" | "x402";
}

export interface ToolRun {
  id: string;
  missionId?: string;
  tool: ToolName;
  input: Json;
  output?: Json;
  status: "running" | "success" | "failed" | "denied";
  startedAt: string;
  endedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export type IntegrationType = "github" | "supabase" | "firebase" | "railway" | "stellar";

export interface Integration {
  id: string;
  workspaceId: string;
  type: IntegrationType;
  name: string;
  connected: boolean;
  meta: Json;
}

// ---------------------------------------------------------------------------
// Payments + x402
// ---------------------------------------------------------------------------

export type PaymentStatus = "pending" | "approved" | "denied" | "settled" | "failed";

export interface PaymentPolicy {
  perRequestXlm: number;
  perMissionXlm: number;
  perDayXlm: number;
  allowedServices: string[];
  allowedRecipients: string[];
  approvalThresholdXlm: number;
  asset: string;
  network: "testnet" | "mainnet";
}

export interface Payment {
  id: string;
  missionId?: string;
  service: string;
  purpose: string;
  amountXlm: number;
  asset: string;
  network: "testnet" | "mainnet";
  wallet: string;
  recipient: string;
  status: PaymentStatus;
  txHash?: string;
  receiptHash?: string;
  createdAt: string;
  settledAt?: string;
}

// ---------------------------------------------------------------------------
// Stellar
// ---------------------------------------------------------------------------

export interface StellarTransaction {
  id: string;
  missionId?: string;
  kind: "payment" | "receipt_anchor" | "contract_call";
  txHash: string;
  network: "testnet" | "mainnet";
  status: "submitted" | "confirmed" | "failed";
  amountXlm?: number;
  receiptHash?: string;
  createdAt: string;
}

export interface Receipt {
  hash: string;
  missionDigest: string;
  submitter: string;
  timestamp: string;
  status: string;
  paymentReference?: string;
  anchorTx?: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditActor = AgentRole | "user" | "system";

export interface AuditEvent {
  id: string;
  at: string;
  actor: AuditActor;
  action: string;
  missionId?: string;
  detail?: Json;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryScope = "mission" | "project" | "workspace" | "tool";

export interface Memory {
  id: string;
  scope: MemoryScope;
  scopeId: string;
  source: string;
  content: string;
  confidence: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export type ApiKeyEnvironment = "live" | "test";

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  environment: ApiKeyEnvironment;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revoked: boolean;
}

// ---------------------------------------------------------------------------
// Projects / Workspaces
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  repository?: string;
  integrations: IntegrationType[];
  environment: Environment;
  budgetXlm: number;
}

// Helper constructors
export const newAudit = (e: Omit<AuditEvent, "id" | "at">): AuditEvent => ({
  id: uuid(),
  at: nowIso(),
  ...e,
});
