"use server";

import { isLocale, type Locale } from "@/i18n/config";
import { looksLikeCancellationToken } from "@/lib/cancellation-token";
import { startPaymentLinkCheckout } from "@/lib/payment-link";
import { QUOTE_PAY_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isCheckoutReady, publishableKey } from "@/lib/stripe";

/**
 * The payment-link page's one write: the pay button.
 *
 * Unauthenticated, like the quote page's — the token in the body is the whole
 * of the authorisation, and it is checked where the work happens
 * (`lib/payment-link.ts`). What is here is the request-shaped part: the
 * throttle, handing the page what it needs to show Stripe's form, and turning
 * every other outcome into a state the button can say in a sentence. The pay
 * throttle is the quote page's rule, under its own key.
 */

/** What the browser needs to mount Stripe's form — as at `/reservar`. */
export type EmbeddedLinkPayment = {
  clientSecret: string;
  publishableKey: string;
  stripeAccount: string | null;
};

/** What the pay form renders after a tap. */
export type LinkPayState =
  | { status: "idle" }
  | { status: "payment"; payment: EmbeddedLinkPayment }
  /** Paid a moment ago, or on its way by a delayed method — reload to see it. */
  | { status: "paid" | "awaiting" | "closed" }
  /** Keyed to `paymentLinkContent.refused`. */
  | { status: "refused"; reason: "full" | "unconfigured" | "failed" }
  /** The link stopped working between the render and the tap. */
  | { status: "invalid" };

export async function payLink(
  _prevState: LinkPayState,
  formData: FormData,
): Promise<LinkPayState> {
  const ip = await clientIp();
  const throttle = await rateLimit(`link-pay:${ip}`, QUOTE_PAY_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[link-pay] throttled tap from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { status: "refused", reason: "failed" };
  }

  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "pt";
  const token = String(formData.get("token") ?? "");
  if (!looksLikeCancellationToken(token)) return { status: "invalid" };

  // No session is minted that the browser could not mount, as on the quote page.
  if (!(await isCheckoutReady())) return { status: "refused", reason: "unconfigured" };

  let outcome: Awaited<ReturnType<typeof startPaymentLinkCheckout>>;
  try {
    outcome = await startPaymentLinkCheckout({ token, locale });
  } catch (err) {
    console.error("[link-pay] could not start the payment", err);
    return { status: "refused", reason: "failed" };
  }
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
    case "closed":
      return { status: outcome.status };
    case "full":
    case "unconfigured":
    case "failed":
      return { status: "refused", reason: outcome.status };
    case "not-found":
      return { status: "invalid" };
  }
}
