/**
 * The admin account store — every read and write of `admin_users` goes through
 * here, so password handling and the "disabled, not deleted" rule live in one
 * place instead of being re-implemented per action.
 *
 * Two invariants this module owns:
 *
 * - **A password never leaves.** {@link AdminUserSummary} is what callers get
 *   back; `passwordHash` is stripped at the boundary so it cannot be leaked
 *   into a server-component payload by accident.
 * - **Email is the identity, lower-cased.** Postgres string comparison is
 *   case-sensitive, so `Rita@…` and `rita@…` would otherwise be two accounts.
 *   Normalization happens here, on the way in and on the way out.
 *
 * Server-only: it touches the database and `node:crypto` via `lib/password.ts`.
 */
import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db, adminUsers, type AdminRole, type AdminUser } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

/** An account as the rest of the app sees it — never carries the password hash. */
export type AdminUserSummary = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
  sessionsValidFrom: Date;
  createdAt: Date;
};

/** Columns to select for an {@link AdminUserSummary}. Excludes `passwordHash`. */
const summaryColumns = {
  id: adminUsers.id,
  email: adminUsers.email,
  name: adminUsers.name,
  role: adminUsers.role,
  lastLoginAt: adminUsers.lastLoginAt,
  disabledAt: adminUsers.disabledAt,
  sessionsValidFrom: adminUsers.sessionsValidFrom,
  createdAt: adminUsers.createdAt,
} as const;

/** Fold an email to its canonical stored form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Every account, active first, then alphabetically. For the users screen. */
export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  return db
    .select(summaryColumns)
    .from(adminUsers)
    .orderBy(sql`${adminUsers.disabledAt} nulls first`, asc(adminUsers.name));
}

/** Look an account up by id. Returns disabled accounts too — callers decide. */
export async function findAdminUserById(
  id: string,
): Promise<AdminUserSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Look an account up by address, normalizing the way {@link verifyCredentials}
 * does. Returns disabled accounts too — callers decide what that means.
 */
export async function findAdminUserByEmail(
  email: string,
): Promise<AdminUserSummary | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizeEmail(email)))
    .limit(1);
  return row ?? null;
}

/** How many accounts can still sign in. Guards the "last owner" checks. */
export async function countActiveOwners(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, "owner"), isNull(adminUsers.disabledAt)));
  return row?.n ?? 0;
}

export type CredentialResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; reason: "unknown" | "wrong-password" | "disabled" };

/**
 * Check an email/password pair.
 *
 * The failure reasons are for the server log, not for the caller to render: the
 * login action collapses all of them into one message, so an attacker cannot use
 * the response to enumerate which addresses exist.
 *
 * An unknown address still pays for a password verification against a dummy
 * hash, so "no such user" and "wrong password" take comparable time.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<CredentialResult> {
  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizeEmail(email)))
    .limit(1);

  if (!row) {
    await verifyPassword(password, await dummyHash());
    return { ok: false, reason: "unknown" };
  }

  if (!(await verifyPassword(password, row.passwordHash))) {
    return { ok: false, reason: "wrong-password" };
  }

  // Checked after the password, so a disabled account is not distinguishable
  // from an active one by response time alone.
  if (row.disabledAt) return { ok: false, reason: "disabled" };

  return { ok: true, user: toSummary(row) };
}

export type CreateAdminUserInput = {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
};

export type CreateAdminUserResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; reason: "duplicate-email" | "weak-password" };

/** Create an account. Fails rather than overwriting an address already in use. */
export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak-password" };
  }

  const email = normalizeEmail(input.email);
  const [row] = await db
    .insert(adminUsers)
    .values({
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
    })
    .onConflictDoNothing({ target: adminUsers.email })
    .returning(summaryColumns);

  if (!row) return { ok: false, reason: "duplicate-email" };
  return { ok: true, user: row };
}

/**
 * Replace an account's password and revoke every session it currently has.
 *
 * The revocation is not optional: a password change that left old cookies
 * working would not actually lock anyone out, which is the point of changing it.
 */
export async function setAdminUserPassword(
  id: string,
  password: string,
): Promise<{ ok: boolean; reason?: "weak-password" }> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak-password" };
  }

  const now = new Date();
  await db
    .update(adminUsers)
    .set({
      passwordHash: await hashPassword(password),
      sessionsValidFrom: now,
      updatedAt: now,
    })
    .where(eq(adminUsers.id, id));

  return { ok: true };
}

export type ResetPasswordResult =
  | { ok: true; user: AdminUserSummary }
  | { ok: false; reason: "unknown" | "weak-password" };

/**
 * Reset the password of the account at an address — the break-glass path for an
 * operator locked out of `/admin`, driven by `scripts/reset-password.ts`.
 *
 * Keyed by email rather than id because whoever runs it is reading the address
 * off a login screen, not a database row. It resolves to an existing account or
 * fails: unlike {@link ensureSeedOwner} it will never create one, so a mistyped
 * address is an error rather than a second, unnoticed admin.
 *
 * A disabled account is reset rather than refused, and reported back through
 * `user.disabledAt` so the caller can say the password now works but sign-in
 * still does not. Refusing would leave the only recovery path for a disabled
 * owner behind the very screen they cannot reach.
 */
export async function resetAdminUserPasswordByEmail(
  email: string,
  password: string,
): Promise<ResetPasswordResult> {
  const user = await findAdminUserByEmail(email);
  if (!user) return { ok: false, reason: "unknown" };

  const result = await setAdminUserPassword(user.id, password);
  if (!result.ok) return { ok: false, reason: "weak-password" };

  return { ok: true, user };
}

/** Sign an account out of every device by invalidating tokens issued so far. */
export async function revokeAdminUserSessions(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(adminUsers)
    .set({ sessionsValidFrom: now, updatedAt: now })
    .where(eq(adminUsers.id, id));
}

/** Disable an account: no sign-in, existing sessions dropped, row preserved. */
export async function disableAdminUser(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(adminUsers)
    .set({ disabledAt: now, sessionsValidFrom: now, updatedAt: now })
    .where(eq(adminUsers.id, id));
}

/** Re-enable a previously disabled account. The password is unchanged. */
export async function enableAdminUser(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(adminUsers)
    .set({ disabledAt: null, updatedAt: now })
    .where(eq(adminUsers.id, id));
}

/** Record a successful sign-in. Best-effort: never blocks the login. */
export async function touchLastLogin(id: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, id));
  } catch (err) {
    console.error("[admin] could not record last login", err);
  }
}

export type SeedOwnerResult =
  | { ok: true; created: boolean; email: string; userId: string }
  | { ok: false; reason: string };

/**
 * Create the first owner account from environment variables, so a fresh deploy
 * is never locked out of its own admin area.
 *
 * Idempotent by design — it is safe to run on every deploy:
 *
 * - No account with that address → create it as an owner.
 * - Account already there → leave it completely alone. It will not reset a
 *   password, because a seed script that silently rewrote a live operator's
 *   credentials on every deploy would be a backdoor, not a convenience.
 *
 * Used by `scripts/seed-owner.ts`, which the "DB migrate" workflow runs on every
 * deploy. That is now the *only* way a first account comes into being: the login
 * form authenticates against `admin_users` and nothing else.
 */
export async function ensureSeedOwner(input: {
  email: string | undefined;
  name: string | undefined;
  password: string | undefined;
}): Promise<SeedOwnerResult> {
  const email = input.email ? normalizeEmail(input.email) : "";
  if (!email) return { ok: false, reason: "no email configured" };
  if (!input.password) return { ok: false, reason: "no password configured" };
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `password is shorter than ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existing) return { ok: true, created: false, email, userId: existing.id };

  const created = await createAdminUser({
    email,
    name: input.name?.trim() || "Owner",
    password: input.password,
    role: "owner",
  });

  if (!created.ok) return { ok: false, reason: created.reason };
  return { ok: true, created: true, email, userId: created.user.id };
}

function toSummary(row: AdminUser): AdminUserSummary {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    lastLoginAt: row.lastLoginAt,
    disabledAt: row.disabledAt,
    sessionsValidFrom: row.sessionsValidFrom,
    createdAt: row.createdAt,
  };
}

/**
 * A throwaway hash to compare against when the address is unknown, so the
 * "no such account" path costs the same scrypt work as a real check. Computed
 * once per process and cached — hashing it on every miss would be a free way
 * for an attacker to burn our CPU.
 */
let dummyHashPromise: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("a password nobody has, for timing parity");
  return dummyHashPromise;
}
