import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/security/session-core";

// Protects pages: redirects unauthenticated users to /login.
// API routes handle their own 401 responses.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api") || pathname === "/login") return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
