"use server";

import { cancellationContent } from "@/content/cancellation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { cancelBooking } from "@/lib/booking-cancellation";
import { looksLikeCancellationToken } from "@/lib/cancellation-token";
import { listCatalogue } from "@/lib/experience-catalogue";
import { formatPrice } from "@/lib/money";
import { CANCEL_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

/**
 * What the page renders after the button has been pressed.
 *
 * `done` carries the formatted total because the success panel states the
 * refund amount, and by the time it renders the booking is gone from the
 * page's own lookup — the token that fetched it has been spent.
 */
export type CancelState = {
  done?: boolean;
  /** "€340", in the guest's language. Only present on success. */
  total?: string;
  /** A finished sentence, already translated. */
  error?: string;
  /** Set when the window closed under the guest — the page re-renders the refusal. */
  tooLate?: boolean;
};

/**
 * The one write this route can perform.
 *
 * **A Server Function, not a GET**, which is the point: everything the page
 * does on render is a read, and the irreversible half happens only when a
 * person submits a form. A mail client prefetching the URL, a crawler, a link
 * preview in WhatsApp — all of them render the page and none of them can
 * cancel anything.
 *
 * The token arrives in the form body rather than being read from the path,
 * because a Server Function has no route params of its own. It is re-validated
 * and re-resolved by {@link cancelBooking} regardless: what the browser posts
 * is whatever the person posting it wants, and the check that counts is the one
 * next to the write.
 */
export async function cancelBookingAction(
  _prevState: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const token = String(formData.get("token") ?? "");
  const c = cancellationContent;

  // Shape first, so a junk post costs nothing but a string test.
  if (!looksLikeCancellationToken(token)) {
    return { error: t(c.errors.failed, locale) };
  }

  const ip = await clientIp();
  const throttle = await rateLimit(`cancel:${ip}`, CANCEL_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(`[cancel] throttled ${ip} — retry in ${throttle.retryAfterSeconds}s`);
    return { error: t(c.errors.rateLimited, locale) };
  }

  const catalogue = await listCatalogue();

  const outcome = await cancelBooking({
    token,
    catalogue: new Map(catalogue.map((entry) => [entry.slug, entry])),
  });

  switch (outcome.status) {
    case "cancelled":
      return {
        done: true,
        // What actually went back, not what the booking cost: they differ if
        // the team had already refunded part of it by hand, and the sentence
        // the guest reads must be about their money, not about the price list.
        total: formatPrice(outcome.refundedCents, locale, outcome.booking.currency),
      };
    case "too-late":
      return { tooLate: true };
    case "unavailable":
      // The link went stale between render and submit — most often a double
      // tap where the first one won. Nothing is wrong, so nothing alarming is
      // said; the neutral page covers it.
      return { error: t(c.unknown.lead, locale) };
    default:
      return { error: t(c.errors.failed, locale) };
  }
}
