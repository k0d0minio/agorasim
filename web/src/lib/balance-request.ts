/**
 * The balance request — the email that asks a couple for their balance, with a
 * fresh link to their quote page. Built here once, for the daily job
 * (`lib/cron/balance-scheduler.ts`, T−15 and T−7) and for "Enviar pedido do
 * restante" on the lead's quote card, which sends it now (Diogo, feedback
 * round 1: "a manual send from the admin whenever needed").
 *
 * **The link.** Only a digest of a quote's token is stored, so no later email
 * can repeat a link that already went out. Each balance email mints its own —
 * a fresh token, its digest swapped onto the quote (`rotateQuoteLink`) — and
 * the email says it replaces the earlier ones. A send by hand therefore
 * retires the link of the job's request, and the job's later request or
 * reminder retires the hand-sent one; the couple always hold one live link.
 *
 * **The manual send is its own kind**, `balance-request-manual`, keyed on the
 * quote and the instant of the send (`QUOTE_BALANCE_SEND_KINDS` in
 * `lib/message-log.ts`): the team may send it as often as it needs, and it
 * never takes the job's once-per-quote claim, so the T−15 request still goes
 * out once. It counts as a request for the T−7 reminder's three-day gap
 * (`lastRequestSentAt` in `lib/balance-schedule.ts`).
 *
 * Personal data: logs name a quote by its ref, never an address or a token.
 */
import "server-only";

import { recordAuditOrWarn } from "@/lib/audit";
import { formatDay, todayKey, type DateKey } from "@/lib/availability";
import { balanceOf } from "@/lib/balance-schedule";
import { guestBalanceEmail, type BalanceEmailStage } from "@/lib/booking-emails";
import { isEmailConfigured } from "@/lib/email";
import { sendLoggedEmail, type ClaimedMessage } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { isOpenInstalment } from "@/lib/quote-math";
import {
  balanceDueDate,
  dueInstalment,
  getQuote,
  listBalanceRecipients,
  quoteRef,
  rotateQuoteLink,
  type BalanceRecipient,
} from "@/lib/quotes";
import { isQuoteTokenConfigured, issueQuoteToken, quotePath } from "@/lib/quote-token";
import { siteUrl } from "@/lib/site-origin";
import type { Quote, QuotePayment } from "@/db";

/** A quote and its open balance — what one balance email is about. */
export type DueBalance = { quote: Quote; payment: QuotePayment };

/**
 * The message for one quote, built once its claim is won: mint a link, write
 * the email around it, and only then swap the link's digest onto the quote —
 * the last step, so nothing that can throw runs after the old link has been
 * retired. `null` — the claim is given back — when another send changed the
 * link first.
 */
export function buildBalanceEmail(
  stage: BalanceEmailStage,
  { quote, payment }: DueBalance,
  recipient: BalanceRecipient,
  today: DateKey,
  now: Date,
): ClaimedMessage {
  return async () => {
    const link = await issueQuoteToken();
    const locale = quote.locale;
    const due = payment.dueDate ?? balanceDueDate(quote.eventDate);

    const message = guestBalanceEmail({
      stage,
      ref: quoteRef(quote.id),
      guestName: recipient.name,
      guestEmail: recipient.email,
      locale,
      date: formatDay(quote.eventDate, locale),
      venue: quote.venue,
      amount: formatPrice(payment.amountCents, locale, payment.currency),
      // A due date already behind them reads as "overdue" or as a mistake; the
      // event date says when. Neither email goes out after T−1, so this only
      // guards a row whose due date was never moved to the day before.
      dueDate: due >= today ? formatDay(due, locale) : null,
      quoteUrl: `${siteUrl()}${quotePath(locale, link.token)}`,
    });

    const rotated = await rotateQuoteLink(quote.id, {
      expectedDigest: quote.accessTokenHash,
      digest: link.digest,
      now,
    });
    return rotated ? message : null;
  };
}

/** What "Enviar pedido do restante" did. */
export type ManualBalanceRequestOutcome =
  /** The email reached the provider, carrying a new link. */
  | { status: "sent"; sentAt: Date }
  /** No quote by that id. */
  | { status: "not-found" }
  /** The deposit is not paid, or the balance is paid, written off or nothing. */
  | { status: "not-open" }
  /** The balance's due date has passed — the event day or later. */
  | { status: "closed" }
  /** No enquiry behind the quote, an erased one, or no address. */
  | { status: "no-recipient" }
  /** This deployment cannot mail or cannot mint quote links. */
  | { status: "unconfigured" }
  /** Another send changed the link at the same moment. Nothing went out from this one. */
  | { status: "duplicate" }
  /**
   * The provider refused, or something threw. The link may already have
   * changed: it is swapped before the email is handed to the provider.
   */
  | { status: "failed" };

/**
 * Send the balance request now, from the lead's quote card.
 *
 * The same email as the T−15 request, with a new link that retires the old
 * ones. Refused once the balance is settled or past its due date, when the
 * quote page would refuse the payment anyway.
 */
export async function sendBalanceRequestNow(options: {
  quoteId: string;
  actorUserId: string;
  now?: Date;
}): Promise<ManualBalanceRequestOutcome> {
  const { quoteId, actorUserId, now = new Date() } = options;

  if (!isQuoteTokenConfigured() || !isEmailConfigured()) return { status: "unconfigured" };

  const quote = await getQuote(quoteId);
  if (!quote) return { status: "not-found" };
  const ref = quoteRef(quote.id);

  const balance = balanceOf(quote.payments);
  if (quote.status !== "deposit_paid" || !balance || !isOpenInstalment(balance)) {
    return { status: "not-open" };
  }
  if (dueInstalment(quote, now).kind === "closed") return { status: "closed" };

  const recipient = quote.tourRequestId
    ? (await listBalanceRecipients([quote.tourRequestId])).get(quote.tourRequestId)
    : undefined;
  if (!recipient || recipient.anonymisedAt || !recipient.email) return { status: "no-recipient" };

  try {
    const result = await sendLoggedEmail(
      {
        kind: "balance-request-manual",
        recipient: "guest",
        tourRequestId: recipient.id,
        quoteId: quote.id,
        quoteSentAt: now,
      },
      buildBalanceEmail("request", { quote, payment: balance }, recipient, todayKey(now), now),
    );

    switch (result.status) {
      case "sent":
        await recordAuditOrWarn({
          actorUserId,
          action: "quote.balance_requested",
          entityType: "tour_request",
          entityId: recipient.id,
          after: { quoteRef: ref, amountCents: balance.amountCents },
        });
        return { status: "sent", sentAt: now };
      case "duplicate":
        return { status: "duplicate" };
      case "skipped":
        return result.reason === "unconfigured"
          ? { status: "unconfigured" }
          : { status: "no-recipient" };
      case "failed":
        console.error(`[balance] manual request for ${ref} — not sent (${result.reason})`);
        return { status: "failed" };
    }
  } catch (err) {
    console.error(`[balance] manual request for ${ref} — failed`, err);
    return { status: "failed" };
  }
}
