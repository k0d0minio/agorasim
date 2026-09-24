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
 * Nothing here decides what the terms allow (D9's 30 days, the `[LAWYER]`
 * items). The amount is the team's judgement, as on the tour dialog.
 */
import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db, tourRequests, type Quote, type QuotePayment } from "@/db";
import { formatDay } from "@/lib/availability";
import { recordAuditOrWarn } from "@/lib/audit";
import { guestQuoteRefundEmail } from "@/lib/booking-emails";
import {
  latestRefundId,
  proportionalFeeRefundCents,
  topUpApplicationFee,
} from "@/lib/booking-refund";
import { isEmailConfigured } from "@/lib/email";
import { sendLoggedEmail } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
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
  | { status: "refund-failed"; payment: QuotePayment; message: string };

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
 * the report.
 */
export async function refundQuotePayment(options: {
  paymentId: string;
  refundCents: number;
  /** "Cancelar também o evento" — call the quote off once the money is back. */
  cancelEvent: boolean;
  actorUserId: string | null;
  now?: Date;
}): Promise<QuoteRefundOutcome> {
  const { paymentId, refundCents, cancelEvent, actorUserId, now = new Date() } = options;

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

  let issued: { refund: Stripe.Refund; charge: Stripe.Charge | null };
  try {
    issued = await issueInstalmentRefund(found.quote, payment, refundCents);
  } catch (err) {
    console.error(`[quote-refund] ${quoteRef(found.quote.id)}: Stripe refused the refund`, err);
    return {
      status: "refund-failed",
      payment,
      message: err instanceof Error ? err.message : "Stripe refused the refund.",
    };
  }

  const { refund, charge } = issued;
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

  const settled = await settleInstalmentRefund({
    quote: found.quote,
    payment,
    // What has gone back on it now: what the row said, and this refund. The
    // webhook echo reads the same total off the charge and finds it written.
    refundedAmountCents: payment.refundedAmountCents + refund.amount,
    charge,
    refundId: refund.id,
    via: "admin",
    actorUserId,
    cancelEvent,
    now,
  });

  return {
    status: "refunded",
    quote: settled.quote,
    payment: settled.payment,
    refundedCents: refund.amount,
    eventCancelled: settled.quote.status === "cancelled",
  };
}

/**
 * The Stripe half: refund the instalment's payment intent on the account that
 * took the money, returning the application fee with it where there was one.
 *
 * The charge is read first, as for a tour, because whether a fee was taken is
 * Stripe's to say — and the same object later names the fee to top up. Keyed on
 * what has already gone back as well as what is going back now, so a
 * double-submitted form collapses into one refund while a second, deliberate
 * partial refund of the same amount is a new request.
 */
async function issueInstalmentRefund(
  quote: Quote,
  payment: QuotePayment,
  amountCents: number,
): Promise<{ refund: Stripe.Refund; charge: Stripe.Charge | null }> {
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
        idempotencyKey: `quote-refund:${payment.id}:${payment.refundedAmountCents}:${amountCents}`,
      },
    );

    return { refund, charge };
  });
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

  const refundId = options.refundId ?? (await latestRefundId(charge));

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
 * the operator asked for.
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
    return { claimed: false, quote: cancelled ?? quote, payment };
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

  return { claimed: true, quote: cancelled ?? quote, payment: settled };
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
  return cancelled ? { status: "cancelled", quote: cancelled } : { status: "not-held", quote };
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

// ---------------------------------------------------------------------------
// The couple's notice
// ---------------------------------------------------------------------------

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
    const quote = await getQuote(found.quote.id);
    if (!quote) return;
    if (!quote.tourRequestId) {
      console.warn(`[quote-refund] ${quoteRef(quote.id)} has no lead — no refund notice sent`);
      return;
    }
    const [lead] = await db
      .select()
      .from(tourRequests)
      .where(eq(tourRequests.id, quote.tourRequestId))
      .limit(1);
    if (!lead) return;

    const locale = quote.locale;
    const money = (cents: number) => formatPrice(cents, locale, quote.currency);
    const totalRefunded = quote.payments.reduce(
      (sum, payment) => sum + payment.refundedAmountCents,
      0,
    );

    const result = await sendLoggedEmail(
      {
        kind: "quote-refunded",
        recipient: "guest",
        quoteId: quote.id,
        quotePaymentId: found.payment.id,
        refundedTotalCents: options.refundedTotalCents,
        tourRequestId: lead.id,
      },
      guestQuoteRefundEmail({
        instalment: found.payment.kind,
        ref: quoteRef(quote.id),
        guestName: lead.name,
        guestEmail: lead.email,
        locale,
        date: formatDay(quote.eventDate, locale),
        venue: quote.venue,
        paid: money(found.payment.amountCents),
        amount: money(options.refundedNowCents),
        totalRefunded: money(totalRefunded),
        eventCancelled: quote.status === "cancelled",
      }),
    );

    if (result.status === "failed" || result.status === "skipped") {
      console.error(
        `[quote-refund] ${quoteRef(quote.id)} refund notice was not sent (${result.reason})`,
      );
    }
  } catch (err) {
    console.error(`[quote-refund] couldn't send the refund notice for ${options.paymentId}`, err);
  }
}
