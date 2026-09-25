/**
 * When a wedding or event balance is asked for, chased and flagged — the
 * calendar rules of `quote-flow/balance-scheduler`, in one place.
 *
 * Three moments, all counted in Lisbon calendar days before the event:
 *
 * - **T−14, the request** — the proposal's "a second link 14 days before"
 *   (`BALANCE_DUE_DAYS_BEFORE`). Which quotes are due is
 *   `listQuotesDueForBalance`'s query; this module only says the event has not
 *   already happened.
 * - **T−7, one reminder** — only if the request reached the couple at least
 *   {@link BALANCE_REMINDER_GAP_DAYS} days earlier, so a deposit paid late
 *   does not get the request and the chaser a day apart.
 * - **T−3, the team's flag** — the Sales board's "Saldo por pagar" panel and
 *   the badge on the lead's quote card read {@link isBalanceFlagged}, the one
 *   predicate both show. It is computed, not stored: nothing has to run for a
 *   balance to be flagged, and paying or writing it off clears it by itself.
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
} from "@/lib/quote-math";
import type { Quote, QuotePayment } from "@/db";

// The three numbers live in `lib/quote-math.ts`, beside the T−14 they count
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

/** Whether a balance still has money to collect: open, and for more than nothing. */
export function isBalanceOpen(payment: Pick<QuotePayment, "status" | "amountCents">): boolean {
  return (payment.status === "pending" || payment.status === "issued") && payment.amountCents > 0;
}

/** The quote's balance row, if it has one (a 100% deposit writes none). */
export function balanceOf<P extends Pick<QuotePayment, "kind">>(payments: readonly P[]): P | null {
  return payments.find((payment) => payment.kind === "balance") ?? null;
}

/**
 * Whether the T−14 request may go out today for a quote the due query
 * returned. The query reaches back (`<=`) so a missed morning is caught up; it
 * does not stop at the event itself, and a balance asked for after the party
 * is not a request anybody wants — that one is the team's, on the board.
 */
export function isRequestInWindow(eventDate: DateKey, today: DateKey): boolean {
  return daysBetween(today, eventDate) >= 0;
}

/**
 * Whether the T−7 reminder is due today.
 *
 * `requestSentAt` is when the request reached the couple (the log's `sent_at`),
 * or null if it never did — in which case there is nothing to remind them of,
 * and the request itself is what goes out.
 */
export function isReminderDue(options: {
  eventDate: DateKey;
  today: DateKey;
  requestSentAt: Date | null;
}): boolean {
  const { eventDate, today, requestSentAt } = options;
  if (!requestSentAt) return false;

  const daysLeft = daysBetween(today, eventDate);
  if (daysLeft < 0 || daysLeft > BALANCE_REMINDER_DAYS_BEFORE) return false;

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
  if (!balance || !isBalanceOpen(balance)) return false;
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

/** When this kind reached the couple, or null if it never did. */
export function balanceMessageSentAt(
  messages: readonly QuoteBalanceMessage[] | undefined,
  kind: QuoteBalanceKind,
): Date | null {
  for (const message of messages ?? []) {
    if (message.kind === kind && message.status === "sent" && message.sentAt) {
      return message.sentAt;
    }
  }
  return null;
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

/** What has gone to the couple about their balance, newest first, in one line. */
export function balanceMessagesLabel(messages: readonly QuoteBalanceMessage[] | undefined): string {
  const reminder = balanceMessageSentAt(messages, "balance-reminder");
  if (reminder) return `Lembrete enviado a ${formatDateTime(reminder)}`;
  const request = balanceMessageSentAt(messages, "balance-request");
  if (request) return `Pedido enviado a ${formatDateTime(request)}`;
  return "Pedido não enviado";
}
