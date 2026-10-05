/**
 * Money going back on a wedding or event instalment — the refund path for
 * `quote_payments`, beside `lib/booking-refund.ts`'s for tours.
 *
 * Two doors, one write. The team refunds a deposit or balance from the lead's
 * quote card ({@link refundQuotePayment}); somebody refunds one from the
 * Stripe dashboard and the webhook brings it here
 * ({@link syncQuotePaymentRefundFromStripe}). Both end in
 * {@link settleInstalmentRefund}, so the row, the commission, the audit trail
 * and the couple's notice cannot come out differently depending on where the
 * button was.
 *
 * The rules are the tour path's, deliberately — the schema note on
 * `quotePayments` asks for exactly that:
 *
 * - **Set to the charge, never added to.** The instalment's refunded amount is
 *   the charge's cumulative `amount_refunded`, under a compare-and-set, so a
 *   redelivered event and the webhook echo of an admin refund converge on one
 *   number and one winner.
 * - **The commission comes back in proportion** (the agreement's §6),
 *   topped up on the platform to whatever the proportion says, from whatever
 *   the refund left it at — `proportionalFeeRefundCents` and the fee top-up are
 *   the tour path's own.
 * - **A partial refund is not a cancellation.** The instalment stays `paid`
 *   with the amount beside it; only the whole instalment going back makes it
 *   `refunded`, and the event itself is called off only when the operator says
 *   so ({@link refundQuotePayment}'s `cancelEvent`, or {@link cancelHeldQuote}).
 *   A dashboard refund never cancels anything.
 *
 * The couple are told once per refund, whichever door it came through: the
 * message log keys `quote-refunded` on the instalment and its refunded total,
 * so the admin refund and its echo share one claim and a second, deliberate
 * partial refund earns a second notice.
 *
 * **The admin door claims first.** Its refund's webhook echo can reach the
 * dashboard door before the admin door has written anything; left to the
 * compare-and-set, the echo would win, record the refund as Stripe's with
 * nobody behind it, and tell the couple their event is still on moments before
 * the admin door calls it off. So the dashboard door defers a refund the quote
 * card issued ({@link ADMIN_REFUND_SETTLE_WINDOW_MS}) and Stripe redelivers it
 * once the admin door has settled — or has died, in which case the
 * redelivery settles it as Stripe's.
 *
 * **A cancellation the couple were not told of is told on its own.** Where an
 * event is called off after the couple's last word was "still booked" — the
 * deferral's fallback, or "Cancelar evento" after an earlier refund — they get
 * a `quote-event-cancelled` notice, once per quote.
 *
 * Nothing here decides what the terms allow (D9's 30 days, the `[LAWYER]`
 * items). The amount is the team's judgement, as on the tour dialog.
 */
import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import type { Locale } from "@/i18n/config";
import { db, tourRequests, type Quote, type QuotePayment } from "@/db";
import { formatDay } from "@/lib/availability";
import { recordAuditOrWarn } from "@/lib/audit";
import { guestQuoteEventCancelledEmail, guestQuoteRefundEmail } from "@/lib/booking-emails";
import {
  latestRefundId,
  proportionalFeeRefundCents,
  topUpApplicationFee,
} from "@/lib/booking-refund";
import { isEmailConfigured } from "@/lib/email";
import {
  hasSentQuoteRefundNotice,
  isRefundNoticeClaimed,
  sendLoggedEmail,
  type LoggedSend,
} from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { expireSession } from "@/lib/quote-checkout";
import {
  cancelQuoteAndOpenInstalments,
  depositRefundedInFull,
  getPayment,
  getPaymentByCharge,
  getQuote,
  instalmentRefundableCents,
  quoteRef,
  recordPaymentRefund,
  recordPaymentRefundFee,
} from "@/lib/quotes";
import { isStripeConfigured, onOwningAccount, stripe } from "@/lib/stripe";

/** Who asked for the refund — the audit row's `via`. */
export type QuoteRefundVia = "admin" | "stripe";

// ---------------------------------------------------------------------------
// The admin door
// ---------------------------------------------------------------------------

export type QuoteRefundOutcome =
  | {
      status: "refunded";
      quote: Quote;
      payment: QuotePayment;
      /** What went back this time. */
      refundedCents: number;
      /** Whether the event was called off with it. */
      eventCancelled: boolean;
    }
  | { status: "not-found" }
  /** Not a `paid` instalment: owed, written off, or already all given back. */
  | { status: "not-refundable"; payment: QuotePayment }
  /** Zero, negative, or more than {@link instalmentRefundableCents}. */
  | { status: "amount-invalid"; payment: QuotePayment; maxCents: number }
  /** Nothing to refund against: no payment intent, or Stripe is switched off. */
  | { status: "refund-unavailable"; payment: QuotePayment }
  /** Stripe refused. Nothing was written and nothing was cancelled. */
  | { status: "refund-failed"; payment: QuotePayment; message: string }
  /**
   * Stripe refunded, then a write after it threw. The money moved; the row,
   * the commission, the audit trail or the cancellation may not have. The
   * webhook reconciles the amounts from the charge — it never cancels.
   */
  | {
      status: "refunded-unrecorded";
      /** The instalment as it was read before the refund. */
      payment: QuotePayment;
      refundedCents: number;
      refundId: string;
      /** The operator ticked "Cancelar também o evento" — it is not confirmed. */
      cancelEventRequested: boolean;
    };

/**
 * Refund `refundCents` of one instalment, from the Sales board.
 *
 * The order is the point. The refund is issued first and everything else only
 * once Stripe has said yes: a refused refund must leave the row, the quote and
 * the couple's inbox exactly as they were — above all it must not cancel an
 * event whose money never went back. `cancelEvent` is honoured after the
 * money, and before the notice, so the notice can say the event is off.
 *
 * Never throws for anything a caller can be told about; the outcome union is
 * the report. That includes a database error after Stripe has said yes: the
 * money has moved, so the caller is told so (`refunded-unrecorded`) rather than
 * shown an error page that invites a second refund.
 */
export async function refundQuotePayment(options: {
  paymentId: string;
  refundCents: number;
  /** "Cancelar também o evento" — call the quote off once the money is back. */
  cancelEvent: boolean;
  /**
   * The dialog's id for this press of "Reembolsar" — the same for a double
   * submit, new for every deliberate retry. The refund's idempotency key.
   */
  attemptId: string;
  actorUserId: string | null;
  now?: Date;
}): Promise<QuoteRefundOutcome> {
  const { paymentId, refundCents, cancelEvent, attemptId, actorUserId, now = new Date() } =
    options;

  const found = await getPayment(paymentId);
  if (!found) return { status: "not-found" };
  const { payment } = found;

  if (payment.status !== "paid") return { status: "not-refundable", payment };

  const maxCents = instalmentRefundableCents(payment);
  if (!Number.isSafeInteger(refundCents) || refundCents <= 0 || refundCents > maxCents) {
    return { status: "amount-invalid", payment, maxCents };
  }
  if (!payment.stripePaymentIntentId || !isStripeConfigured()) {
    return { status: "refund-unavailable", payment };
  }

  let issued: IssuedInstalmentRefund;
  try {
    issued = await issueInstalmentRefund(found.quote, payment, refundCents, attemptId);
  } catch (err) {
    console.error(`[quote-refund] ${quoteRef(found.quote.id)}: Stripe refused the refund`, err);
    return {
      status: "refund-failed",
      payment,
      message: err instanceof Error ? err.message : "Stripe refused the refund.",
    };
  }

  const { refund, charge, totalRefundedCents } = issued;
  if (refund.status === "failed" || refund.status === "canceled") {
    console.error(
      `[quote-refund] ${quoteRef(found.quote.id)}: ${refund.id} came back ${refund.status}`,
    );
    return {
      status: "refund-failed",
      payment,
      message: `Stripe devolveu o reembolso como ${refund.status}.`,
    };
  }

  if (refund.id === payment.stripeRefundId) {
    // A replayed press: Stripe handed back the refund this attempt already
    // made, and the row read above already records it. Settling it again
    // would add it a second time wherever the charge could not be read back.
    return {
      status: "refunded",
      quote: found.quote,
      payment,
      refundedCents: refund.amount,
      eventCancelled: found.quote.status === "cancelled",
    };
  }

  if (totalRefundedCents === null) {
    console.error(
      `[quote-refund] ${quoteRef(found.quote.id)}: ${refund.id} went through but the charge ` +
        `couldn't be read back — settling the ${payment.kind} from the row plus this refund; ` +
        `the webhook echo sets it to Stripe's figure`,
    );
  }

  let settled: Awaited<ReturnType<typeof settleInstalmentRefund>>;
  try {
    settled = await settleInstalmentRefund({
      quote: found.quote,
      payment,
      // What has gone back on it now, as Stripe counts it — set to the charge,
      // never added to, so a dashboard refund whose event never reached the row
      // is counted here rather than announced again by the echo. The row's own
      // sum is only the fallback for a charge that could not be read back.
      refundedAmountCents: totalRefundedCents ?? payment.refundedAmountCents + refund.amount,
      charge,
      refundId: refund.id,
      via: "admin",
      actorUserId,
      cancelEvent,
      now,
    });
  } catch (err) {
    // The money is back with the couple whatever the database says. Nothing
    // is retried here: the `charge.refunded` echo sets the row, the fee, the
    // audit row and the notice from Stripe's own figures — but it never calls
    // an event off, so a requested cancellation is left for the operator.
    console.error(
      `[quote-refund] ${quoteRef(found.quote.id)}: refunded ${refund.amount} on the ` +
        `${payment.kind} (${refund.id}) but couldn't record it — the webhook will reconcile ` +
        `the books; event cancellation ${cancelEvent ? "requested, not confirmed" : "not requested"}`,
      err,
    );
    return {
      status: "refunded-unrecorded",
      payment,
      refundedCents: refund.amount,
      refundId: refund.id,
      cancelEventRequested: cancelEvent,
    };
  }

  return {
    status: "refunded",
    quote: settled.quote,
    payment: settled.payment,
    refundedCents: refund.amount,
    eventCancelled: settled.quote.status === "cancelled",
  };
}

type IssuedInstalmentRefund = {
  refund: Stripe.Refund;
  /** The charge as read back after the refund, else as read before it. */
  charge: Stripe.Charge | null;
  /** The charge's cumulative `amount_refunded` after the refund; `null` when it couldn't be read. */
  totalRefundedCents: number | null;
};

/**
 * The Stripe half: refund the instalment's payment intent on the account that
 * took the money, returning the application fee with it where there was one.
 *
 * The charge is read first, as for a tour, because whether a fee was taken is
 * Stripe's to say — and the same object later names the fee to top up.
 *
 * Keyed on the attempt, never on the row. Stripe keeps a request's answer
 * against its key for a day, a decline included: a key built from the row —
 * which a refused refund leaves untouched — would hand "try again" the same
 * decline, and a re-issue after a refund that later failed the old refund. The
 * dialog's `attemptId` is the same for a double submit, which Stripe collapses
 * into the one refund (and the settle below finds already written), and new
 * for every retry, which therefore reaches Stripe.
 *
 * Then the charge is read again, for the total Stripe now counts as refunded
 * on it — which is what the instalment is set to.
 */
async function issueInstalmentRefund(
  quote: Quote,
  payment: QuotePayment,
  amountCents: number,
  attemptId: string,
): Promise<IssuedInstalmentRefund> {
  const client = stripe();
  const paymentIntentId = payment.stripePaymentIntentId!;

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

    const refund = await client.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: "requested_by_customer",
        // Stripe returns the fee in proportion to the amount refunded — §6.
        // The reconciler tops up any cent its rounding leaves behind.
        ...(hasApplicationFee ? { refund_application_fee: true } : {}),
        metadata: {
          quotePaymentId: payment.id,
          ref: quoteRef(quote.id),
          instalment: payment.kind,
          via: "admin",
        },
      },
      {
        ...account,
        idempotencyKey: `quote-refund:${payment.id}:${attemptId}`,
      },
    );

    const after = await readChargeAfterRefund(client, charge?.id ?? chargeIdOf(refund), account);
    return {
      refund,
      charge: after ?? charge,
      totalRefundedCents: after ? after.amount_refunded : null,
    };
  });
}

/**
 * The charge as Stripe has it once the refund has gone through, or `null`.
 *
 * Never throws: the money has already gone back by the time this runs, so a
 * failed read must neither report the refund as refused nor escape into
 * {@link onOwningAccount}, whose retry on the platform would re-issue it.
 */
async function readChargeAfterRefund(
  client: Stripe,
  chargeId: string | null,
  account: Stripe.RequestOptions | undefined,
): Promise<Stripe.Charge | null> {
  if (!chargeId) return null;
  try {
    return await client.charges.retrieve(chargeId, {}, account);
  } catch (err) {
    console.error(`[quote-refund] couldn't read ${chargeId} back after the refund`, err);
    return null;
  }
}

function chargeIdOf(refund: Stripe.Refund): string | null {
  if (!refund.charge) return null;
  return typeof refund.charge === "string" ? refund.charge : refund.charge.id;
}

// ---------------------------------------------------------------------------
// The dashboard door
// ---------------------------------------------------------------------------

export type QuoteRefundSyncOutcome =
  | {
      status: "synced";
      payment: QuotePayment;
      refundedAmountCents: number;
      refundedFeeCents: number;
    }
  /** Stripe is telling us something the row already says. A retry, or our own refund. */
  | { status: "already-synced"; payment: QuotePayment }
  /**
   * The quote card's own refund, still within {@link ADMIN_REFUND_SETTLE_WINDOW_MS}:
   * nothing written, nothing sent. The webhook answers so Stripe asks again.
   */
  | { status: "deferred"; payment: QuotePayment }
  /** No instalment was paid with this charge either. Needs a human. */
  | { status: "unknown-charge" };

/**
 * Bring an instalment into line with a charge Stripe says has been refunded —
 * the path a refund issued in the Stripe dashboard travels, reached by the
 * webhook when the charge matched no booking.
 *
 * Idempotent by reconciliation, as `syncRefundFromStripe` is: the charge's
 * cumulative figures are the whole truth, the row is set to them, and a
 * delivery that finds them already written does nothing at all.
 */
export async function syncQuotePaymentRefundFromStripe(options: {
  charge: Stripe.Charge;
  /** The refund the event was about, when it carried one. */
  refundId?: string | null;
  /** The refund itself, when the event was about one (`refund.updated`). */
  refund?: Stripe.Refund | null;
  now?: Date;
}): Promise<QuoteRefundSyncOutcome> {
  const { charge, now = new Date() } = options;

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  const found = await getPaymentByCharge(charge.id, paymentIntentId);
  if (!found) return { status: "unknown-charge" };
  const { payment } = found;

  const refundedAmountCents = charge.amount_refunded;
  const feeTarget = proportionalFeeRefundCents({
    feeCents: charge.application_fee_amount ?? 0,
    chargeCents: charge.amount,
    refundedCents: refundedAmountCents,
  });

  // The common case by a distance: every retry, and every event our own
  // refund action caused.
  if (
    payment.refundedAmountCents === refundedAmountCents &&
    payment.refundedFeeCents === feeTarget
  ) {
    return { status: "already-synced", payment };
  }

  if (refundedAmountCents < payment.refundedAmountCents) {
    // A refund reversed or failed after the fact. The amounts follow Stripe
    // down; the status does not come back with them (see
    // `instalmentStatusAfterRefund`).
    console.error(
      `[quote-refund] ${quoteRef(found.quote.id)}: Stripe now says ${refundedAmountCents} ` +
        `is refunded on the ${payment.kind}, down from ${payment.refundedAmountCents} — ` +
        `the row follows the money but keeps status ${payment.status}; needs a human`,
    );
  }

  // Money newly went back: if the quote card sent any of it and has not written
  // it yet, the quote card claims it. Every refund the row has not recorded
  // counts, not only the newest — the total this door would write includes
  // them all.
  const unrecorded =
    refundedAmountCents > payment.refundedAmountCents
      ? await unrecordedRefunds(charge, options.refund ?? null, payment, refundedAmountCents)
      : [];
  const awaitingCard = unrecorded.find((refund) => issuedByQuoteCard(refund, payment));
  if (awaitingCard) {
    if (now.getTime() - awaitingCard.created * 1000 < ADMIN_REFUND_SETTLE_WINDOW_MS) {
      return { status: "deferred", payment };
    }
    console.warn(
      `[quote-refund] ${quoteRef(found.quote.id)}: ${awaitingCard.id} came from the quote card ` +
        `but was never settled there — recording it from Stripe, without the actor`,
    );
  }

  const refundId = options.refundId ?? unrecorded[0]?.id ?? (await latestRefundId(charge));

  const settled = await settleInstalmentRefund({
    quote: found.quote,
    payment,
    refundedAmountCents,
    charge,
    refundId,
    via: "stripe",
    actorUserId: null,
    cancelEvent: false,
    now,
  });

  if (!settled.claimed) return { status: "already-synced", payment };

  return {
    status: "synced",
    payment: settled.payment,
    refundedAmountCents,
    refundedFeeCents: settled.payment.refundedFeeCents,
  };
}

/**
 * How long the dashboard door leaves a quote-card refund to the quote card.
 *
 * Longer than any request can live — the admin action runs under Vercel's
 * 300-second function limit — so by the time a deferred event comes back the
 * admin door has either written the refund or is gone. Measured from Stripe's
 * `created`, which is after the admin door started.
 */
export const ADMIN_REFUND_SETTLE_WINDOW_MS = 10 * 60 * 1000;

/**
 * The refunds behind the money this row has not recorded yet, newest first.
 *
 * A `charge.refunded` event carries no refund, and two refunds close together
 * on one instalment can each be somebody else's — so the newest alone says
 * nothing about the one that fired this event. Instead: Stripe added
 * `charge.amount_refunded - payment.refundedAmountCents` since the row was
 * written, so walk the charge's refunds from the newest back until that much
 * is accounted for, stopping early at the refund the row already carries (it
 * and everything older is written). The refund a `refund.updated` event
 * carried is always one of them.
 *
 * Empty when Stripe cannot say — and then nothing is deferred, because a
 * refund we cannot read is not one we can attribute.
 */
async function unrecordedRefunds(
  charge: Stripe.Charge,
  carried: Stripe.Refund | null,
  payment: QuotePayment,
  chargeRefundedCents: number,
): Promise<Stripe.Refund[]> {
  const behind: Stripe.Refund[] = [];
  if (carried && carried.id !== payment.stripeRefundId) behind.push(carried);
  if (!isStripeConfigured()) return behind;

  try {
    const listed = await onOwningAccount(async (account) => {
      const recent = await stripe().refunds.list({ charge: charge.id, limit: 10 }, account);
      return recent.data;
    });

    let uncovered = chargeRefundedCents - payment.refundedAmountCents;
    for (const refund of listed) {
      if (uncovered <= 0 || refund.id === payment.stripeRefundId) break;
      // A refund that did not go through added nothing to the charge.
      if (refund.status === "failed" || refund.status === "canceled") continue;
      uncovered -= refund.amount;
      if (!behind.some((known) => known.id === refund.id)) behind.push(refund);
    }
  } catch (err) {
    console.warn(`[quote-refund] couldn't read the refunds behind ${charge.id}`, err);
  }
  return behind.sort((a, b) => b.created - a.created);
}

/** Whether `refund` is one {@link issueInstalmentRefund} made for this instalment. */
function issuedByQuoteCard(refund: Stripe.Refund, payment: QuotePayment): boolean {
  const metadata = refund.metadata;
  if (!metadata || metadata.via !== "admin") return false;
  if (metadata.quotePaymentId && metadata.quotePaymentId !== payment.id) return false;
  // A refund that did not go through is the admin door's refusal, not its claim.
  return refund.status !== "failed" && refund.status !== "canceled";
}

// ---------------------------------------------------------------------------
// The one write both doors end in
// ---------------------------------------------------------------------------

/**
 * Write the refund, return the commission, call the event off if asked, audit
 * it, and tell the couple — in that order.
 *
 * `claimed: false` means the compare-and-set found the row already moved: the
 * other door got there first (the admin refund and its webhook echo), and it
 * has written the amounts, the fee, its audit row and the notice. What is left
 * for this caller is only what the other door could not do — the cancellation
 * the operator asked for — and, since the other door's notice said the event
 * was still on, telling the couple it is not. The row handed back is read
 * fresh, so the caller reports what is now true rather than what it read.
 */
async function settleInstalmentRefund(options: {
  quote: Quote;
  payment: QuotePayment;
  refundedAmountCents: number;
  /** The charge the money was on — the fee, its id and the charged amount. */
  charge: Stripe.Charge | null;
  refundId: string | null;
  via: QuoteRefundVia;
  actorUserId: string | null;
  cancelEvent: boolean;
  now: Date;
}): Promise<{ claimed: boolean; quote: Quote; payment: QuotePayment }> {
  const { quote, payment, refundedAmountCents, charge, refundId, via, actorUserId, now } =
    options;

  const claimed = await recordPaymentRefund(payment, {
    refundedAmountCents,
    stripeRefundId: refundId,
    now,
  });

  if (!claimed) {
    const cancelled = options.cancelEvent
      ? await cancelEvent(quote, actorUserId, "refund", now)
      : null;
    // Only once the winner's refund notice is claimed: it builds its text after
    // taking the claim, so before that it still reads the quote as cancelled
    // and says so — and "Evento cancelado … see the earlier email" would reach
    // the couple ahead of the email it points to.
    if (
      cancelled &&
      (await isRefundNoticeClaimed({
        quoteId: quote.id,
        quotePaymentId: payment.id,
        refundedTotalCents: refundedAmountCents,
      }))
    ) {
      await sendEventCancelledNotice(quote.id);
    }

    const fresh = await getPayment(payment.id);
    return {
      claimed: false,
      quote: cancelled ?? fresh?.quote ?? quote,
      payment: fresh?.payment ?? payment,
    };
  }

  // The commission, second and separately: the couple's money is already
  // recorded correctly, and a fee that could not go back must not undo that.
  const feeTaken = charge?.application_fee_amount ?? 0;
  let refundedFeeCents = claimed.refundedFeeCents;
  if (charge && feeTaken > 0) {
    const feeTarget = proportionalFeeRefundCents({
      feeCents: feeTaken,
      chargeCents: charge.amount,
      refundedCents: refundedAmountCents,
    });
    const returned = await topUpApplicationFee({
      charge,
      targetCents: feeTarget,
      // Keyed on the total the fee should reach, so a redelivered event asks
      // for the same top-up once and a larger refund later asks for a new one.
      idempotencyKey: `quote-fee-refund:${payment.id}:${feeTarget}`,
    });
    if (returned.status === "returned") {
      refundedFeeCents = returned.refundedFeeCents;
    } else if (returned.status === "failed") {
      console.error(
        `[quote-refund] ${quoteRef(quote.id)}: refunded ${refundedAmountCents} on the ` +
          `${payment.kind} but couldn't return ${feeTarget} of commission on ${returned.feeId} — needs a human`,
        returned.error,
      );
    }
  }

  const settled =
    refundedFeeCents === claimed.refundedFeeCents
      ? claimed
      : ((await recordPaymentRefundFee(claimed.id, refundedFeeCents, now)) ?? claimed);

  if (
    refundedAmountCents === payment.refundedAmountCents &&
    settled.refundedFeeCents === payment.refundedFeeCents
  ) {
    // The echo of a refund whose fee Stripe rounded differently from the
    // proportion: the row already holds what Stripe holds, so there is nothing
    // to audit and nobody to tell.
    return { claimed: false, quote, payment: settled };
  }

  await recordAuditOrWarn({
    // Nobody here pressed anything on a dashboard refund — the actor is Stripe.
    actorUserId,
    action: "quote.payment_refunded",
    entityType: "tour_request",
    entityId: quote.tourRequestId,
    before: {
      status: payment.status,
      refundedAmountCents: payment.refundedAmountCents,
      refundedFeeCents: payment.refundedFeeCents,
    },
    after: {
      quoteRef: quoteRef(quote.id),
      instalment: payment.kind,
      status: settled.status,
      via,
      // Both amounts: "€600 refunded" means something different against a
      // €600 deposit than against a €1 400 balance.
      amountCents: settled.amountCents,
      refundedAmountCents,
      applicationFeeCents: feeTaken > 0 ? feeTaken : null,
      refundedFeeCents,
      stripeRefundId: refundId,
      stripeChargeId: charge?.id ?? settled.stripeChargeId,
    },
    ...(via === "stripe" ? { ipAddress: null } : {}),
  });

  const cancelled = options.cancelEvent
    ? await cancelEvent(quote, actorUserId, "refund", now)
    : null;

  // Only money that newly went back is news to the couple. A delivery that
  // moved only the fee, or followed a failed refund down, says nothing.
  if (refundedAmountCents > payment.refundedAmountCents) {
    await sendRefundNotice({
      paymentId: settled.id,
      refundedTotalCents: refundedAmountCents,
      refundedNowCents: refundedAmountCents - payment.refundedAmountCents,
    });
  }

  // `cancelled` is null when the other door's cancellation got there first
  // (a double submit, with the lost claim above); the quote is then read fresh,
  // so the caller reports it cancelled and the calendar is revalidated.
  const current = cancelled ?? (options.cancelEvent ? await getQuote(quote.id) : null);
  return { claimed: true, quote: current ?? quote, payment: settled };
}

// ---------------------------------------------------------------------------
// Calling the event off
// ---------------------------------------------------------------------------

export type CancelHeldQuoteOutcome =
  | { status: "cancelled"; quote: Quote }
  | { status: "not-found" }
  /** The deposit is not all back, or the quote is already cancelled. */
  | { status: "not-held"; quote: Quote };

/**
 * "Cancelar evento" — call off a quote whose deposit has gone back in full but
 * which is still held: a dashboard refund, or a refund whose dialog left the
 * event on. Left alone it would still have its balance asked for at T−14.
 *
 * Only in that state, on purpose: cancelling a paid event with its money still
 * held is a refund decision, and belongs in the refund dialog.
 *
 * The couple's last word on a held quote was its refund notice, which said
 * the event was still on; the cancellation is told in its own notice.
 */
export async function cancelHeldQuote(options: {
  quoteId: string;
  actorUserId: string | null;
  now?: Date;
}): Promise<CancelHeldQuoteOutcome> {
  const { quoteId, actorUserId, now = new Date() } = options;

  const quote = await getQuote(quoteId);
  if (!quote) return { status: "not-found" };
  if (quote.status === "cancelled" || !depositRefundedInFull(quote.payments)) {
    return { status: "not-held", quote };
  }

  const cancelled = await cancelEvent(quote, actorUserId, "held-quote", now);
  if (!cancelled) return { status: "not-held", quote };

  await sendEventCancelledNotice(quote.id);
  return { status: "cancelled", quote: cancelled };
}

/**
 * The quote to `cancelled`, its open instalments written off, and the audit row
 * saying who and from where. `null` when it was already cancelled.
 */
async function cancelEvent(
  quote: Quote,
  actorUserId: string | null,
  from: "refund" | "held-quote",
  now: Date,
): Promise<Quote | null> {
  const result = await cancelQuoteAndOpenInstalments(quote.id, now);
  if (!result) return null;

  await expireWrittenOffSessions(result.writtenOff);

  await recordAuditOrWarn({
    actorUserId,
    action: "quote.cancelled",
    entityType: "tour_request",
    entityId: quote.tourRequestId,
    before: { status: quote.status },
    after: {
      quoteRef: quoteRef(quote.id),
      status: result.quote.status,
      from,
      writtenOff: result.writtenOff.map((payment) => payment.kind),
    },
  });

  return result.quote;
}

/**
 * Close the Checkout session behind each instalment the cancellation wrote
 * off, so a couple with the balance page still open cannot pay a cancelled
 * event ({@link cancelQuoteAndOpenInstalments} only marks the row).
 *
 * Best-effort, on the owning account: a Stripe failure here must not undo the
 * cancellation, which has already landed by the time this runs — the quote
 * page's own check on `recordQuotePayment` is the backstop if a session slips
 * through.
 */
async function expireWrittenOffSessions(writtenOff: readonly QuotePayment[]): Promise<void> {
  if (!isStripeConfigured()) return;

  await Promise.all(
    writtenOff
      .filter((payment): payment is QuotePayment & { stripeSessionId: string } =>
        payment.stripeSessionId !== null,
      )
      .map(async (payment) => {
        try {
          await expireSession(payment.stripeSessionId);
        } catch (err) {
          console.error(
            `[quote-refund] couldn't expire the Checkout session behind the written-off ${payment.kind}`,
            err,
          );
        }
      }),
  );
}

// ---------------------------------------------------------------------------
// The couple's notice
// ---------------------------------------------------------------------------

type QuoteNoticeContext = {
  quote: NonNullable<Awaited<ReturnType<typeof getQuote>>>;
  lead: typeof tourRequests.$inferSelect;
  locale: Locale;
  money: (cents: number) => string;
  totalRefunded: number;
};

/**
 * What both couple's notices read fresh: the quote, its lead, the quote's
 * language and what has gone back on it so far. `null` when there is nobody to
 * write to (the quote or lead is gone, or the quote has no lead — warned as
 * `<what> was not sent`), so each notice just returns.
 */
async function loadQuoteNoticeContext(
  quoteId: string,
  what: string,
  accept: (quote: QuoteNoticeContext["quote"]) => boolean = () => true,
): Promise<QuoteNoticeContext | null> {
  const quote = await getQuote(quoteId);
  if (!quote || !accept(quote)) return null;
  if (!quote.tourRequestId) {
    console.warn(`[quote-refund] ${quoteRef(quote.id)} has no lead — no ${what} sent`);
    return null;
  }
  const [lead] = await db
    .select()
    .from(tourRequests)
    .where(eq(tourRequests.id, quote.tourRequestId))
    .limit(1);
  if (!lead) return null;

  const locale = quote.locale;
  return {
    quote,
    lead,
    locale,
    money: (cents) => formatPrice(cents, locale, quote.currency),
    totalRefunded: quote.payments.reduce((sum, payment) => sum + payment.refundedAmountCents, 0),
  };
}

/** Logs a notice that was not sent; sending itself never throws past the caller. */
function warnIfUnsent(
  quote: QuoteNoticeContext["quote"],
  what: string,
  result: LoggedSend,
): void {
  if (result.status === "failed" || result.status === "skipped") {
    console.error(`[quote-refund] ${quoteRef(quote.id)} ${what} was not sent (${result.reason})`);
  }
}

/**
 * One `quote-refunded` email to the couple, claimed in the message log under
 * the instalment and its refunded total. Read fresh, after the write and any
 * cancellation, so the totals and "the event is off" are what is now true.
 * Never throws: the money is recorded whatever the mail does.
 */
async function sendRefundNotice(options: {
  paymentId: string;
  refundedTotalCents: number;
  refundedNowCents: number;
}): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const found = await getPayment(options.paymentId);
    if (!found) return;
    const context = await loadQuoteNoticeContext(found.quote.id, "refund notice");
    if (!context) return;
    const { quote, lead } = context;

    const result = await sendLoggedEmail(
      {
        kind: "quote-refunded",
        recipient: "guest",
        quoteId: quote.id,
        quotePaymentId: found.payment.id,
        refundedTotalCents: options.refundedTotalCents,
        tourRequestId: lead.id,
      },
      // Built under the claim, from a read taken after it: a lost-claim
      // cancellation that finds this claim absent stands down on the promise
      // that this text will say the event is off.
      async () => {
        const latest = await loadQuoteNoticeContext(quote.id, "refund notice");
        if (!latest) return null;

        return guestQuoteRefundEmail({
          instalment: found.payment.kind,
          ref: quoteRef(latest.quote.id),
          guestName: lead.name,
          guestEmail: lead.email,
          locale: latest.locale,
          date: formatDay(latest.quote.eventDate, latest.locale),
          venue: latest.quote.venue,
          paid: latest.money(found.payment.amountCents),
          amount: latest.money(options.refundedNowCents),
          totalRefunded: latest.money(latest.totalRefunded),
          eventCancelled: latest.quote.status === "cancelled",
        });
      },
    );

    warnIfUnsent(quote, "refund notice", result);
  } catch (err) {
    console.error(`[quote-refund] couldn't send the refund notice for ${options.paymentId}`, err);
  }
}

/**
 * One `quote-event-cancelled` email to the couple, claimed in the message log
 * under the quote — a quote is cancelled once, so a retry or a second
 * "Cancelar evento" finds the claim. Read fresh, so the total refunded is
 * what is now true. Never throws: the cancellation stands whatever the mail
 * does.
 */
async function sendEventCancelledNotice(quoteId: string): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    const context = await loadQuoteNoticeContext(
      quoteId,
      "cancellation notice",
      (quote) => quote.status === "cancelled",
    );
    if (!context) return;
    const { quote, lead, locale, money, totalRefunded } = context;

    // A failed or skipped refund notice leaves nothing earlier to point at.
    const refundNoticeSent = await hasSentQuoteRefundNotice(quote.id);

    const result = await sendLoggedEmail(
      {
        kind: "quote-event-cancelled",
        recipient: "guest",
        quoteId: quote.id,
        tourRequestId: lead.id,
      },
      guestQuoteEventCancelledEmail({
        ref: quoteRef(quote.id),
        guestName: lead.name,
        guestEmail: lead.email,
        locale,
        date: formatDay(quote.eventDate, locale),
        venue: quote.venue,
        totalRefunded: money(totalRefunded),
        refundNoticeSent,
      }),
    );

    warnIfUnsent(quote, "cancellation notice", result);
  } catch (err) {
    console.error(`[quote-refund] couldn't send the cancellation notice for ${quoteId}`, err);
  }
}
