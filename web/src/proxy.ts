import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-session";

/**
 * Gate the `/admin` area behind a valid session cookie. Everything else on the
 * (static, public) site is untouched. The login page itself must stay
 * reachable while signed out, so it is explicitly allowed through.
 *
 * This is navigation-level convenience, not the authorization boundary: it
 * matches on the URL, and Server Actions are dispatched by the `Next-Action`
 * header. Every admin action calls `requireAdmin()` for itself — see
 * `lib/admin-auth.ts`.
 *
 * It checks a token's signature and expiry and nothing else: whether the account
 * still exists, is still enabled, has been signed out everywhere, or holds the
 * role a page needs are database questions, answered by `requireAdmin()`. Hence
 * the import from `admin-session.ts` rather than `admin-auth.ts` — the proxy has
 * no business carrying the Neon driver, and none of these checks would be sound
 * here anyway.
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
