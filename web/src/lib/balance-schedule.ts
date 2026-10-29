/**
 * When a wedding or event balance is asked for, chased and flagged — the
 * calendar rules of `quote-flow/balance-scheduler`, in one place.
 *
 * Three moments, all counted in Lisbon calendar days before the event:
 *
 * - **T−15, the request** — Diogo's "the link 15 days before"
 *   (`BALANCE_REQUEST_DAYS_BEFORE`). Which quotes are due is
 *   `listQuotesDueForBalance`'s query; this module only says the event is
 *   still at least a day away. The couple may pay before it: the quote page
 *   takes the balance from the deposit on, up to its due date (T−1).
 * - **T−7, one reminder** — only if a request reached the couple at least
 *   {@link BALANCE_REMINDER_GAP_DAYS} days earlier, so a deposit paid late
 *   does not get the request and the chaser a day apart. A request the team
 *   sent by hand counts ({@link lastRequestSentAt}).
 * - **T−3, the team's flag** — the Sales board's "Saldo por pagar" panel and
 *   the badge on the lead's quote card read {@link isBalanceFlagged}, the one
 *   predicate both show. It is computed, not stored: nothing has to run for a
 *   balance to be flagged, and paying or writing it off clears it by itself.
 *
 * Neither email goes out on the event's own day: T−1 is the last morning
 * either can be sent. Each one rotates the quote link, and a wedding morning
 * is no time to retire the link a couple already has; an event-day balance is
 * the team's, on the board.
 *
 * What happens to an unpaid balance on the day itself is the client's open
 * question, so nothing here releases a date or cancels anything.
 *
 * Pure: every function takes "today" as a key rather than reading the clock,
 * so the tests pin the calendar and the job and the page agree on one day.
 */
import "server-only";

import { formatDateTime } from "@/lib/admin-format";
import { parseDateKey, todayKey, type DateKey } from "@/lib/availability";
import type { QuoteBalanceKind, QuoteBalanceMessage } from "@/lib/message-log";
import {
  BALANCE_FLAG_DAYS_BEFORE,
  BALANCE_REMINDER_DAYS_BEFORE,
  BALANCE_REMINDER_GAP_DAYS,
  isOpenInstalment,
} from "@/lib/quote-math";
import type { Quote, QuotePayment } from "@/db";

// The three numbers live in `lib/quote-math.ts`, beside the T−15 they count
// like, so `lib/quotes.ts` can query with them without importing this module.
export {
  BALANCE_FLAG_DAYS_BEFORE,
  BALANCE_REMINDER_DAYS_BEFORE,
  BALANCE_REMINDER_GAP_DAYS,
} from "@/lib/quote-math";

const DAY_MS = 86_400_000;

/**
 * Whole calendar days from `from` to `to` — negative once `to` has passed.
 * UTC-midnight arithmetic over keys, so a clock change is not a day lost.
 */
export function daysBetween(from: DateKey, to: DateKey): number {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  if (!a || !b) throw new Error(`daysBetween: ${from} → ${to} is not a pair of YYYY-MM-DD dates`);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** The quote's balance row, if it has one (a 100% deposit writes none). */
export function balanceOf<P extends Pick<QuotePayment, "kind">>(payments: readonly P[]): P | null {
  return payments.find((payment) => payment.kind === "balance") ?? null;
}

/**
 * Whether the T−15 request may go out today for a quote the due query
 * returned. The query reaches back (`<=`) so a missed morning is caught up, but
 * only as far as the day before the event: a request on the morning itself,
 * or after the party, is not one anybody wants — that balance is the team's,
 * on the board.
 */
export function isRequestInWindow(eventDate: DateKey, today: DateKey): boolean {
  return daysBetween(today, eventDate) >= 1;
}

/**
 * Whether the T−7 reminder is due today.
 *
 * `requestSentAt` is when the latest request reached the couple (the log's
 * `sent_at`, {@link lastRequestSentAt}), or null if none did — in which case
 * there is nothing to remind them of, and the request itself is what goes out.
 */
export function isReminderDue(options: {
  eventDate: DateKey;
  today: DateKey;
  requestSentAt: Date | null;
}): boolean {
  const { eventDate, today, requestSentAt } = options;
  if (!requestSentAt) return false;

  // T−7 down to T−1 — never on the event's own day, like the request.
  const daysLeft = daysBetween(today, eventDate);
  if (daysLeft < 1 || daysLeft > BALANCE_REMINDER_DAYS_BEFORE) return false;

  // Lisbon's day for the send, like every other day in this module.
  return daysBetween(todayKey(requestSentAt), today) >= BALANCE_REMINDER_GAP_DAYS;
}

/**
 * Whether the team should see this quote's balance as unpaid — the "Saldo por
 * pagar" rule. A deposit-paid quote, a balance still open, the event three
 * days away or fewer, or already past: a balance that never came in stays on
 * the board until somebody records it or writes it off.
 */
export function isBalanceFlagged(
  quote: Pick<Quote, "status" | "eventDate"> & {
    payments: readonly Pick<QuotePayment, "kind" | "status" | "amountCents">[];
  },
  today: DateKey,
): boolean {
  if (quote.status !== "deposit_paid") return false;
  const balance = balanceOf(quote.payments);
  if (!balance || !isOpenInstalment(balance)) return false;
  return daysBetween(today, quote.eventDate) <= BALANCE_FLAG_DAYS_BEFORE;
}

/**
 * Whether a message of this kind holds its claim in the log — `sending` or
 * `sent`. A `failed` row released its claim, so it does not count.
 */
export function holdsBalanceClaim(
  messages: readonly QuoteBalanceMessage[] | undefined,
  kind: QuoteBalanceKind,
): boolean {
  return (messages ?? []).some((message) => message.kind === kind && message.status !== "failed");
}

/** The latest time one of these kinds reached the couple, or null if none did. */
export function balanceMessageSentAt(
  messages: readonly QuoteBalanceMessage[] | undefined,
  ...kinds: QuoteBalanceMessage["kind"][]
): Date | null {
  let latest: Date | null = null;
  for (const message of messages ?? []) {
    if (!kinds.includes(message.kind) || message.status !== "sent" || !message.sentAt) continue;
    if (!latest || message.sentAt > latest) latest = message.sentAt;
  }
  return latest;
}

/**
 * When the latest balance request reached the couple — the daily job's, or
 * one the team sent by hand — or null if none did. What the reminder's gap
 * counts from.
 */
export function lastRequestSentAt(
  messages: readonly QuoteBalanceMessage[] | undefined,
): Date | null {
  return balanceMessageSentAt(messages, "balance-request", "balance-request-manual");
}

/** How far off the event is, in the team's words — "Hoje", "Daqui a 2 dias", "Há 3 dias". */
export function eventWhenLabel(eventDate: DateKey, today: DateKey): string {
  const days = daysBetween(today, eventDate);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days > 1) return `Daqui a ${days} dias`;
  if (days === -1) return "Ontem";
  return `Há ${-days} dias`;
}

/** How each balance message reads in {@link balanceMessagesLabel}. */
const SENT_LABEL: Record<QuoteBalanceMessage["kind"], string> = {
  "balance-request": "Pedido enviado",
  "balance-request-manual": "Pedido enviado pela equipa",
  "balance-reminder": "Lembrete enviado",
};

/** The last thing that went to the couple about their balance, in one line. */
export function balanceMessagesLabel(messages: readonly QuoteBalanceMessage[] | undefined): string {
  let last: QuoteBalanceMessage | null = null;
  for (const message of messages ?? []) {
    if (message.status !== "sent" || !message.sentAt) continue;
    if (!last?.sentAt || message.sentAt > last.sentAt) last = message;
  }
  return last?.sentAt
    ? `${SENT_LABEL[last.kind]} a ${formatDateTime(last.sentAt)}`
    : "Pedido não enviado";
}
