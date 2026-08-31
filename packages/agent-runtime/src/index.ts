// @arena-os/agent-runtime
// Agent lifecycle management, capability enforcement, and execution context.
// Stub for Prompt 1 — actual agent implementations come in Prompt 2+.

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
  defaultCapabilities: string[];
}

export const AGENT_REGISTRY: Record<AgentRole, AgentSpec> = {
  commander: {
    role: "commander",
    name: "Commander Agent",
    description: "Understands intent, builds the task graph and assigns agents.",
    defaultCapabilities: ["mission:plan", "agent:assign"],
  },
  research: {
    role: "research",
    name: "Research Agent",
    description: "Searches docs, inspects repos and APIs, compares approaches.",
    defaultCapabilities: ["github:read_repository", "github:read_issue", "web:search"],
  },
  code: {
    role: "code",
    name: "Code Agent",
    description: "Inspects, writes and refactors code, prepares pull requests.",
    defaultCapabilities: [
      "github:read_repository", "github:create_branch", "github:write_files",
      "github:create_commit", "github:create_pull_request", "terminal:run",
    ],
  },
  qa: {
    role: "qa",
    name: "QA Agent",
    description: "Runs tests, reviews diffs and verifies requirements.",
    defaultCapabilities: ["github:read_repository", "terminal:run", "github:read_checks"],
  },
  deployment: {
    role: "deployment",
    name: "Deployment Agent",
    description: "Creates previews, inspects deployments and promotes approved ones.",
    defaultCapabilities: ["railway:read_project", "railway:deploy_preview", "railway:read_logs"],
  },
  stellar: {
    role: "stellar",
    name: "Stellar Agent",
    description: "Inspects wallets, prepares and submits Soroban transactions.",
    defaultCapabilities: [
      "stellar:read_wallet", "stellar:prepare_transaction",
      "stellar:submit_transaction", "stellar:spend",
    ],
  },
};
