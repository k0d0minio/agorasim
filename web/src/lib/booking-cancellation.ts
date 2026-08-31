/**
 * The guest side of a cancellation: what a link unlocks, and what pressing the
 * button does.
 *
 * **The money is not this module's business.** Cancelling a paid booking —
 * claiming the row, refunding the charge, returning the application fee in
 * proportion, freeing the seat, writing the audit entry, telling the guest — is
 * `lib/booking-refund.ts`, and it is deliberately the same code the Sales board
 * runs. The two paths differ in exactly one fact, who pressed the button, and
 * that fact is a `via` argument. Anything else here would be a second
 * implementation of the same thing, and the failure mode of two is that one of
 * them forgets the email, or the seat, or the audit row.
 *
 * So what is left in this module is only what is genuinely the *guest's* path
 * and not the team's:
 *
 * 1. **Authentication**, which for a table holding no guest identity means
 *    resolving an unguessable token to a booking ({@link resolveCancellation}).
 * 2. **The 48-hour policy** — a gate the Sales board deliberately does not have,
 *    because Rita cancelling a tour by hand is not bound by the promise made to
 *    the person she is on the phone with.
 * 3. **Spending the token**, so an emailed link works once.
 * 4. **Telling the team**, which `booking-refund.ts` leaves to its callers: from
 *    the Sales board they are the ones who just did it, but a guest cancelling
 *    at midnight is news.
 *
 * **Two questions, deliberately separate.** {@link resolveCancellation} answers
 * "whose booking is this and may it still be cancelled?" and writes nothing;
 * {@link cancelBooking} does it. The page calls the first on every render and
 * the second only from a confirmed POST, which is what keeps a link preview, a
 * crawler, or a mail client that prefetches URLs from cancelling a tour by
 * looking at it.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { bookings, db, tourRequests, type Booking } from "@/db";
import { bookingEmails } from "@/content/emails";
import type { Experience } from "@/content/experiences";
import { t } from "@/i18n/config";
import { formatDay } from "@/lib/availability";
import { partyLabel, teamCancellationEmail } from "@/lib/booking-emails";
import { cancelAndRefundBooking, isCancellable, refundableCents } from "@/lib/booking-refund";
import { bookingRef } from "@/lib/bookings";
import { cancellationWindow, type CancellationWindow } from "@/lib/cancellation";
import {
  cancellationTokenDigest,
  looksLikeCancellationToken,
} from "@/lib/cancellation-token";
import { isEmailConfigured, sendEmail, teamRecipients } from "@/lib/email";
import { formatPrice } from "@/lib/money";
import { siteUrl } from "@/lib/site-origin";

/**
 * What a token resolved to.
 *
 * **`unknown` is one state on purpose.** A token that never existed, one that
 * has been spent, one revoked by a secret rotation, and a booking that is no
 * longer cancellable all land here, and the page renders them identically. The
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

  // The same predicate the Sales board uses, rather than a second opinion about
  // what "still cancellable" means.
  if (!isCancellable(row)) return { kind: "unknown" };

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
  | { status: "cancelled"; booking: Booking; refundedCents: number }
  /** The link stopped being valid between rendering the page and pressing the button. */
  | { status: "unavailable" }
  /** Inside 48 hours, or already departed. */
  | { status: "too-late" }
  /** Our fault, or Stripe's. */
  | { status: "failed" };

/**
 * Cancel a booking on the guest's own authority: full refund, seat freed, token
 * spent, both sides told.
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
  now?: Date;
}): Promise<CancellationOutcome> {
  const { token, catalogue, now = new Date() } = options;

  const resolved = await resolveCancellation(token, now);
  if (resolved.kind === "unknown") return { status: "unavailable" };
  if (resolved.kind !== "cancellable") return { status: "too-late" };

  const { booking, lead } = resolved;

  /**
   * "Free cancellation" means everything still returnable goes back — which is
   * `refundableCents`, not `amountCents`. They differ only if the team has
   * already refunded part of this booking by hand, and in that case returning
   * the full price would refund some of it twice.
   */
  const outcome = await cancelAndRefundBooking({
    bookingId: booking.id,
    refundCents: refundableCents(booking),
    via: "guest",
    // Nobody in the admin pressed this. The guest's authority was the token,
    // and `cancelled_via` is what records that.
    actorUserId: null,
  });

  switch (outcome.status) {
    case "cancelled":
      break;
    case "not-cancellable":
    case "not-found":
      // Another tap, or the Sales board, got there first.
      return { status: "unavailable" };
    default:
      // `refund-failed` lands here too, and it is the one case where the
      // booking *is* cancelled and the money is not back. That is deliberate
      // in `booking-refund.ts` — a guest told their tour is off must not find
      // it un-cancelled — and it is logged there for a person to finish. The
      // guest is told it did not complete, which is the honest half.
      console.error(
        `[cancel] ${bookingRef(booking.id)} could not be cancelled by its guest (${outcome.status})`,
      );
      return { status: "failed" };
  }

  /**
   * Spend the token, in its own write.
   *
   * Separate from the claim rather than folded into it, because the claim
   * belongs to `booking-refund.ts` and self-serve links do not: the Sales board
   * has no token to spend. A failure here is logged and swallowed — the booking
   * is cancelled and the money is back, and the only cost is that a link which
   * now resolves to a non-cancellable booking says "this link no longer works"
   * via {@link isCancellable} instead of via a null hash. Same page, same words.
   */
  await db
    .update(bookings)
    .set({ cancellationTokenHash: null, updatedAt: new Date() })
    .where(eq(bookings.id, booking.id))
    .catch((err) => {
      console.error(`[cancel] could not spend the token for ${bookingRef(booking.id)}`, err);
    });

  await notifyTeam(outcome.booking, lead, catalogue, outcome.refundedCents);

  return { status: "cancelled", booking: outcome.booking, refundedCents: outcome.refundedCents };
}

/**
 * Tell Diogo & Rita that a seat just came free.
 *
 * `booking-refund.ts` sends the guest's copy and deliberately leaves this to
 * its callers: from the Sales board the team *are* the ones who cancelled it,
 * and a notification would be telling them what they just did. From here they
 * are not — a guest can do this at midnight — so this is the half the guest
 * path owes and the admin path does not.
 *
 * Never throws, on the same reasoning as every other send in this codebase: the
 * refund is issued and the seat is free, and failing over a slow mail server
 * would report a failure for something that worked.
 */
async function notifyTeam(
  booking: Booking,
  lead: typeof tourRequests.$inferSelect,
  catalogue: Map<string, Experience>,
  refundedCents: number,
): Promise<void> {
  if (!isEmailConfigured()) return;

  const team = teamRecipients();
  if (team.length === 0) return;

  const locale = booking.locale;
  const experience = catalogue.get(booking.experienceSlug);

  try {
    const result = await sendEmail(
      teamCancellationEmail(
        {
          ref: bookingRef(booking.id),
          guestName: lead.name,
          guestEmail: lead.email,
          locale,
          date: formatDay(booking.date, locale),
          experience: `${experience ? t(experience.title, locale) : booking.experienceSlug} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
          partyLabel: partyLabel(booking, locale),
          partySize: booking.partySize,
          refund: formatPrice(refundedCents, locale, booking.currency),
          adminUrl: lead.id ? `${siteUrl()}/admin/sales/${lead.id}` : siteUrl(),
        },
        team,
      ),
    );

    if (!result.sent) {
      console.error(
        `[cancel] ${bookingRef(booking.id)} was refunded but the team email was not sent (${result.reason})`,
      );
    }
  } catch (err) {
    console.error(`[cancel] team notification failed for ${bookingRef(booking.id)}`, err);
  }
}
