/**
 * Ending a booking that has been paid for: the money back, the car free, and
 * the guest told.
 *
 * **Why this is a module and not the body of an admin action.** Two paths end a
 * paid booking — the Sales board (a phone call to Rita) and, once it ships, the
 * guest's own cancel link — and they differ in exactly one fact: who pressed
 * the button. Everything else has to be identical, because the failure mode of
 * two implementations is that one of them forgets the email, or the seat, or
 * the audit entry, and nobody notices until a guest is standing at a meeting
 * point. So the decision (how much, and whether the caller may) belongs to the
 * caller, and everything after it lives here.
 *
 * **The row is claimed before the money moves.** {@link cancelAndRefundBooking}
 * flips the booking to `cancelled` under a `status = 'confirmed'` guard, and
 * only then asks Stripe for the refund. That order is deliberate, and it is the
 * safer of the two:
 *
 * - claim first, and the worst case is a cancelled booking whose refund failed —
 *   visible on the screen, reported to the operator, and issuable by hand;
 * - refund first, and the worst case is money out of the account with the
 *   booking still reading "paid", still holding a car nobody can sell, and no
 *   email sent. Nothing on any screen would say so.
 *
 * A double-submitted form is caught twice over: the claim's guard means exactly
 * one caller proceeds, and the Stripe call carries an idempotency key so even a
 * true race cannot produce two refunds.
 *
 * **Seats need no code here.** `lib/bookings.ts` counts `confirmed` rows and
 * `pending` rows whose hold is still live, and nothing else — so the status
 * write below *is* the seat release, and the departure is sellable again the
 * moment it lands.
 *
 * **The application fee comes back in proportion.** Nothing takes one yet
 * (`commission-engine/tour-application-fees`), so the charge is inspected
 * rather than assumed: when it carries an application fee the refund asks
 * Stripe to return it, and Stripe does the proportional arithmetic for a
 * partial refund. When it does not — every booking today — the flag is left
 * off, because sending it for a charge that never had a fee is an error rather
 * than a no-op. Reversing a Connect *transfer* stays absent on purpose: the
 * scaffolding chose the direct-charge shape (`lib/stripe.ts`), which creates no
 * transfer to reverse.
 *
 * **The lead is left where it is.** A cancelled booking does not move its
 * `tour_requests` row out of "Reservado": the team decides what a cancellation
 * means for a person — re-book them in September, or archive them — and a status
 * this module chose would be a guess sitting on their board.
 */
import "server-only";

import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";

import { bookings, db, tourRequests, type Booking, type CancelledVia } from "@/db";
import { formatDay } from "@/lib/availability";
import { recordAuditOrWarn } from "@/lib/audit";
import { guestCancellationEmail, partyLabel } from "@/lib/booking-emails";
import { bookingRef } from "@/lib/bookings";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { listCatalogue } from "@/lib/experience-catalogue";
import { bookingEmails } from "@/content/emails";
import { t } from "@/i18n/config";
import { formatPrice } from "@/lib/money";
import { isStripeConfigured, onOwningAccount, stripe } from "@/lib/stripe";

/**
 * What is still returnable on a booking: what was paid, less what has already
 * gone back.
 *
 * Pure, and the ceiling every caller validates against — the admin form today,
 * the guest route after it. A booking refunded in part once can be refunded
 * again up to this and never past it. Stripe would refuse anyway; refusing here
 * means the operator reads a sentence in Portuguese instead of an error code.
 */
export function refundableCents(
  booking: Pick<Booking, "amountCents" | "refundedAmountCents">,
): number {
  return Math.max(0, booking.amountCents - booking.refundedAmountCents);
}

/**
 * Whether this booking can be called off at all.
 *
 * `confirmed` and nothing else. A `pending` row is a hold that releases itself
 * when the clock passes it, and `cancelled`, `expired` and `refunded` are all
 * already over — "cancel" on any of them would be a write that changes nothing
 * and an email that confuses somebody.
 */
export function isCancellable(booking: Pick<Booking, "status">): boolean {
  return booking.status === "confirmed";
}

export type CancelRefundOutcome =
  | {
      status: "cancelled";
      booking: Booking;
      /** What actually went back. `0` when the booking was called off unrefunded. */
      refundedCents: number;
    }
  | { status: "not-found" }
  /** Already cancelled, expired, refunded — or never paid for in the first place. */
  | { status: "not-cancellable"; booking: Booking }
  /** More than {@link refundableCents} was asked for. */
  | { status: "amount-too-large"; booking: Booking; maxCents: number }
  /** Nothing to refund against: no payment intent, or Stripe is switched off. */
  | { status: "refund-unavailable"; booking: Booking }
  /** The booking *is* cancelled and Stripe refused the refund. Needs a human. */
  | { status: "refund-failed"; booking: Booking; message: string };

/**
 * Cancel a paid booking, returning `refundCents` of it.
 *
 * `refundCents` is an explicit amount rather than a full/partial flag: the team
 * refunds a whole tour for weather and part of one for a late cancellation met
 * with goodwill, and `0` — call it off and return nothing — is a real answer a
 * caller must be able to give.
 *
 * Never throws for anything a caller can be told about; the outcome union is
 * the report. The guest's email and the audit entry are best-effort *after* the
 * money and the row agree, on the same reasoning as `confirmPaidBooking`: the
 * booking is cancelled and the refund is issued, and failing the call because a
 * mail server was slow would tell the operator to do all of it again.
 */
export async function cancelAndRefundBooking(options: {
  bookingId: string;
  refundCents: number;
  /** Which path called it off — the "who" beside `cancelledAt`'s "when". */
  via: CancelledVia;
  /** The operator, for the audit entry. `null` for the guest's own link. */
  actorUserId: string | null;
}): Promise<CancelRefundOutcome> {
  const { bookingId, refundCents, via, actorUserId } = options;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!existing) return { status: "not-found" };
  if (!isCancellable(existing)) return { status: "not-cancellable", booking: existing };

  const maxCents = refundableCents(existing);
  if (refundCents < 0 || refundCents > maxCents) {
    return { status: "amount-too-large", booking: existing, maxCents };
  }
  if (refundCents > 0 && (!existing.stripePaymentIntentId || !isStripeConfigured())) {
    return { status: "refund-unavailable", booking: existing };
  }

  // The claim, and the seat release with it. Exactly one caller comes back with
  // a row: a double-submitted form, or the guest's link racing the Sales board,
  // finds nothing left to update and is told the booking is already over.
  const [claimed] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: now, cancelledVia: via, updatedAt: now })
    .where(and(eq(bookings.id, existing.id), eq(bookings.status, "confirmed")))
    .returning();

  if (!claimed) return { status: "not-cancellable", booking: existing };

  let refund: Stripe.Refund | null = null;
  if (refundCents > 0) {
    try {
      refund = await issueRefund(claimed, refundCents, via);
    } catch (err) {
      // The booking is already cancelled and its car is free, which is the
      // half of this that must not be rolled back — a guest told their tour is
      // off must not find it un-cancelled because a card network was down. The
      // money is now a job for a person, and the audit entry says so.
      console.error(`[booking] ${bookingRef(claimed.id)} cancelled but not refunded`, err);
      await recordAuditOrWarn({
        actorUserId,
        action: "booking.cancelled",
        entityType: "booking",
        entityId: claimed.id,
        before: { status: existing.status },
        after: {
          status: "cancelled",
          cancelledVia: via,
          refundRequestedCents: refundCents,
          refundFailed: true,
        },
      });
      return {
        status: "refund-failed",
        booking: claimed,
        message: err instanceof Error ? err.message : "Stripe refused the refund.",
      };
    }
  }

  // One settling write for both paths, even though the no-refund case is
  // re-stating a status the claim already wrote: two branches here would be two
  // places for the amount, the timestamp and the audit row to disagree, and the
  // saving is one UPDATE on an action a person performs by hand.
  const refundedAmountCents = existing.refundedAmountCents + refundCents;
  const [settled] = await db
    .update(bookings)
    .set({
      // `refunded` only when money actually went back. A cancellation that
      // returned nothing is a cancellation, and saying otherwise would put a
      // refund that never happened into the books.
      status: refundCents > 0 ? "refunded" : "cancelled",
      refundedAmountCents,
      ...(refund
        ? { stripeRefundId: refund.id, refundedAt: now }
        : {}),
      updatedAt: now,
    })
    .where(eq(bookings.id, claimed.id))
    .returning();

  const booking = settled ?? claimed;

  await recordAuditOrWarn({
    actorUserId,
    action: refundCents > 0 ? "booking.refunded" : "booking.cancelled",
    entityType: "booking",
    entityId: booking.id,
    before: { status: existing.status, refundedAmountCents: existing.refundedAmountCents },
    after: {
      ref: bookingRef(booking.id),
      date: booking.date,
      status: booking.status,
      cancelledVia: via,
      // Both amounts: "€170 refunded" means something different against a €340
      // tour than against a €170 one, and an audit row read a year later has
      // only what it wrote down.
      amountCents: booking.amountCents,
      refundedAmountCents,
      stripeRefundId: refund?.id ?? null,
    },
  });

  await sendCancellationEmail(booking, refundCents);

  return { status: "cancelled", booking, refundedCents: refundCents };
}

/**
 * The Stripe half: refund the charge, returning any application fee with it.
 *
 * The payment intent is read first because the fee question cannot be answered
 * from our own row — nothing records a fee yet — and asking Stripe is one call
 * against an action a human performs a few times a month. See the module note
 * for why the flag is conditional rather than always on.
 */
async function issueRefund(
  booking: Booking,
  amountCents: number,
  via: CancelledVia,
): Promise<Stripe.Refund> {
  const client = stripe();
  const paymentIntentId = booking.stripePaymentIntentId!;

  // Both calls go to whichever account took the money — the client's for a
  // booking paid under Connect, the platform's for one paid before it. Wrapping
  // the pair keeps them on the same account: the retry only happens when the
  // intent was not found, so no refund exists to be issued twice.
  return onOwningAccount(async (account) => {
    const intent = await client.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] },
      account,
    );
    const charge =
      intent.latest_charge && typeof intent.latest_charge !== "string"
        ? intent.latest_charge
        : null;
    const hasApplicationFee = Boolean(charge?.application_fee_amount);

    return client.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        // Stripe returns the fee in proportion to the amount refunded, which is
        // what the commission agreement requires ("refunds return commission in
        // proportion") — so the arithmetic is Stripe's, not ours.
        ...(hasApplicationFee ? { refund_application_fee: true } : {}),
        metadata: { bookingId: booking.id, ref: bookingRef(booking.id), via },
      },
      {
        ...account,
        // Keyed on what has already gone back as well as what is going back now,
        // so a retried submission collapses into one refund while a *second*,
        // deliberate partial refund of the same amount is a new request.
        idempotencyKey: `booking-refund:${booking.id}:${booking.refundedAmountCents}:${amountCents}`,
      },
    );
  });
}

/**
 * Tell the guest. Best-effort and never throws — see the function note above.
 *
 * The team gets nothing here on purpose: from the Sales board they are the ones
 * who just did this, and the guest's own cancel link (which does owe them a
 * notification) is a route that does not exist yet.
 */
async function sendCancellationEmail(
  booking: Booking,
  refundCents: number,
): Promise<void> {
  if (!isEmailConfigured()) return;
  if (!booking.tourRequestId) {
    console.warn(
      `[booking] ${bookingRef(booking.id)} has no lead row — no cancellation email sent`,
    );
    return;
  }

  try {
    const [lead] = await db
      .select()
      .from(tourRequests)
      .where(eq(tourRequests.id, booking.tourRequestId))
      .limit(1);

    if (!lead?.email) {
      console.warn(
        `[booking] ${bookingRef(booking.id)} has no address — no cancellation email sent`,
      );
      return;
    }

    const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
    const locale = booking.locale;
    const experience = catalogue.get(booking.experienceSlug);

    const result = await sendEmail(
      guestCancellationEmail({
        ref: bookingRef(booking.id),
        guestName: lead.name,
        guestEmail: lead.email,
        locale,
        date: formatDay(booking.date, locale),
        // A retired experience still has to be nameable in the mail of the
        // guest who bought it; the slug is a poor name but never a blank.
        experience: `${experience ? t(experience.title, locale) : booking.experienceSlug} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
        partyLabel: partyLabel(booking, locale),
        total: formatPrice(booking.amountCents, locale, booking.currency),
        refund:
          refundCents > 0
            ? formatPrice(refundCents, locale, booking.currency)
            : null,
        partialRefund: refundCents > 0 && refundCents < booking.amountCents,
      }),
    );

    if (!result.sent) {
      console.error(
        `[booking] ${bookingRef(booking.id)} cancelled but the guest email was not sent (${result.reason})`,
      );
    }
  } catch (err) {
    console.error(
      `[booking] ${bookingRef(booking.id)} cancelled but the guest email failed`,
      err,
    );
  }
}
