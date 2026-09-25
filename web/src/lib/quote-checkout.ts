/**
 * Paying a quote — the Checkout session the quote page mints on tap, and the
 * record of the money once it lands.
 *
 * D25 fixes the shape: no long-lived Stripe Payment Link objects and no raw
 * session in any email. The couple open their quote page whenever they like —
 * days after the quote was sent — and a tap on its one button creates the
 * session for whichever instalment is due right then (`dueInstalment`). A
 * session lives an hour; the page, not the session, is the durable thing.
 *
 * **Never two payable sessions for one instalment.** That is the rule every
 * branch below serves, because two open sessions is how a couple pays their
 * deposit twice:
 *
 * - an instalment whose current session is still open reuses it;
 * - one whose session has expired gets a new one, and the swap on the row is
 *   compare-and-set on the session it replaces (`reissuePayment`'s
 *   `replacing`), so two taps racing each other record one session and the
 *   loser expires its own at Stripe;
 * - an open session minted under older terms is expired at Stripe *before* its
 *   replacement is created — the couple are paying under the terms the page
 *   shows them now, and the session carries that version;
 * - a completed session (paid, or waiting on a delayed method like
 *   Multibanco) mints nothing: the money is on its way.
 *
 * **Recorded by whichever gets there first.** The webhook is the authority on
 * payment, and the page Stripe returns the couple to asks Stripe too — the
 * same pairing `/reservar/confirmacao` has with `confirmPaidBooking`. Both call
 * {@link recordQuotePayment}; `markPaymentPaid` is guarded on the instalment's
 * status, and the receipts are claimed in the message log under the quote and
 * the kind, so either order sends each email once.
 *
 * **The fee is the agreement's 6% of this instalment** (§5), as an application
 * fee on a direct charge to the connected account — or no fee at all while
 * Connect is unconfigured, exactly as the tour checkout behaves, so a preview
 * without a connected account can still take a test payment.
 *
 * **The token.** The plaintext reaches this module from the page's own URL and
 * leaves it inside the return URLs Stripe sends the couple back to. It is
 * never logged, never put in session metadata and never stored.
 */
import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db, tourRequests, type QuotePayment, type TourRequest } from "@/db";
import { TERMS_VERSION } from "@/content/terms";
import { quotePageContent } from "@/content/quote-page";
import { t, type Locale } from "@/i18n/config";
import { formatDay, todayKey } from "@/lib/availability";
import {
  guestQuoteReceiptEmail,
  teamQuoteReceiptEmail,
  type QuoteReceiptEmailFacts,
  type QuoteReceiptInstalment,
} from "@/lib/booking-emails";
import { commissionOn } from "@/lib/commission";
import { isEmailConfigured, teamRecipients } from "@/lib/email";
import { sendLoggedEmail } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { captureAlert } from "@/lib/observability";
import {
  BALANCE_DUE_DAYS_BEFORE,
  dueInstalment,
  getPayment,
  getPaymentBySessionId,
  getQuote,
  getQuoteByAccessTokenHash,
  markPaymentIssued,
  markPaymentPaid,
  quoteRef,
  reissuePayment,
  type PaymentSettlement,
  type QuoteWithPayments,
} from "@/lib/quotes";
import {
  isQuoteTokenConfigured,
  looksLikeQuoteToken,
  quotePath,
  quoteTokenDigest,
} from "@/lib/quote-token";
import { siteUrl } from "@/lib/site-origin";
import {
  connectedAccountId,
  isStripeConfigured,
  onConnectedAccount,
  onOwningAccount,
  stripe,
} from "@/lib/stripe";

/**
 * How long a minted session stays payable. Short, because a new one costs a
 * tap: the page is what the couple keep, and a session that outlives the tab
 * it was opened in is only a second payable object to reason about.
 */
export const QUOTE_SESSION_TTL_MINUTES = 60;

// ---------------------------------------------------------------------------
// The link
// ---------------------------------------------------------------------------

/**
 * The live quote behind a link, or `null` for every other case — unknown,
 * malformed, rotated by a re-send, superseded by a new version, cancelled, or
 * a draft. The page shows the same neutral answer for all of them, so a link
 * that no longer works says nothing about whether it ever did.
 */
export async function resolveQuoteToken(token: string): Promise<QuoteWithPayments | null> {
  // Refused before hashing: a URL segment that cannot be a token is not worth
  // a database round-trip, and not worth a digest either.
  if (!looksLikeQuoteToken(token) || !isQuoteTokenConfigured()) return null;

  const quote = await getQuoteByAccessTokenHash(await quoteTokenDigest(token));
  if (!quote) return null;
  if (quote.status !== "sent" && quote.status !== "deposit_paid" && quote.status !== "paid") {
    return null;
  }
  return quote;
}

// ---------------------------------------------------------------------------
// The session's own label
// ---------------------------------------------------------------------------

/** What a quote session carries, on the session and on its payment intent. */
export type QuoteSessionMetadata = {
  quoteId: string;
  paymentId: string;
  kind: QuoteReceiptInstalment;
  ref: string;
  /** The `TERMS_VERSION` the page showed when the couple tapped pay. */
  termsVersion: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The quote metadata on a session, or `null` when it is not a quote's.
 *
 * This is how the webhook tells a quote session from a tour one before it
 * reaches `confirmPaidBooking`. The payload is signed by Stripe and the
 * sessions are ours, but the ids still go into a `uuid` column — a value that
 * is not one would be a database error, not a lookup miss — so they are
 * shape-checked here.
 */
export function quoteSessionMetadata(
  session: Pick<Stripe.Checkout.Session, "metadata">,
): QuoteSessionMetadata | null {
  const meta = session.metadata ?? {};
  const { quoteId, paymentId, kind, ref, termsVersion } = meta;
  if (!quoteId || !paymentId || !UUID.test(quoteId) || !UUID.test(paymentId)) return null;
  if (kind !== "deposit" && kind !== "balance") return null;
  return { quoteId, paymentId, kind, ref: ref ?? "", termsVersion: termsVersion ?? "" };
}

// ---------------------------------------------------------------------------
// The tap
// ---------------------------------------------------------------------------

/** What a tap on the pay button came to. The page turns each into a sentence. */
export type QuoteCheckoutOutcome =
  /** Off to Stripe — a fresh session, or the one still open. */
  | { status: "redirect"; url: string }
  /** The session completed and is paid; the page now shows the receipt. */
  | { status: "paid" }
  /** The session completed on a delayed method; the money is on its way. */
  | { status: "awaiting" }
  /** Nothing to pay today: the balance is not due yet. */
  | { status: "not-due" }
  /** Nothing to pay at all. */
  | { status: "settled" }
  /** No live quote behind this link. */
  | { status: "not-found" }
  /** Stripe is not configured on this deployment. */
  | { status: "unconfigured" }
  /** Stripe refused or could not be reached. */
  | { status: "failed" };

/**
 * The pay button: find what is due, and send the couple to the one session
 * that may take it. Re-checks everything the page showed — the render may be
 * hours old, and the balance may have fallen due or been paid since.
 */
export async function startQuoteCheckout(options: {
  token: string;
  /** The `/pt` or `/en` the page was on — Stripe's language and the way back. */
  locale: Locale;
  now?: Date;
}): Promise<QuoteCheckoutOutcome> {
  const { token, locale, now = new Date() } = options;

  if (!isStripeConfigured()) return { status: "unconfigured" };
  const quote = await resolveQuoteToken(token);
  if (!quote) return { status: "not-found" };

  try {
    return await checkoutFor(quote, { token, locale, now, attempt: 0 });
  } catch (err) {
    console.error(`[quote-checkout] ${quoteRef(quote.id)}: could not start a payment`, err);
    return { status: "failed" };
  }
}

async function checkoutFor(
  quote: QuoteWithPayments,
  context: { token: string; locale: Locale; now: Date; attempt: number },
): Promise<QuoteCheckoutOutcome> {
  const due = dueInstalment(quote, context.now);
  if (due.kind === "settled") return { status: "settled" };
  if (due.kind === "not-yet") return { status: "not-due" };
  if (due.kind === "not-live") return { status: "not-found" };

  const payment = due.payment;
  const previous = payment.stripeSessionId;

  if (previous) {
    const existing = await retrieveSession(previous);
    if (existing?.status === "open") {
      // Still payable, and under the terms the page shows today: the same
      // session, not a second one.
      if (existing.url && existing.metadata?.termsVersion === TERMS_VERSION) {
        return { status: "redirect", url: existing.url };
      }
      // Minted under older terms. Expired first, so it can never be paid
      // alongside the one that replaces it.
      const closed = await expireSession(previous);
      if (closed?.status === "complete") return settleCompleted(closed, context.now);
    } else if (existing?.status === "complete") {
      // A delayed method (Multibanco) that failed leaves the session
      // `complete` and `unpaid` for good; only its payment intent says the
      // attempt is over. Without this the couple would read "waiting for your
      // payment" for ever and never be offered the button again.
      if (!(await delayedPaymentFailed(existing))) {
        return settleCompleted(existing, context.now);
      }
    }
    // Expired, failed, or unknown to Stripe: mint a new one below.
  }

  const lead = quote.tourRequestId ? await readQuoteLead(quote.tourRequestId) : null;
  const kind = payment.kind === "balance" ? "balance" : "deposit";
  const connected = connectedAccountId();
  const fee = connected ? commissionOn("event", payment.amountCents) : null;
  const metadata: QuoteSessionMetadata = {
    quoteId: quote.id,
    paymentId: payment.id,
    kind,
    ref: quoteRef(quote.id),
    termsVersion: TERMS_VERSION,
  };

  const page = `${siteUrl()}${quotePath(context.locale, context.token)}`;
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency,
            unit_amount: payment.amountCents,
            product_data: {
              name: `${t(quotePageContent.instalmentNames[kind], context.locale)} — ${metadata.ref}`,
            },
          },
        },
      ],
      customer_email: lead?.email || undefined,
      client_reference_id: payment.id,
      metadata,
      payment_intent_data: {
        // Also on the intent: it is what a refund in the Stripe dashboard shows.
        metadata,
        ...(fee ? { application_fee_amount: fee.feeCents } : {}),
      },
      expires_at: Math.floor(context.now.getTime() / 1000) + QUOTE_SESSION_TTL_MINUTES * 60,
      locale: context.locale === "pt" ? "pt" : "en",
      // Back to the quote page either way. The token rides in these two URLs,
      // which Stripe — already the processor of the payment — holds for the
      // session's life; it goes nowhere else.
      success_url: `${page}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: page,
    },
    // A direct charge on the client's account when Connect is configured;
    // `undefined` (the platform) when it is not.
    onConnectedAccount(),
  );
  if (!session.url) throw new Error("Stripe returned a session with no URL");

  const commissionRateBps = fee ? fee.rateBps : null;
  const recorded = previous
    ? await reissuePayment(payment.id, {
        stripeSessionId: session.id,
        replacing: previous,
        commissionRateBps,
        now: context.now,
      })
    : await markPaymentIssued(payment.id, {
        stripeSessionId: session.id,
        commissionRateBps,
        now: context.now,
      });

  if (recorded) return { status: "redirect", url: session.url };

  // Another tap recorded its session first. Ours must not stay payable; the
  // winner's is the one to use, so read the row again and take it.
  await expireSession(session.id);
  if (context.attempt > 0) return { status: "failed" };
  const fresh = await getQuote(quote.id);
  if (!fresh) return { status: "not-found" };
  return checkoutFor(fresh, { ...context, attempt: context.attempt + 1 });
}

/** A completed session: record it if it is paid, or say the money is on its way. */
async function settleCompleted(
  session: Stripe.Checkout.Session,
  now: Date,
): Promise<QuoteCheckoutOutcome> {
  if (session.payment_status !== "paid") return { status: "awaiting" };
  await recordQuotePayment(session, { now });
  return { status: "paid" };
}

/**
 * A session as Stripe has it now, on whichever account owns it — `null` only
 * when Stripe says it does not exist.
 *
 * Any other failure (a timeout, a 5xx) is thrown, and the tap answers
 * "try again": reading a session we could not see as "gone" would mint a
 * second one beside a first that may still be open and payable.
 */
async function retrieveSession(id: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await onOwningAccount((account) =>
      stripe().checkout.sessions.retrieve(id, undefined, account),
    );
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "resource_missing") return null;
    throw err;
  }
}

/**
 * Whether a completed-but-unpaid session's delayed payment has failed — its
 * payment intent back to wanting a payment method, or cancelled. Unreadable
 * counts as "not failed": the safe answer keeps the couple waiting rather
 * than minting a second payable session.
 */
async function delayedPaymentFailed(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.payment_status === "paid") return false;
  const intentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  if (!intentId) return false;

  try {
    const intent = await onOwningAccount((account) =>
      stripe().paymentIntents.retrieve(intentId, undefined, account),
    );
    return intent.status === "requires_payment_method" || intent.status === "canceled";
  } catch (err) {
    console.warn(`[quote-checkout] couldn't read ${intentId} behind ${session.id}`, err);
    return false;
  }
}

/**
 * Close a session so it can no longer be paid, and return it as it now is.
 *
 * Stripe refuses to expire a session that has completed — the couple finished
 * paying a moment ago — so a refusal is answered by reading it back: the
 * caller then records the payment instead of minting a second one.
 */
export async function expireSession(id: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await onOwningAccount((account) =>
      stripe().checkout.sessions.expire(id, undefined, account),
    );
  } catch (err) {
    const current = await retrieveSession(id);
    if (current?.status === "complete" || current?.status === "expired") return current;
    throw err;
  }
}

/** The enquiry behind a quote — the couple's name and address. */
export async function readQuoteLead(id: string): Promise<TourRequest | null> {
  const [lead] = await db.select().from(tourRequests).where(eq(tourRequests.id, id)).limit(1);
  return lead ?? null;
}

// ---------------------------------------------------------------------------
// The money landing
// ---------------------------------------------------------------------------

/** What recording a quote session came to. */
export type QuotePaymentOutcome =
  /** This call recorded the payment. */
  | { status: "recorded"; quote: QuoteWithPayments }
  /** It was already recorded — a redelivery, or the other path won the race. */
  | { status: "already"; quote: QuoteWithPayments | null }
  /** Stripe says the session is not paid (yet). */
  | { status: "not-paid" }
  /** No instalment behind this session — the case that needs a person. */
  | { status: "unknown" };

/**
 * Record a paid quote session: the instalment, the quote and the lead move
 * (`markPaymentPaid`), then the two receipts.
 *
 * The receipts are attempted whenever the instalment is paid, not only when
 * this call was the one to mark it: a first attempt that died between the two
 * would otherwise leave the couple without their copy of the terms for ever.
 * The message log's claim is what keeps that from ever sending twice.
 */
export async function recordQuotePayment(
  session: Stripe.Checkout.Session,
  options: { now?: Date } = {},
): Promise<QuotePaymentOutcome> {
  const { now = new Date() } = options;
  const meta = quoteSessionMetadata(session);

  const found =
    (await getPaymentBySessionId(session.id)) ??
    (meta ? await getPayment(meta.paymentId) : null);
  if (!found) return { status: "unknown" };

  if (found.payment.stripeSessionId !== session.id) {
    // Paid, but not the session the row holds now — replaced a moment after
    // the couple finished it. The money is real, so it is recorded all the same.
    console.warn(
      `[quote-checkout] ${quoteRef(found.quote.id)}: ${session.id} is not the instalment's current session — recording it anyway`,
    );
  }

  if (session.payment_status !== "paid") return { status: "not-paid" };

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const settlement = await readQuoteSettlement(paymentIntentId, found.payment, found.quote.id);
  const marked = await markPaymentPaid(
    found.payment.id,
    {
      ...settlement,
      stripePaymentIntentId: paymentIntentId,
      acceptedTermsVersion: meta?.termsVersion || null,
    },
    now,
  );

  const quote = marked ?? (await getQuote(found.quote.id));
  const paid = quote?.payments.find((payment) => payment.id === found.payment.id);
  const secondCharge =
    !marked &&
    paid?.status === "paid" &&
    paid.stripePaymentIntentId !== null &&
    paymentIntentId !== null &&
    paid.stripePaymentIntentId !== paymentIntentId;

  if (quote?.status === "cancelled" || secondCharge) {
    // A session left open in a tab and paid after the quote was replaced by a
    // new version, or a second session paid for an instalment already paid:
    // either way the couple have paid for something they do not owe, and
    // only a person can say what to give back. No receipt — "the date is
    // held" would be untrue for a cancelled quote and a duplicate otherwise.
    console.error(
      `[quote-checkout] ${quoteRef(found.quote.id)}: ${session.id} was paid on a ${secondCharge ? "paid instalment" : "cancelled quote"} — needs a human`,
    );
    captureAlert("Paid Stripe quote session that nothing was owed on", {
      area: "stripe-webhook",
      tags: { outcome: secondCharge ? "second-charge" : "cancelled-quote" },
      extra: { sessionId: session.id, quoteRef: quoteRef(found.quote.id) },
    });
  } else if (quote && paid?.status === "paid") {
    await sendQuoteReceipts(quote, paid);
  } else if (paid) {
    // Money arrived on an instalment that was no longer payable — written off
    // by the team (a transfer) or refunded. The couple may have paid twice,
    // and only a person can say which payment to give back.
    console.error(
      `[quote-checkout] ${quoteRef(found.quote.id)}: ${session.id} was paid on a ${paid.status} instalment — needs a human`,
    );
    captureAlert("Paid Stripe quote session on an instalment that was not payable", {
      area: "stripe-webhook",
      tags: { outcome: "unpayable-instalment", status: paid.status },
      extra: { sessionId: session.id, quoteRef: quoteRef(found.quote.id) },
    });
  }

  return marked ? { status: "recorded", quote: marked } : { status: "already", quote };
}

/** What the quote page says after Stripe sends the couple back, or nothing. */
export type QuoteReturn = { kind: "confirming" | "awaiting"; paymentId: string } | null;

/**
 * Back from Stripe with `?session_id=`: record the payment if Stripe says it
 * is paid, the way `/reservar/confirmacao` reconciles a tour.
 *
 * A session that is not one of *this* quote's is ignored — the query string is
 * the visitor's to type, and the only thing it may do here is name a payment
 * of the quote whose token opened the page. Every failure resolves to `null`
 * (no banner): the webhook is the authority and records the payment anyway.
 */
export async function reconcileQuoteReturn(
  sessionId: string,
  quoteId: string,
  options: { now?: Date } = {},
): Promise<QuoteReturn> {
  if (!/^cs_[A-Za-z0-9_]{8,250}$/.test(sessionId) || !isStripeConfigured()) return null;

  try {
    const session = await onOwningAccount((account) =>
      stripe().checkout.sessions.retrieve(sessionId, undefined, account),
    );
    const meta = quoteSessionMetadata(session);
    if (!meta || meta.quoteId !== quoteId || session.status !== "complete") return null;
    if (session.payment_status !== "paid") return { kind: "awaiting", paymentId: meta.paymentId };

    await recordQuotePayment(session, options);
    return { kind: "confirming", paymentId: meta.paymentId };
  } catch (err) {
    console.error(`[quote-checkout] couldn't reconcile ${sessionId} for ${quoteRef(quoteId)}`, err);
    return null;
  }
}

/**
 * What Stripe actually took, read back from the charge — the charge id, the
 * account it lives on, and the application fee — as `readCommissionAudit`
 * does for a tour. A Stripe read failing here costs these columns, never the
 * record of the payment: a null is recoverable from Stripe later.
 */
async function readQuoteSettlement(
  paymentIntentId: string | null,
  payment: Pick<QuotePayment, "amountCents">,
  quoteId: string,
): Promise<PaymentSettlement> {
  if (!paymentIntentId || !isStripeConfigured()) return {};

  try {
    const { charge, account } = await onOwningAccount(async (options) => {
      const intent = await stripe().paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["latest_charge"] },
        options,
      );
      return {
        charge:
          intent.latest_charge && typeof intent.latest_charge !== "string"
            ? intent.latest_charge
            : null,
        account: options?.stripeAccount ?? null,
      };
    });
    if (!charge) return {};

    const settlement: PaymentSettlement = {
      stripeChargeId: charge.id,
      stripeConnectedAccountId: account,
    };
    const feeCents = charge.application_fee_amount ?? null;
    if (feeCents === null) return settlement;

    const expected = commissionOn("event", payment.amountCents);
    if (expected.feeCents !== feeCents) {
      console.error(
        `[quote-checkout] ${quoteRef(quoteId)}: Stripe took ${feeCents} in commission, ` +
          `the agreement's 6% of ${payment.amountCents} is ${expected.feeCents} — recording what Stripe took`,
      );
    }
    return { ...settlement, applicationFeeCents: feeCents, commissionRateBps: expected.rateBps };
  } catch (err) {
    console.error(
      `[quote-checkout] couldn't read the charge behind ${paymentIntentId} for ${quoteRef(quoteId)}`,
      err,
    );
    return {};
  }
}

/**
 * The couple's receipt and the team's notice for one paid instalment, each
 * claimed once in the message log under the quote and the kind. Never throws:
 * the money is recorded whatever the mail does.
 */
async function sendQuoteReceipts(
  quote: QuoteWithPayments,
  paid: QuotePayment,
): Promise<void> {
  if (!isEmailConfigured()) return;
  if (paid.kind === "other") return;
  if (!quote.tourRequestId) {
    console.warn(`[quote-checkout] ${quoteRef(quote.id)} has no lead — no receipt sent`);
    return;
  }
  const lead = await readQuoteLead(quote.tourRequestId);
  if (!lead) return;

  const instalment: QuoteReceiptInstalment = paid.kind;
  const kind = instalment === "deposit" ? "deposit-received" : "balance-paid";
  const facts = receiptFacts(quote, paid, lead);
  const team = teamRecipients();
  const subject = { kind, quoteId: quote.id, tourRequestId: lead.id } as const;

  const results = await Promise.all([
    sendLoggedEmail({ ...subject, recipient: "guest" }, guestQuoteReceiptEmail(facts)),
    team.length > 0
      ? sendLoggedEmail({ ...subject, recipient: "team" }, teamQuoteReceiptEmail(facts, team))
      : Promise.resolve({ status: "skipped", reason: "no-recipient" } as const),
  ]);

  for (const [who, result] of [["guest", results[0]], ["team", results[1]]] as const) {
    if (result.status === "sent" || result.status === "duplicate") continue;
    if (result.status === "skipped" && who === "team") continue;
    console.error(
      `[quote-checkout] ${facts.ref} ${kind} to the ${who} was not sent (${result.reason})`,
    );
  }
}

/** The receipt's facts, formatted in the quote's own language. */
export function receiptFacts(
  quote: QuoteWithPayments,
  paid: QuotePayment,
  lead: Pick<TourRequest, "id" | "name" | "email" | "phone">,
): QuoteReceiptEmailFacts {
  const locale = quote.locale;
  const money = (cents: number) => formatPrice(cents, locale, quote.currency);
  // What is still owed after this payment: the balance, when this was the
  // deposit and the balance is still open.
  const balance = quote.payments.find((payment) => payment.kind === "balance");
  const remaining =
    paid.kind === "deposit" &&
    balance &&
    balance.amountCents > 0 &&
    (balance.status === "pending" || balance.status === "issued")
      ? {
          amount: money(balance.amountCents),
          dueDate: balance.dueDate ? formatDay(balance.dueDate, locale) : "",
        }
      : null;
  const paidAt = paid.paidAt ?? new Date();

  return {
    instalment: paid.kind === "balance" ? "balance" : "deposit",
    ref: quoteRef(quote.id),
    guestName: lead.name,
    guestEmail: lead.email,
    guestPhone: lead.phone,
    locale,
    date: formatDay(quote.eventDate, locale),
    venue: quote.venue,
    amount: money(paid.amountCents),
    // The day in Lisbon, the calendar the couple and the terms both keep.
    paidOn: formatDay(todayKey(paidAt), locale),
    total: money(quote.totalCents),
    remaining,
    balanceDueDaysBefore: BALANCE_DUE_DAYS_BEFORE,
    fee: paid.applicationFeeCents !== null ? money(paid.applicationFeeCents) : null,
    adminUrl: `${siteUrl()}/admin/sales/${lead.id}`,
  };
}

/**
 * The webhook's alert for a paid quote session with nothing behind it —
 * money with no instalment, which only a person can reconcile.
 */
export function alertUnknownQuoteSession(sessionId: string, event: string): void {
  console.error(`[stripe] paid quote session ${sessionId} matches no instalment — needs a human`);
  captureAlert("Paid Stripe quote session matches no instalment", {
    area: "stripe-webhook",
    tags: { event, outcome: "unknown-quote-session" },
    extra: { sessionId },
  });
}
