import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { adminCsp } from "@/lib/security-headers";

/**
 * Two jobs on `/admin`, and only one of them is a security boundary.
 *
 * **1. Gate navigation behind a session cookie.** *Navigation* is the operative
 * word — see {@link isServerAction}. The login page must stay reachable while
 * signed out, so it is explicitly allowed through.
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

/**
 * Whether this request is a Server Action call rather than a navigation.
 *
 * Next dispatches actions by POSTing to whatever page the operator is on, with
 * the action id in the `Next-Action` header and the form data in the body. Such
 * a request must never be answered with a redirect: 307 and 308 preserve the
 * method, so the browser re-POSTs the same body at `/admin/login`, which knows
 * nothing about that action id and answers with HTML. Next's client checks the
 * content type, finds no flight payload and no action-redirect header, and
 * throws *"An unexpected response was received from the server."* — the
 * operator gets the admin error screen, and the next navigation drops them on
 * the login form with no explanation.
 *
 * That is the whole bug this guard exists to prevent: a session the proxy
 * declines to verify turned every interaction into a broken error screen
 * instead of a clean sign-in prompt.
 *
 * Letting these through costs nothing. The proxy was never the authorization
 * boundary (see `lib/admin-auth.ts`), and `actions.test.ts` holds every action
 * but `login` to calling `requireAdmin()`/`requireOwner()` as its first
 * statement. An action reached without a session therefore still refuses — via
 * `redirect("/admin/login")`, which Next delivers over the RSC protocol and the
 * client follows properly.
 *
 * Only the header form is recognised, which is deliberate: a no-JS form post
 * carries its action id in the body instead, and is a document navigation that
 * should land on the login screen like any other.
 */
function isServerAction(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}

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

  // A Server Action authorizes itself and must not be redirected — see
  // `isServerAction`. Hand it to Next with the nonce like any other request.
  if (isServerAction(request)) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Say why, once, so a session that stops being accepted in production is a
  // log line rather than a guess. The token itself is never logged.
  console.warn(
    `[admin] proxy turned away ${request.method} ${pathname} — ` +
      (token ? "session token invalid or expired" : "no session cookie"),
  );

  // Not authenticated → send to login, remembering where they were headed.
  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("next", pathname);
  }

  // 303 for anything carrying a body: 307 preserves the method, which would
  // re-send the body to the login screen. GETs keep 307 — there is nothing to
  // re-send, and it is the status a navigation redirect should have.
  const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
  return withCsp(NextResponse.redirect(loginUrl, status));
}

export const config = {
  matcher: "/admin/:path*",
};
