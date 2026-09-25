/**
 * The wedding and event balance — asked for at T−14 and chased once at T−7,
 * by the daily dispatcher (`quote-flow/balance-scheduler`; proposal §5, "the
 * balance request goes out automatically").
 *
 * **Two passes per run**, at 06:00 UTC (`vercel.json`), in Lisbon days:
 *
 * 1. **The request** — every quote `listQuotesDueForBalance` returns: deposit
 *    paid (by Stripe, or by transfer and written off — `statusAfterPayment`),
 *    the balance still `pending`, the event fourteen days away or fewer but
 *    not past (the query's floor; `isRequestInWindow` says it again). `<=` rather than `=`, so a missed morning and a deposit paid
 *    inside T−14 are caught on the next run.
 * 2. **The reminder** — every deposit-paid quote with the event seven days
 *    away or fewer, the balance still open, and a request that reached the
 *    couple at least three days before (`lib/balance-schedule.ts`).
 *
 * The team's T−3 flag is not a pass: it is computed where it is shown (the
 * Sales board and the lead's quote card), so nothing has to run for it. What
 * happens to a balance still unpaid on the day is the client's open question;
 * this job asks and chases, and does nothing else.
 *
 * **The link.** Only a digest of a quote's token is stored, so no later email
 * can repeat a link that already went out. Each balance email mints its own —
 * a fresh token, its digest swapped onto the quote (`rotateQuoteLink`) — and
 * the email says it replaces the earlier ones.
 *
 * **Once per quote, and never a new link without its email.** The log claim
 * (`balance-request` / `balance-reminder`, keyed on the quote) is taken
 * *before* the link is minted: the message is a {@link ClaimedMessage}, built
 * only by the run that won the claim, so a rerun or a second run the same
 * morning finds the claim and mints nothing. The swap is a compare-and-swap on
 * the digest this run read, so the link mailed is always the one stored. A
 * send that fails releases its claim as usual — tomorrow tries again, with
 * another fresh link.
 *
 * `issued` stays the quote page's word: the page mints the Checkout session on
 * tap (D25) and stamps the row; a session minted here at 06:00 would have
 * expired long before the couple read the mail (`QUOTE_SESSION_TTL_MINUTES`).
 *
 * Personal data: logs name a quote by its ref, never an address or a token.
 */
import "server-only";

import { formatDay, todayKey, type DateKey } from "@/lib/availability";
import {
  balanceMessageSentAt,
  holdsBalanceClaim,
  isBalanceOpen,
  isReminderDue,
  isRequestInWindow,
} from "@/lib/balance-schedule";
import { guestBalanceEmail, type BalanceEmailStage } from "@/lib/booking-emails";
import { register, type CronJobResult } from "@/lib/cron/jobs";
import { isEmailConfigured } from "@/lib/email";
import {
  listQuoteBalanceMessages,
  sendLoggedEmail,
  type QuoteBalanceKind,
  type QuoteBalanceMessage,
} from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { captureAlert, captureError } from "@/lib/observability";
import {
  balanceDueDate,
  listBalanceRecipients,
  listQuotesDueForBalance,
  listQuotesForBalanceReminder,
  quoteRef,
  rotateQuoteLink,
  type BalanceRecipient,
} from "@/lib/quotes";
import { isQuoteTokenConfigured, issueQuoteToken, quotePath } from "@/lib/quote-token";
import { siteUrl } from "@/lib/site-origin";
import type { Quote, QuotePayment } from "@/db";

/** The job's stable name in the dispatcher's audit row. */
export const BALANCE_SCHEDULER_JOB = "balance-scheduler";

/** What one pass did. `already` is a quote a previous send (or a racing run) had claimed. */
export type BalanceTally = { sent: number; already: number; skipped: number; failed: number };

type DueBalance = { quote: Quote; payment: QuotePayment };

const KIND: Record<BalanceEmailStage, QuoteBalanceKind> = {
  request: "balance-request",
  reminder: "balance-reminder",
};

function emptyTally(): BalanceTally {
  return { sent: 0, already: 0, skipped: 0, failed: 0 };
}

function summarise(stage: BalanceEmailStage, tally: BalanceTally): string {
  return `${stage}: ${tally.sent} sent, ${tally.already} already, ${tally.skipped} skipped, ${tally.failed} failed`;
}

/**
 * The message for one quote, built once its claim is won: mint a link, write
 * the email around it, and only then swap the link's digest onto the quote —
 * the last step, so nothing that can throw runs after the old link has been
 * retired. `null` — the claim is given back — when another run changed the
 * link first.
 */
function buildBalanceEmail(
  stage: BalanceEmailStage,
  { quote, payment }: DueBalance,
  recipient: BalanceRecipient,
  today: DateKey,
  now: Date,
) {
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
      // A due date already behind them (the reminder, a late deposit's
      // request) reads as "overdue" or as a mistake; the event date says when.
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

/** Ask one pass's quotes for their balance, each claimed once. */
async function sendPass(
  stage: BalanceEmailStage,
  due: DueBalance[],
  messages: Map<string, QuoteBalanceMessage[]>,
  today: DateKey,
  now: Date,
): Promise<BalanceTally> {
  const tally = emptyTally();
  const kind = KIND[stage];
  const recipients = await listBalanceRecipients(
    due.flatMap(({ quote }) => (quote.tourRequestId ? [quote.tourRequestId] : [])),
  );

  for (const row of due) {
    const { quote } = row;
    const ref = quoteRef(quote.id);

    // Claimed already — the answer on every morning after the first. Read
    // before anything is minted, though the claim below is what decides.
    if (holdsBalanceClaim(messages.get(quote.id), kind)) {
      tally.already += 1;
      continue;
    }

    // Nobody to write to: no enquiry behind the quote, an erased one, or no
    // address. Counted, never claimed, and the link is left alone — the team
    // sees the balance on the board at T−3 either way.
    const recipient = quote.tourRequestId ? recipients.get(quote.tourRequestId) : undefined;
    if (!recipient || recipient.anonymisedAt || !recipient.email) {
      tally.skipped += 1;
      continue;
    }

    try {
      const result = await sendLoggedEmail(
        { kind, recipient: "guest", tourRequestId: recipient.id, quoteId: quote.id },
        buildBalanceEmail(stage, row, recipient, today, now),
      );

      switch (result.status) {
        case "sent":
          tally.sent += 1;
          break;
        case "duplicate":
          tally.already += 1;
          break;
        case "skipped":
          tally.skipped += 1;
          break;
        case "failed":
          tally.failed += 1;
          console.error(`[balance] ${stage} for ${ref} — not sent (${result.reason})`);
          break;
      }
    } catch (err) {
      // One quote that cannot be written about must not cost the others.
      tally.failed += 1;
      console.error(`[balance] ${stage} for ${ref} — failed`, err);
    }
  }

  return tally;
}

/** T−14: the quotes due a request today, the event not yet past. */
async function requestPass(now: Date, today: DateKey): Promise<BalanceTally> {
  const due = (await listQuotesDueForBalance({ now })).filter(
    ({ quote, payment }) => isBalanceOpen(payment) && isRequestInWindow(quote.eventDate, today),
  );
  const messages = await listQuoteBalanceMessages(due.map(({ quote }) => quote.id));
  return sendPass("request", due, messages, today, now);
}

/** T−7: the quotes still unpaid a week out whose request reached them in time. */
async function reminderPass(now: Date, today: DateKey): Promise<BalanceTally> {
  const inView = (await listQuotesForBalanceReminder({ now })).filter(({ payment }) =>
    isBalanceOpen(payment),
  );
  const messages = await listQuoteBalanceMessages(inView.map(({ quote }) => quote.id));
  const due = inView.filter(({ quote }) =>
    isReminderDue({
      eventDate: quote.eventDate,
      today,
      requestSentAt: balanceMessageSentAt(messages.get(quote.id), "balance-request"),
    }),
  );
  return sendPass("reminder", due, messages, today, now);
}

/**
 * One pass, sealed off from the other: a read that fails is reported (the
 * log, the error tracker, the summary) and the other pass still runs.
 */
async function runPass(
  stage: BalanceEmailStage,
  pass: () => Promise<BalanceTally>,
): Promise<string> {
  try {
    return summarise(stage, await pass());
  } catch (err) {
    console.error(`[balance] ${stage} — quotes could not be read`, err);
    captureError(err, { area: "cron", tags: { job: BALANCE_SCHEDULER_JOB, pass: stage } });
    return `${stage}: not run — quotes could not be read`;
  }
}

/**
 * The dispatcher job. It does not throw: every per-quote outcome is a count in
 * the summary. A deployment that cannot mail or cannot mint links sends
 * nothing, claims nothing and rotates nothing — and says so.
 */
export async function balanceScheduler(now: Date = new Date()): Promise<CronJobResult> {
  if (!isQuoteTokenConfigured()) {
    // Unlike a missing mail key, which every mailing job shares and reports,
    // this one stops only the contracted T−14 collection — so it is said
    // somewhere a person reads, not only in the dispatcher's audit row.
    console.error("[balance] BOOKING_TOKEN_SECRET is not set — no balance asked for");
    captureAlert("BOOKING_TOKEN_SECRET is not set — the balance job sent nothing", {
      area: "cron",
      tags: { job: BALANCE_SCHEDULER_JOB },
    });
    return { name: BALANCE_SCHEDULER_JOB, summary: "not run — quote links are not configured" };
  }
  if (!isEmailConfigured()) {
    return { name: BALANCE_SCHEDULER_JOB, summary: "not run — email is not configured" };
  }

  const today = todayKey(now);
  const request = await runPass("request", () => requestPass(now, today));
  const reminder = await runPass("reminder", () => reminderPass(now, today));

  return { name: BALANCE_SCHEDULER_JOB, summary: `${request} · ${reminder}` };
}

register(balanceScheduler);
