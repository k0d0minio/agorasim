"use server";

import { isLocale, type Locale } from "@/i18n/config";
import { startQuoteCheckout } from "@/lib/quote-checkout";
import { looksLikeQuoteToken } from "@/lib/quote-token";
import { QUOTE_PAY_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isEmbeddedCheckoutConfigured, publishableKey } from "@/lib/stripe";

/**
 * The quote page's one write: the pay button (D25).
 *
 * Unauthenticated, like the cancel link — the token in the body is the whole
 * of the authorisation, and it is checked where the work happens
 * (`lib/quote-checkout.ts`), not here. What is here is the request-shaped part:
 * the throttle, handing the page what it needs to show Stripe's form, and
 * turning every other outcome into a state the button can say in a sentence.
 */

/**
 * What the browser needs to mount Stripe's form for this instalment — the same
 * three things the booking page is handed (`reservar/checkout-actions.ts`).
 *
 * Only ever in this response, to the tab holding the quote's token. The client
 * secret opens this one session and nothing else; the publishable key is public
 * by design and read at request time so it is this deployment's own
 * (`lib/stripe.ts`); `stripeAccount` is the connected account the session lives
 * on, or `null` on the platform.
 */
export type EmbeddedQuotePayment = {
  clientSecret: string;
  publishableKey: string;
  stripeAccount: string | null;
};

/** What the pay form renders after a tap. */
export type QuotePayState =
  | { status: "idle" }
  /** The payment step: Stripe's form where the button was. */
  | { status: "payment"; payment: EmbeddedQuotePayment }
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

  // No session is minted that the browser could not mount: without a
  // publishable key that agrees with the secret key (or with no Stripe at
  // all) the tap says payment is unavailable — the switch reports why, once —
  // and never falls back to Stripe's own page.
  if (!isEmbeddedCheckoutConfigured()) return { status: "refused", reason: "unconfigured" };

  const outcome = await startQuoteCheckout({ token, locale });

  switch (outcome.status) {
    case "embedded":
      return {
        status: "payment",
        payment: {
          clientSecret: outcome.clientSecret,
          publishableKey: publishableKey(),
          stripeAccount: outcome.stripeAccount,
        },
      };
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
