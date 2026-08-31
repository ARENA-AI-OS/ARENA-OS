import type { ToolName, ToolSpec } from "@domain/index";

// Tool registry. Every external action flows through a registered tool so it
// can be permission-checked, validated, audited and (optionally) mocked.
// No agent may call an external service directly — only through this gateway.

export const TOOL_REGISTRY: Record<ToolName, ToolSpec> = {
  // ── GitHub ──────────────────────────────────────────────────────────────
  "github.read_issue": {
    name: "github.read_issue",
    capability: "github:read_issue",
    description: "Read a GitHub issue by number.",
    requiresProvider: "github",
  },
  "github.list_repositories": {
    name: "github.list_repositories",
    capability: "github:read_repository",
    description: "List repositories accessible to the authenticated user.",
    requiresProvider: "github",
  },
  "github.read_file": {
    name: "github.read_file",
    capability: "github:read_repository",
    description: "Read a file from a GitHub repository at a given ref.",
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
    description: "Open a pull request. Auto-merge is NEVER enabled.",
    requiresProvider: "github",
  },
  "github.read_checks": {
    name: "github.read_checks",
    capability: "github:read_checks",
    description: "Read CI check status for a ref.",
    requiresProvider: "github",
  },

  // ── Terminal (controlled) ───────────────────────────────────────────────
  "terminal.run": {
    name: "terminal.run",
    capability: "terminal:run",
    description: "Run a controlled, allow-listed command with timeout and audit.",
  },
  "terminal.git_status": {
    name: "terminal.git_status",
    capability: "terminal:run",
    description: "Run git status in the project directory.",
  },
  "terminal.git_diff": {
    name: "terminal.git_diff",
    capability: "terminal:run",
    description: "Run git diff to see staged/unstaged changes.",
  },
  "terminal.run_tests": {
    name: "terminal.run_tests",
    capability: "terminal:run",
    description: "Run the project test suite with structured output.",
  },
  "terminal.run_build": {
    name: "terminal.run_build",
    capability: "terminal:run",
    description: "Run the project build and return exit code.",
  },
  "terminal.install_deps": {
    name: "terminal.install_deps",
    capability: "terminal:run",
    description: "Install project dependencies.",
  },

  // ── Supabase ────────────────────────────────────────────────────────────
  "supabase.query": {
    name: "supabase.query",
    capability: "supabase:read_database",
    description: "Run a read-only SQL query via PostgREST.",
    requiresProvider: "supabase",
  },
  "supabase.list_tables": {
    name: "supabase.list_tables",
    capability: "supabase:read_database",
    description: "List all tables in the connected Supabase project.",
    requiresProvider: "supabase",
  },
  "supabase.describe_table": {
    name: "supabase.describe_table",
    capability: "supabase:read_database",
    description: "Describe columns, types and constraints of a table.",
    requiresProvider: "supabase",
  },
  "supabase.write_database": {
    name: "supabase.write_database",
    capability: "supabase:write_database",
    description: "Insert or update rows via PostgREST.",
    requiresProvider: "supabase",
  },
  "supabase.delete_record": {
    name: "supabase.delete_record",
    capability: "supabase:destructive",
    description: "Delete rows from a table. Destructive operation.",
    requiresProvider: "supabase",
  },

  // ── Firebase ────────────────────────────────────────────────────────────
  "firebase.read_firestore": {
    name: "firebase.read_firestore",
    capability: "firebase:read_database",
    description: "Read documents from a Firestore collection.",
    requiresProvider: "firebase",
  },
  "firebase.write_firestore": {
    name: "firebase.write_firestore",
    capability: "firebase:write_database",
    description: "Write or update a Firestore document.",
    requiresProvider: "firebase",
  },
  "firebase.list_documents": {
    name: "firebase.list_documents",
    capability: "firebase:read_database",
    description: "List documents in a Firestore collection.",
    requiresProvider: "firebase",
  },
  "firebase.get_project": {
    name: "firebase.get_project",
    capability: "firebase:read_database",
    description: "Get Firebase project configuration and metadata.",
    requiresProvider: "firebase",
  },

  // ── Railway ─────────────────────────────────────────────────────────────
  "railway.list_projects": {
    name: "railway.list_projects",
    capability: "railway:read_project",
    description: "List Railway projects accessible to the token.",
    requiresProvider: "railway",
  },
  "railway.deploy_preview": {
    name: "railway.deploy_preview",
    capability: "railway:deploy_preview",
    description: "Trigger a preview (branch) deployment.",
    requiresProvider: "railway",
  },
  "railway.get_deployment_status": {
    name: "railway.get_deployment_status",
    capability: "railway:read_project",
    description: "Get current deployment status for a Railway service.",
    requiresProvider: "railway",
  },
  "railway.get_logs": {
    name: "railway.get_logs",
    capability: "railway:read_logs",
    description: "Fetch recent logs from a Railway service.",
    requiresProvider: "railway",
  },

  // ── Custom API ──────────────────────────────────────────────────────
  "custom_api.call": {
    name: "custom_api.call",
    capability: "custom_api:can_call",
    description: "Call a registered custom API endpoint through the gateway.",
    requiresProvider: undefined,
  },

  // ── Payment / Stellar ───────────────────────────────────────────────────
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

// Input validation schemas for critical tools.
// Returns null if valid, error string if invalid.
export function validateToolInput(tool: ToolName, input: unknown): string | null {
  const i = input as Record<string, unknown>;
  if (!i || typeof i !== "object") return "input must be an object";

  switch (tool) {
    case "github.read_issue":
      if (!i.issueNumber && !i.issue_number) return "missing issueNumber";
      return null;
    case "github.read_file":
      if (!i.path) return "missing path";
      return null;
    case "github.create_branch":
      if (!i.branch) return "missing branch name";
      if (!/^[a-zA-Z0-9_\-/]+$/.test(String(i.branch))) return "invalid branch name";
      return null;
    case "github.create_pr":
      if (!i.branch) return "missing branch";
      if (!i.title) return "missing title";
      return null;
    case "supabase.query":
    case "supabase.write_database":
    case "supabase.delete_record":
      if (!i.query && !i.sql) return "missing query/sql";
      return null;
    case "firebase.read_firestore":
    case "firebase.list_documents":
      if (!i.collection) return "missing collection";
      return null;
    case "firebase.write_firestore":
      if (!i.collection || !i.documentId) return "missing collection or documentId";
      return null;
    case "railway.deploy_preview":
    case "railway.list_projects":
    case "railway.get_deployment_status":
    case "railway.get_logs":
      return null; // These have optional params
    case "terminal.run":
      if (!i.command) return "missing command";
      return null;
    case "terminal.run_tests":
    case "terminal.run_build":
    case "terminal.install_deps":
    case "terminal.git_status":
    case "terminal.git_diff":
      return null; // No required params
    case "custom_api.call":
      if (!i.apiId) return "missing apiId";
      return null;
    default:
      return null;
  }
}
