import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { ExhibitionProject } from "@domain/index";

// Public GET — featured projects only (no auth required)
export async function GET(req: Request) {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const url = new URL(req.url);
  const featuredOnly = url.searchParams.get("featured") === "true";
  const projects = await repo.listExhibitionProjects(ws.id, featuredOnly);
  return NextResponse.json(projects);
}

// POST — create a featured project (auth required at middleware level)
export async function POST(req: Request) {
  const body = await req.json();
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const project: ExhibitionProject = {
    id: shortId("EXH"),
    workspaceId: ws.id,
    missionId: body.missionId,
    name: body.name,
    description: body.description || "",
    techStack: body.techStack || [],
    repoUrl: body.repoUrl,
    liveUrl: body.liveUrl,
    screenshotUrl: body.screenshotUrl,
    arenaInvolvement: body.arenaInvolvement,
    category: body.category || "other",
    featured: body.featured ?? true,
    sortOrder: body.sortOrder ?? 0,
    receiptHash: body.receiptHash,
    stellarTx: body.stellarTx,
    meta: body.meta || {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await repo.saveExhibitionProject(project);
  return NextResponse.json(project, { status: 201 });
}
