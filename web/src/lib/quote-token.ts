/**
 * Quote links — the credential a sent quote carries so a couple can open it
 * without an account.
 *
 * The same construction as the booking cancel link (`lib/cancellation-token.ts`,
 * whose note is the reasoning): 32 bytes from the CSPRNG, base64url, and only a
 * keyed digest stored — `quotes.access_token_hash`. The plaintext exists in one
 * place, the `quote-sent` email, and belongs nowhere else: not a log line, not
 * an audit payload, not an error, not the Art. 15 export.
 *
 * **One secret, two domains.** It is keyed with `BOOKING_TOKEN_SECRET` — no new
 * environment variable to provision in three places — but what is signed is
 * `quote:<token>`, never the bare token. A quote link pasted into the cancel
 * route therefore digests to something no booking holds, and the reverse; the
 * two kinds of link cannot be confused for each other even though they share a
 * key and a shape.
 */
import {
  CANCELLATION_TOKEN_BYTES,
  cancellationTokenDigest,
  isCancellationTokenConfigured,
  looksLikeCancellationToken,
} from "@/lib/cancellation-token";

/** Separates a quote link's digest from a cancel link's under the same key. */
const DOMAIN = "quote:";

/** A freshly minted link: the secret to email, and the digest to store. */
export type IssuedQuoteToken = { token: string; digest: string };

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Whether links can be minted at all on this deployment — the secret is set. */
export function isQuoteTokenConfigured(): boolean {
  return isCancellationTokenConfigured();
}

/** The stored form of a quote token — what `quotes.access_token_hash` holds. */
export async function quoteTokenDigest(token: string): Promise<string> {
  return cancellationTokenDigest(`${DOMAIN}${token}`);
}

/** Mint a token and its digest. The plaintext is never persisted. */
export async function issueQuoteToken(): Promise<IssuedQuoteToken> {
  const bytes = new Uint8Array(CANCELLATION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  const token = base64UrlEncode(bytes);
  return { token, digest: await quoteTokenDigest(token) };
}

/** Whether a URL segment is even shaped like a token, before any hashing. */
export function looksLikeQuoteToken(value: unknown): value is string {
  return looksLikeCancellationToken(value);
}

/**
 * The token segment `proxy.ts` rewrites a dead link to, so `[token]/page.tsx`
 * can answer with a real 404 status via one synchronous check — no second
 * lookup, and no await before `notFound()` for the render to suspend on
 * (`web/src/app/[locale]/orcamento/[token]/page.tsx`; `FAILURE.md` —
 * quote-page-and-deposit-link). `looksLikeQuoteToken` never accepts a value
 * this short, so a live token can never collide with it.
 */
export const DEAD_QUOTE_TOKEN = "invalido";

/**
 * Where the emailed link points: `/pt/orcamento/<token>`.
 *
 * One function so the mail that mints the link and the page that reads it
 * (`quote-flow/quote-page-and-deposit-link`, D25) agree on one string. The
 * token is in the path, not a query string, for the reason the cancel link's
 * is — see `cancellationPath`.
 */
export function quotePath(locale: string, token: string): string {
  return `/${locale}/orcamento/${token}`;
}
