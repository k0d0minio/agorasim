import { headers } from "next/headers";

/**
 * Best-effort client IP for the current request, used as a rate-limit key.
 *
 * Behind Vercel's proxy `x-forwarded-for` is a comma-separated chain whose first
 * entry is the original client; `x-real-ip` is set by most other proxies. Neither
 * is trustworthy on its own — a client can forge them when the app is reachable
 * without a proxy in front — so treat the result as a throttling key, never as
 * an identity or an access-control input.
 *
 * Falls back to a constant so callers always get a key: with no usable header
 * every caller shares one bucket, which throttles more aggressively rather than
 * silently disabling the limit.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return headerList.get("x-real-ip")?.trim() || "unknown";
}
