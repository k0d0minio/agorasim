/**
 * Admin session **tokens** — the signed, expiring cookie payload and nothing else.
 *
 * This module is deliberately the narrow half of admin auth:
 *
 * - It is **Web Crypto only** (`globalThis.crypto`), with no `node:` imports, no
 *   `next/*` imports and no database access, so it runs unchanged in `proxy.ts`
 *   and in Server Functions and is unit-testable in plain Node.
 * - It answers "is this token well-formed, unexpired and signed by us?" and
 *   nothing more. Whether the account it names still exists, is still enabled,
 *   still holds the required role, or has been signed out everywhere are all
 *   database questions, and they live in `admin-auth.ts`.
 *
 * That split is the point. `proxy.ts` imports only this file, so gating
 * navigation never drags the Neon driver into the proxy bundle — and, more
 * importantly, nobody can mistake a passing signature check for authorization.
 * See the note at the top of `admin-auth.ts`.
 *
 * `ADMIN_SESSION_SECRET` is required in every environment, including local
 * development: there is no built-in fallback, so a misconfigured deployment
 * fails closed. See `.env.example`.
 */

export const ADMIN_SESSION_COOKIE = "agorasim_admin_session";

/** Session lifetime: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Token format marker.
 *
 * Bumped to 2 when the payload gained `uid`: before per-user accounts a session
 * identified nobody, so a v1 token cannot be mapped onto an account and is
 * rejected outright. The effect is a forced re-login on the release that ships
 * accounts, which is the correct outcome.
 */
const TOKEN_VERSION = 2;

/** A verified admin session, decoded from the cookie. */
export type AdminSession = {
  /** The `admin_users.id` this session was minted for. */
  userId: string;
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
  uid: string;
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

/**
 * Mint a signed session token for `userId`, valid for
 * {@link SESSION_MAX_AGE_SECONDS}.
 *
 * The payload carries the account id, a random session id and an issued-at
 * alongside the expiry. `iat` is what makes "sign out everywhere" a one-column
 * change: `requireAdmin()` rejects any token issued before the account's
 * `sessionsValidFrom`, so revoking every live session is a single UPDATE and
 * needs no server-side session table.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const issuedAt = nowSeconds();
  const payload: SessionPayload = {
    v: TOKEN_VERSION,
    uid: userId,
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
 *
 * This says nothing about the account — see the module note.
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

  return {
    userId: payload.uid,
    sid: payload.sid,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  return (await readSessionToken(token)) !== null;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.v === "number" &&
    typeof candidate.uid === "string" &&
    candidate.uid.length > 0 &&
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
