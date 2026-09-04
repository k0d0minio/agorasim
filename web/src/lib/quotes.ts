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
 * **Commission is not computed here.** `lib/commission.ts` owns the agreement's
 * arithmetic and `payment-links` will ask it for 6% of each instalment (§5);
 * what this module does is record the figure Stripe actually took, on the
 * payment row it was taken from — the same discipline `bookings` keeps.
 *
 * Server-only: it imports `@/db`. The pure half above the query section is
 * unit-tested through the `server-only` stub, as elsewhere in this repo.
 */
import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import {
  db,
  quotePayments,
  quotes,
  type Quote,
  type QuoteLineItem,
  type QuotePayment,
  type QuotePaymentKind,
  type QuoteStatus,
  type AppLocale,
} from "@/db";
import { dateKey, isDateKey, parseDateKey, todayKey, type DateKey } from "@/lib/availability";
import { BOOKING_CURRENCY } from "@/lib/money";

// ---------------------------------------------------------------------------
// The numbers the agreement fixes
// ---------------------------------------------------------------------------

/** The share taken up front to hold the date (proposal §5). */
export const DEFAULT_DEPOSIT_PERCENT = 30;

/**
 * How many days before the event the deposit stops being refundable (D9).
 *
 * A default, not a decision: the client asked for 30 and the lawyer has flagged
 * the *sinal* regime around it. Every quote stores its own window, so moving
 * this never rewrites the terms an accepted quote was accepted under.
 */
export const DEFAULT_TERMS_WINDOW_DAYS = 30;

/**
 * How many days before the event the balance falls due — the proposal's
 * "collected by a second automatic payment link 14 days before".
 */
export const BALANCE_DUE_DAYS_BEFORE = 14;

/** The reference a quote wears: short, stable, greppable — like `bookingRef`. */
export function quoteRef(id: string): string {
  return `QT-${id.slice(0, 6).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Pure arithmetic
// ---------------------------------------------------------------------------

/** What the two instalments come to. Always sums to the total, exactly. */
export type QuoteSplit = { depositCents: number; balanceCents: number };

/**
 * Split a total into the deposit that holds the date and the balance that
 * follows.
 *
 * The deposit rounds to the nearest cent and **the balance is the remainder**,
 * never its own percentage of the total. Take 30% of €1,235 twice and the two
 * halves come to a cent less than the whole; taking one and subtracting cannot,
 * whatever the percentage or the total. A guest who pays both instalments has
 * paid the quote, and this is what makes that arithmetically true rather than
 * usually true.
 *
 * Throws on anything that is not a whole number of cents or a percentage
 * between 1 and 100, in the shape `commissionOn` refuses a non-integer basis:
 * a plausible figure computed from a bad input is worse than a stack trace,
 * because the guest is charged it.
 */
export function splitTotal(
  totalCents: number,
  depositPercent: number = DEFAULT_DEPOSIT_PERCENT,
): QuoteSplit {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error(
      `splitTotal: ${totalCents} is not a positive whole number of cents — money is integers here`,
    );
  }
  if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) {
    throw new Error(`splitTotal: ${depositPercent}% is not a deposit share between 1 and 100`);
  }

  const depositCents = Math.round((totalCents * depositPercent) / 100);
  return { depositCents, balanceCents: totalCents - depositCents };
}

/** What the lines add up to. `0` for a quote that is a single agreed figure. */
export function lineItemsTotal(items: QuoteLineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
}

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

/** When the balance falls due for an event on this day: T−14. */
export function balanceDueDate(eventDate: DateKey): DateKey {
  return shiftDays(eventDate, -BALANCE_DUE_DAYS_BEFORE);
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
  // `sent → paid` looks like a skipped step and is not: a deposit settled by
  // bank transfer is written off rather than paid, leaving the balance as the
  // only outstanding instalment and its arrival as the whole of the money.
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

  const depositPaid = payments.some(
    (payment) => payment.kind === "deposit" && payment.status === "paid",
  );
  return depositPaid ? "deposit_paid" : current;
}

/** The same rule, refusing anything {@link QUOTE_TRANSITIONS} does not allow. */
function nextStatusAfterPayment(
  current: QuoteStatus,
  payments: Pick<QuotePayment, "kind" | "status">[],
): QuoteStatus {
  const next = statusAfterPayment(current, payments);
  return next === current || canTransition(current, next) ? next : current;
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
 * Write a draft quote and the two instalments it implies.
 *
 * Both payment rows exist from the start, `pending` and unissued: the balance
 * is a thing that is owed on a date from the moment the offer is made, and the
 * T−14 job's query is "the balance rows that are due and not yet issued" — a
 * row that only appears when the job first runs would make that query mean
 * something else.
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

  const [quote] = await db
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
      {
        quoteId: quote.id,
        kind: "balance" as const,
        amountCents: balanceCents,
        currency,
        dueDate: balanceDueDate(input.eventDate),
      },
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
      {
        quoteId: id,
        kind: "balance" as const,
        amountCents: balanceCents,
        currency: existing.currency,
        dueDate: balanceDueDate(merged.eventDate),
      },
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
 */
export async function markQuoteSent(
  id: string,
  options: { termsVersion: string; tokenHash?: string; now?: Date },
): Promise<Quote | null> {
  const { termsVersion, tokenHash, now = new Date() } = options;

  const [quote] = await db
    .update(quotes)
    .set({
      status: "sent",
      termsVersion,
      ...(tokenHash ? { accessTokenHash: tokenHash } : {}),
      sentAt: now,
      updatedAt: now,
    })
    .where(and(eq(quotes.id, id), inArray(quotes.status, statusesThatMayBecome("sent"))))
    .returning();

  return quote ?? null;
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
    .where(and(eq(quotePayments.id, paymentId), eq(quotePayments.status, "pending")))
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
  options: { stripeSessionId: string; now?: Date },
): Promise<QuotePayment | null> {
  const { stripeSessionId, now = new Date() } = options;

  const [payment] = await db
    .update(quotePayments)
    .set({ status: "issued", stripeSessionId, issuedAt: now, updatedAt: now })
    .where(
      and(
        eq(quotePayments.id, paymentId),
        inArray(quotePayments.status, ["pending", "issued"]),
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
 * quote was sent under is copied into `accepted_terms_version` here — once,
 * never overwritten, which is the whole reason it is a second column.
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

  const current = await getQuote(payment.quoteId);
  if (!current) return null;

  const next = nextStatusAfterPayment(current.status, current.payments);
  const acceptsTerms = payment.kind === "deposit" && current.acceptedAt === null;

  if (next === current.status && !acceptsTerms) return current;

  const [quote] = await db
    .update(quotes)
    .set({
      status: next,
      ...(acceptsTerms
        ? { acceptedAt: now, acceptedTermsVersion: current.termsVersion }
        : {}),
      updatedAt: now,
    })
    .where(eq(quotes.id, current.id))
    .returning();

  return withPayments(quote ?? current, current.payments);
}

/**
 * Record money going back out of an instalment, cumulatively.
 *
 * Same shape as `bookings`: an amount rather than a flag, added to rather than
 * replaced, and the fee that went back with it recorded next to it (§6 returns
 * commission in proportion). Both figures are Stripe's, read back after the
 * refund lands — a column holding our intention would agree with the dashboard
 * right up until the once it mattered that it did not.
 */
export async function recordPaymentRefund(
  paymentId: string,
  refund: {
    amountCents: number;
    feeCents?: number;
    stripeRefundId?: string | null;
    now?: Date;
  },
): Promise<QuotePayment | null> {
  const { amountCents, feeCents = 0, stripeRefundId = null, now = new Date() } = refund;

  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new QuoteError(
      `recordPaymentRefund: ${amountCents} is not a whole number of cents`,
    );
  }

  const [payment] = await db
    .update(quotePayments)
    .set({
      status: "refunded",
      refundedAmountCents: sql`${quotePayments.refundedAmountCents} + ${amountCents}`,
      refundedFeeCents: sql`${quotePayments.refundedFeeCents} + ${feeCents}`,
      stripeRefundId,
      refundedAt: now,
      updatedAt: now,
    })
    .where(eq(quotePayments.id, paymentId))
    .returning();

  return payment ?? null;
}

/** Write an instalment off — settled outside Stripe, or no longer owed. */
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

  return payment ?? null;
}
