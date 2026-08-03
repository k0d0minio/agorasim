import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { adminCsp } from "@/lib/security-headers";

/**
 * Two jobs on `/admin`, and only one of them is a security boundary.
 *
 * **1. Gate navigation behind a session cookie.** The login page must stay
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
 *
 * **2. Mint the CSP nonce.** A nonce has to be unique per request and has to
 * reach the renderer, so it can only be made here. Next reads it back off the
 * request's own `Content-Security-Policy` header during SSR and attaches it to
 * every script it emits, which is why the header is set on the request as well
 * as the response. `next.config.ts` deliberately does not send a CSP for
 * `/admin`, so nothing competes with this one.
 *
 * The nonce is attached to *every* response this function returns, including the
 * redirect to the login screen — a redirect still has a body in some clients,
 * and a path that skipped the header would be a path with no policy at all.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = adminCsp(nonce);

  // Next extracts the nonce from the CSP on the *request* when it renders.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withCsp = <T extends NextResponse>(response: T): T => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  // The login screen is the one admin path that must work while signed out.
  if (pathname === "/admin/login") {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Not authenticated → send to login, remembering where they were headed.
  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("next", pathname);
  }
  return withCsp(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: "/admin/:path*",
};
