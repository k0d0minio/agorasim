"use server";

import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/config";
import { startQuoteCheckout } from "@/lib/quote-checkout";
import { looksLikeQuoteToken } from "@/lib/quote-token";
import { QUOTE_PAY_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

/**
 * The quote page's one write: the pay button (D25).
 *
 * Unauthenticated, like the cancel link — the token in the body is the whole
 * of the authorisation, and it is checked where the work happens
 * (`lib/quote-checkout.ts`), not here. What is here is the request-shaped part:
 * the throttle, the redirect to Stripe, and turning every other outcome into a
 * state the button can say in a sentence.
 */

/** What the pay form renders after a tap that did not leave for Stripe. */
export type QuotePayState =
  | { status: "idle" }
  /** Paid a moment ago, or on its way by a delayed method — reload to see it. */
  | { status: "paid" | "awaiting" }
  /** Keyed to `quotePageContent.refused`. */
  | { status: "refused"; reason: "unconfigured" | "failed" | "notDue" | "settled" }
  /** The link stopped working between the render and the tap. */
  | { status: "invalid" };

export async function payQuote(
  _prevState: QuotePayState,
  formData: FormData,
): Promise<QuotePayState> {
  const ip = await clientIp();
  const throttle = await rateLimit(`quote-pay:${ip}`, QUOTE_PAY_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[quote-pay] throttled tap from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { status: "refused", reason: "failed" };
  }

  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "pt";
  const token = String(formData.get("token") ?? "");
  if (!looksLikeQuoteToken(token)) return { status: "invalid" };

  const outcome = await startQuoteCheckout({ token, locale });

  // Outside any try: `redirect` works by throwing, and a catch here would
  // swallow the one outcome that is meant to leave the page.
  if (outcome.status === "redirect") redirect(outcome.url);

  switch (outcome.status) {
    case "paid":
    case "awaiting":
      return { status: outcome.status };
    case "not-due":
      return { status: "refused", reason: "notDue" };
    case "settled":
      return { status: "refused", reason: "settled" };
    case "unconfigured":
      return { status: "refused", reason: "unconfigured" };
    case "failed":
      return { status: "refused", reason: "failed" };
    case "not-found":
      return { status: "invalid" };
  }
}
