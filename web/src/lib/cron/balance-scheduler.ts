/**
 * The wedding and event balance — asked for at T−15 and chased once at T−7,
 * by the daily dispatcher (`quote-flow/balance-scheduler`; proposal §5, "the
 * balance request goes out automatically"; the days from Diogo, feedback
 * round 1). The couple may pay sooner: the quote page takes the balance from
 * the deposit on, and the team may send the request by hand at any time
 * (`lib/balance-request.ts`), which this job neither waits for nor skips.
 *
 * **Two passes per run**, at 06:00 UTC (`vercel.json`), in Lisbon days:
 *
 * 1. **The request** — every quote `listQuotesDueForBalance` returns: deposit
 *    paid (by Stripe, or by transfer and written off — `statusAfterPayment`),
 *    the balance still open, the event fifteen days away or fewer and at
 *    least one day off (the query's floor; `isRequestInWindow` says it
 *    again). `<=` rather than `=`, so a missed morning and a deposit paid
 *    inside T−15 are caught on the next run — up to the day before the event.
 * 2. **The reminder** — every deposit-paid quote with the event seven days
 *    away or fewer but not today, the balance still open, and a request —
 *    the job's or the team's — that reached the couple at least three days
 *    before (`lib/balance-schedule.ts`).
 *
 * Neither goes out on the event's own day: each would rotate the quote link
 * on the morning itself. An event-day balance is the team's, on the board.
 *
 * The team's T−3 flag is not a pass: it is computed where it is shown (the
 * Sales board and the lead's quote card), so nothing has to run for it. What
 * happens to a balance still unpaid on the day is the client's open question;
 * this job asks and chases, and does nothing else.
 *
 * **The link.** Each balance email mints its own and retires the earlier ones
 * (`buildBalanceEmail` in `lib/balance-request.ts`, which the team's manual
 * send shares).
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
 * tap (.icm/intake/README.md § Decisions) and stamps the row; a session minted here at 06:00 would have
 * expired long before the couple read the mail (`QUOTE_SESSION_TTL_MINUTES`).
 *
 * Personal data: logs name a quote by its ref, never an address or a token.
 */
import "server-only";

import { todayKey, type DateKey } from "@/lib/availability";
import { buildBalanceEmail, type DueBalance } from "@/lib/balance-request";
import {
  holdsBalanceClaim,
  isReminderDue,
  isRequestInWindow,
  lastRequestSentAt,
} from "@/lib/balance-schedule";
import type { BalanceEmailStage } from "@/lib/booking-emails";
import { register, type CronJobResult } from "@/lib/cron/jobs";
import { isEmailConfigured } from "@/lib/email";
import {
  listQuoteBalanceMessages,
  sendLoggedEmail,
  type QuoteBalanceKind,
  type QuoteBalanceMessage,
} from "@/lib/message-log";
import { captureAlert, captureError } from "@/lib/observability";
import { isOpenInstalment } from "@/lib/quote-math";
import {
  listBalanceRecipients,
  listQuotesDueForBalance,
  listQuotesForBalanceReminder,
  quoteRef,
} from "@/lib/quotes";
import { isQuoteTokenConfigured } from "@/lib/quote-token";

/** The job's stable name in the dispatcher's audit row. */
export const BALANCE_SCHEDULER_JOB = "balance-scheduler";

/** What one pass did. `already` is a quote a previous send (or a racing run) had claimed. */
export type BalanceTally = { sent: number; already: number; skipped: number; failed: number };

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

/** T−15: the quotes due a request today, the event at least a day away. */
async function requestPass(now: Date, today: DateKey): Promise<BalanceTally> {
  const due = (await listQuotesDueForBalance({ now })).filter(
    ({ quote, payment }) => isOpenInstalment(payment) && isRequestInWindow(quote.eventDate, today),
  );
  const messages = await listQuoteBalanceMessages(due.map(({ quote }) => quote.id));
  return sendPass("request", due, messages, today, now);
}

/** T−7: the quotes still unpaid a week out whose request reached them in time. */
async function reminderPass(now: Date, today: DateKey): Promise<BalanceTally> {
  const inView = (await listQuotesForBalanceReminder({ now })).filter(({ payment }) =>
    isOpenInstalment(payment),
  );
  const messages = await listQuoteBalanceMessages(inView.map(({ quote }) => quote.id));
  const due = inView.filter(({ quote }) =>
    isReminderDue({
      eventDate: quote.eventDate,
      today,
      requestSentAt: lastRequestSentAt(messages.get(quote.id)),
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
    // this one stops only the contracted T−15 collection — so it is said
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
