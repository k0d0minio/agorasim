/**
 * Opt-out keys and links — the crypto half of the address-level suppression
 * list (`email_opt_outs`, see its note in `db/schema.ts`).
 *
 * **Two HMACs under one secret, domain-separated.** The *address hash* is the
 * row key: HMAC-SHA-256 of the normalised address, so "has this address opted
 * out?" is one lookup for an address we are about to write to, and a dump of
 * the table lists nobody. The *link signature* is a second HMAC over that hash,
 * so the emailed link can carry the hash (and nothing else) and still be
 * unforgeable: without the secret there is no way to produce a valid pair,
 * and there is no address and no booking id in the URL to read.
 *
 * **Stateless on purpose.** Nothing is stored per link, so any code that holds
 * an address can mint its link at any time — the thank-you job does, every
 * morning — and a link keeps working after the enquiry behind it is erased,
 * because it never pointed at the enquiry. (Contrast the cancel link, whose
 * token is stored as a digest and so can be put in a URL only by the code
 * that minted it.)
 *
 * **`EMAIL_OPT_OUT_SECRET` is never rotated.** A new key makes every stored
 * hash unmatchable, which silently re-subscribes everyone who opted out. It is
 * its own secret, not `BOOKING_TOKEN_SECRET`, precisely because *that* one's
 * rotation is its designed emergency behaviour. Without it every function here
 * that needs it throws, and the callers fail closed: the thank-you job sends
 * nothing and the opt-out page shows a neutral error.
 *
 * Web Crypto only — no `node:`, no `next/*`, no database — so it runs in a
 * route handler, a Server Function or a plain test unchanged.
 */

import { secretsMatch } from "@/lib/admin-session";

/** Domain separators: the same secret never signs two meanings of one input. */
const ADDRESS_DOMAIN = "agorasim:email-opt-out:address:";
const LINK_DOMAIN = "agorasim:email-opt-out:link:";

const encoder = new TextEncoder();

/** Whether the secret is set, without throwing — for callers that fail closed. */
export function isOptOutConfigured(): boolean {
  return Boolean(process.env.EMAIL_OPT_OUT_SECRET);
}

function optOutSecret(): string {
  const value = process.env.EMAIL_OPT_OUT_SECRET;
  if (!value) {
    throw new Error("EMAIL_OPT_OUT_SECRET is not set — email opt-outs cannot be checked or recorded.");
  }
  return value;
}

async function hmacBytes(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(optOutSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/**
 * The one normalisation every address goes through before it is hashed —
 * the same as `normalizeEmail` in `lib/admin-users.ts`, restated here so this
 * module stays free of the database that one imports.
 */
export function normaliseAddress(email: string): string {
  return email.trim().toLowerCase();
}

/** `email_opt_outs.address_hash` for an address: 64 hex characters. */
export async function optOutAddressHash(email: string): Promise<string> {
  return toHex(await hmacBytes(ADDRESS_DOMAIN + normaliseAddress(email)));
}

async function linkSignature(addressHash: string): Promise<string> {
  return base64UrlEncode(await hmacBytes(LINK_DOMAIN + addressHash));
}

/**
 * The link token for an address: `<hash, base64url>.<signature, base64url>` —
 * two 43-character halves. Carries the row key and its proof, nothing else.
 */
export async function optOutToken(email: string): Promise<string> {
  const addressHash = await optOutAddressHash(email);
  return `${base64UrlEncode(fromHex(addressHash))}.${await linkSignature(addressHash)}`;
}

/**
 * Whether a value is even shaped like a token, before anything is signed.
 * Cheap rejection of what a public URL segment attracts.
 */
export function looksLikeOptOutToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value);
}

/**
 * The address hash a token vouches for, or `null` for anything malformed or
 * forged. Never throws on bad input; throws only when the secret is unset,
 * which the caller turns into its neutral error.
 */
export async function verifyOptOutToken(token: unknown): Promise<string | null> {
  if (!looksLikeOptOutToken(token)) return null;
  const [hashPart, signaturePart] = token.split(".");
  const hashBytes = base64UrlDecode(hashPart);
  if (hashBytes.length !== 32) return null;
  const addressHash = toHex(hashBytes);
  const expected = await linkSignature(addressHash);
  return (await secretsMatch(expected, signaturePart)) ? addressHash : null;
}

/**
 * Where the emailed link points: `/pt/reserva/deixar-de-receber/<token>`. Like
 * the cancel page, a transactional page reached from an inbox — never in the
 * nav, the sitemap or the hreflang set — and the token rides in the path, not
 * a query string.
 */
export function optOutPath(locale: string, token: string): string {
  return `/${locale}/reserva/deixar-de-receber/${token}`;
}

/** The RFC 8058 one-click endpoint the `List-Unsubscribe` header names. */
export function optOutOneClickPath(token: string): string {
  return `/api/email/opt-out/${token}`;
}
