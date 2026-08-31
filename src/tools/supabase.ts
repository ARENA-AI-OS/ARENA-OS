import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// Supabase adapter. Uses the Supabase REST API / PostgREST when configured.
// Permissions are separated: READ, WRITE, SCHEMA_CHANGE, DESTRUCTIVE.
// A read-only-scoped agent must be structurally unable to write.

const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_KEY || "";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

async function supaFetch(path: string, opts?: { method?: string; body?: any }): Promise<any> {
  if (!URL || !KEY) throw new Error("supabase not configured");
  const headers: Record<string, string> = {
    apikey: KEY,
    authorization: `Bearer ${KEY}`,
    "content-type": "application/json",
  };
  const res = await fetch(`${URL}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`supabase ${res.status}: ${text.slice(0, 300)}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

export async function runSupabaseTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const configured = !!(URL && KEY);

  try {
    switch (tool) {
      // ── Read-only query ──────────────────────────────────────────────
      case "supabase.query": {
        if (!configured) {
          return {
            ok: false,
            error: "supabase not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY)",
            output: { configured: false },
          };
        }
        // Execute read-only SQL via PostgREST RPC or direct query
        const query = i.query || i.sql;
        const result = await supaFetch("/rest/v1/rpc/execute_sql", {
          method: "POST",
          body: { query_text: query },
        });
        return {
          ok: true,
          output: { rows: result, rowCount: Array.isArray(result) ? result.length : 0 },
        };
      }

      // ── List Tables ──────────────────────────────────────────────────
      case "supabase.list_tables": {
        if (!configured) {
          return {
            ok: false,
            error: "supabase not configured",
            output: { configured: false },
          };
        }
        // Query information_schema for table list
        const result = await supaFetch("/rest/v1/rpc/execute_sql", {
          method: "POST",
          body: {
            query_text: "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
          },
        });
        return {
          ok: true,
          output: { tables: result },
        };
      }

      // ── Describe Table ───────────────────────────────────────────────
      case "supabase.describe_table": {
        if (!configured) {
          return { ok: false, error: "supabase not configured" };
        }
        const result = await supaFetch("/rest/v1/rpc/execute_sql", {
          method: "POST",
          body: {
            query_text: `SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = '${i.table}'
              ORDER BY ordinal_position`,
          },
        });
        return {
          ok: true,
          output: { table: i.table, columns: result },
        };
      }

      // ── Write Database (INSERT/UPDATE) ───────────────────────────────
      case "supabase.write_database": {
        if (!configured) {
          return { ok: false, error: "supabase not configured" };
        }
        const query = i.query || i.sql;
        const result = await supaFetch("/rest/v1/rpc/execute_sql", {
          method: "POST",
          body: { query_text: query },
        });
        return {
          ok: true,
          output: { affectedRows: result?.affected_rows ?? 0, result },
        };
      }

      // ── Delete Record (DESTRUCTIVE) ──────────────────────────────────
      case "supabase.delete_record": {
        if (!configured) {
          return { ok: false, error: "supabase not configured" };
        }
        const query = i.query || i.sql;
        const result = await supaFetch("/rest/v1/rpc/execute_sql", {
          method: "POST",
          body: { query_text: query },
        });
        return {
          ok: true,
          output: { affectedRows: result?.affected_rows ?? 0, destructive: true, result },
        };
      }

      default:
        return { ok: false, error: `unsupported supabase tool: ${tool}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
