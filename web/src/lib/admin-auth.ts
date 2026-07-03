/**
 * Admin authentication — a single shared password gate for the Agorasim team.
 *
 * There are only a couple of operators (Diogo & Rita), so instead of a full
 * user store we gate `/admin` behind one shared password. A successful login
 * mints a signed, expiring session token that is stored in an httpOnly cookie
 * and verified on every request by `proxy.ts`.
 *
 * When we later need per-user accounts, swap the password check for a real
 * user lookup and keep the token/cookie plumbing below.
 *
 * Implementation notes:
 * - Uses Web Crypto (`globalThis.crypto`) only, so it runs unchanged in Proxy
 *   (Node runtime) and in Server Functions — no `node:` imports.
 * - The token is `${expiresAt}.${hmac(expiresAt)}`; we never store the password
 *   itself in the cookie.
 */

export const ADMIN_SESSION_COOKIE = "agorasim_admin_session";

/** Session lifetime: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Dev-only fallbacks so the admin area is usable before env vars are set. */
const DEV_PASSWORD = "agorasim";
const DEV_SECRET = "dev-insecure-secret-change-me";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** The shared admin password. Required in production. */
function adminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (value) return value;
  if (isProduction()) {
    throw new Error("ADMIN_PASSWORD is not set — the admin area is disabled.");
  }
  return DEV_PASSWORD;
}

/** Secret used to sign session tokens. Required in production. */
function sessionSecret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value) return value;
  if (isProduction()) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set — the admin area is disabled.",
    );
  }
  return DEV_SECRET;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

/** Constant-time string comparison to avoid leaking length/content via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Check a submitted password against the configured shared password. */
export function isValidPassword(candidate: string): boolean {
  return timingSafeEqual(candidate, adminPassword());
}

/** Mint a signed session token valid for {@link SESSION_MAX_AGE_SECONDS}. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = String(nowSeconds() + SESSION_MAX_AGE_SECONDS);
  const signature = await hmac(expiresAt, sessionSecret());
  return `${expiresAt}.${signature}`;
}

/** Verify a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  const expected = await hmac(expiresAt, sessionSecret());
  if (!timingSafeEqual(signature, expected)) return false;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return false;
  return expiry > nowSeconds();
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
