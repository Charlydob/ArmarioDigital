import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = path === "/login" || path.startsWith("/api/auth/") || path.startsWith("/_next") || path === "/manifest.webmanifest" || path.startsWith("/icons/");
  if (!isPublic && !request.cookies.get("armario_session")) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!favicon.ico).*)"] };
