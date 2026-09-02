"use server";

import { revalidatePath } from "next/cache";

import { isLocale, type Locale } from "@/i18n/config";
import {
  cancelBookingWithToken,
  type GuestCancellationOutcome,
} from "@/lib/booking-cancellation";
import { looksLikeCancellationToken } from "@/lib/cancellation-token";
import { CANCELLATION_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

/**
 * The one write the guest's cancel link can make.
 *
 * Unauthenticated, like the enquiry form and the checkout — the token in the
 * body is the whole of the authorisation, and it is checked where the work
 * happens (`lib/booking-cancellation.ts`) rather than here, so this file cannot
 * drift into a second, weaker copy of the same check.
 *
 * What *is* here is the request-shaped part: the throttle, and turning an
 * outcome into a state the panel can render. Both belong to the boundary; the
 * decision does not.
 */

/** What the panel renders. Every branch has copy in `content/booking.ts`. */
export type GuestCancelState =
  /** Nothing submitted yet. */
  | { status: "idle" }
  /** Cancelled and refunded. `refund` is already formatted for reading. */
  | { status: "done"; refund: string }
  /** The 48-hour window had closed by the time this was submitted. */
  | { status: "too-late"; deadline: string }
  /** Unknown, spent, or already over — the neutral answer. */
  | { status: "unknown" }
  /** Something to say, keyed to `bookingContent.cancellation.errors`. */
  | { status: "error"; error: "rateLimited" | "refundFailed" | "generic" };

/**
 * Cancel a booking from its emailed link.
 *
 * Throttled harder than the public forms are: on the other side of this call is
 * a Stripe refund, and five per address per ten minutes is more than any real
 * guest needs (see `CANCELLATION_RATE_LIMIT`). The throttle is spent *before*
 * the token is looked at, so a rejected caller learns nothing about whether
 * what they sent was a real link.
 */
export async function cancelBookingFromLink(
  _prevState: GuestCancelState,
  formData: FormData,
): Promise<GuestCancelState> {
  const ip = await clientIp();

  const throttle = await rateLimit(`cancel-booking:${ip}`, CANCELLATION_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[cancel] throttled attempt from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { status: "error", error: "rateLimited" };
  }

  const rawLocale = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "pt";
  const token = String(formData.get("token") ?? "");

  // Cheap rejection before the HMAC and the database — and the same neutral
  // answer a real-but-spent token gets, so the two are indistinguishable.
  if (!looksLikeCancellationToken(token)) return { status: "unknown" };

  let outcome: GuestCancellationOutcome;
  try {
    outcome = await cancelBookingWithToken({ token, locale });
  } catch (err) {
    // The module never throws for anything it can report, so this is a database
    // or a network having a bad moment. The guest is asked to try again; the
    // booking is untouched and their link still works.
    console.error("[cancel] guest cancellation failed", err);
    return { status: "error", error: "generic" };
  }

  switch (outcome.status) {
    case "cancelled":
      // The public calendar renders occupancy and is cached hourly. The car is
      // free from the moment the status landed, and a seat nobody can buy back
      // is the bug this prevents — same reasoning as the Sales board's action.
      revalidatePath("/", "layout");
      return { status: "done", refund: outcome.refund };

    case "too-late":
      return { status: "too-late", deadline: outcome.deadline };

    case "unknown":
      return { status: "unknown" };

    case "refund-failed":
      // The seat is free here too, so the calendar still has to be told.
      revalidatePath("/", "layout");
      return { status: "error", error: "refundFailed" };

    case "error":
      return { status: "error", error: "generic" };
  }
}
