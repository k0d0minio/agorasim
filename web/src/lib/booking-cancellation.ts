/**
 * The guest side of a cancellation: what a link unlocks, and what pressing the
 * button does.
 *
 * **Two questions, deliberately separate.** {@link resolveCancellation} answers
 * "whose booking is this and may it still be cancelled?" and writes nothing;
 * {@link cancelBooking} answers "do it" . The page calls the first on every
 * render and the second only from a confirmed POST, which is what keeps a link
 * preview, a crawler, or a mail client that prefetches URLs from cancelling
 * somebody's tour by looking at it.
 *
 * **The order of operations is the whole safety argument.** The row is claimed
 * *before* Stripe is called, with a `status = 'confirmed'` guard — the same
 * trick `confirmPaidBooking` uses. Two taps on the button race; exactly one
 * updates a row; only that one reaches the refund. Doing it the other way round
 * (refund, then write) would mean a database blip between the two leaves a
 * guest refunded and a booking still selling their seat.
 *
 * **The token is spent by the same write.** Setting `cancellation_token_hash`
 * to null is what makes the link single-use, and it happens inside the claiming
 * update rather than after it, so there is no window in which a second request
 * can resolve the same token to a still-confirmed booking.
 *
 * **What is deliberately not here: the fee.** The agreement returns commission
 * in proportion to a refund, and `refund-machinery` (commission-engine) is the
 * ticket that implements it — including the `charge.refunded` webhook that will
 * reconcile the refunds this module issues. Nothing is lost by shipping first:
 * this deployment takes no application fee at all yet (there is no Connect
 * account and no `application_fee_amount` in `lib/booking-checkout.ts`), so
 * there is currently no fee to return. When there is one, the refund call below
 * gains `refund_application_fee: true` and nothing else here moves.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { bookings, db, tourRequests, type Booking } from "@/db";
import type { Experience } from "@/content/experiences";
import type { Locale } from "@/i18n/config";
import { recordAuditOrWarn } from "@/lib/audit";
import { guestCancellationEmail, teamCancellationEmail } from "@/lib/booking-emails";
import { bookingEmailFacts } from "@/lib/booking-facts";
import { bookingRef } from "@/lib/bookings";
import { cancellationWindow, type CancellationWindow } from "@/lib/cancellation";
import {
  cancellationTokenDigest,
  looksLikeCancellationToken,
} from "@/lib/cancellation-token";
import { isEmailConfigured, sendEmail, teamRecipients } from "@/lib/email";
import { isStripeConfigured, stripe } from "@/lib/stripe";

/**
 * What a token resolved to.
 *
 * **`unknown` is one state on purpose.** A token that never existed, one that
 * has been spent, one revoked by a secret rotation, and a booking that was
 * never confirmed all land here, and the page renders them identically. The
 * distinctions are real but they are not the guest's to see: telling whoever is
 * holding a link that it "has already been used" confirms that a booking exists
 * behind it, which is precisely what an unauthenticated route must not do.
 */
export type ResolvedCancellation =
  | {
      kind: "cancellable" | "too-late" | "departed";
      booking: Booking;
      lead: typeof tourRequests.$inferSelect;
      window: CancellationWindow;
    }
  | { kind: "unknown" };

/**
 * Look a token up, without writing anything.
 *
 * Rejects on shape before it hashes or queries — a truncated link or a crawler
 * hitting `/reserva/cancelar/favicon.ico` should cost an HMAC and a round trip
 * to Neon exactly never.
 */
export async function resolveCancellation(
  token: string,
  now: Date = new Date(),
): Promise<ResolvedCancellation> {
  if (!looksLikeCancellationToken(token)) return { kind: "unknown" };

  const digest = await cancellationTokenDigest(token);

  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.cancellationTokenHash, digest))
    .limit(1);

  // A null hash can never match: `cancellationTokenDigest` always returns a
  // prefixed string, and SQL equality against NULL is never true. So a spent
  // token falls out here with no special case.
  if (!row) return { kind: "unknown" };

  // Anything but `confirmed` — already refunded, expired, still pending — has
  // nothing for this route to do, and says so in the neutral voice.
  if (row.status !== "confirmed") return { kind: "unknown" };

  const [lead] = row.tourRequestId
    ? await db
        .select()
        .from(tourRequests)
        .where(eq(tourRequests.id, row.tourRequestId))
        .limit(1)
    : [undefined];

  // No lead means no name, no email and nobody to write to. The booking is real
  // but this route cannot finish the job for it, and a half-done cancellation
  // is worse than a phone call.
  if (!lead) {
    console.error(`[cancel] ${bookingRef(row.id)} has no lead row — cannot self-serve`);
    return { kind: "unknown" };
  }

  const window = cancellationWindow(row, now);
  const kind =
    window.verdict === "free"
      ? "cancellable"
      : window.verdict === "departed"
        ? "departed"
        : // `unknown` from the window means an unparseable date, which is a
          // broken row rather than a policy answer. Refusing is the safe side:
          // it sends the guest to a person who can look at it.
          "too-late";

  return { kind, booking: row, lead, window };
}

export type CancellationOutcome =
  /** Done: refunded, seat freed, emails away. */
  | { status: "cancelled"; booking: Booking; refundId: string | null }
  /** The link stopped being valid between rendering the page and pressing the button. */
  | { status: "unavailable" }
  /** Inside 48 hours, or already departed. */
  | { status: "too-late" }
  /** Our fault. The booking is untouched — see the rollback below. */
  | { status: "failed" };

/**
 * Cancel a booking, refund it in full, and tell both sides.
 *
 * The window is re-checked here rather than trusted from the page: the page was
 * rendered at some point in the past, and a guest who opened it three hours
 * before the deadline and pressed the button after it must be refused. The
 * check that counts is the one adjacent to the write.
 */
export async function cancelBooking(options: {
  token: string;
  /** Names experiences in the two emails. */
  catalogue: Map<string, Experience>;
  /** The `/pt` or `/en` the guest is standing on — see below. */
  pathLocale?: Locale;
  now?: Date;
}): Promise<CancellationOutcome> {
  const { token, catalogue, pathLocale, now = new Date() } = options;

  const resolved = await resolveCancellation(token, now);
  if (resolved.kind === "unknown") return { status: "unavailable" };
  if (resolved.kind !== "cancellable") return { status: "too-late" };

  const { booking, lead } = resolved;

  // Stripe has to be reachable before the row is touched. Marking a booking
  // refunded in a deployment that cannot issue refunds would free the seat and
  // keep the money — the one outcome worse than refusing.
  if (!isStripeConfigured() || !booking.stripePaymentIntentId) {
    console.error(
      `[cancel] ${bookingRef(booking.id)} cannot be refunded — no payment intent or no Stripe`,
    );
    return { status: "failed" };
  }

  /**
   * Claim it. The guard is what makes a double tap safe: the second request
   * finds no `confirmed` row and returns without reaching the refund.
   *
   * The status is `refunded` rather than `cancelled`, and the difference is not
   * cosmetic — `cancelled` in this codebase means a payment that never
   * completed (`closeUnpaidBooking`), while `refunded` means money went out and
   * came back, which is what happened here. Neither holds capacity, so the seat
   * is free either way (`holdsCapacity`, `lib/bookings.ts`); only the books can
   * tell them apart, and the books should be able to.
   */
  const [claimed] = await db
    .update(bookings)
    .set({
      status: "refunded",
      cancelledAt: now,
      cancelledVia: "guest",
      // Spent, in the same write that claims the row.
      cancellationTokenHash: null,
      updatedAt: now,
      ...(pathLocale && pathLocale !== booking.locale ? { locale: pathLocale } : {}),
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
    .returning();

  if (!claimed) return { status: "unavailable" };

  let refundId: string | null = null;
  try {
    const refund = await stripe().refunds.create(
      {
        payment_intent: booking.stripePaymentIntentId,
        // No `amount`: the whole charge. "Free cancellation" is the promise,
        // and a partial refund here would be the site quietly not keeping it.
        reason: "requested_by_customer",
        metadata: { bookingId: booking.id, ref: bookingRef(booking.id), via: "guest" },
      },
      {
        // Two requests that get this far for one booking describe the same
        // refund, not two. Keyed on the booking rather than the attempt, so a
        // retry after a timeout returns the original refund instead of issuing
        // a second one — which is also what makes the rollback below safe.
        idempotencyKey: `cancel-${booking.id}`,
      },
    );
    refundId = refund.id;
  } catch (err) {
    console.error(`[cancel] refund failed for ${bookingRef(booking.id)}`, err);

    /**
     * Put the booking back. The guest is told nothing happened, and nothing
     * did: they still hold a confirmed booking and a working link.
     *
     * Safe against the nastiest case — a timeout that Stripe actually
     * processed — because the idempotency key above means the retry returns
     * that same refund rather than issuing another. The worst outcome is a
     * booking that is refunded at Stripe and confirmed here, which is exactly
     * the state `refund-machinery`'s `charge.refunded` handler exists to
     * reconcile, and which is visible in the dashboard meanwhile.
     */
    await db
      .update(bookings)
      .set({
        status: "confirmed",
        cancelledAt: null,
        cancelledVia: null,
        cancellationTokenHash: booking.cancellationTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .catch((rollbackErr) => {
        // Both failed. Loudly, because now only a person can sort it out.
        console.error(
          `[cancel] ${bookingRef(booking.id)} is marked refunded but was not refunded — needs a human`,
          rollbackErr,
        );
      });

    return { status: "failed" };
  }

  // The lead goes back to "New" rather than to an archived state: somebody who
  // booked and cancelled is still a person who wanted this tour, and the Sales
  // board is where that gets noticed.
  if (claimed.tourRequestId) {
    await db
      .update(tourRequests)
      .set({ status: "new", updatedAt: now })
      .where(eq(tourRequests.id, claimed.tourRequestId))
      .catch((err) => {
        console.error(`[cancel] could not move lead for ${bookingRef(booking.id)}`, err);
      });
  }

  await recordAuditOrWarn({
    // Nobody in the admin pressed this — the guest did, holding a token. The
    // actor is null for the same reason it is on Stripe's own events.
    actorUserId: null,
    action: "booking.cancelled_by_guest",
    entityType: "booking",
    entityId: claimed.id,
    after: {
      ref: bookingRef(claimed.id),
      date: claimed.date,
      status: "refunded",
      amountCents: claimed.amountCents,
      // The refund id, never the token — see `lib/cancellation-token.ts`.
      refundId,
    },
    ipAddress: null,
  });

  await sendCancellationEmails(claimed, lead, catalogue);

  return { status: "cancelled", booking: claimed, refundId };
}

/**
 * Both cancellation emails. Never throws, for the same reason the confirmation
 * pair does not: the refund has been issued and the seat is free, and failing
 * the request over a slow mail server would show the guest an error for
 * something that worked.
 */
async function sendCancellationEmails(
  booking: Booking,
  lead: typeof tourRequests.$inferSelect,
  catalogue: Map<string, Experience>,
): Promise<void> {
  if (!isEmailConfigured()) return;

  // No `cancelToken`: the link is spent, and a receipt carrying a dead one
  // would be worse than a receipt carrying none.
  const facts = bookingEmailFacts({ booking, lead, catalogue });

  const team = teamRecipients();
  const results = await Promise.all([
    sendEmail(guestCancellationEmail(facts)),
    team.length > 0
      ? sendEmail(teamCancellationEmail(facts, team))
      : Promise.resolve({ sent: false as const, reason: "no-recipient" as const }),
  ]);

  for (const [who, result] of [["guest", results[0]], ["team", results[1]]] as const) {
    if (!result.sent) {
      console.error(
        `[cancel] ${facts.ref} was refunded but the ${who} email was not sent (${result.reason})`,
      );
    }
  }
}
