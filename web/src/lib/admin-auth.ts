/**
 * Admin authentication and authorization — the boundary the admin area is
 * actually defended by.
 *
 * The area used to be one shared password. It is now per-user accounts
 * (`admin_users`), which is what makes the audit log meaningful: "who archived
 * this lead?" has an answer only if sessions name a person.
 *
 * **Where the boundary is.** `proxy.ts` verifies the cookie for `/admin/:path*`
 * and keeps signed-out visitors out of the UI, but it is not the authorization
 * boundary. A Server Action is dispatched by the `Next-Action` header, not by
 * the URL it was POSTed to; which route the framework then runs it against, and
 * therefore whether the proxy matcher sees it at all, is a routing detail we
 * don't control. It only holds while every action lives under a page inside
 * `/admin` — import one into a public page and the proxy never runs.
 *
 * So every action that reads or writes admin data calls {@link requireAdmin}
 * itself, **including the role check**. The proxy stays for navigation; this is
 * the check that authorizes. Roles in particular cannot be enforced there at
 * all: the proxy has no database access, and the token deliberately does not
 * carry the role — a role baked into a 7-day cookie would keep working for a
 * week after someone was demoted or disabled.
 *
 * **Module layout.** Token minting/verification is Web Crypto only and lives in
 * `admin-session.ts`, which is all the proxy imports. This file adds the parts
 * that need a database and `next/headers`:
 *
 *   proxy.ts       → admin-session.ts                    (signature + expiry)
 *   server actions → admin-auth.ts → admin-users.ts, db  (identity + role)
 */
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { AdminRole } from "@/db/schema";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionToken,
  type AdminSession,
} from "@/lib/admin-session";
import { findAdminUserById, type AdminUserSummary } from "@/lib/admin-users";

/** Where an authenticated-but-unauthorized operator is sent. */
export const ADMIN_FORBIDDEN_PATH = "/admin/forbidden";

/**
 * Role ranking. `owner` can do everything a `collaborator` can, so a required
 * role is a floor, not an exact match.
 */
const ROLE_RANK: Record<AdminRole, number> = {
  collaborator: 1,
  owner: 2,
};

/**
 * Whether `role` satisfies `required`. Pure, so the policy is testable without a
 * request, a cookie or a database.
 */
export function roleSatisfies(role: AdminRole, required: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Whether an account may act at all, and at `required` if given.
 *
 * Split out of {@link requireAdmin} so the policy — disabled accounts are out,
 * sessions minted before a "sign out everywhere" are out, roles are a floor —
 * can be unit-tested directly.
 */
export function authorize(
  user: AdminUserSummary | null,
  session: Pick<AdminSession, "issuedAt"> | null,
  required?: AdminRole,
): { ok: true } | { ok: false; reason: "no-session" | "unknown-user" | "disabled" | "revoked" | "role" } {
  if (!session) return { ok: false, reason: "no-session" };
  if (!user) return { ok: false, reason: "unknown-user" };
  if (user.disabledAt) return { ok: false, reason: "disabled" };

  // "Sign out everywhere": any token issued before the account's watermark is
  // dead, whatever its signature says. Seconds vs. milliseconds — floor the
  // watermark so a token minted in the same second as the reset is not kept.
  const validFrom = Math.floor(user.sessionsValidFrom.getTime() / 1000);
  if (session.issuedAt < validFrom) return { ok: false, reason: "revoked" };

  if (required && !roleSatisfies(user.role, required)) {
    return { ok: false, reason: "role" };
  }

  return { ok: true };
}

/** Read and verify the session cookie's token, without touching the database. */
export async function currentSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * The signed-in operator, or `null` — for server components that want to render
 * differently rather than refuse. Anything that mutates should call
 * {@link requireAdmin} instead, which refuses.
 */
export async function getCurrentUser(): Promise<AdminUserSummary | null> {
  const session = await currentSession();
  if (!session) return null;

  const user = await findAdminUserById(session.userId);
  return authorize(user, session).ok ? user : null;
}

/**
 * Assert that the caller holds a valid admin session — and, when `required` is
 * given, that their account holds at least that role. Returns the operator, so
 * callers have the actor id for the audit log without a second lookup.
 *
 * Call it as the first statement of every admin Server Action and at the top of
 * every admin page. `redirect` throws, so nothing after the call runs for a
 * caller who fails the check:
 *
 * - no/expired/revoked session → the login screen
 * - authenticated, wrong role  → {@link ADMIN_FORBIDDEN_PATH}
 */
export async function requireAdmin(required?: AdminRole): Promise<AdminUserSummary> {
  const session = await currentSession();
  const user = session ? await findAdminUserById(session.userId) : null;
  const decision = authorize(user, session, required);

  if (!decision.ok) {
    console.warn(`[admin] rejected an admin action — ${decision.reason}`);
    // A signed-in operator who simply lacks the role should not be bounced to a
    // login form: they are already logged in, and re-authenticating would not
    // help. Everything else is an authentication problem.
    redirect(decision.reason === "role" ? ADMIN_FORBIDDEN_PATH : "/admin/login");
  }

  // `authorize` returning ok guarantees both are non-null.
  return user!;
}

/** Shorthand for the owner-only surfaces (user management, guest PII). */
export function requireOwner(): Promise<AdminUserSummary> {
  return requireAdmin("owner");
}

/** Write the session cookie for a freshly authenticated account. */
export async function startSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Drop the session cookie on this device. */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
