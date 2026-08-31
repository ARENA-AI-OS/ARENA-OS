// @arena-os/tool-gateway
// Tool registry, permission checking, and execution dispatch.
// Stub for Prompt 1 — actual tool execution comes in Prompt 2+.

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
  capability: string;
  description: string;
  requiresProvider?: string;
}

export interface ToolRun {
  id: string;
  missionId?: string;
  tool: ToolName;
  input: unknown;
  output?: unknown;
  status: "running" | "success" | "failed" | "denied";
  startedAt: string;
  endedAt?: string;
  error?: string;
}

export const TOOL_REGISTRY: Record<ToolName, ToolSpec> = {
  "github.read_issue": {
    name: "github.read_issue", capability: "github:read_issue",
    description: "Read a GitHub issue by number.", requiresProvider: "github",
  },
  "github.create_branch": {
    name: "github.create_branch", capability: "github:create_branch",
    description: "Create a branch from the default branch.", requiresProvider: "github",
  },
  "github.modify_files": {
    name: "github.modify_files", capability: "github:write_files",
    description: "Create or update files in the repository.", requiresProvider: "github",
  },
  "github.create_commit": {
    name: "github.create_commit", capability: "github:create_commit",
    description: "Commit staged changes.", requiresProvider: "github",
  },
  "github.create_pr": {
    name: "github.create_pr", capability: "github:create_pull_request",
    description: "Create a pull request.", requiresProvider: "github",
  },
  "github.read_checks": {
    name: "github.read_checks", capability: "github:read_checks",
    description: "Read CI check results for a ref.", requiresProvider: "github",
  },
  "terminal.run": {
    name: "terminal.run", capability: "terminal:run",
    description: "Run a sandboxed terminal command.",
  },
  "supabase.query": {
    name: "supabase.query", capability: "supabase:read_database",
    description: "Execute a read-only Supabase query.", requiresProvider: "supabase",
  },
  "railway.deploy_preview": {
    name: "railway.deploy_preview", capability: "railway:deploy_preview",
    description: "Deploy a preview environment.", requiresProvider: "railway",
  },
  "payment.request": {
    name: "payment.request", capability: "stellar:spend",
    description: "Request an x402 payment.", requiresProvider: "x402",
  },
  "stellar.anchor_receipt": {
    name: "stellar.anchor_receipt", capability: "stellar:submit_transaction",
    description: "Anchor a receipt hash on Stellar.", requiresProvider: "stellar",
  },
};
