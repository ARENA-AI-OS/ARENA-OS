import type { ToolName, ToolSpec } from "@domain/index";

// Tool registry. Every external action flows through a registered tool so it
// can be permission-checked, validated, audited and (optionally) mocked.
export const TOOL_REGISTRY: Record<ToolName, ToolSpec> = {
  "github.read_issue": {
    name: "github.read_issue",
    capability: "github:read_issue",
    description: "Read a GitHub issue by number.",
    requiresProvider: "github",
  },
  "github.create_branch": {
    name: "github.create_branch",
    capability: "github:create_branch",
    description: "Create a branch from the default branch.",
    requiresProvider: "github",
  },
  "github.modify_files": {
    name: "github.modify_files",
    capability: "github:write_files",
    description: "Create or update files in the repository.",
    requiresProvider: "github",
  },
  "github.create_commit": {
    name: "github.create_commit",
    capability: "github:create_commit",
    description: "Commit staged changes.",
    requiresProvider: "github",
  },
  "github.create_pr": {
    name: "github.create_pr",
    capability: "github:create_pull_request",
    description: "Open a pull request.",
    requiresProvider: "github",
  },
  "github.read_checks": {
    name: "github.read_checks",
    capability: "github:read_checks",
    description: "Read CI check status for a ref.",
    requiresProvider: "github",
  },
  "terminal.run": {
    name: "terminal.run",
    capability: "terminal:run",
    description: "Run a controlled command in the project sandbox.",
  },
  "supabase.query": {
    name: "supabase.query",
    capability: "supabase:read_database",
    description: "Run a read-only SQL query.",
    requiresProvider: "supabase",
  },
  "railway.deploy_preview": {
    name: "railway.deploy_preview",
    capability: "railway:deploy_preview",
    description: "Trigger a preview deployment.",
    requiresProvider: "railway",
  },
  "payment.request": {
    name: "payment.request",
    capability: "stellar:spend",
    description: "Request an x402 payment for a paid API.",
    requiresProvider: "x402",
  },
  "stellar.anchor_receipt": {
    name: "stellar.anchor_receipt",
    capability: "stellar:submit_transaction",
    description: "Anchor a mission receipt hash on Soroban.",
    requiresProvider: "stellar",
  },
};

export function listToolSpecs(): ToolSpec[] {
  return Object.values(TOOL_REGISTRY);
}
