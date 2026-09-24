"use server";

import { recordOptOut } from "@/lib/email-opt-out";
import { verifyOptOutToken } from "@/lib/email-opt-out-token";
import { OPT_OUT_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

/**
 * The one write the thank-you's opt-out link can make — the page's button.
 *
 * Unauthenticated, like the cancel link: the signed token in the body is the
 * whole of the authorisation, and it is verified here against the secret
 * before anything is written. The GET that rendered the page wrote nothing, so
 * a mail scanner that prefetches the link cannot opt a guest out; only this
 * POST can.
 */

/** What the panel renders. Every branch has copy in `content/opt-out.ts`. */
export type OptOutState =
  | { status: "idle" }
  | { status: "done" }
  /** Malformed, forged — or the secret is missing, which reads the same. */
  | { status: "invalid" }
  | { status: "error"; error: "rateLimited" | "generic" };

export async function optOutFromLink(
  _prevState: OptOutState,
  formData: FormData,
): Promise<OptOutState> {
  const ip = await clientIp();
  const throttle = await rateLimit(`opt-out:${ip}`, OPT_OUT_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(`[opt-out] throttled attempt from ${ip} — retry in ${throttle.retryAfterSeconds}s`);
    return { status: "error", error: "rateLimited" };
  }

  let addressHash: string | null;
  try {
    addressHash = await verifyOptOutToken(String(formData.get("token") ?? ""));
  } catch (err) {
    // EMAIL_OPT_OUT_SECRET is unset: nothing can be verified, and the guest
    // gets the same neutral page a bad link gets.
    console.error("[opt-out] token could not be verified", err);
    return { status: "invalid" };
  }
  if (!addressHash) return { status: "invalid" };

  try {
    // Idempotent — a second press records nothing and still reads as done.
    await recordOptOut(addressHash, "page");
  } catch (err) {
    console.error("[opt-out] recording the opt-out failed", err);
    return { status: "error", error: "generic" };
  }
  return { status: "done" };
}
