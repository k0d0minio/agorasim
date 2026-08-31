/**
 * Cancellation tokens — the credential a booking carries so a guest can act on
 * it without an account.
 *
 * **Why a token at all.** `bookings` holds no guest identity by design (see the
 * table note in `db/schema.ts`): names, emails and phone numbers live once, on
 * `tour_requests`. So there is nobody to log in as, and nothing to check a
 * guest against. The token *is* the authentication: an unguessable value the
 * confirmation email carries, and the only thing that unlocks the cancel page.
 *
 * **Shaped like `admin-session.ts`, hashed like `password.ts`.** Web Crypto
 * only — no `node:` imports, no `next/*`, no database — so it runs unchanged in
 * a Server Function, a route handler or a plain Node test. What is stored is a
 * digest, never the token: a leaked `bookings` dump must not be a stack of
 * working cancel links.
 *
 * **HMAC, not scrypt, and that is deliberate.** `password.ts` is memory-hard
 * because a password is low-entropy and guessable offline. A token here is
 * {@link CANCELLATION_TOKEN_BYTES} bytes straight out of the CSPRNG, so there
 * is nothing to guess — brute force is the problem, not the dictionary. A
 * keyed SHA-256 is the right cost: fast enough to run on every request to a
 * public route (scrypt on a public, unauthenticated route would be a denial of
 * service handed to whoever asks for it), and keyed so the digest cannot be
 * recomputed from a database dump alone.
 *
 * **The digest is the lookup key.** The cancel link carries the token and
 * nothing else — no booking id, no reference — so the route hashes what it was
 * given and looks the row up by digest. That only works because the same token
 * always hashes to the same digest, which is why this is an HMAC with a fixed
 * secret and not a salted hash.
 *
 * **`BOOKING_TOKEN_SECRET` is required**, like `ADMIN_SESSION_SECRET`: there is
 * no built-in fallback, so a misconfigured deployment fails closed rather than
 * minting tokens anybody can forge. Rotating it invalidates every live cancel
 * link at once, which is the intended emergency behaviour and the reason it is
 * its own secret rather than a second use of the admin one.
 */

import { secretsMatch } from "@/lib/admin-session";

/**
 * Entropy per token. 32 bytes is what makes the "nothing to guess" claim above
 * true, and is the same order as a Stripe key or a GitHub token.
 */
export const CANCELLATION_TOKEN_BYTES = 32;

/** Marks the digest format, so the hash can be changed without ambiguity. */
const DIGEST_PREFIX = "hmac-sha256";

/** A freshly minted token: the secret to send, and the digest to store. */
export type IssuedCancellationToken = {
  /**
   * The plaintext. **Treat it as a credential**: it belongs in the emailed link
   * and nowhere else — not in a log line, not in an audit `after` payload, not
   * in an error message, and not in the Art. 15 export (it is not personal
   * data; it is a key to somebody's booking).
   */
  token: string;
  /** What goes in `bookings.cancellation_token_hash`. */
  digest: string;
};

const encoder = new TextEncoder();

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The signing key. Required in every environment — see the module note. */
function tokenSecret(): string {
  const value = process.env.BOOKING_TOKEN_SECRET;
  if (!value) {
    throw new Error(
      "BOOKING_TOKEN_SECRET is not set — cancellation tokens cannot be issued.",
    );
  }
  return value;
}

/**
 * Whether the secret is configured, without throwing.
 *
 * The one caller that needs to ask rather than fail is the checkout: a booking
 * that cannot be given a cancel link is still a booking worth taking, so the
 * sale proceeds and the link is what goes missing. Everything on the reading
 * side fails closed instead — no token, no self-serve cancellation.
 */
export function isCancellationTokenConfigured(): boolean {
  return Boolean(process.env.BOOKING_TOKEN_SECRET);
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(tokenSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(signature);
}

/**
 * The stored form of a token: `hmac-sha256$<base64url digest>`.
 *
 * Deterministic, so the cancel route can hash the token out of the URL and look
 * the booking up by the result.
 */
export async function cancellationTokenDigest(token: string): Promise<string> {
  return `${DIGEST_PREFIX}$${await hmac(token)}`;
}

/** Mint a token and its digest. The plaintext is never persisted — see above. */
export async function issueCancellationToken(): Promise<IssuedCancellationToken> {
  const bytes = new Uint8Array(CANCELLATION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  const token = base64UrlEncode(bytes.buffer as ArrayBuffer);
  return { token, digest: await cancellationTokenDigest(token) };
}

/**
 * Whether a value is even shaped like a token, before anything is hashed or
 * queried.
 *
 * Cheap rejection of the traffic a public URL segment attracts — a truncated
 * link, a crawler, a path that is not a token at all — so those never reach the
 * database or the HMAC.
 */
export function looksLikeCancellationToken(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // 32 bytes of base64url, unpadded.
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

/**
 * Check a candidate token against a stored digest.
 *
 * The route resolves a booking by digest equality in SQL; this is the same
 * question asked in constant time, for the paths that already hold the row —
 * and it returns `false`, never throws, for a row whose digest is missing or
 * was written in some other format, so one bad row cannot take the page down.
 */
export async function cancellationTokenMatches(
  candidate: string,
  digest: string | null | undefined,
): Promise<boolean> {
  if (!digest || !digest.startsWith(`${DIGEST_PREFIX}$`)) return false;
  if (!looksLikeCancellationToken(candidate)) return false;
  return secretsMatch(await cancellationTokenDigest(candidate), digest);
}
