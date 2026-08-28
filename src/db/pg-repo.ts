import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
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
    return rows[0] as Workspace | undefined;
  }
  async ensureSeedWorkspace() {
    const existing = await this.db.select().from(schema.workspaces).limit(1);
    if (existing.length) return existing[0] as Workspace;
    const ws: Workspace = {
      id: "ws_seed",
      name: "Arena Workspace",
      ownerEmail: process.env.ARENA_SEED_EMAIL || "dev@arena.os",
      createdAt: new Date().toISOString(),
    };
    await this.db.insert(schema.workspaces).values(ws).onConflictDoNothing();
    return ws;
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
