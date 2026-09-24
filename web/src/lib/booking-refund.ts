/**
 * Ending a booking that has been paid for: the money back, the car free, and
 * the guest told.
 *
 * **Why this is a module and not the body of an admin action.** Two paths end a
 * paid booking — the Sales board (a phone call to Rita) and the guest's own
 * cancel link (`lib/booking-cancellation.ts`) — and they differ in exactly one
 * fact: who pressed the button. Everything else has to be identical, because the failure mode of
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
 * **The application fee comes back in proportion.** The charge is inspected
 * rather than assumed, because a fee is taken only where a connected account
 * exists to split it from: when the charge carries one the refund asks Stripe
 * to return it, and Stripe does the proportional arithmetic for a partial
 * refund. When it does not — every booking taken before Connect was configured
 * — the flag is left off, because sending it for a charge that never had a fee
 * is an error rather than a no-op. Reversing a Connect *transfer* stays absent on purpose: the
 * scaffolding chose the direct-charge shape (`lib/stripe.ts`), which creates no
 * transfer to reverse.
 *
 * **The lead is left where it is.** A cancelled booking does not move its
 * `tour_requests` row out of "Reservado": the team decides what a cancellation
 * means for a person — re-book them in September, or archive them — and a status
 * this module chose would be a guess sitting on their board.
 *
 *
 * **The third path issues nothing and records everything.** A refund made in
 * the Stripe dashboard never comes through here at all — it happens entirely on
 * Stripe's side — so {@link syncRefundFromStripe} runs in the other direction,
 * reconciling `charge.refunded` onto the row from the webhook. It is also what
 * finally records the *commission* returned on every refund, including the ones
 * {@link cancelAndRefundBooking} issued: that path asks Stripe to return the
 * fee proportionally but never learns the figure, and one writer for the column
 * is how the books and the dashboard are kept from drifting.
 */
import "server-only";

import type Stripe from "stripe";
import { and, eq, or } from "drizzle-orm";

import {
  bookings,
  db,
  tourRequests,
  type Booking,
  type BookingStatus,
  type CancelledVia,
} from "@/db";
import { formatDay } from "@/lib/availability";
import { recordAuditOrWarn } from "@/lib/audit";
import { guestCancellationEmail, partyLabel } from "@/lib/booking-emails";
import { bookingRef } from "@/lib/bookings";
import { isEmailConfigured } from "@/lib/email";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";
import { bookingEmails } from "@/content/emails";
import { t } from "@/i18n/config";
import { formatPrice } from "@/lib/money";
import { isStripeConfigured, onOwningAccount, stripe } from "@/lib/stripe";

/**
 * What is still returnable on a booking: what was paid, less what has already
 * gone back.
 *
 * Pure, and the ceiling every caller validates against — the admin form, and
 * the guest route, which asks for all of it. A booking refunded in part once can be refunded
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
 * who just did this. The guest's own cancel link does owe them a notification,
 * and sends its own — `teamCancellationEmail`, from
 * `lib/booking-cancellation.ts`, which is the only path that ends a booking
 * with nobody at the business in the loop.
 *
 * Through the message log, under `booking-cancellation`/`guest`: a booking is
 * cancelled once, so one notice is the whole rule, and the two paths that can
 * reach this (the Sales board and the guest's own link) can no longer both send
 * it. `duplicate` is therefore the correct answer, not a failure — the guest
 * has already been told.
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

    const result = await sendLoggedEmail(
      {
        kind: "booking-cancellation",
        recipient: "guest",
        bookingId: booking.id,
        tourRequestId: booking.tourRequestId,
      },
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

    if (result.status !== "sent" && result.status !== "duplicate") {
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

// ---------------------------------------------------------------------------
// The other direction: a refund that happened in Stripe, reconciled onto the row
// ---------------------------------------------------------------------------

/**
 * How much commission a refund of `refundedCents` returns, in cents.
 *
 * The agreement (§6) says commission comes back "in proportion", and this is
 * that sentence as arithmetic: half a tour refunded returns half its fee. Pure
 * and exported so the rule can be read and tested without a Stripe account.
 *
 * Cumulative, like the refund it follows: given the *total* refunded so far it
 * answers with the *total* fee that should have gone back, so a second partial
 * refund tops the first one up rather than starting over. A full refund returns
 * the whole fee exactly, rather than a rounding of it — the one case where "the
 * proportion" and "all of it" must not be allowed to differ by a cent.
 */
export function proportionalFeeRefundCents(options: {
  /** The application fee that was taken — Stripe's figure, off the charge. */
  feeCents: number;
  /** What the charge was for. */
  chargeCents: number;
  /** How much of that charge has gone back, in total. */
  refundedCents: number;
}): number {
  const { feeCents, chargeCents, refundedCents } = options;
  if (feeCents <= 0 || chargeCents <= 0 || refundedCents <= 0) return 0;
  if (refundedCents >= chargeCents) return feeCents;
  return Math.min(feeCents, Math.round((feeCents * refundedCents) / chargeCents));
}

export type RefundSyncOutcome =
  /** The row moved: amounts, and a status if the refund was a full one. */
  | {
      status: "synced";
      booking: Booking;
      refundedAmountCents: number;
      refundedFeeCents: number;
    }
  /** Stripe is telling us something the row already says. A retry, or our own refund. */
  | { status: "already-synced"; booking: Booking }
  /** A refund against a charge no booking here was paid with. Needs a human. */
  | { status: "unknown-charge" };

/**
 * Bring a booking into line with a charge Stripe says has been refunded.
 *
 * **This is the write path a refund issued in the Stripe dashboard travels.**
 * Rita refunding a rained-off tour from her phone produced, until now, nothing
 * at all on this side: the booking stayed `confirmed`, the departure kept
 * counting the car, the books never said `refunded`, and the commission stayed
 * with the platform. `charge.refunded` reaches here instead.
 *
 * **Idempotent by reconciliation, not by remembering.** Nothing tracks which
 * events have been seen. The charge carries the whole truth — `amount_refunded`
 * is cumulative and absolute — so the row is set *to* it rather than adjusted
 * *by* it, and an event delivered five times converges on the same numbers.
 * The write is a compare-and-set on the amount that was read, so two deliveries
 * racing each other produce one winner and one `already-synced`.
 *
 * That is also what makes this safe to run behind {@link cancelAndRefundBooking}:
 * an admin refund fires this same event a second later, finds the amount it
 * already wrote, and does nothing to it — while still reconciling the fee,
 * which the admin path asks Stripe for but cannot know the size of.
 *
 * **Seats need no code here**, for the reason in the module note: capacity
 * counts `confirmed` rows and live `pending` holds, so writing `refunded` *is*
 * the release.
 *
 * **A partial refund is not a cancellation.** Money back on a tour that is
 * still running — a party that shrank, goodwill after a late start — leaves the
 * booking `confirmed` and its car committed, because the guest is still coming.
 * Only Stripe's own `refunded` flag, which means the whole charge went back,
 * ends the booking. The amounts are written either way, which is what makes the
 * partial case honest rather than invisible.
 *
 * **It never walks a status back.** A refund that later fails lowers
 * `amount_refunded`, and this will follow it down in the amounts — but a
 * booking that has read `refunded` has had its car sold to somebody else as far
 * as anything here knows, and quietly re-confirming it could put two parties on
 * one departure. That case is logged for a person instead.
 *
 * Never throws for anything a caller can be told about; the outcome union is
 * the report, and the Stripe half of the fee is best-effort on top of a row
 * that is already correct about the guest's money.
 */
export async function syncRefundFromStripe(options: {
  /** The charge, as Stripe currently has it. The authority on every number here. */
  charge: Stripe.Charge;
  /** The refund the event was about, when it carried one. */
  refundId?: string | null;
}): Promise<RefundSyncOutcome> {
  const { charge } = options;
  const now = new Date();

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  // Either handle finds the booking: the charge id is written at confirmation,
  // the payment intent from checkout — and a booking confirmed before
  // `0019_commission_audit` has only the latter.
  const [existing] = await db
    .select()
    .from(bookings)
    .where(
      paymentIntentId
        ? or(
            eq(bookings.stripeChargeId, charge.id),
            eq(bookings.stripePaymentIntentId, paymentIntentId),
          )
        : eq(bookings.stripeChargeId, charge.id),
    )
    .limit(1);

  if (!existing) return { status: "unknown-charge" };

  const refundedAmountCents = charge.amount_refunded;
  const feeTaken = charge.application_fee_amount ?? 0;
  const feeTarget = proportionalFeeRefundCents({
    feeCents: feeTaken,
    chargeCents: charge.amount,
    refundedCents: refundedAmountCents,
  });

  // Nothing Stripe is saying is news. The common case by a distance: every
  // webhook retry, and every event our own refund action caused.
  if (
    existing.refundedAmountCents === refundedAmountCents &&
    existing.refundedFeeCents === feeTarget
  ) {
    return { status: "already-synced", booking: existing };
  }

  if (refundedAmountCents < existing.refundedAmountCents) {
    // A refund reversed or failed after the fact. The amounts follow Stripe
    // down — they are a record of where the money is — but see the note above
    // on why the status does not come back with them.
    console.error(
      `[booking] ${bookingRef(existing.id)}: Stripe now says ${refundedAmountCents} ` +
        `is refunded, down from ${existing.refundedAmountCents} — the row follows the ` +
        `money but keeps status ${existing.status}; needs a human`,
    );
  }

  const fullyRefunded = charge.refunded && refundedAmountCents > 0;
  const status: BookingStatus =
    fullyRefunded && (existing.status === "confirmed" || existing.status === "cancelled")
      ? "refunded"
      : existing.status;

  const refundId = options.refundId ?? (await latestRefundId(charge));

  const [claimed] = await db
    .update(bookings)
    .set({
      status,
      refundedAmountCents,
      ...(refundId ? { stripeRefundId: refundId } : {}),
      ...(refundedAmountCents > 0 ? { refundedAt: now } : {}),
      updatedAt: now,
    })
    // Compare-and-set on what was read. Two deliveries of the same event race
    // here exactly as the two confirmation paths race in `booking-checkout.ts`,
    // and for the same reason exactly one of them comes back with a row.
    .where(
      and(
        eq(bookings.id, existing.id),
        eq(bookings.refundedAmountCents, existing.refundedAmountCents),
      ),
    )
    .returning();

  if (!claimed) return { status: "already-synced", booking: existing };

  // The commission, second and separately: the guest's money is already
  // recorded correctly, and a Stripe call failing here must not undo that or
  // ask Stripe to redeliver an event whose only remaining work is a fee.
  const refundedFeeCents = await returnApplicationFee(claimed, charge, feeTarget);

  const [settled] =
    refundedFeeCents === claimed.refundedFeeCents
      ? [claimed]
      : await db
          .update(bookings)
          .set({ refundedFeeCents, updatedAt: now })
          .where(eq(bookings.id, claimed.id))
          .returning();

  const booking = settled ?? claimed;

  await recordAuditOrWarn({
    // Nobody here pressed anything — the actor is Stripe, whoever asked it.
    actorUserId: null,
    action: "booking.refunded",
    entityType: "booking",
    entityId: booking.id,
    before: {
      status: existing.status,
      refundedAmountCents: existing.refundedAmountCents,
      refundedFeeCents: existing.refundedFeeCents,
    },
    after: {
      ref: bookingRef(booking.id),
      date: booking.date,
      status: booking.status,
      via: "stripe",
      // Both amounts, as in the admin path: "€170 refunded" means something
      // different against a €340 tour than against a €170 one.
      amountCents: booking.amountCents,
      refundedAmountCents,
      // What the platform gave back with it, and what it had taken — §8's
      // promise is that this is checkable, and an audit row read a year later
      // has only what it wrote down.
      applicationFeeCents: feeTaken > 0 ? feeTaken : null,
      refundedFeeCents,
      stripeRefundId: refundId,
      stripeChargeId: charge.id,
    },
    ipAddress: null,
  });

  return { status: "synced", booking, refundedAmountCents, refundedFeeCents };
}

/**
 * Stripe's handle for the refund that most recently hit this charge.
 *
 * A `charge.refunded` payload carries no refund id of its own, and which one it
 * was is the join a guest's "the bank says nothing arrived" needs. The embedded
 * list is used when the payload has one and asked for otherwise; a failure
 * costs the id and nothing else, because every amount on the row comes from the
 * charge itself.
 */
export async function latestRefundId(charge: Stripe.Charge): Promise<string | null> {
  const embedded = charge.refunds?.data?.[0]?.id;
  if (embedded) return embedded;
  if (!isStripeConfigured()) return null;

  try {
    const refunds = await onOwningAccount((account) =>
      stripe().refunds.list({ charge: charge.id, limit: 1 }, account),
    );
    return refunds.data[0]?.id ?? null;
  } catch (err) {
    console.warn(`[stripe] couldn't read the refunds on ${charge.id}`, err);
    return null;
  }
}

/**
 * Return the commission in proportion, and report what Stripe says came back.
 *
 * **Why this is not simply `refund_application_fee`.** That flag exists on a
 * refund *we* create, and the refund this is reconciling was very likely
 * created by somebody in the Stripe dashboard, where the default is to keep the
 * fee. So the fee is topped up here to whatever the proportion says it should
 * be, from whatever it currently is — which makes this correct behind the
 * dashboard, behind {@link cancelAndRefundBooking} (whose flag already returned
 * it, leaving nothing to top up), and behind a retry of either.
 *
 * **The application fee lives on the platform**, not on the connected account
 * the charge is on: it is the platform's money coming back, so the call carries
 * no `stripeAccount` — the one Stripe call in this file that must not.
 *
 * Never throws. A fee that could not be returned is logged loudly and leaves
 * the column at what Stripe last confirmed, because the alternative — writing
 * what we asked for rather than what moved — is a books entry that disagrees
 * with the dashboard, which is the one thing §8 promises cannot happen.
 */
async function returnApplicationFee(
  booking: Booking,
  charge: Stripe.Charge,
  targetCents: number,
): Promise<number> {
  const returned = await topUpApplicationFee({
    charge,
    targetCents,
    // Keyed on the total the fee should reach, so a redelivered event asks
    // for the same top-up once and a genuinely larger refund later asks for
    // a new one.
    idempotencyKey: `booking-fee-refund:${booking.id}:${targetCents}`,
  });
  if (returned.status === "failed") {
    console.error(
      `[booking] ${bookingRef(booking.id)}: refunded ${booking.refundedAmountCents} to the ` +
        `guest but couldn't return ${targetCents} of commission on ${returned.feeId} — needs a human`,
      returned.error,
    );
    return booking.refundedFeeCents;
  }
  return returned.status === "returned" ? returned.refundedFeeCents : booking.refundedFeeCents;
}

/**
 * The Stripe half of {@link returnApplicationFee}, shared with the quote
 * instalments' reconciler (`lib/quote-refund.ts`): top the charge's
 * application fee up to `targetCents` returned, on the platform, and say what
 * Stripe reports came back.
 *
 * `untouched` when there is nothing to do here — no fee on the charge (a
 * platform charge, or one taken before Connect), nothing owed back, or Stripe
 * switched off — and the caller keeps what its row already says. Never throws.
 */
export async function topUpApplicationFee(options: {
  charge: Stripe.Charge;
  targetCents: number;
  idempotencyKey: string;
}): Promise<
  | { status: "returned"; refundedFeeCents: number }
  | { status: "untouched" }
  | { status: "failed"; feeId: string; error: unknown }
> {
  const { charge, targetCents, idempotencyKey } = options;
  const feeId =
    typeof charge.application_fee === "string"
      ? charge.application_fee
      : (charge.application_fee?.id ?? null);

  // No fee to return: a platform charge, or a booking taken before Connect.
  if (!feeId || targetCents <= 0) return { status: "untouched" };
  if (!isStripeConfigured()) return { status: "untouched" };

  try {
    const client = stripe();
    const fee = await client.applicationFees.retrieve(feeId);
    const shortfall = targetCents - fee.amount_refunded;
    if (shortfall <= 0) return { status: "returned", refundedFeeCents: fee.amount_refunded };

    await client.applicationFees.createRefund(feeId, { amount: shortfall }, { idempotencyKey });
    return { status: "returned", refundedFeeCents: targetCents };
  } catch (error) {
    return { status: "failed", feeId, error };
  }
}
