import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

/**
 * Gate the `/admin` area behind a valid session cookie. Everything else on the
 * (static, public) site is untouched. The login page itself must stay
 * reachable while signed out, so it is explicitly allowed through.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login screen is the one admin path that must work while signed out.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  // Not authenticated → send to login, remembering where they were headed.
  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/admin/:path*",
};
