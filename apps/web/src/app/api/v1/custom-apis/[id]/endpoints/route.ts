import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { shortId } from "@core/ids";
import type { CustomApiEndpoint } from "@domain/index";

// GET /api/v1/custom-apis/:id/endpoints -> list endpoints for a custom API
// POST /api/v1/custom-apis/:id/endpoints -> add an endpoint
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const repo = getRepository();
  const endpoints = await repo.listCustomApiEndpoints(id);
  return NextResponse.json({ endpoints });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const repo = getRepository();

  const api = await repo.getCustomApi(id);
  if (!api) return NextResponse.json({ error: "API not found" }, { status: 404 });

  const endpoint: CustomApiEndpoint = {
    id: shortId("EP"),
    customApiId: id,
    name: String(body.name || "Untitled Endpoint"),
    method: (body.method || "GET").toUpperCase(),
    path: String(body.path || "/"),
    description: String(body.description || ""),
    paramSchema: body.paramSchema,
    costXlm: Number(body.costXlm || 0),
  };

  await repo.saveCustomApiEndpoint(endpoint);
  return NextResponse.json({ endpoint });
}
