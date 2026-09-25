/**
 * The message log — one writer for every automatic mail this system sends.
 *
 * **A row is a claim, not a receipt.** {@link sendLoggedEmail} inserts a
 * `sending` row *before* it calls Resend and updates it after. The insert is
 * `ON CONFLICT DO NOTHING` against the partial unique indexes on `message_log`
 * (see `db/schema.ts`), so the second caller for the same message loses the
 * insert and never sends. That ordering is the whole point: it is what lets the
 * daily dispatcher (`.icm/intake/lifecycle-messages/daily-dispatcher.md`) ask
 * for the day-before reminder on every booking every day without a second copy
 * landing in somebody's inbox, and it works across processes and retries
 * because the arbiter is an index rather than a lock or a flag in memory.
 *
 * The uniqueness key is (kind, recipient, subject): one confirmation per
 * booking to the guest and one to the team; one ack per enquiry. A message that
 * is genuinely meant to go twice is two kinds — `balance-request` and
 * `balance-reminder` — never the same kind sent again.
 *
 * **Except where the subject is a departure, not a booking.** A booking's date
 * is not fixed: a weather move edits it in place, the afternoon before, which
 * is exactly when the day-before reminder has just gone out. So the
 * {@link DATE_BOUND_KINDS} carry the date they are about, and the booking's
 * move-seq (`bookings.moveSeq`) alongside it, and are keyed on both — the
 * moved booking earns a reminder for its new morning, the old date keeps
 * its own row and is never reminded twice, and a booking moved twice is told
 * twice. The move-seq is what keeps a *third* move honest: a booking moved
 * back onto a date it already left (`X → A → B → A`) would otherwise find
 * `A`'s row still claimed from the first visit and go untold on the second.
 * The type below makes both fields mandatory for those kinds and impossible
 * for the others, because the two are different indexes in `db/schema.ts`
 * and a send that guessed wrong would quietly key on nothing.
 *
 * **And except where the subject is a quote.** A lead is quoted more than
 * once — a new version replaces a sent quote, a re-send rotates a link that
 * went to a mistyped address — and every one of those is an email the couple
 * must get. So the {@link QUOTE_SEND_KINDS} are keyed on the quote and on the
 * `sent_at` the send stamped, which names the link the mail carries: one
 * email per link, never two, and never refused because an earlier link to
 * the same lead already went out.
 *
 * **A failed send releases its claim.** The row stays as the record of an
 * attempt, but `status <> 'failed'` in the indexes means it no longer reserves
 * the slot, so tomorrow's run tries again. A row stuck in `sending` does *not*
 * release — the process died between the claim and Resend's answer, so the mail
 * may well have gone out, and a duplicate confirmation is worse than a missing
 * one. Those rows are the ones an operator should see on the Notifications page.
 *
 * **Never throws, and never lets the log cost a send.** Every caller is
 * downstream of something that already succeeded — a payment taken, a booking
 * moved — exactly as in `lib/email.ts`. If the claim cannot be written at all
 * (the database is unreachable), the mail is sent anyway, unlogged and loudly:
 * a guest who paid gets their confirmation. That path gives up idempotency for
 * that one send, which is acceptable precisely because a scheduler that cannot
 * reach the database never got as far as deciding to send anything.
 *
 * **Personal data.** What is written here is linkage and status — no address,
 * no hash of one, no subject line. The table note in `db/schema.ts` says why,
 * `lib/retention.ts` expires the provider id, and `lib/subject-data.ts` puts
 * the rows in the Art. 15 export.
 */
import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import {
  db,
  messageLog,
  tourRequests,
  type MessageKind,
  type MessageRecipient,
  type MessageStatus,
} from "@/db";
import { isEmailConfigured, sendEmail, type EmailMessage } from "@/lib/email";

/**
 * The kinds whose subject is a *departure* rather than the booking itself.
 *
 * The reminder is about a morning, and the move notice is about the morning it
 * moved to — send either again for a different date and it is a different
 * message, not a duplicate. Everything else (a confirmation, a cancellation, a
 * thank-you, an enquiry ack) happens once to a booking however many times its
 * date changes, so those stay keyed on the booking alone.
 */
export const DATE_BOUND_KINDS = ["day-before-reminder", "booking-moved"] as const;

/** A kind from {@link DATE_BOUND_KINDS}. */
export type DateBoundKind = (typeof DATE_BOUND_KINDS)[number];

/**
 * The kinds whose subject is one send of a quote — see the module note.
 *
 * The receipts are about a quote too, but once each rather than once per
 * link; they have a shape of their own ({@link QUOTE_RECEIPT_KINDS}) rather
 * than borrowing this one's key.
 */
export const QUOTE_SEND_KINDS = ["quote-sent"] as const;

/** A kind from {@link QUOTE_SEND_KINDS}. */
export type QuoteSendKind = (typeof QUOTE_SEND_KINDS)[number];

/**
 * The kinds whose subject is one paid instalment of a quote — the receipts.
 *
 * A quote has one deposit and one balance, and each receipt is its own kind,
 * so the quote alone is the key (`message_log_quote_receipt_key`): a second
 * webhook delivery, or the return page racing the webhook, finds the claim.
 */
export const QUOTE_RECEIPT_KINDS = ["deposit-received", "balance-paid"] as const;

/** A kind from {@link QUOTE_RECEIPT_KINDS}. */
export type QuoteReceiptKind = (typeof QUOTE_RECEIPT_KINDS)[number];

/**
 * The kinds whose subject is money going back on one instalment: one notice
 * per refunded total on it, so each refund is told once and a second partial
 * refund is told again (`message_log_quote_refund_key`).
 */
export const QUOTE_REFUND_KINDS = ["quote-refunded"] as const;

export type QuoteRefundKind = (typeof QUOTE_REFUND_KINDS)[number];

/** Whom a message is about, in rows — shared by every shape of the subject. */
type SubjectRows = {
  recipient: MessageRecipient;
  /**
   * The enquiry behind it — the person. Set it whenever there is one, even for
   * a booking-shaped kind: it is how the Art. 15 export finds the row and how
   * an erasure takes it away.
   */
  tourRequestId?: string | null;
};

/**
 * What a message is *about* — the kind, who it went to, and the row it belongs
 * to. Together these are the uniqueness key the send is claimed under.
 *
 * A union rather than one optional field: `subjectDate` is required for the
 * {@link DATE_BOUND_KINDS} and rejected for the rest, so `tsc` rather than a
 * production duplicate is what catches a reminder sent without its day.
 */
export type MessageSubject =
  | (SubjectRows & {
      kind: DateBoundKind;
      /** A date-bound message always names its booking. */
      bookingId: string;
      /** `2026-08-15` — the departure this message is about, from `bookings.date`. */
      subjectDate: string;
      /**
       * `bookings.moveSeq` at the moment of sending — the other half of the
       * date-bound key. A date alone cannot tell "reminded for the 22nd" apart
       * from "reminded for the 22nd, again, after leaving and coming back", so
       * a caller that skipped it would claim under a key that silently
       * collides with an earlier visit to the same date.
       */
      moveSeq: number;
      quoteId?: never;
      quoteSentAt?: never;
      quotePaymentId?: never;
      refundedTotalCents?: never;
    })
  | (SubjectRows & {
      kind: QuoteSendKind;
      /** The quote this send is of. */
      quoteId: string;
      /** The quote's `sent_at` as this send stamped it — which link the mail carries. */
      quoteSentAt: Date;
      bookingId?: never;
      subjectDate?: never;
      moveSeq?: never;
      quotePaymentId?: never;
      refundedTotalCents?: never;
    })
  | (SubjectRows & {
      kind: QuoteReceiptKind;
      /** The quote whose instalment was paid. */
      quoteId: string;
      bookingId?: never;
      subjectDate?: never;
      moveSeq?: never;
      quoteSentAt?: never;
      quotePaymentId?: never;
      refundedTotalCents?: never;
    })
  | (SubjectRows & {
      kind: QuoteRefundKind;
      /** The quote the refunded instalment belongs to. */
      quoteId: string;
      /** The instalment money went back on. */
      quotePaymentId: string;
      /** What had gone back on it in total once this refund landed — which refund it was. */
      refundedTotalCents: number;
      bookingId?: never;
      subjectDate?: never;
      moveSeq?: never;
      quoteSentAt?: never;
    })
  | (SubjectRows & {
      kind: Exclude<
        MessageKind,
        DateBoundKind | QuoteSendKind | QuoteReceiptKind | QuoteRefundKind
      >;
      /**
       * The booking this message is about, for the booking-shaped kinds
       * (confirmation, cancellation, thank-you). Null for the kinds that answer
       * an enquiry rather than a booking.
       */
      bookingId?: string | null;
      subjectDate?: never;
      moveSeq?: never;
      quoteId?: never;
      quoteSentAt?: never;
      quotePaymentId?: never;
      refundedTotalCents?: never;
    });

/** Why a send did not happen, in the provider's own terms. */
export type SendFailure = "unconfigured" | "no-recipient" | "failed";

/**
 * What became of one logged send.
 *
 * `duplicate` is a success, not an error: it means this message had already
 * been claimed, which is the answer a scheduled job wants. `skipped` is the
 * deployment saying it cannot send mail at all (no Resend key, nobody to send
 * to) — nothing was attempted, so nothing is logged; a log full of non-events
 * would make the Notifications page unreadable on a half-configured
 * deployment.
 */
export type LoggedSend =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "duplicate" }
  | { status: "skipped"; reason: "unconfigured" | "no-recipient" }
  | { status: "failed"; reason: SendFailure };

/**
 * Send one message and record it, exactly once.
 *
 * Returns what happened rather than throwing — see the module note. Callers log
 * the non-`sent` outcomes in their own terms, because "the guest's confirmation
 * did not go out" reads differently from "the team's copy did not".
 */
export async function sendLoggedEmail(
  subject: MessageSubject,
  message: EmailMessage,
): Promise<LoggedSend> {
  // Asked before the claim, not after: an unconfigured deployment has not
  // attempted anything, so it must not consume the one row that would stop
  // tomorrow's attempt once the key is set.
  if (!isEmailConfigured()) {
    console.warn(
      `[message-log] not configured — skipping ${subject.kind} to ${subject.recipient}`,
    );
    return { status: "skipped", reason: "unconfigured" };
  }
  if (message.to.length === 0) {
    return { status: "skipped", reason: "no-recipient" };
  }

  const claim = await claimSend(subject);
  if (claim === "duplicate") return { status: "duplicate" };

  const result = await sendEmail(message);

  if (!claim) {
    // The log is unreachable. The mail still goes — see the module note.
    return result.sent
      ? { status: "sent", providerMessageId: result.id }
      : { status: "failed", reason: result.reason };
  }

  const now = new Date();
  if (result.sent) {
    await settle(claim, {
      status: "sent",
      providerMessageId: result.id,
      sentAt: now,
      updatedAt: now,
    });
    return { status: "sent", providerMessageId: result.id };
  }

  // `failed`, not a deleted row: the attempt is worth seeing, and the partial
  // indexes already exclude it from blocking a retry.
  await settle(claim, {
    status: "failed",
    failureReason: result.reason,
    updatedAt: now,
  });
  return { status: "failed", reason: result.reason };
}

/**
 * Take the claim on one message.
 *
 * Returns the new row's id, `"duplicate"` when this message is already claimed
 * or sent, or `null` when the log itself could not be written — the caller
 * sends anyway in that last case, so this never throws.
 */
async function claimSend(subject: MessageSubject): Promise<string | "duplicate" | null> {
  try {
    const [row] = await db
      .insert(messageLog)
      .values({
        kind: subject.kind,
        recipient: subject.recipient,
        bookingId: subject.bookingId ?? null,
        tourRequestId: subject.tourRequestId ?? null,
        subjectDate: subject.subjectDate ?? null,
        moveSeq: subject.moveSeq ?? null,
        quoteId: subject.quoteId ?? null,
        quoteSentAt: subject.quoteSentAt ?? null,
        quotePaymentId: subject.quotePaymentId ?? null,
        refundedTotalCents: subject.refundedTotalCents ?? null,
        status: "sending",
      })
      // No conflict target: all six partial unique indexes are arbiters, and
      // which one applies depends on whether this message names a booking, a
      // date or a quote.
      .onConflictDoNothing()
      .returning({ id: messageLog.id });

    return row?.id ?? "duplicate";
  } catch (err) {
    console.error(
      `[message-log] could not claim ${subject.kind} to ${subject.recipient} — sending unlogged`,
      err,
    );
    return null;
  }
}

/** Close out a claimed row. A failure here is logged, never thrown. */
async function settle(
  id: string,
  patch: {
    status: "sent" | "failed";
    providerMessageId?: string | null;
    failureReason?: string | null;
    sentAt?: Date;
    updatedAt: Date;
  },
): Promise<void> {
  try {
    await db
      .update(messageLog)
      .set(patch)
      // The claim is ours and nothing else writes it, but the guard keeps this
      // update from ever reviving a row some other path has already settled.
      .where(and(eq(messageLog.id, id), eq(messageLog.status, "sending")));
  } catch (err) {
    console.error(
      `[message-log] sent ${patch.status === "sent" ? "" : "nothing "}but could not update ${id}`,
      err,
    );
  }
}

/**
 * One send as the Notifications page shows it — linkage and status, plus the
 * guest's name borrowed from the enquiry. Never the provider id: it is not
 * actionable on that page and retention expires it anyway.
 */
export type LoggedMessage = {
  id: string;
  kind: MessageKind;
  recipient: MessageRecipient;
  status: MessageStatus;
  bookingId: string | null;
  tourRequestId: string | null;
  /** `tour_requests.name` — null when the row names no enquiry. */
  guestName: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

/**
 * Every send from `since` on, newest first — the Notifications page's one read.
 *
 * Dated by `sent_at` where the provider accepted it and by the claim otherwise,
 * so a failed or stuck send sits where it happened. An erased enquiry has
 * already taken its rows with it (`cascade`), so every name here is a live one.
 */
export async function recentMessages(since: Date): Promise<LoggedMessage[]> {
  const happenedAt = sql`coalesce(${messageLog.sentAt}, ${messageLog.createdAt})`;
  return db
    .select({
      id: messageLog.id,
      kind: messageLog.kind,
      recipient: messageLog.recipient,
      status: messageLog.status,
      bookingId: messageLog.bookingId,
      tourRequestId: messageLog.tourRequestId,
      guestName: tourRequests.name,
      sentAt: messageLog.sentAt,
      createdAt: messageLog.createdAt,
    })
    .from(messageLog)
    .leftJoin(tourRequests, eq(tourRequests.id, messageLog.tourRequestId))
    // An ISO string cast in SQL rather than a bound Date: a raw `sql` operand
    // has no column to map the value through, so the type is said here.
    .where(sql`${happenedAt} >= ${since.toISOString()}::timestamptz`)
    .orderBy(desc(happenedAt));
}
