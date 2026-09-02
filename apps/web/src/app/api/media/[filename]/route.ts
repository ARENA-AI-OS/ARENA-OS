import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

// Public media endpoint — no auth required.
// Serves files from the monorepo root public/ directory.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  // Only allow specific safe media files
  const allowed = new Set([
    "background.mp4",
    "intro.mp4",
  ]);
  if (!allowed.has(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // public/ is at monorepo root: /codebase/public/
    // cwd is /codebase/apps/web/, so go up two levels
    const filePath = join(resolve(process.cwd(), "..", ".."), "public", filename);
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
