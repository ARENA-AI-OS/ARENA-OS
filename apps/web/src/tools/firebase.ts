import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// Firebase adapter. Uses the Firebase REST API when configured.
// All operations are scoped to the project and environment.
// Credentials are read server-side only via process.env.

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const API_KEY = process.env.FIREBASE_API_KEY || "";
const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || "";

function isConfigured(): boolean {
  return !!(PROJECT_ID && (API_KEY || SERVICE_ACCOUNT));
}

async function firebaseFetch(
  path: string,
  opts?: { method?: string; body?: any },
): Promise<any> {
  if (!isConfigured()) throw new Error("firebase not configured");
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  // Use API key for REST calls
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}key=${API_KEY}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`firebase ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Parse Firestore document format to plain object
function parseFirestoreDoc(doc: any): Record<string, unknown> {
  if (!doc?.fields) return {};
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc.fields) as any[]) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
    else if (val.arrayValue?.values) result[key] = val.arrayValue.values.map((v: any) => v.stringValue ?? v.integerValue ?? v);
    else if (val.mapValue?.fields) result[key] = parseFirestoreDoc({ fields: val.mapValue.fields });
    else if (val.nullValue !== undefined) result[key] = null;
  }
  return result;
}

export async function runFirebaseTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;

  try {
    switch (tool) {
      // ── Get Project ──────────────────────────────────────────────────
      case "firebase.get_project": {
        if (!isConfigured()) {
          return {
            ok: false,
            error: "firebase not configured (set FIREBASE_PROJECT_ID + FIREBASE_API_KEY)",
            output: { configured: false },
          };
        }
        return {
          ok: true,
          output: {
            projectId: PROJECT_ID,
            configured: true,
            hasServiceAccount: !!SERVICE_ACCOUNT,
          },
        };
      }

      // ── Read Firestore Document ──────────────────────────────────────
      case "firebase.read_firestore": {
        if (!isConfigured()) {
          return { ok: false, error: "firebase not configured" };
        }
        const docPath = `/${i.collection}/${i.documentId}`;
        const doc = await firebaseFetch(docPath);
        return {
          ok: true,
          output: {
            id: doc.name?.split("/").pop(),
            data: parseFirestoreDoc(doc) as unknown as Json,
            path: doc.name,
          },
        };
      }

      // ── List Documents in Collection ─────────────────────────────────
      case "firebase.list_documents": {
        if (!isConfigured()) {
          return { ok: false, error: "firebase not configured" };
        }
        const pageSize = Math.min(i.limit || 20, 100);
        const listUrl = `/${i.collection}?pageSize=${pageSize}`;
        const result = await firebaseFetch(listUrl);
        const documents = (result.documents ?? []).map((doc: any) => ({
          id: doc.name?.split("/").pop(),
          data: parseFirestoreDoc(doc),
          path: doc.name,
        }));
        return {
          ok: true,
          output: { collection: i.collection, documents, count: documents.length },
        };
      }

      // ── Write Firestore Document ─────────────────────────────────────
      case "firebase.write_firestore": {
        if (!isConfigured()) {
          return { ok: false, error: "firebase not configured" };
        }
        // Convert plain object to Firestore format
        const fields: Record<string, any> = {};
        for (const [key, val] of Object.entries(i.data || {})) {
          if (typeof val === "string") fields[key] = { stringValue: val };
          else if (typeof val === "number") fields[key] = Number.isInteger(val) ? { integerValue: val } : { doubleValue: val };
          else if (typeof val === "boolean") fields[key] = { booleanValue: val };
          else if (val === null) fields[key] = { nullValue: null };
        }
        const docPath = `/${i.collection}/${i.documentId}`;
        const result = await firebaseFetch(docPath, {
          method: "PATCH",
          body: { fields },
        });
        return {
          ok: true,
          output: { id: i.documentId, path: result.name, written: true } as any,
        };
      }

      default:
        return { ok: false, error: `unsupported firebase tool: ${tool}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
