import type {
  AgentRun,
  AgentApiAssignment,
  AgentSlot,
  ApiKey,
  AuditEvent,
  ChatConversation,
  ChatMessage,
  CustomApi,
  CustomApiEndpoint,
  ExhibitionProject,
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

export interface ActivityFilter {
  agent?: string;
  model?: string;
  project?: string;
  tool?: string;
  mission?: string;
  payment?: boolean;
  stellar?: boolean;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "audit" | "tool" | "payment" | "stellar";
  actor: string;
  action: string;
  missionId?: string;
  detail?: unknown;
}

// Single access surface used by the whole application. Swappable backends.
export interface Repository {
  getWorkspace(id: string): Promise<Workspace | undefined>;
  ensureSeedWorkspace(): Promise<Workspace>;

  listProjects(workspaceId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(p: Project): Promise<Project>;

  listMissions(workspaceId: string): Promise<Mission[]>;
  getMission(id: string): Promise<Mission | undefined>;
  saveMission(m: Mission): Promise<Mission>;

  listIntegrations(workspaceId: string): Promise<Integration[]>;
  upsertIntegration(i: Integration): Promise<Integration>;

  listPayments(workspaceId?: string): Promise<Payment[]>;
  savePayment(p: Payment): Promise<Payment>;

  listStellarTx(workspaceId?: string): Promise<StellarTransaction[]>;
  saveStellarTx(t: StellarTransaction): Promise<StellarTransaction>;
  saveReceipt(r: Receipt): Promise<Receipt>;
  getReceipt(hash: string): Promise<Receipt | undefined>;

  listAudit(missionId?: string): Promise<AuditEvent[]>;
  appendAudit(e: AuditEvent): Promise<AuditEvent>;

  listMemories(scope: Memory["scope"], scopeId: string): Promise<Memory[]>;
  saveMemory(m: Memory): Promise<Memory>;

  listApiKeys(workspaceId: string): Promise<ApiKey[]>;
  createApiKey(k: ApiKey): Promise<ApiKey>;

  listModelProviders(): Promise<ModelProviderConfig[]>;
  upsertModelProvider(p: ModelProviderConfig): Promise<ModelProviderConfig>;

  saveAgentRun(r: AgentRun): Promise<AgentRun>;
  saveToolRun(r: ToolRun): Promise<ToolRun>;

  // Custom API Registry
  listCustomApis(workspaceId: string): Promise<CustomApi[]>;
  getCustomApi(id: string): Promise<CustomApi | undefined>;
  saveCustomApi(api: CustomApi): Promise<CustomApi>;
  deleteCustomApi(id: string): Promise<void>;

  listCustomApiEndpoints(apiId: string): Promise<CustomApiEndpoint[]>;
  saveCustomApiEndpoint(ep: CustomApiEndpoint): Promise<CustomApiEndpoint>;
  deleteCustomApiEndpoint(id: string): Promise<void>;

  // Agent Slots
  listAgentSlots(): Promise<AgentSlot[]>;
  getAgentSlot(id: string): Promise<AgentSlot | undefined>;
  saveAgentSlot(slot: AgentSlot): Promise<AgentSlot>;
  deleteAgentSlot(id: string): Promise<void>;

  // Agent-API Assignments
  listAgentApiAssignments(agentId?: string): Promise<AgentApiAssignment[]>;
  getAgentApiAssignment(id: string): Promise<AgentApiAssignment | undefined>;
  saveAgentApiAssignment(a: AgentApiAssignment): Promise<AgentApiAssignment>;
  deleteAgentApiAssignment(id: string): Promise<void>;

  // Chat Conversations
  listChatConversations(workspaceId: string): Promise<ChatConversation[]>;
  getChatConversation(id: string): Promise<ChatConversation | undefined>;
  saveChatConversation(c: ChatConversation): Promise<ChatConversation>;
  deleteChatConversation(id: string): Promise<void>;

  // Chat Messages
  listChatMessages(conversationId: string): Promise<ChatMessage[]>;
  saveChatMessage(m: ChatMessage): Promise<ChatMessage>;

  // Platform Connections
  listPlatformConnections(workspaceId: string): Promise<PlatformConnection[]>;
  getPlatformConnection(id: string): Promise<PlatformConnection | undefined>;
  savePlatformConnection(p: PlatformConnection): Promise<PlatformConnection>;
  deletePlatformConnection(id: string): Promise<void>;

  // Exhibition Projects
  listExhibitionProjects(workspaceId: string, featuredOnly?: boolean): Promise<ExhibitionProject[]>;
  getExhibitionProject(id: string): Promise<ExhibitionProject | undefined>;
  saveExhibitionProject(p: ExhibitionProject): Promise<ExhibitionProject>;
  deleteExhibitionProject(id: string): Promise<void>;

  listActivity(filter?: ActivityFilter): Promise<ActivityItem[]>;
}
