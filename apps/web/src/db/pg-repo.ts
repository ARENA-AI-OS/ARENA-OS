import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type {
  AgentRun,
  AgentApiAssignment,
  AgentSlot,
  ApiKey,
  AuditEvent,
  ChatConversation,
  ChatMessage,
  CustomApi,
  ExhibitionProject,
  CustomApiEndpoint,
  Integration,
  Memory,
  Mission,
  ModelProviderConfig,
  Payment,
  PlatformConnection,
  Project,
  Receipt,
  StellarTransaction,
  ToolRun,
  Workspace,
} from "@domain/index";
import { newAudit } from "@domain/index";
import type { ActivityFilter, ActivityItem, Repository } from "./repository";

// PostgreSQL-backed repository via Drizzle. Used when ARENA_DB_DRIVER=postgres.
// Falls back to the memory repo for any table read/write that throws, so the
// app degrades gracefully if the schema is not yet applied.

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the postgres driver");
  const sql = postgres(url, { max: 5 });
  return drizzle(sql, { schema });
}

type DB = PostgresJsDatabase<typeof schema>;

export class PgRepository implements Repository {
  private db: DB;
  constructor(db: DB) {
    this.db = db;
  }

  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      console.error("[pg-repo] falling back after error:", (e as Error).message);
      return fallback;
    }
  }

  async getWorkspace(id: string) {
    const rows = await this.db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id));
    return rows[0] as unknown as Workspace | undefined;
  }
  async ensureSeedWorkspace() {
    const existing = await this.db.select().from(schema.workspaces).limit(1);
    if (existing.length) return existing[0] as unknown as Workspace;
    const email = process.env.ARENA_SEED_EMAIL || "dev@arena.os";
    const ws = {
      id: "ws_seed",
      name: "Arena Workspace",
      ownerId: `user_${email.replace(/[^a-z0-9]/gi, "_")}`,
      createdAt: new Date(),
    };
    await this.db.insert(schema.workspaces).values(ws as any).onConflictDoNothing();
    return { id: ws.id, name: ws.name, ownerId: ws.ownerId, ownerEmail: email, createdAt: ws.createdAt.toISOString() };
  }

  async listProjects(workspaceId: string) {
    const rows = await this.db.select().from(schema.projects).where(eq(schema.projects.workspaceId, workspaceId));
    return rows as unknown as Project[];
  }
  async getProject(id: string) {
    const rows = await this.db.select().from(schema.projects).where(eqId(schema.projects.id, id));
    return rows[0] as unknown as Project | undefined;
  }
  async createProject(p: Project) {
    await this.db.insert(schema.projects).values(p as any).onConflictDoNothing();
    return p;
  }

  async listMissions(workspaceId: string) {
    const rows = await this.db.select().from(schema.missions).where(eqId(schema.missions.workspaceId, workspaceId));
    return (rows as unknown as Mission[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getMission(id: string) {
    const rows = await this.db.select().from(schema.missions).where(eqId(schema.missions.id, id));
    return rows[0] as unknown as Mission | undefined;
  }
  async saveMission(m: Mission) {
    await this.db.insert(schema.missions).values(m as any).onConflictDoUpdate({ target: schema.missions.id, set: m as any });
    return m;
  }

  async listIntegrations(workspaceId: string) {
    const rows = await this.db.select().from(schema.integrations).where(eqId(schema.integrations.workspaceId, workspaceId));
    return rows as unknown as Integration[];
  }
  async upsertIntegration(i: Integration) {
    await this.db.insert(schema.integrations).values(i as any).onConflictDoUpdate({ target: schema.integrations.id, set: i as any });
    return i;
  }

  async listPayments() {
    const rows = await this.db.select().from(schema.payments);
    return (rows as unknown as Payment[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async savePayment(p: Payment) {
    await this.db.insert(schema.payments).values(p as any).onConflictDoUpdate({ target: schema.payments.id, set: p as any });
    return p;
  }

  async listStellarTx() {
    const rows = await this.db.select().from(schema.stellarTransactions);
    return (rows as unknown as StellarTransaction[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async saveStellarTx(t: StellarTransaction) {
    await this.db.insert(schema.stellarTransactions).values(t as any).onConflictDoNothing();
    return t;
  }
  async saveReceipt(r: Receipt) {
    await this.db.insert(schema.receipts).values(r as any).onConflictDoNothing();
    return r;
  }
  async getReceipt(hash: string) {
    const rows = await this.db.select().from(schema.receipts).where(eqId(schema.receipts.hash, hash));
    return rows[0] as unknown as Receipt | undefined;
  }

  async listAudit(missionId?: string) {
    const rows = await this.db.select().from(schema.auditEvents);
    return (rows as unknown as AuditEvent[])
      .filter((a) => !missionId || a.missionId === missionId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }
  async appendAudit(e: AuditEvent) {
    await this.db.insert(schema.auditEvents).values(e as any).onConflictDoNothing();
    return e;
  }

  async listMemories(scope: Memory["scope"], scopeId: string) {
    const rows = await this.db.select().from(schema.memories).where(eqId(schema.memories.scopeId, scopeId));
    return rows.filter((m) => (m as unknown as Memory).scope === scope) as unknown as Memory[];
  }
  async saveMemory(m: Memory) {
    await this.db.insert(schema.memories).values(m as any).onConflictDoNothing();
    return m;
  }

  async listApiKeys(workspaceId: string) {
    const rows = await this.db.select().from(schema.apiKeys).where(eqId(schema.apiKeys.workspaceId, workspaceId));
    return rows as unknown as ApiKey[];
  }
  async createApiKey(k: ApiKey) {
    await this.db.insert(schema.apiKeys).values(k as any).onConflictDoNothing();
    return k;
  }

  async listModelProviders() {
    const rows = await this.db.select().from(schema.modelProviders);
    return (rows as unknown as ModelProviderConfig[]);
  }
  async upsertModelProvider(p: ModelProviderConfig) {
    await this.db.insert(schema.modelProviders).values(p as any).onConflictDoUpdate({ target: schema.modelProviders.provider, set: p as any });
    return p;
  }

  async saveAgentRun(r: AgentRun) {
    await this.db.insert(schema.agentRuns).values(r as any).onConflictDoNothing();
    return r;
  }
  async saveToolRun(r: ToolRun) {
    await this.db.insert(schema.toolRuns).values(r as any).onConflictDoNothing();
    return r;
  }

  async listActivity(filter?: ActivityFilter): Promise<ActivityItem[]> {
    const items: ActivityItem[] = [];
    const audit = await this.listAudit(filter?.mission);
    for (const a of audit) items.push({ id: a.id, at: a.at, kind: "audit", actor: a.actor, action: a.action, missionId: a.missionId, detail: a.detail });
    const tools = await this.db.select().from(schema.toolRuns);
    for (const t of tools as unknown as ToolRun[]) {
      if (filter?.mission && t.missionId !== filter.mission) continue;
      if (filter?.tool && t.tool !== filter.tool) continue;
      items.push({ id: t.id, at: t.startedAt, kind: "tool", actor: t.tool, action: `tool:${t.status}`, missionId: t.missionId, detail: t });
    }
    const payments = await this.listPayments();
    for (const p of payments) {
      if (filter?.mission && p.missionId !== filter.mission) continue;
      if (filter?.payment === false) continue;
      items.push({ id: p.id, at: p.createdAt, kind: "payment", actor: "stellar", action: `payment:${p.status}`, missionId: p.missionId, detail: p });
    }
    const stellar = await this.listStellarTx();
    for (const s of stellar) {
      if (filter?.mission && s.missionId !== filter.mission) continue;
      if (filter?.stellar === false) continue;
      items.push({ id: s.id, at: s.createdAt, kind: "stellar", actor: "stellar", action: `stellar:${s.status}`, missionId: s.missionId, detail: s });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }

  // ── Custom API Registry ──────────────────────────────────────────────
  async listCustomApis(workspaceId: string) {
    return this.safe(async () => {
      const rows = await this.db.select().from(schema.customApis).where(eqId(schema.customApis.workspaceId, workspaceId));
      return rows as unknown as CustomApi[];
    }, []);
  }
  async getCustomApi(id: string) {
    const rows = await this.db.select().from(schema.customApis).where(eqId(schema.customApis.id, id));
    return rows[0] as unknown as CustomApi | undefined;
  }
  async saveCustomApi(api: CustomApi) {
    await this.db.insert(schema.customApis).values(api as any).onConflictDoUpdate({ target: schema.customApis.id, set: api as any });
    return api;
  }
  async deleteCustomApi(id: string) {
    await this.db.delete(schema.customApis).where(eqId(schema.customApis.id, id));
  }

  async listCustomApiEndpoints(apiId: string) {
    return this.safe(async () => {
      const rows = await this.db.select().from(schema.customApiEndpoints).where(eqId(schema.customApiEndpoints.customApiId, apiId));
      return rows as unknown as CustomApiEndpoint[];
    }, []);
  }
  async saveCustomApiEndpoint(ep: CustomApiEndpoint) {
    await this.db.insert(schema.customApiEndpoints).values(ep as any).onConflictDoUpdate({ target: schema.customApiEndpoints.id, set: ep as any });
    return ep;
  }
  async deleteCustomApiEndpoint(id: string) {
    await this.db.delete(schema.customApiEndpoints).where(eqId(schema.customApiEndpoints.id, id));
  }

  // ── Agent Slots ──────────────────────────────────────────────────────
  async listAgentSlots() {
    return this.safe(async () => {
      const rows = await this.db.select().from(schema.agentSlots);
      return rows as unknown as AgentSlot[];
    }, []);
  }
  async getAgentSlot(id: string) {
    const rows = await this.db.select().from(schema.agentSlots).where(eqId(schema.agentSlots.id, id));
    return rows[0] as unknown as AgentSlot | undefined;
  }
  async saveAgentSlot(slot: AgentSlot) {
    await this.db.insert(schema.agentSlots).values(slot as any).onConflictDoUpdate({ target: schema.agentSlots.id, set: slot as any });
    return slot;
  }
  async deleteAgentSlot(id: string) {
    await this.db.delete(schema.agentSlots).where(eqId(schema.agentSlots.id, id));
  }

  // ── Agent-API Assignments ────────────────────────────────────────────
  async listAgentApiAssignments(agentId?: string) {
    return this.safe(async () => {
      const rows = agentId
        ? await this.db.select().from(schema.agentApiAssignments).where(eqId(schema.agentApiAssignments.agentId, agentId))
        : await this.db.select().from(schema.agentApiAssignments);
      return rows as unknown as AgentApiAssignment[];
    }, []);
  }
  async getAgentApiAssignment(id: string) {
    const rows = await this.db.select().from(schema.agentApiAssignments).where(eqId(schema.agentApiAssignments.id, id));
    return rows[0] as unknown as AgentApiAssignment | undefined;
  }
  async saveAgentApiAssignment(a: AgentApiAssignment) {
    await this.db.insert(schema.agentApiAssignments).values(a as any).onConflictDoUpdate({ target: schema.agentApiAssignments.id, set: a as any });
    return a;
  }
  async deleteAgentApiAssignment(id: string) {
    await this.db.delete(schema.agentApiAssignments).where(eqId(schema.agentApiAssignments.id, id));
  }

  // Chat Conversations
  async listChatConversations(workspaceId: string) {
    return (await this.db.select().from(schema.chatConversations).where(eq(schema.chatConversations.workspaceId, workspaceId)) as any[]).map(this.toChatConversation);
  }
  async getChatConversation(id: string) {
    const rows = await this.db.select().from(schema.chatConversations).where(eq(schema.chatConversations.id, id));
    return rows[0] ? this.toChatConversation(rows[0]) : undefined;
  }
  async saveChatConversation(c: ChatConversation) {
    await this.db.insert(schema.chatConversations).values(c as any).onConflictDoUpdate({ target: schema.chatConversations.id, set: c as any });
    return c;
  }
  async deleteChatConversation(id: string) {
    await this.db.delete(schema.chatMessages).where(eq(schema.chatMessages.conversationId, id));
    await this.db.delete(schema.chatConversations).where(eq(schema.chatConversations.id, id));
  }

  // Chat Messages
  async listChatMessages(conversationId: string) {
    return (await this.db.select().from(schema.chatMessages).where(eq(schema.chatMessages.conversationId, conversationId)) as any[]).map(this.toChatMessage);
  }
  async saveChatMessage(m: ChatMessage) {
    await this.db.insert(schema.chatMessages).values(m as any).onConflictDoUpdate({ target: schema.chatMessages.id, set: m as any });
    return m;
  }

  // Platform Connections
  async listPlatformConnections(workspaceId: string) {
    return (await this.db.select().from(schema.platformConnections).where(eq(schema.platformConnections.workspaceId, workspaceId)) as any[]).map(this.toPlatformConnection);
  }
  async getPlatformConnection(id: string) {
    const rows = await this.db.select().from(schema.platformConnections).where(eq(schema.platformConnections.id, id));
    return rows[0] ? this.toPlatformConnection(rows[0]) : undefined;
  }
  async savePlatformConnection(p: PlatformConnection) {
    await this.db.insert(schema.platformConnections).values(p as any).onConflictDoUpdate({ target: schema.platformConnections.id, set: p as any });
    return p;
  }
  async deletePlatformConnection(id: string) {
    await this.db.delete(schema.platformConnections).where(eq(schema.platformConnections.id, id));
  }

  // Type mappers
  private toChatConversation(r: any): ChatConversation {
    return { ...r, scopes: undefined, createdAt: String(r.createdAt), updatedAt: String(r.updatedAt), lastUsedAt: r.lastUsedAt ? String(r.lastUsedAt) : undefined } as any;
  }
  private toChatMessage(r: any): ChatMessage {
    return { ...r, createdAt: String(r.createdAt) } as any;
  }
  private toPlatformConnection(r: any): PlatformConnection {
    return { ...r, createdAt: String(r.createdAt), lastUsedAt: r.lastUsedAt ? String(r.lastUsedAt) : undefined, lastTestAt: r.lastTestAt ? String(r.lastTestAt) : undefined } as any;
  }

  // Exhibition Projects
  async listExhibitionProjects(workspaceId: string, featuredOnly?: boolean) {
    let rows = await this.db.select().from(schema.exhibitionProjects).where(eq(schema.exhibitionProjects.workspaceId, workspaceId));
    if (featuredOnly) rows = rows.filter((r: any) => r.featured);
    return (rows as any[]).map(this.toExhibitionProject);
  }
  async getExhibitionProject(id: string) {
    const rows = await this.db.select().from(schema.exhibitionProjects).where(eq(schema.exhibitionProjects.id, id));
    return rows[0] ? this.toExhibitionProject(rows[0]) : undefined;
  }
  async saveExhibitionProject(p: ExhibitionProject) {
    await this.db.insert(schema.exhibitionProjects).values(p as any).onConflictDoUpdate({ target: schema.exhibitionProjects.id, set: p as any });
    return p;
  }
  async deleteExhibitionProject(id: string) {
    await this.db.delete(schema.exhibitionProjects).where(eq(schema.exhibitionProjects.id, id));
  }
  private toExhibitionProject(r: any): ExhibitionProject {
    return { ...r, createdAt: String(r.createdAt), updatedAt: String(r.updatedAt) } as any;
  }
}

// small helpers (kept local to avoid schema typing friction)
import { eq } from "drizzle-orm";
function eqId(col: any, val: string) {
  return eq(col, val);
}

let pgInstance: Repository | null = null;
export function getPgRepository(): Repository {
  if (!pgInstance) pgInstance = new PgRepository(client());
  return pgInstance;
}
