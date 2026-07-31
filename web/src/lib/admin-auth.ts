/**
 * Admin authentication — a single shared password gate for the Agorasim team.
 *
 * There are only a couple of operators (Diogo & Rita), so instead of a full
 * user store we gate `/admin` behind one shared password. A successful login
 * mints a signed, expiring session token that is stored in an httpOnly cookie.
 *
 * When we later need per-user accounts, swap the password check for a real
 * user lookup and keep the token/cookie plumbing below.
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
 * itself. The proxy stays for navigation; this is the check that authorizes.
 *
 * Implementation notes:
 * - Uses Web Crypto (`globalThis.crypto`) only, so it runs unchanged in Proxy
 *   (Node runtime) and in Server Functions — no `node:` imports.
 * - `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` are required in every
 *   environment, including local development: there are no built-in fallbacks,
 *   so a misconfigured deployment fails closed instead of accepting a password
 *   that is public in this repo's history. See `.env.example`.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "agorasim_admin_session";

/** Session lifetime: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Token format marker, so the payload can grow without breaking verification. */
const TOKEN_VERSION = 1;

/** A verified admin session, decoded from the cookie. */
export type AdminSession = {
  /** Random per-login id. Unique per session, so tokens are never identical. */
  sid: string;
  /** Issued-at, seconds since the epoch. */
  issuedAt: number;
  /** Expiry, seconds since the epoch. */
  expiresAt: number;
};

/** Payload as it is serialized inside the token. */
type SessionPayload = {
  v: number;
  sid: string;
  iat: number;
  exp: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — the admin area is disabled.`);
  }
  return value;
}

/** The shared admin password. Required in every environment. */
function adminPassword(): string {
  return requiredEnv("ADMIN_PASSWORD");
}

/** Secret used to sign session tokens. Required in every environment. */
function sessionSecret(): string {
  return requiredEnv("ADMIN_SESSION_SECRET");
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncode(encoder.encode(value).buffer as ArrayBuffer);
}

function base64UrlDecodeText(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return base64UrlEncode(signature);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64UrlEncode(digest);
}

/**
 * Constant-time comparison of two equal-length strings. Callers must only pass
 * fixed-length values (digests, HMACs) — the early return on a length mismatch
 * would otherwise leak the length of the secret.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Compare two secrets without leaking their length: hash both to fixed-length
 * SHA-256 digests first, then compare those in constant time. Comparing the raw
 * strings would return early whenever the lengths differ, which tells an
 * attacker how long the real value is.
 */
export async function secretsMatch(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)]);
  return constantTimeEqual(digestA, digestB);
}

/** Check a submitted password against the configured shared password. */
export async function isValidPassword(candidate: string): Promise<boolean> {
  return secretsMatch(candidate, adminPassword());
}

/**
 * Mint a signed session token valid for {@link SESSION_MAX_AGE_SECONDS}.
 *
 * The payload carries a random session id and an issued-at alongside the expiry,
 * so two logins in the same second produce different tokens and every session is
 * individually identifiable. Adding revocation later ("sign out everywhere")
 * means storing/denylisting `sid` in {@link verifySessionToken} — the token
 * format does not need to change.
 */
export async function createSessionToken(): Promise<string> {
  const issuedAt = nowSeconds();
  const payload: SessionPayload = {
    v: TOKEN_VERSION,
    sid: randomSessionId(),
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS,
  };

  const encoded = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await hmac(encoded, sessionSecret());
  return `${encoded}.${signature}`;
}

/**
 * Verify a session token's signature and expiry and return the decoded session,
 * or `null` if it is malformed, tampered with, or expired.
 */
export async function readSessionToken(
  token: string | undefined | null,
): Promise<AdminSession | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = await hmac(encoded, sessionSecret());
  if (!constantTimeEqual(signature, expected)) return null;

  const json = base64UrlDecodeText(encoded);
  if (!json) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isSessionPayload(payload)) return null;
  if (payload.v !== TOKEN_VERSION) return null;
  if (payload.exp <= nowSeconds()) return null;

  return { sid: payload.sid, issuedAt: payload.iat, expiresAt: payload.exp };
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  return (await readSessionToken(token)) !== null;
}

/** Read and verify the session cookie, without redirecting. */
export async function currentSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Assert that the caller holds a valid admin session, redirecting to the login
 * screen if not. This — not `proxy.ts` — is the authorization boundary for
 * anything that reads or writes admin data (see the note at the top of this
 * file).
 *
 * Call it as the first statement of every admin Server Action. `redirect` throws,
 * so nothing after the call runs for an unauthenticated caller.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await currentSession();
  if (!session) {
    console.warn("[admin] rejected an admin action with no valid session");
    redirect("/admin/login");
  }
  return session;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.v === "number" &&
    typeof candidate.sid === "string" &&
    candidate.sid.length > 0 &&
    typeof candidate.iat === "number" &&
    Number.isFinite(candidate.iat) &&
    typeof candidate.exp === "number" &&
    Number.isFinite(candidate.exp)
  );
}

function randomSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer as ArrayBuffer);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
