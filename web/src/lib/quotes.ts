/**
 * Quotes: what an event costs, when it happens, and what has been paid of it.
 *
 * The events and weddings half of the business does not sell off a price list —
 * it quotes per job (info PDF §2.3) — and this module is the whole of that
 * record's arithmetic and its access to the database. Two ideas run through it.
 *
 * **The split is frozen at creation, never recomputed.** A quote's total and
 * its deposit percentage produce two instalment rows, and those amounts are
 * what the guest is asked for. Recomputing them on read would mean an edit to a
 * sent quote silently re-pricing a deposit somebody has already paid, which is
 * the sort of bug that is only found by a couple's bank statement. {@link
 * splitTotal} is therefore pure and called once, by {@link createQuote}.
 *
 * **The writes are guarded, and the guard is a state machine.** Every mutation
 * here states which statuses it will act on and refuses the rest, because the
 * alternative is a UI that has to remember: "send" on a cancelled quote,
 * "edit" on one whose deposit has landed, two webhook deliveries marking the
 * same instalment paid twice and doubling the money the board shows. The rules
 * live in {@link QUOTE_TRANSITIONS} and {@link canTransition} so they can be
 * read in one place and tested without a database.
 *
 * **The quote drags the lead along behind it.** A couple whose deposit has
 * landed is not "Contactado" on Rita's board, and the difference is not
 * cosmetic: `lib/retention.ts` exempts a `booked` lead from anonymisation, so a
 * stage that never moves is a couple whose event record is shredded two years
 * after the money arrived. Sending moves the lead to `quoted` and a settled
 * deposit moves it to `booked`, forwards only and never past an archive — see
 * {@link leadStageAfterQuote}.
 *
 * **Commission is not computed here.** `lib/commission.ts` owns the agreement's
 * arithmetic and `lib/quote-checkout.ts` asks it for 6% of each instalment (§5);
 * what this module does is record the figure Stripe actually took, on the
 * payment row it was taken from — the same discipline `bookings` keeps.
 *
 * Server-only: it imports `@/db`. The pure half above the query section is
 * unit-tested through the `server-only` stub, as elsewhere in this repo.
 */
import "server-only";

import { NeonDbError } from "@neondatabase/serverless";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

import {
  db,
  quotePayments,
  quotes,
  tourRequests,
  type Quote,
  type QuoteLineItem,
  type QuotePayment,
  type QuotePaymentKind,
  type QuotePaymentStatus,
  type QuoteStatus,
  type RequestStatus,
  type AppLocale,
} from "@/db";
import { recordAuditOrWarn } from "@/lib/audit";
import { dateKey, isDateKey, parseDateKey, todayKey, type DateKey } from "@/lib/availability";
import { BOOKING_CURRENCY } from "@/lib/money";
import {
  BALANCE_DUE_DAYS_BEFORE,
  DEFAULT_DEPOSIT_PERCENT,
  balanceDueKey,
  lineItemsTotal,
  splitTotal,
} from "@/lib/quote-math";

// ---------------------------------------------------------------------------
// The numbers the agreement fixes
// ---------------------------------------------------------------------------

/**
 * How many days before the event the deposit stops being refundable (D9).
 *
 * A default, not a decision: the client asked for 30 and the lawyer has flagged
 * the *sinal* regime around it. Every quote stores its own window, so moving
 * this never rewrites the terms an accepted quote was accepted under.
 */
export const DEFAULT_TERMS_WINDOW_DAYS = 30;

/** The reference a quote wears: short, stable, greppable — like `bookingRef`. */
export function quoteRef(id: string): string {
  return `QT-${id.slice(0, 6).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Pure arithmetic
// ---------------------------------------------------------------------------

// `splitTotal`, `lineItemsTotal` and the two constants live in
// `lib/quote-math.ts`, so the builder's live preview in the browser computes
// the very figures this module writes. Re-exported, so every caller still
// imports the quote's arithmetic from here.
export {
  BALANCE_DUE_DAYS_BEFORE,
  DEFAULT_DEPOSIT_PERCENT,
  lineItemsTotal,
  splitTotal,
  type QuoteSplit,
} from "@/lib/quote-math";

/**
 * `2026-08-15` plus or minus whole days, as a key.
 *
 * UTC midnight arithmetic, so a DST boundary cannot move a due date: the keys
 * this engine passes around are calendar days, and Portugal changing its clocks
 * in October is not fourteen days becoming thirteen.
 */
export function shiftDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  if (!date) throw new Error(`shiftDays: ${key} is not a YYYY-MM-DD date`);
  return dateKey(new Date(date.getTime() + days * 86_400_000));
}

/**
 * When the balance falls due for an event on this day: T−14.
 *
 * Delegates to `balanceDueKey` in `lib/quote-math.ts`, which the builder's
 * live preview uses in the browser — one computation, so the date Rita sees
 * while typing is the date written to the instalment and emailed.
 */
export function balanceDueDate(eventDate: DateKey): DateKey {
  const due = balanceDueKey(eventDate);
  if (!due) throw new Error(`balanceDueDate: ${eventDate} is not a YYYY-MM-DD date`);
  return due;
}

/**
 * Whether the deposit's non-refundable window has closed.
 *
 * True from the first moment of the day `termsWindowDays` before the event —
 * cancel on that morning and the deposit is kept. Whole days in Europe/Lisbon,
 * because that is the unit the terms are written in and the couple read them
 * in; an hours-based answer would make the same cancellation refundable or not
 * depending on which side of midnight a server is.
 */
export function isInsideNonRefundableWindow(
  quote: Pick<Quote, "eventDate" | "termsWindowDays">,
  now: Date = new Date(),
): boolean {
  return todayKey(now) >= shiftDays(quote.eventDate, -quote.termsWindowDays);
}

// ---------------------------------------------------------------------------
// What the couple owe today
// ---------------------------------------------------------------------------

/**
 * What the quote page offers to pay, today.
 *
 * - `due` — one instalment the couple can pay now: the deposit while it is
 *   unsettled, then the balance from its due date (T−14) on.
 * - `not-yet` — the deposit is settled and the balance is not due until
 *   `dueDate`; the page says so rather than taking it early (the proposal's
 *   terms are the balance 14 days before, and nothing more).
 * - `settled` — nothing is left to pay.
 * - `not-live` — a draft or a cancelled quote, which the page does not show.
 *
 * "Settled" is `paid` or `cancelled`, the same reading {@link
 * statusAfterPayment} makes: a deposit the team wrote off because it arrived
 * by transfer holds the date as surely as one paid through Stripe. A balance
 * of zero (a 100% deposit) has no row, or a row of nothing, and is settled.
 * `other` instalments are the team's own extras and never offered here.
 */
export type DueInstalment =
  | { kind: "due"; payment: QuotePayment }
  | { kind: "not-yet"; payment: QuotePayment; dueDate: DateKey }
  | { kind: "settled" }
  | { kind: "not-live" };

/** Whether an instalment still has money to collect. */
function isOpenInstalment(payment: Pick<QuotePayment, "status" | "amountCents">): boolean {
  return (payment.status === "pending" || payment.status === "issued") && payment.amountCents > 0;
}

export function dueInstalment(
  quote: Pick<Quote, "status"> & { payments: QuotePayment[] },
  now: Date = new Date(),
): DueInstalment {
  if (quote.status !== "sent" && quote.status !== "deposit_paid" && quote.status !== "paid") {
    return { kind: "not-live" };
  }

  const deposit = quote.payments.find((payment) => payment.kind === "deposit");
  if (deposit && isOpenInstalment(deposit)) return { kind: "due", payment: deposit };

  const balance = quote.payments.find((payment) => payment.kind === "balance");
  if (!balance || !isOpenInstalment(balance)) return { kind: "settled" };

  // Whole days in Europe/Lisbon, like the non-refundable window above: the
  // due date is a day the couple read, not an instant a server keeps.
  if (balance.dueDate && todayKey(now) < balance.dueDate) {
    return { kind: "not-yet", payment: balance, dueDate: balance.dueDate };
  }
  return { kind: "due", payment: balance };
}

// ---------------------------------------------------------------------------
// The state machine
// ---------------------------------------------------------------------------

/**
 * Which statuses a quote may move to from each of its states.
 *
 * `sent → draft` is deliberately absent: a quote the couple have seen cannot be
 * un-sent, and a change to it is a re-send under a possibly different terms
 * version, which {@link markQuoteSent} handles. `cancelled` is terminal, and
 * `paid` is too — money that has arrived is not a state to leave, it is one to
 * refund from.
 */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "cancelled"],
  // `sent → paid` looks like a skipped step and is not: a quote whose whole
  // value is settled outside Stripe has both instalments written off at once,
  // and never passes through `deposit_paid`. Writing off the deposit alone is
  // the ordinary bank-transfer case and lands on `deposit_paid` — see
  // {@link statusAfterPayment}.
  sent: ["sent", "deposit_paid", "paid", "cancelled"],
  // A fully-paid event can still be called off; the refund is its own path.
  deposit_paid: ["paid", "cancelled"],
  paid: ["cancelled"],
  cancelled: [],
};

/** Whether a quote may move between these two states. */
export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_TRANSITIONS[from].includes(to);
}

/**
 * The statuses a quote can be in and still legally reach `to`.
 *
 * Every write below puts this in its `WHERE` clause rather than listing the
 * statuses inline, so {@link QUOTE_TRANSITIONS} is the only statement of the
 * rules and the guard is in the statement itself — two operators on two phones
 * is not a hypothetical, and a read-then-write check has a window between the
 * two where the second one's edit lands.
 */
export function statusesThatMayBecome(to: QuoteStatus): QuoteStatus[] {
  return (Object.keys(QUOTE_TRANSITIONS) as QuoteStatus[]).filter((from) =>
    canTransition(from, to),
  );
}

/**
 * Whether the offer can still be edited.
 *
 * Drafts only. Once it has been sent, the total and the date are what the
 * couple were shown and — after the deposit — what they have paid a share of;
 * editing either in place would leave the instalments describing a quote that
 * no longer exists.
 */
export function isEditable(quote: Pick<Quote, "status">): boolean {
  return quote.status === "draft";
}

/**
 * Whether a lead may have a new quote started from nothing — "Criar orçamento".
 *
 * Only when every quote it has is `cancelled` (or it has none). A draft is
 * already the thing to edit, a `sent` quote is changed through "Nova versão",
 * and a quote with money on it is not something a second offer should compete
 * with: a lead holds at most one draft and one live quote, and this is the half
 * of that rule the create path enforces. The send path enforces the other half
 * ({@link supersedeSentQuotes}).
 */
export function canStartQuote(existing: readonly Pick<Quote, "status">[]): boolean {
  return existing.every((quote) => quote.status === "cancelled");
}

/**
 * Whether "Nova versão" is offered on this quote: it is `sent` — nothing has
 * been paid on it — and the lead has no draft already waiting.
 */
export function canCopyAsNewVersion(
  quote: Pick<Quote, "status">,
  siblings: readonly Pick<Quote, "status">[],
): boolean {
  return quote.status === "sent" && !siblings.some((sibling) => sibling.status === "draft");
}

/**
 * Whether a cancelled quote was replaced by a later version, rather than
 * called off — what the card labels "Substituído".
 *
 * A quote that was sent, then cancelled, with a newer quote of the same lead
 * sent after it: that is exactly the trace {@link supersedeSentQuotes} leaves.
 */
export function wasSuperseded(
  quote: Pick<Quote, "status" | "sentAt" | "createdAt">,
  siblings: readonly Pick<Quote, "sentAt" | "createdAt">[],
): boolean {
  if (quote.status !== "cancelled" || !quote.sentAt) return false;
  return siblings.some(
    (sibling) =>
      sibling.sentAt !== null && sibling.createdAt.getTime() > quote.createdAt.getTime(),
  );
}

/** The status a quote takes when one of its instalments is paid. */
export function statusAfterPayment(
  current: QuoteStatus,
  payments: Pick<QuotePayment, "kind" | "status">[],
): QuoteStatus {
  if (current === "cancelled") return current;
  // No instalments at all is not a settled quote — it is a quote nothing has
  // been asked for yet, and reading the empty list as "nothing outstanding"
  // would mark it paid.
  if (payments.length === 0) return current;

  // Everything that was ever owed is settled — an instalment written off by the
  // team (paid by transfer, waived) counts as settled, because what is left to
  // collect is nothing either way.
  const outstanding = payments.filter(
    (payment) => payment.status !== "paid" && payment.status !== "cancelled",
  );
  if (outstanding.length === 0) return "paid";

  // Settled, not paid — and the difference is the bank-transfer case. A deposit
  // the couple sent by transfer is written off by the team (`cancelPayment`)
  // rather than paid through Stripe, and the date is just as held either way.
  // Reading only `paid` here left those quotes at `sent`, which is the status
  // `listQuotesDueForBalance` filters *out*: the couple paid and their balance
  // was then never asked for.
  const depositSettled = payments.some(
    (payment) =>
      payment.kind === "deposit" &&
      (payment.status === "paid" || payment.status === "cancelled"),
  );
  return depositSettled ? "deposit_paid" : current;
}

// ---------------------------------------------------------------------------
// The lead behind the quote
// ---------------------------------------------------------------------------

/**
 * The Sales board's stages, in the order a lead passes through them.
 *
 * `archived` is deliberately absent: it is not a later stage, it is an operator
 * saying "not this one", and {@link leadStageAfterQuote} treats it as a place
 * nothing automatic moves a card out of.
 */
export const LEAD_STAGE_ORDER = ["new", "contacted", "quoted", "booked"] as const;

/**
 * Where a lead should sit once its quote has reached `target`, or `null` when
 * it should not move at all.
 *
 * **Forwards only.** A re-sent quote must not drag a couple who have already
 * paid back from `booked` to `quoted`, and a quote cancelled after a deposit
 * does not un-book them either — nothing here ever returns an earlier stage
 * than the one the lead is on.
 *
 * **Never out of the archive.** An archived lead was archived by a person. A
 * webhook is not the thing that overrules that, so an archived card stays
 * archived and whoever is watching the quote can un-archive it by hand.
 */
export function leadStageAfterQuote(
  current: RequestStatus,
  target: "quoted" | "booked",
): RequestStatus | null {
  if (current === "archived") return null;

  const from = LEAD_STAGE_ORDER.indexOf(current as (typeof LEAD_STAGE_ORDER)[number]);
  const to = LEAD_STAGE_ORDER.indexOf(target);
  return to > from ? target : null;
}

/** The stages a lead can be on and still legally reach `target`. */
export function leadStagesThatMayBecome(target: "quoted" | "booked"): RequestStatus[] {
  return LEAD_STAGE_ORDER.filter((stage) => leadStageAfterQuote(stage, target) !== null);
}

/** The same rule, refusing anything {@link QUOTE_TRANSITIONS} does not allow. */
function nextStatusAfterPayment(
  current: QuoteStatus,
  payments: Pick<QuotePayment, "kind" | "status">[],
): QuoteStatus {
  const next = statusAfterPayment(current, payments);
  return next === current || canTransition(current, next) ? next : current;
}

/**
 * What is still returnable on one instalment: what was paid, less what has
 * already gone back. The ceiling the admin refund validates against, as
 * `refundableCents` is for a booking.
 */
export function instalmentRefundableCents(
  payment: Pick<QuotePayment, "amountCents" | "refundedAmountCents">,
): number {
  return Math.max(0, payment.amountCents - payment.refundedAmountCents);
}

/**
 * An instalment's status once `refundedAmountCents` has gone back on it.
 *
 * `refunded` only when the whole instalment did — a partial refund is goodwill
 * on an event that is still happening, and the instalment stays `paid` with the
 * amount beside it, as a partly refunded tour stays `confirmed`. Only a `paid`
 * row moves: this never walks a `refunded` row back to `paid` when a refund
 * later fails and Stripe's total drops, for the reason the tour reconciler
 * gives — something may already have been decided on the strength of it.
 */
export function instalmentStatusAfterRefund(
  payment: Pick<QuotePayment, "amountCents" | "status">,
  refundedAmountCents: number,
): QuotePaymentStatus {
  if (payment.status !== "paid") return payment.status;
  return refundedAmountCents > 0 && refundedAmountCents >= payment.amountCents
    ? "refunded"
    : "paid";
}

/**
 * Whether the deposit of this quote has gone back in full — the state in which
 * the date is no longer paid for but, until somebody cancels the quote, is
 * still held and its balance still asked for.
 */
export function depositRefundedInFull(
  payments: readonly Pick<QuotePayment, "kind" | "amountCents" | "refundedAmountCents">[],
): boolean {
  const deposit = payments.find((payment) => payment.kind === "deposit");
  return (
    deposit !== undefined &&
    deposit.amountCents > 0 &&
    deposit.refundedAmountCents >= deposit.amountCents
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** A quote and its instalments — the only shape anything renders. */
export type QuoteWithPayments = Quote & { payments: QuotePayment[] };

/** Instalments in the order they are owed: deposit, then balance, then extras. */
const PAYMENT_ORDER: Record<QuotePaymentKind, number> = {
  deposit: 0,
  balance: 1,
  other: 2,
};

function withPayments(quote: Quote, payments: QuotePayment[]): QuoteWithPayments {
  return {
    ...quote,
    payments: [...payments].sort(
      (a, b) =>
        PAYMENT_ORDER[a.kind] - PAYMENT_ORDER[b.kind] ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    ),
  };
}

/** One quote with its instalments, or `null` if there is no such row. */
export async function getQuote(id: string): Promise<QuoteWithPayments | null> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return null;

  const payments = await db
    .select()
    .from(quotePayments)
    .where(eq(quotePayments.quoteId, id));

  return withPayments(quote, payments);
}

/**
 * The quote behind a public link, by the digest of its token.
 *
 * The caller hashes — `lib/quotes.ts` never sees a live token, for the reason
 * `bookings.cancellation_token_hash` is a digest in the first place.
 */
export async function getQuoteByAccessTokenHash(
  tokenHash: string,
): Promise<QuoteWithPayments | null> {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.accessTokenHash, tokenHash))
    .limit(1);
  if (!quote) return null;

  const payments = await db
    .select()
    .from(quotePayments)
    .where(eq(quotePayments.quoteId, quote.id));

  return withPayments(quote, payments);
}

/** Every quote built from one enquiry, newest first — what its page lists. */
export async function listQuotesForLead(
  tourRequestId: string,
): Promise<QuoteWithPayments[]> {
  const rows = await db
    .select()
    .from(quotes)
    .where(eq(quotes.tourRequestId, tourRequestId))
    .orderBy(desc(quotes.createdAt));

  return attachPayments(rows);
}

/** The events coming up, soonest first — the team's own forward view. */
export async function listUpcomingQuotes(options: {
  from?: DateKey;
  statuses?: QuoteStatus[];
  limit?: number;
} = {}): Promise<QuoteWithPayments[]> {
  const {
    from = todayKey(),
    statuses = ["sent", "deposit_paid", "paid"],
    limit = 100,
  } = options;
  if (statuses.length === 0) return [];

  const rows = await db
    .select()
    .from(quotes)
    .where(
      and(
        inArray(quotes.status, statuses),
        gte(quotes.eventDate, from),
      ),
    )
    .orderBy(asc(quotes.eventDate))
    .limit(limit);

  return attachPayments(rows);
}

/**
 * The balances the T−14 job should be issuing today.
 *
 * The whole reason `event_date` is a real `date` column: this is one indexed
 * comparison over `(status, event_date)`, where the same question against the
 * free-text `tour_requests.preferred_date` was not a query at all.
 *
 * `<=` rather than `=`, and that matters — a dispatcher that fails to run on a
 * Tuesday must still catch Tuesday's events on the Wednesday, rather than
 * leaving a couple's balance permanently unasked-for. Nothing is sent twice
 * because the filter is on `issued_at` being null, which the issuing write
 * sets; the date is only what brings the row into view.
 */
export async function listQuotesDueForBalance(options: {
  now?: Date;
  limit?: number;
} = {}): Promise<{ quote: Quote; payment: QuotePayment }[]> {
  const { now = new Date(), limit = 100 } = options;
  // Events at or inside T−14 — i.e. happening on or before today + 14 days.
  const horizon = shiftDays(todayKey(now), BALANCE_DUE_DAYS_BEFORE);

  const rows = await db
    .select({ quote: quotes, payment: quotePayments })
    .from(quotePayments)
    .innerJoin(quotes, eq(quotePayments.quoteId, quotes.id))
    .where(
      and(
        eq(quotes.status, "deposit_paid"),
        eq(quotePayments.kind, "balance"),
        eq(quotePayments.status, "pending"),
        isNull(quotePayments.issuedAt),
        lte(quotes.eventDate, horizon),
      ),
    )
    .orderBy(asc(quotes.eventDate))
    .limit(limit);

  return rows;
}

/** The instalment behind a Stripe Checkout Session — how the webhook resolves one. */
export async function getPaymentBySessionId(
  stripeSessionId: string,
): Promise<{ quote: Quote; payment: QuotePayment } | null> {
  const [row] = await db
    .select({ quote: quotes, payment: quotePayments })
    .from(quotePayments)
    .innerJoin(quotes, eq(quotePayments.quoteId, quotes.id))
    .where(eq(quotePayments.stripeSessionId, stripeSessionId))
    .limit(1);

  return row ?? null;
}

/**
 * The instalment a Stripe charge paid for — how a refund resolves one.
 *
 * Either handle finds it, as for a booking: the charge id is written when the
 * payment lands, the payment intent with it, and a charge whose settlement read
 * failed has only the latter.
 */
export async function getPaymentByCharge(
  stripeChargeId: string,
  stripePaymentIntentId: string | null,
): Promise<{ quote: Quote; payment: QuotePayment } | null> {
  const [row] = await db
    .select({ quote: quotes, payment: quotePayments })
    .from(quotePayments)
    .innerJoin(quotes, eq(quotePayments.quoteId, quotes.id))
    .where(
      stripePaymentIntentId
        ? or(
            eq(quotePayments.stripeChargeId, stripeChargeId),
            eq(quotePayments.stripePaymentIntentId, stripePaymentIntentId),
          )
        : eq(quotePayments.stripeChargeId, stripeChargeId),
    )
    .limit(1);

  return row ?? null;
}

/**
 * One instalment and its quote, by the instalment's id — the fallback the
 * webhook uses when a paid session is no longer the one the row holds (it was
 * replaced a moment after the couple finished paying it). The session's own
 * metadata names the instalment, and money that arrived is recorded either way.
 */
export async function getPayment(
  paymentId: string,
): Promise<{ quote: Quote; payment: QuotePayment } | null> {
  const [row] = await db
    .select({ quote: quotes, payment: quotePayments })
    .from(quotePayments)
    .innerJoin(quotes, eq(quotePayments.quoteId, quotes.id))
    .where(eq(quotePayments.id, paymentId))
    .limit(1);

  return row ?? null;
}

/** Fetch the instalments for a page of quotes in one query, and attach them. */
async function attachPayments(rows: Quote[]): Promise<QuoteWithPayments[]> {
  if (rows.length === 0) return [];

  const payments = await db
    .select()
    .from(quotePayments)
    .where(inArray(quotePayments.quoteId, rows.map((row) => row.id)));

  const byQuote = new Map<string, QuotePayment[]>();
  for (const payment of payments) {
    const list = byQuote.get(payment.quoteId) ?? [];
    list.push(payment);
    byQuote.set(payment.quoteId, list);
  }

  return rows.map((row) => withPayments(row, byQuote.get(row.id) ?? []));
}

// ---------------------------------------------------------------------------
// Guarded writes
// ---------------------------------------------------------------------------

/** Everything a new quote needs. Validated by {@link createQuote}, not trusted. */
export type NewQuoteInput = {
  /** The enquiry it was built from. Null only for a quote raised from nothing. */
  tourRequestId: string | null;
  /** The signed-in operator. Null for anything not raised by a person. */
  createdByUserId?: string | null;
  eventDate: DateKey;
  venue?: string | null;
  locale?: AppLocale;
  totalCents: number;
  lineItems?: QuoteLineItem[];
  depositPercent?: number;
  termsWindowDays?: number;
  currency?: string;
};

/** What a caller got wrong. Thrown rather than returned — see {@link createQuote}. */
export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

/**
 * Thrown by {@link createQuote} when `quotes_one_draft_per_lead_key` refuses
 * the insert — the race `canStartQuote` and `canCopyAsNewVersion` check for
 * but cannot close by themselves: two taps ("Criar orçamento" on two phones,
 * or one of those racing a "Nova versão") both read "no draft yet" and both
 * reach the insert. The database is what actually stops the second one; kept
 * distinct from {@link QuoteError} so a caller can tell "the input was bad"
 * from "someone else's tap won" and answer with the outcome its own pre-check
 * would have given losing that race.
 */
export class QuoteDraftConflictError extends Error {
  constructor() {
    super("createQuote: a draft already exists for this lead");
    this.name = "QuoteDraftConflictError";
  }
}

/** Whether `err` is the unique violation {@link QuoteDraftConflictError} maps. */
function isDraftConflict(err: unknown): boolean {
  return (
    err instanceof NeonDbError &&
    err.code === "23505" &&
    err.constraint === "quotes_one_draft_per_lead_key"
  );
}

/**
 * Validate an offer without writing it — the check a form runs before saving.
 *
 * Returns the problems in the order a person would meet them, empty when there
 * are none. {@link createQuote} runs exactly this and refuses on any of it, so
 * a form that skips the call cannot get a bad row in; the two exist separately
 * only so the form can show all the problems at once instead of the first.
 */
export function validateQuoteInput(input: NewQuoteInput): string[] {
  const problems: string[] = [];

  if (!isDateKey(input.eventDate)) {
    problems.push(`eventDate ${input.eventDate} is not a YYYY-MM-DD calendar day`);
  }
  if (!Number.isSafeInteger(input.totalCents) || input.totalCents <= 0) {
    problems.push(`totalCents ${input.totalCents} is not a positive whole number of cents`);
  }

  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) {
    problems.push(`depositPercent ${depositPercent} is not a share between 1 and 100`);
  }

  const termsWindowDays = input.termsWindowDays ?? DEFAULT_TERMS_WINDOW_DAYS;
  if (!Number.isInteger(termsWindowDays) || termsWindowDays < 0) {
    problems.push(`termsWindowDays ${termsWindowDays} is not a whole number of days`);
  }

  const lineItems = input.lineItems ?? [];
  for (const item of lineItems) {
    if (!Number.isSafeInteger(item.unitCents) || item.unitCents < 0) {
      problems.push(`line "${item.label}" has a unit price that is not whole cents`);
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      problems.push(`line "${item.label}" has a quantity that is not a positive whole number`);
    }
  }

  // Lines explain the total; they do not decide it. But lines that add up to a
  // different number than the figure the couple are shown is a quote nobody can
  // defend on the phone, so it is refused rather than reconciled.
  if (lineItems.length > 0 && problems.length === 0) {
    const summed = lineItemsTotal(lineItems);
    if (summed !== input.totalCents) {
      problems.push(
        `line items come to ${summed} cents but the total is ${input.totalCents} — they must agree`,
      );
    }
  }

  return problems;
}

/**
 * Write a draft quote and the instalments it implies.
 *
 * Both payment rows exist from the start, `pending` and unissued: the balance
 * is a thing that is owed on a date from the moment the offer is made, and the
 * T−14 job's query is "the balance rows that are due and not yet issued" — a
 * row that only appears when the job first runs would make that query mean
 * something else. The one exception is a 100% deposit: {@link splitTotal}
 * leaves nothing for the balance, and a balance row of `0` is not a real
 * instalment — it is a row the T−14 job would still try to issue a link for,
 * to no one's benefit. No row is written for it, and the quote reaches `paid`
 * the moment the deposit does ({@link statusAfterPayment}).
 *
 * Throws {@link QuoteError} on invalid input rather than returning a result
 * type, because every caller is a server action whose error path is already
 * "catch and show the message" and a silently unwritten quote is worse than a
 * visible refusal.
 */
export async function createQuote(input: NewQuoteInput): Promise<QuoteWithPayments> {
  const problems = validateQuoteInput(input);
  if (problems.length > 0) {
    throw new QuoteError(`createQuote: ${problems.join("; ")}`);
  }

  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  const currency = input.currency ?? BOOKING_CURRENCY;
  const { depositCents, balanceCents } = splitTotal(input.totalCents, depositPercent);

  let quote: Quote;
  try {
    [quote] = await db
      .insert(quotes)
      .values({
        tourRequestId: input.tourRequestId,
        createdByUserId: input.createdByUserId ?? null,
        eventDate: input.eventDate,
        venue: input.venue ?? null,
        locale: input.locale ?? "pt",
        lineItems: input.lineItems ?? [],
        totalCents: input.totalCents,
        currency,
        depositPercent,
        termsWindowDays: input.termsWindowDays ?? DEFAULT_TERMS_WINDOW_DAYS,
      })
      .returning();
  } catch (err) {
    if (isDraftConflict(err)) throw new QuoteDraftConflictError();
    throw err;
  }

  const payments = await db
    .insert(quotePayments)
    .values([
      {
        quoteId: quote.id,
        kind: "deposit" as const,
        amountCents: depositCents,
        currency,
        // The deposit is owed on acceptance, not on a date.
        dueDate: null,
      },
      ...(balanceCents > 0
        ? [
            {
              quoteId: quote.id,
              kind: "balance" as const,
              amountCents: balanceCents,
              currency,
              dueDate: balanceDueDate(input.eventDate),
            },
          ]
        : []),
    ])
    .returning();

  return withPayments(quote, payments);
}

/** The parts of an offer a draft may still change. */
export type QuoteDraftPatch = Partial<
  Pick<NewQuoteInput, "eventDate" | "venue" | "totalCents" | "lineItems" | "depositPercent" | "termsWindowDays">
>;

/**
 * Edit a draft, re-deriving the instalments from the new figures.
 *
 * **Drafts only.** Once the quote has been sent the couple have seen these
 * numbers, and after the deposit they have paid a share of them; a re-price is
 * a new quote, not an edit. Returns `null` when the row is missing or no longer
 * a draft, so a stale form cannot quietly rewrite a live offer.
 *
 * The instalments are deleted and rewritten rather than updated, because the
 * set can change: a new deposit percentage moves both amounts and a new event
 * date moves the balance's due date. They carry no Stripe state to lose — a
 * draft has never issued a link.
 */
export async function updateQuoteDraft(
  id: string,
  patch: QuoteDraftPatch,
  now: Date = new Date(),
): Promise<QuoteWithPayments | null> {
  const existing = await getQuote(id);
  if (!existing || !isEditable(existing)) return null;

  const merged: NewQuoteInput = {
    tourRequestId: existing.tourRequestId,
    eventDate: patch.eventDate ?? existing.eventDate,
    venue: patch.venue !== undefined ? patch.venue : existing.venue,
    totalCents: patch.totalCents ?? existing.totalCents,
    lineItems: patch.lineItems ?? existing.lineItems,
    depositPercent: patch.depositPercent ?? existing.depositPercent,
    termsWindowDays: patch.termsWindowDays ?? existing.termsWindowDays,
  };

  const problems = validateQuoteInput(merged);
  if (problems.length > 0) {
    throw new QuoteError(`updateQuoteDraft: ${problems.join("; ")}`);
  }

  const { depositCents, balanceCents } = splitTotal(merged.totalCents, merged.depositPercent);

  const [quote] = await db
    .update(quotes)
    .set({
      eventDate: merged.eventDate,
      venue: merged.venue ?? null,
      totalCents: merged.totalCents,
      lineItems: merged.lineItems ?? [],
      depositPercent: merged.depositPercent,
      termsWindowDays: merged.termsWindowDays,
      updatedAt: now,
    })
    .where(and(eq(quotes.id, id), eq(quotes.status, "draft")))
    .returning();

  // The status guard is in the WHERE clause as well as the read above: two
  // operators on two phones is not a hypothetical, and the read-then-write
  // window is exactly where the second one's edit would land on a quote the
  // first has just sent.
  if (!quote) return null;

  await db.delete(quotePayments).where(eq(quotePayments.quoteId, id));
  const payments = await db
    .insert(quotePayments)
    .values([
      {
        quoteId: id,
        kind: "deposit" as const,
        amountCents: depositCents,
        currency: existing.currency,
        dueDate: null,
      },
      // No balance row at a 100% deposit — see the note on `createQuote`.
      ...(balanceCents > 0
        ? [
            {
              quoteId: id,
              kind: "balance" as const,
              amountCents: balanceCents,
              currency: existing.currency,
              dueDate: balanceDueDate(merged.eventDate),
            },
          ]
        : []),
    ])
    .returning();

  return withPayments(quote, payments);
}

/**
 * Mark a quote sent, under a stated terms version and behind a link.
 *
 * Re-sendable: a quote that has been corrected and sent again is still `sent`,
 * and {@link QUOTE_TRANSITIONS} allows `sent → sent` for exactly that. The
 * terms version moves with the send; what the couple *accepted* does not (see
 * `quotes.accepted_terms_version`).
 *
 * `tokenHash` is a digest the caller has already computed. Passing it again on
 * a re-send rotates the link, which is the correct behaviour when a quote has
 * gone to the wrong address; omitting it keeps the existing one.
 *
 * `from` narrows the statuses the write will land on, and `ifSentAt` pins it
 * to the send the caller saw. The builder uses both: "Enviar" is a draft's
 * action only, so a double tap finds the quote already `sent` and moves
 * nothing, where the `sent → sent` the state machine allows would otherwise
 * rotate the link and mail the couple twice; "Reenviar" names the `sent_at` on
 * the screen it was pressed from, so the second of two taps — or two phones —
 * finds a newer stamp and does nothing.
 *
 * Sending also moves the lead behind the quote to `quoted`, so the Sales board
 * shows the couple where they actually are. See {@link moveLeadStage}.
 */
export async function markQuoteSent(
  id: string,
  options: {
    termsVersion: string;
    tokenHash?: string;
    /** The operator behind the send, for the lead's stage-move audit entry. */
    actorUserId?: string | null;
    /** Only from these statuses — a subset of what may become `sent`. */
    from?: readonly QuoteStatus[];
    /** Only if the quote was last sent at exactly this instant. */
    ifSentAt?: Date;
    now?: Date;
  },
): Promise<Quote | null> {
  const {
    termsVersion,
    tokenHash,
    actorUserId = null,
    from = statusesThatMayBecome("sent"),
    ifSentAt,
    now = new Date(),
  } = options;

  const allowed = from.filter((status) => canTransition(status, "sent"));
  if (allowed.length === 0) return null;

  const [quote] = await db
    .update(quotes)
    .set({
      status: "sent",
      termsVersion,
      ...(tokenHash ? { accessTokenHash: tokenHash } : {}),
      sentAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotes.id, id),
        inArray(quotes.status, allowed),
        ...(ifSentAt ? [eq(quotes.sentAt, ifSentAt)] : []),
      ),
    )
    .returning();

  if (!quote) return null;

  // The offer has gone out, so the card is no longer "Contactado". A re-send
  // finds the lead already at `quoted` (or past it) and moves nothing.
  await moveLeadStage(quote, "quoted", { actorUserId, now });

  return quote;
}

/**
 * Move the lead behind a quote to the stage the quote has just reached, and say
 * so in the audit trail.
 *
 * The guard is in the `WHERE` clause rather than read-then-written, exactly as
 * every quote write here is: {@link leadStagesThatMayBecome} is the same rule as
 * {@link leadStageAfterQuote}, expressed as the set of rows the update may land
 * on, so a card an operator archives between the read and the write is not
 * pulled back out of the archive by a webhook.
 *
 * The entry is written against the **lead**, not the quote: the lead's own page
 * reads `listAuditForEntity("tour_request", id)` for its Histórico, so a move
 * recorded anywhere else is a card that silently jumps a stage with nobody's
 * name on it — the same reasoning as the manual booking's stage move.
 *
 * Never throws. A stage that did not move is a board that is a little behind;
 * a deposit that was recorded and then thrown away because the board write
 * failed is money nobody can find.
 */
async function moveLeadStage(
  quote: Pick<Quote, "id" | "tourRequestId">,
  target: "quoted" | "booked",
  context: { actorUserId?: string | null; now?: Date } = {},
): Promise<RequestStatus | null> {
  if (!quote.tourRequestId) return null;
  const { actorUserId = null, now = new Date() } = context;

  let moved: { id: string; status: RequestStatus } | undefined;
  try {
    [moved] = await db
      .update(tourRequests)
      .set({ status: target, updatedAt: now })
      .where(
        and(
          eq(tourRequests.id, quote.tourRequestId),
          inArray(tourRequests.status, leadStagesThatMayBecome(target)),
        ),
      )
      .returning({ id: tourRequests.id, status: tourRequests.status });
  } catch (err) {
    console.error(`[quotes] could not move lead ${quote.tourRequestId} to ${target}`, err);
    return null;
  }

  // Already there, archived, or gone. Not a failure: the rule is "forwards
  // only", and this is what it looks like when there is nowhere forward to go.
  if (!moved) return null;

  await recordAuditOrWarn({
    // Null for the webhook and the dispatcher, which are not people. The lead's
    // Histórico renders that as the system rather than as an operator.
    actorUserId,
    action: "tour_request.status_changed",
    entityType: "tour_request",
    entityId: moved.id,
    // No `before`: `RETURNING` hands back the row as it now is, and reading the
    // old status first would mean the read-then-write window the `WHERE` guard
    // exists to close. The trail's previous entry for this lead is where the
    // stage it came from is written down.
    after: { status: target, quoteRef: quoteRef(quote.id), source: "quote" },
    // A machine has no client IP worth recording, and Stripe's is not the
    // couple's. Only a send made by a signed-in operator carries one.
    ...(actorUserId ? {} : { ipAddress: null }),
  });

  return moved.status;
}

/**
 * Cancel every other quote of the same lead that is still `sent` — how a new
 * version replaces the one the couple already have.
 *
 * Called by the send of the new version, not by the "Nova versão" button: the
 * old quote stays valid while its replacement is only a draft, so a couple is
 * never left holding a dead link and no live offer because Rita opened a copy
 * and went to lunch. Only `sent` is touched — a quote with money on it is the
 * refunds path's, never replaced from here.
 *
 * Each cancellation is written against the **lead**, naming both references,
 * so its Histórico says which quote replaced which.
 */
export async function supersedeSentQuotes(
  replacement: Pick<Quote, "id" | "tourRequestId">,
  context: { actorUserId?: string | null; now?: Date } = {},
): Promise<Quote[]> {
  if (!replacement.tourRequestId) return [];
  const { actorUserId = null, now = new Date() } = context;

  const superseded = await db
    .update(quotes)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(quotes.tourRequestId, replacement.tourRequestId),
        ne(quotes.id, replacement.id),
        eq(quotes.status, "sent"),
      ),
    )
    .returning();

  for (const old of superseded) {
    await recordAuditOrWarn({
      actorUserId,
      action: "quote.superseded",
      entityType: "tour_request",
      entityId: replacement.tourRequestId,
      before: { quoteRef: quoteRef(old.id), status: "sent" },
      after: { quoteRef: quoteRef(old.id), status: "cancelled", replacedBy: quoteRef(replacement.id) },
    });
  }

  return superseded;
}

/**
 * Throw away a draft — "Descartar rascunho".
 *
 * Drafts only, in the `WHERE`: {@link cancelQuote} is legal from every state,
 * and a stale builder form must not be able to call off a quote that was sent
 * from the other phone a minute ago.
 */
export async function discardDraft(id: string, now: Date = new Date()): Promise<Quote | null> {
  const [quote] = await db
    .update(quotes)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(and(eq(quotes.id, id), eq(quotes.status, "draft")))
    .returning();

  return quote ?? null;
}

/**
 * A new draft copied from a sent quote — "Nova versão".
 *
 * The date, the venue, the language, the lines, the total and the deposit
 * share carry over; the status, the link and the terms stamp do not, because
 * those belong to a send and this has not been sent. `null` when the source is
 * missing or is no longer `sent` — a quote with a deposit on it is changed by
 * refunding, not by re-quoting.
 */
export async function copyQuoteAsDraft(
  sourceId: string,
  createdByUserId: string | null,
): Promise<QuoteWithPayments | null> {
  const source = await getQuote(sourceId);
  if (!source || source.status !== "sent") return null;

  return createQuote({
    tourRequestId: source.tourRequestId,
    createdByUserId,
    eventDate: source.eventDate,
    venue: source.venue,
    locale: source.locale,
    totalCents: source.totalCents,
    lineItems: source.lineItems,
    depositPercent: source.depositPercent,
    termsWindowDays: source.termsWindowDays,
    currency: source.currency,
  });
}

/** Call a quote off. Terminal, and legal from any state but itself. */
export async function cancelQuote(id: string, now: Date = new Date()): Promise<Quote | null> {
  const [quote] = await db
    .update(quotes)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(and(eq(quotes.id, id), inArray(quotes.status, statusesThatMayBecome("cancelled"))))
    .returning();

  return quote ?? null;
}

/**
 * Call off an event whose money has gone back: the quote to `cancelled`, and
 * every instalment still owed on it written off, so no balance is asked for or
 * paid afterwards. The quote page answers a cancelled quote's link with its
 * "no longer valid" page, so nothing the couple hold can pay it either.
 *
 * `null` when the quote was already cancelled, or is gone — the first of two
 * racing operators wins, the second is told.
 */
export async function cancelQuoteAndOpenInstalments(
  id: string,
  now: Date = new Date(),
): Promise<{ quote: Quote; writtenOff: QuotePayment[] } | null> {
  const quote = await cancelQuote(id, now);
  if (!quote) return null;

  const writtenOff = await db
    .update(quotePayments)
    .set({ status: "cancelled", updatedAt: now })
    .where(
      and(
        eq(quotePayments.quoteId, id),
        inArray(quotePayments.status, ["pending", "issued"]),
      ),
    )
    .returning();

  return { quote, writtenOff };
}

/**
 * Record that an instalment's payment link has gone out.
 *
 * The idempotency the T−14 dispatcher rides on: the write only lands on a row
 * that is still `pending`, so a job running twice in a morning issues one link
 * and the second call returns `null` rather than a second email. A deliberate
 * re-issue — the link expired, the couple lost the mail — goes through
 * {@link reissuePayment}, which says so.
 */
export async function markPaymentIssued(
  paymentId: string,
  options: { stripeSessionId: string; commissionRateBps?: number | null; now?: Date },
): Promise<QuotePayment | null> {
  const { stripeSessionId, commissionRateBps, now = new Date() } = options;

  const [payment] = await db
    .update(quotePayments)
    .set({
      status: "issued",
      stripeSessionId,
      // Only when the caller states it: an omitted rate must not blank the one
      // a previous issue recorded.
      ...(commissionRateBps !== undefined ? { commissionRateBps } : {}),
      issuedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotePayments.id, paymentId),
        eq(quotePayments.status, "pending"),
        // The first session for this instalment, and only the first: a second
        // tap racing the first finds a session here and loses, rather than
        // overwriting one the couple may already be paying.
        isNull(quotePayments.stripeSessionId),
      ),
    )
    .returning();

  return payment ?? null;
}

/**
 * Replace an unpaid instalment's checkout session with a fresh one.
 *
 * Separate from {@link markPaymentIssued} because the guard is the opposite
 * one: this is the deliberate second link, and it must not be reachable by a
 * job retrying. It refuses a paid, refunded or cancelled row — reissuing a link
 * for money that has arrived is how a couple pays twice.
 */
export async function reissuePayment(
  paymentId: string,
  options: {
    stripeSessionId: string;
    /**
     * The session this one replaces, as the caller read it. When given, the
     * write only lands if the row still holds exactly that session — two taps
     * on the quote page that both found an expired session each mint one, and
     * only the first may be recorded, or the row forgets a session the couple
     * could still pay. The loser gets `null` and expires its own.
     */
    replacing?: string;
    commissionRateBps?: number | null;
    now?: Date;
  },
): Promise<QuotePayment | null> {
  const { stripeSessionId, replacing, commissionRateBps, now = new Date() } = options;

  const [payment] = await db
    .update(quotePayments)
    .set({
      status: "issued",
      stripeSessionId,
      ...(commissionRateBps !== undefined ? { commissionRateBps } : {}),
      issuedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(quotePayments.id, paymentId),
        inArray(quotePayments.status, ["pending", "issued"]),
        ...(replacing !== undefined ? [eq(quotePayments.stripeSessionId, replacing)] : []),
      ),
    )
    .returning();

  return payment ?? null;
}

/** What Stripe tells us once an instalment has actually been paid. */
export type PaymentSettlement = {
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeConnectedAccountId?: string | null;
  /** Stripe's own figure for the application fee it routed (§5). */
  applicationFeeCents?: number | null;
  commissionRateBps?: number | null;
  /**
   * The terms version the quote page showed when the couple tapped pay — the
   * paid session's own metadata. It is what a paid deposit records as
   * accepted: the couple read the page, not the version stamped when the quote
   * was sent. Absent (a session minted before this existed), the send-time
   * version stands in.
   */
  acceptedTermsVersion?: string | null;
};

/**
 * Record that an instalment has been paid, and move the quote with it.
 *
 * **Idempotent, because the webhook is not.** Stripe delivers at least once,
 * and the guard is in the WHERE clause: a second delivery finds no row in a
 * payable state, changes nothing and returns `null`. A caller that treats
 * `null` as "already done" is correct; one that treats it as a failure will
 * retry forever.
 *
 * The quote's own status follows from its instalments rather than being asked
 * for: the deposit landing is what holds the date (`deposit_paid`), and the
 * last outstanding instalment landing is what completes it (`paid`). See
 * {@link statusAfterPayment}, which is that rule, pure.
 *
 * Paying the deposit is also the acceptance of the terms, so the version the
 * couple were shown when they tapped pay (`settlement.acceptedTermsVersion`,
 * falling back to the version the quote was sent under) is copied into
 * `accepted_terms_version` here — once, never overwritten, which is the whole
 * reason it is a second column.
 */
export async function markPaymentPaid(
  paymentId: string,
  settlement: PaymentSettlement = {},
  now: Date = new Date(),
): Promise<QuoteWithPayments | null> {
  const [payment] = await db
    .update(quotePayments)
    .set({
      status: "paid",
      paidAt: now,
      updatedAt: now,
      ...(settlement.stripePaymentIntentId !== undefined
        ? { stripePaymentIntentId: settlement.stripePaymentIntentId }
        : {}),
      ...(settlement.stripeChargeId !== undefined
        ? { stripeChargeId: settlement.stripeChargeId }
        : {}),
      ...(settlement.stripeConnectedAccountId !== undefined
        ? { stripeConnectedAccountId: settlement.stripeConnectedAccountId }
        : {}),
      ...(settlement.applicationFeeCents !== undefined
        ? { applicationFeeCents: settlement.applicationFeeCents }
        : {}),
      ...(settlement.commissionRateBps !== undefined
        ? { commissionRateBps: settlement.commissionRateBps }
        : {}),
    })
    .where(
      and(
        eq(quotePayments.id, paymentId),
        inArray(quotePayments.status, ["pending", "issued"]),
      ),
    )
    .returning();

  // Already paid, refunded or cancelled — a repeat delivery, not a failure.
  if (!payment) return null;

  return syncQuoteAfterPaymentChange(payment.quoteId, {
    // Paying the deposit *through the quote* is the couple's own act, so it is
    // the one that accepts the terms. Writing the same instalment off is the
    // team's bookkeeping about money that arrived some other way, and evidence
    // of an agreement the guest never made is not evidence — see
    // {@link cancelPayment}.
    acceptsTerms: payment.kind === "deposit",
    acceptedTermsVersion: settlement.acceptedTermsVersion ?? null,
    now,
  });
}

/**
 * Bring a quote's own status, and the lead behind it, back in line with its
 * instalments.
 *
 * Shared by the two writes that can settle an instalment — Stripe paying one
 * ({@link markPaymentPaid}) and the team writing one off
 * ({@link cancelPayment}) — because the quote's status is a function of its
 * payments and not of which door the money came through. A transfer-paid
 * deposit that left the quote at `sent` is precisely what this being in one
 * place prevents.
 *
 * The lead move is attempted on every call rather than only when the status
 * changed: {@link moveLeadStage} is idempotent, and a board left behind by an
 * earlier failure is corrected by the next event rather than forever.
 */
async function syncQuoteAfterPaymentChange(
  quoteId: string,
  options: {
    acceptsTerms?: boolean;
    /** The version shown at the tap; the send-time version when absent. */
    acceptedTermsVersion?: string | null;
    actorUserId?: string | null;
    now?: Date;
  } = {},
): Promise<QuoteWithPayments | null> {
  const {
    acceptsTerms = false,
    acceptedTermsVersion = null,
    actorUserId = null,
    now = new Date(),
  } = options;

  const current = await getQuote(quoteId);
  if (!current) return null;

  const next = nextStatusAfterPayment(current.status, current.payments);
  const accepts = acceptsTerms && current.acceptedAt === null;

  let quote: Quote = current;
  if (next !== current.status || accepts) {
    const [updated] = await db
      .update(quotes)
      .set({
        status: next,
        ...(accepts
          ? {
              acceptedAt: now,
              acceptedTermsVersion: acceptedTermsVersion ?? current.termsVersion,
            }
          : {}),
        updatedAt: now,
      })
      .where(eq(quotes.id, current.id))
      .returning();
    quote = updated ?? quote;
  }

  // The deposit is what holds the date, so it is what books the couple — and
  // `paid` implies it. Anything short of that leaves the card where it is.
  if (quote.status === "deposit_paid" || quote.status === "paid") {
    await moveLeadStage(quote, "booked", { actorUserId, now });
  }

  return withPayments(quote, current.payments);
}

/**
 * Set an instalment's refunded amount to what Stripe says has gone back on it.
 *
 * Same shape as `bookings`: an amount rather than a flag, and **set, not added
 * to** — the caller hands in the charge's cumulative total, so an event
 * delivered five times converges on one number (`lib/quote-refund.ts`). The
 * write is a compare-and-set on the amount the caller read: the admin refund
 * and the webhook echo of it race here, and exactly one of them comes back with
 * a row. `null` means the other one got there first, or the row is gone.
 *
 * The status follows {@link instalmentStatusAfterRefund}. The fee that went
 * back is written separately ({@link recordPaymentRefundFee}), after Stripe
 * says it moved — a column holding our intention would agree with the
 * dashboard right up until the once it mattered that it did not.
 */
export async function recordPaymentRefund(
  payment: Pick<QuotePayment, "id" | "amountCents" | "status" | "refundedAmountCents">,
  refund: {
    /** The instalment's refunded total now — Stripe's `amount_refunded`. */
    refundedAmountCents: number;
    stripeRefundId?: string | null;
    now?: Date;
  },
): Promise<QuotePayment | null> {
  const { refundedAmountCents, stripeRefundId = null, now = new Date() } = refund;

  if (!Number.isSafeInteger(refundedAmountCents) || refundedAmountCents < 0) {
    throw new QuoteError(
      `recordPaymentRefund: ${refundedAmountCents} is not a whole number of cents`,
    );
  }

  const [updated] = await db
    .update(quotePayments)
    .set({
      status: instalmentStatusAfterRefund(payment, refundedAmountCents),
      refundedAmountCents,
      ...(stripeRefundId ? { stripeRefundId } : {}),
      ...(refundedAmountCents > 0 ? { refundedAt: now } : {}),
      updatedAt: now,
    })
    .where(
      and(
        eq(quotePayments.id, payment.id),
        eq(quotePayments.refundedAmountCents, payment.refundedAmountCents),
      ),
    )
    .returning();

  return updated ?? null;
}

/** Record the commission that went back on an instalment — Stripe's figure. */
export async function recordPaymentRefundFee(
  paymentId: string,
  refundedFeeCents: number,
  now: Date = new Date(),
): Promise<QuotePayment | null> {
  const [updated] = await db
    .update(quotePayments)
    .set({ refundedFeeCents, updatedAt: now })
    .where(eq(quotePayments.id, paymentId))
    .returning();

  return updated ?? null;
}

/**
 * Write an instalment off — settled outside Stripe, or no longer owed.
 *
 * **This is the bank-transfer door, and it moves the quote too.** "The couple
 * transferred the deposit" is recorded here, not through
 * {@link markPaymentPaid}, because there is no Stripe payment to record; but
 * what it means for the quote is identical, and the quote used to stay at
 * `sent` for it. `listQuotesDueForBalance` only looks at `deposit_paid`, so
 * those couples' balances were never asked for, and the lead behind them never
 * reached `booked` — which then made them eligible for anonymisation two years
 * after they had paid. {@link syncQuoteAfterPaymentChange} is the fix, and the
 * arithmetic behind it is in {@link statusAfterPayment}.
 *
 * It does **not** stamp `accepted_at`. Acceptance is the couple's own act on
 * the quote page; this is the team's bookkeeping about money that arrived some
 * other way, and it must not manufacture evidence of an agreement.
 *
 * Returns the instalment, as before — the quote's new status is readable from
 * {@link getQuote} and is not what the caller of this is holding.
 */
export async function cancelPayment(
  paymentId: string,
  now: Date = new Date(),
): Promise<QuotePayment | null> {
  const [payment] = await db
    .update(quotePayments)
    .set({ status: "cancelled", updatedAt: now })
    .where(
      and(
        eq(quotePayments.id, paymentId),
        inArray(quotePayments.status, ["pending", "issued"]),
      ),
    )
    .returning();

  if (!payment) return null;

  await syncQuoteAfterPaymentChange(payment.quoteId, { now });

  return payment;
}
