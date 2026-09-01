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
  | "stellar"
  | "planner";

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
  planner: {
    role: "planner",
    name: "Planning Assistant",
    description: "Conversational planner — reasons about approach and strategy. Zero tool capabilities; outputs plans that hand off to Arena missions.",
    defaultCapabilities: [],
    defaultModelRole: "research",
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
  // GitHub
  | "github.read_issue"
  | "github.list_repositories"
  | "github.read_file"
  | "github.create_branch"
  | "github.modify_files"
  | "github.create_commit"
  | "github.create_pr"
  | "github.read_checks"
  // Terminal
  | "terminal.run"
  | "terminal.git_status"
  | "terminal.git_diff"
  | "terminal.run_tests"
  | "terminal.run_build"
  | "terminal.install_deps"
  // Supabase
  | "supabase.query"
  | "supabase.list_tables"
  | "supabase.describe_table"
  | "supabase.write_database"
  | "supabase.delete_record"
  // Firebase
  | "firebase.read_firestore"
  | "firebase.write_firestore"
  | "firebase.list_documents"
  | "firebase.get_project"
  // Railway
  | "railway.list_projects"
  | "railway.deploy_preview"
  | "railway.get_deployment_status"
  | "railway.get_logs"
  // Render
  | "render.list_projects"
  | "render.get_deployment_status"
  | "render.get_logs"
  | "render.deploy_preview"
  // Vercel
  | "vercel.list_projects"
  | "vercel.get_deployment_status"
  | "vercel.get_logs"
  | "vercel.deploy_preview"
  | "vercel.deploy_production"
  | "vercel.get_domains"
  // Payment / Stellar
  | "payment.request"
  | "stellar.anchor_receipt"
  // Custom API
  | "custom_api.call";

export interface ToolSpec {
  name: ToolName;
  capability: Capability;
  description: string;
  // Provider that must be configured for this tool to run for real.
  requiresProvider?: "github" | "supabase" | "railway" | "firebase" | "render" | "vercel" | "stellar" | "x402";
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

export type IntegrationType = "github" | "supabase" | "firebase" | "railway" | "stellar" | "render" | "vercel";

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

// ---------------------------------------------------------------------------
// Custom API Registry (Prompt 7)
// ---------------------------------------------------------------------------

export type AuthType = "none" | "api_key" | "bearer_token" | "basic" | "oauth2" | "custom_header";
export type CustomApiStatus = "active" | "disabled";

export interface CustomApi {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: AuthType;
  // Pointer into the security module — never stores raw secrets
  credentialReference: string;
  requestConfig: {
    headers?: Record<string, string>;
    defaultParams?: Record<string, string>;
    rateLimit?: { requests: number; perSeconds: number };
    timeoutMs?: number;
  };
  status: CustomApiStatus;
  createdAt: string;
  createdBy: string;
}

export interface CustomApiEndpoint {
  id: string;
  customApiId: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  paramSchema?: Json;
  // Cost in XLM for x402-enabled endpoints (0 = free)
  costXlm?: number;
}

export interface AgentSlot {
  id: string;
  name: string;
  description: string;
  role: string;
  isCustom: boolean;
  modelPreference: string;
  budget: number;
  timeoutMs: number;
  retryLimit: number;
  status: "active" | "disabled";
  // Capabilities this agent slot has by default
  defaultCapabilities: Capability[];
  createdAt: string;
}

export interface AgentApiAssignment {
  id: string;
  customApiId: string;
  agentId: string;
  grantedCapabilities: string[]; // e.g. ["can_call", "can_spend_via_x402"]
  assignedAt: string;
  assignedBy: string;
}

// Helper constructors
export const newAudit = (e: Omit<AuditEvent, "id" | "at">): AuditEvent => ({
  id: uuid(),
  at: nowIso(),
  ...e,
});

// ---------------------------------------------------------------------------
// Chat Conversations (Prompt 8A — planning chatbot)
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  model?: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  modelProvider: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  missionId?: string; // set when handed off to Arena
}

// ---------------------------------------------------------------------------
// Platform Connections (Prompt 8A — Arena page)
// ---------------------------------------------------------------------------

export type PlatformStatus = "connected" | "disconnected" | "error" | "token_expired";

export interface PlatformScope {
  name: string;
  description: string;
}

export interface ExhibitionProject {
  id: string;
  workspaceId: string;
  missionId?: string;
  name: string;
  description: string;
  techStack: string[];
  repoUrl?: string;
  liveUrl?: string;
  screenshotUrl?: string;
  arenaInvolvement?: string;
  category: string;
  featured: boolean;
  sortOrder: number;
  receiptHash?: string;
  stellarTx?: string;
  meta?: Json;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConnection {
  id: string;
  workspaceId: string;
  platform: IntegrationType | "openai" | "gemini" | "claude";
  label: string;
  status: PlatformStatus;
  credentialReference: string;
  scopes: PlatformScope[];
  lastUsedAt?: string;
  lastTestAt?: string;
  lastTestOk?: boolean;
  network?: "testnet" | "mainnet"; // for Stellar
  meta: Json;
  createdAt: string;
}

