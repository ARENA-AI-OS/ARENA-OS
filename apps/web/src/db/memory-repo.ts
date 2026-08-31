import type {
  AgentRun,
  ApiKey,
  AuditEvent,
  Integration,
  Memory,
  Mission,
  ModelProviderConfig,
  Payment,
  Project,
  Receipt,
  StellarTransaction,
  ToolRun,
  Workspace,
} from "@domain/index";
import type {
  ActivityFilter,
  ActivityItem,
  Repository,
} from "./repository";
import { newAudit } from "@domain/index";
import { nowIso, shortId, uuid } from "@core/ids";

// ---------------------------------------------------------------------------
// In-memory repository. Used when ARENA_DB_DRIVER=memory (the default).
// Seeds a single-developer workspace with demonstrative data so the app
// runs end-to-end with zero external dependencies.
// ---------------------------------------------------------------------------

class MemoryRepository implements Repository {
  private workspace: Workspace;
  private projects: Project[] = [];
  private missions: Mission[] = [];
  private integrations: Integration[] = [];
  private payments: Payment[] = [];
  private stellarTx: StellarTransaction[] = [];
  private receipts = new Map<string, Receipt>();
  private audit: AuditEvent[] = [];
  private memories: Memory[] = [];
  private apiKeys: ApiKey[] = [];
  private modelProviders: ModelProviderConfig[] = [];
  private agentRuns: AgentRun[] = [];
  private toolRuns: ToolRun[] = [];

  constructor(seedEmail: string) {
    this.workspace = {
      id: "ws_seed",
      name: "Arena Workspace",
      ownerId: `user_${seedEmail.replace(/[^a-z0-9]/gi, "_")}`,
      ownerEmail: seedEmail,
      createdAt: nowIso(),
    };
    this.seed();
  }

  private seed() {
    this.projects.push(
      {
        id: "proj_receiptor",
        workspaceId: this.workspace.id,
        name: "Receiptor",
        repository: "ARENA-AI-OS/receiptor",
        integrations: ["github", "supabase", "railway", "stellar"],
        environment: "development",
        budgetXlm: 5,
      },
      {
        id: "proj_arena",
        workspaceId: this.workspace.id,
        name: "Arena OS",
        repository: "ARENA-AI-OS/ARENA-OS",
        integrations: ["github", "railway", "stellar"],
        environment: "development",
        budgetXlm: 5,
      },
    );

    this.integrations.push(
      { id: "int_gh", workspaceId: this.workspace.id, type: "github", name: "GitHub", connected: true, meta: { user: "arena-dev" } },
      { id: "int_sb", workspaceId: this.workspace.id, type: "supabase", name: "Supabase", connected: true, meta: {} },
      { id: "int_rw", workspaceId: this.workspace.id, type: "railway", name: "Railway", connected: false, meta: {} },
      { id: "int_st", workspaceId: this.workspace.id, type: "stellar", name: "Stellar Testnet", connected: false, meta: {} },
    );

    this.modelProviders.push(
      { provider: "openai", label: "OpenAI", connected: false, models: ["gpt-4o", "gpt-4o-mini"] },
      { provider: "gemini", label: "Google Gemini", connected: false, models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
      { provider: "claude", label: "Anthropic Claude", connected: false, models: ["claude-3-5-sonnet", "claude-3-haiku"] },
      { provider: "mock", label: "Mock Model (offline)", connected: true, models: ["mock-reason"] },
    );

    const sampleMission: Mission = {
      id: shortId("AOS"),
      title: "Fix GitHub issue #42",
      description: "Investigate failing auth test and ship a preview deployment.",
      status: "verified",
      phaseOrder: ["planning", "research", "coding", "testing", "deployment", "verification"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      workspaceId: this.workspace.id,
      projectId: "proj_receiptor",
      tasks: [],
      agents: ["commander", "research", "code", "qa", "deployment", "stellar"],
      modelsUsed: ["claude", "gemini", "openai"],
      toolsUsed: ["github.read_issue", "terminal.run", "railway.deploy_preview", "stellar.anchor_receipt"],
      costUsd: 0.38,
      paymentsXlm: 0,
      filesChanged: 4,
      testsPassed: 12,
      testsFailed: 0,
      deploymentUrl: "https://receiptor-preview.railway.app",
      verificationStatus: "verified",
      finalResult: "Issue analyzed, code changed, tests passed, preview deployed and verified.",
      receiptHash: "sha256:9f2c...ab01",
      stellarTx: "a1b2c3...",
    };
    this.missions.push(sampleMission);

    const seedAudit = [
      newAudit({ actor: "commander", action: "created mission", missionId: sampleMission.id }),
      newAudit({ actor: "research", action: "inspected repository", missionId: sampleMission.id }),
      newAudit({ actor: "code", action: "modified auth.ts and 3 files", missionId: sampleMission.id }),
      newAudit({ actor: "qa", action: "test suite passed", missionId: sampleMission.id }),
      newAudit({ actor: "deployment", action: "preview deployed", missionId: sampleMission.id }),
      newAudit({ actor: "user", action: "approved payment", missionId: sampleMission.id }),
      newAudit({ actor: "stellar", action: "receipt anchored on Soroban", missionId: sampleMission.id }),
    ];
    this.audit.push(...seedAudit);

    this.payments.push({
      id: shortId("PAY"),
      missionId: sampleMission.id,
      service: "Repo Analyzer API",
      purpose: "Repository analysis",
      amountXlm: 0.2,
      asset: "XLM",
      network: "testnet",
      wallet: "GABCDEFG...",
      recipient: "GRECIPENT...",
      status: "settled",
      txHash: "tx_demo_001",
      receiptHash: sampleMission.receiptHash,
      createdAt: nowIso(),
      settledAt: nowIso(),
    });

    this.stellarTx.push({
      id: shortId("STX"),
      missionId: sampleMission.id,
      kind: "receipt_anchor",
      txHash: "tx_demo_001",
      network: "testnet",
      status: "confirmed",
      receiptHash: sampleMission.receiptHash,
      createdAt: nowIso(),
    });

    this.receipts.set(sampleMission.receiptHash ?? "r", {
      hash: sampleMission.receiptHash ?? "r",
      missionDigest: "digest:" + sampleMission.id,
      submitter: "GABCDEFG...",
      timestamp: nowIso(),
      status: "verified",
      paymentReference: this.payments[0].id,
      anchorTx: this.stellarTx[0].txHash,
    });

    this.apiKeys.push({
      id: "key_live",
      workspaceId: this.workspace.id,
      name: "Production Agent",
      environment: "live",
      prefix: "aos_live_••••••••••••",
      scopes: ["missions:write", "tools:execute"],
      createdAt: nowIso(),
      lastUsedAt: nowIso(),
      revoked: false,
    });

    this.memories.push({
      id: uuid(),
      scope: "project",
      scopeId: "proj_receiptor",
      source: "code-agent",
      content: "Auth uses JWT stored in httpOnly cookie; refresh rotation every 15m.",
      confidence: 0.9,
      createdAt: nowIso(),
    });
  }

  async getWorkspace(id: string) {
    return this.workspace.id === id ? this.workspace : undefined;
  }
  async ensureSeedWorkspace() {
    return this.workspace;
  }

  async listProjects(workspaceId: string) {
    return this.projects.filter((p) => p.workspaceId === workspaceId);
  }
  async getProject(id: string) {
    return this.projects.find((p) => p.id === id);
  }
  async createProject(p: Project) {
    this.projects.push(p);
    return p;
  }

  async listMissions(workspaceId: string) {
    return this.missions
      .filter((m) => m.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getMission(id: string) {
    return this.missions.find((m) => m.id === id);
  }
  async saveMission(m: Mission) {
    const idx = this.missions.findIndex((x) => x.id === m.id);
    if (idx >= 0) this.missions[idx] = m;
    else this.missions.push(m);
    return m;
  }

  async listIntegrations(workspaceId: string) {
    return this.integrations.filter((i) => i.workspaceId === workspaceId);
  }
  async upsertIntegration(i: Integration) {
    const idx = this.integrations.findIndex((x) => x.id === i.id);
    if (idx >= 0) this.integrations[idx] = i;
    else this.integrations.push(i);
    return i;
  }

  async listPayments() {
    return [...this.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async savePayment(p: Payment) {
    const idx = this.payments.findIndex((x) => x.id === p.id);
    if (idx >= 0) this.payments[idx] = p;
    else this.payments.push(p);
    return p;
  }

  async listStellarTx() {
    return [...this.stellarTx].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async saveStellarTx(t: StellarTransaction) {
    this.stellarTx.push(t);
    return t;
  }
  async saveReceipt(r: Receipt) {
    this.receipts.set(r.hash, r);
    return r;
  }
  async getReceipt(hash: string) {
    return this.receipts.get(hash);
  }

  async listAudit(missionId?: string) {
    return this.audit
      .filter((a) => !missionId || a.missionId === missionId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }
  async appendAudit(e: AuditEvent) {
    this.audit.push(e);
    return e;
  }

  async listMemories(scope: Memory["scope"], scopeId: string) {
    return this.memories.filter((m) => m.scope === scope && m.scopeId === scopeId);
  }
  async saveMemory(m: Memory) {
    this.memories.push(m);
    return m;
  }

  async listApiKeys(workspaceId: string) {
    return this.apiKeys.filter((k) => k.workspaceId === workspaceId);
  }
  async createApiKey(k: ApiKey) {
    this.apiKeys.push(k);
    return k;
  }

  async listModelProviders() {
    return this.modelProviders;
  }
  async upsertModelProvider(p: ModelProviderConfig) {
    const idx = this.modelProviders.findIndex((x) => x.provider === p.provider);
    if (idx >= 0) this.modelProviders[idx] = p;
    else this.modelProviders.push(p);
    return p;
  }

  async saveAgentRun(r: AgentRun) {
    this.agentRuns.push(r);
    return r;
  }
  async saveToolRun(r: ToolRun) {
    this.toolRuns.push(r);
    return r;
  }

  async listActivity(filter?: ActivityFilter): Promise<ActivityItem[]> {
    const items: ActivityItem[] = [];
    for (const a of this.audit) {
      if (filter?.mission && a.missionId !== filter.mission) continue;
      items.push({ id: a.id, at: a.at, kind: "audit", actor: a.actor, action: a.action, missionId: a.missionId, detail: a.detail });
    }
    for (const t of this.toolRuns) {
      if (filter?.mission && t.missionId !== filter.mission) continue;
      if (filter?.tool && t.tool !== filter.tool) continue;
      items.push({ id: t.id, at: t.startedAt, kind: "tool", actor: t.tool, action: `tool:${t.status}`, missionId: t.missionId, detail: t });
    }
    for (const p of this.payments) {
      if (filter?.mission && p.missionId !== filter.mission) continue;
      if (filter?.payment === false) continue;
      items.push({ id: p.id, at: p.createdAt, kind: "payment", actor: "stellar", action: `payment:${p.status}`, missionId: p.missionId, detail: p });
    }
    for (const s of this.stellarTx) {
      if (filter?.mission && s.missionId !== filter.mission) continue;
      if (filter?.stellar === false) continue;
      items.push({ id: s.id, at: s.createdAt, kind: "stellar", actor: "stellar", action: `stellar:${s.status}`, missionId: s.missionId, detail: s });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }
}

let instance: Repository | null = null;

export function getMemoryRepository(seedEmail: string): Repository {
  if (!instance) instance = new MemoryRepository(seedEmail);
  return instance;
}
