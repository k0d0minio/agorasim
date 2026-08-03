import { headers } from "next/headers";

/**
 * Best-effort client IP for the current request, used as a rate-limit key.
 *
 * **The headers are tried in order of who set them, not in order of popularity.**
 * That ordering is the whole point of this module:
 *
 * 1. `x-vercel-forwarded-for` is written by Vercel's own edge, after it has
 *    already handled whatever the client sent. A client cannot forge it into the
 *    position we read.
 * 2. `x-real-ip` is set by the proxy immediately in front of us, on Vercel and on
 *    most other platforms — a single value rather than a chain.
 * 3. `x-forwarded-for` is a chain whose *first* entry is the hop furthest from
 *    us, which is to say the one a client had the most opportunity to write.
 *    Reading it first, as this module used to, means a caller who wants a fresh
 *    rate-limit bucket can ask for one by sending a header.
 *
 * None of them is trustworthy enough to be an identity or an access-control
 * input, and nothing here treats them as one: the result keys a throttle, and
 * lands in the audit log as evidence rather than as proof. But a throttle that
 * any client can opt out of is not a throttle, so a platform-set header wins
 * wherever there is one.
 *
 * Falls back to a constant so callers always get a key: with no usable header
 * every caller shares one bucket, which throttles more aggressively rather than
 * silently disabling the limit.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  return pickClientIp((name) => headerList.get(name));
}

/**
 * The header-precedence policy, as a pure function of a header lookup — so it is
 * testable without a request, which is the only reason it is separate.
 */
export function pickClientIp(get: (name: string) => string | null): string {
  // Set by the platform, and only by the platform.
  const vercel = firstHop(get("x-vercel-forwarded-for"));
  if (vercel) return vercel;

  const real = get("x-real-ip")?.trim();
  if (real) return real;

  // Least trustworthy, so last — see the note above.
  const forwarded = firstHop(get("x-forwarded-for"));
  if (forwarded) return forwarded;

  return "unknown";
}

/** Leading entry of a comma-separated forwarding chain. */
function firstHop(chain: string | null): string {
  return chain?.split(",")[0]?.trim() ?? "";
}
