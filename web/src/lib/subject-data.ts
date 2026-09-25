/**
 * Subject access (GDPR Art. 15) and erasure (Art. 17) for a person, keyed by
 * their email address.
 *
 * **The registry below is the contract.** Answering "everything you hold about
 * me" correctly means enumerating every table that references the person — so
 * adding a table that stores an email address and forgetting to add it here
 * silently makes every future export wrong. The list is deliberately explicit
 * and deliberately short; keep it that way, and extend it in the same commit
 * that adds the table.
 *
 * Four tables are in scope. `tour_requests` holds the person — name, address,
 * phone, what they wrote. `message_log` holds no identifier at all, and is here
 * anyway: "you emailed me these five times" is data about that person (Art.
 * 4(1)) and is exactly the sort of thing an access request is asking for. It is
 * found through the enquiry rows rather than by address, because the log
 * deliberately keeps no copy of one (see its note in `db/schema.ts`) — so the
 * enquiries are the index into it, and a person with no enquiry has no sends.
 *
 * `quotes` and `quote_payments` are the weddings-and-events half of the same
 * answer, and they are here for two reasons rather than one. The obvious one is
 * that "what you quoted me for my wedding, and what I have paid of it" is data
 * about the person asking. The less obvious one is that `quotes.venue` and the
 * labels on `quotes.line_items` are free text somebody typed about that
 * person's day — an export that left them out would be answering a narrower
 * question than the one that was asked. The instalments come with their quote
 * because a price with no record of what was taken against it is half an
 * answer. Both are reached through `tour_request_id`, on the same reasoning as
 * the message log: the enquiry is the index, and neither table stores an
 * address to search by.
 *
 * `bookings` is deliberately absent: it holds no guest identity (the table's own
 * note says so), and every booking reachable from these rows is reachable
 * through the enquiry that owns it. `admin_users` is not in scope either —
 * those are operators, not data subjects of the enquiry flow, and their records
 * are managed from the users screen.
 */
import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import {
  db,
  messageLog,
  quotePayments,
  quotes,
  tourRequests,
  type MessageLogEntry,
  type Quote,
  type QuotePayment,
  type TourRequest,
} from "@/db";
import { normalizeEmail } from "@/lib/admin-users";
import { optedOutAt } from "@/lib/email-opt-out";

/** Everything the system holds about one person, ready to serialize as JSON. */
export type SubjectExport = {
  /** Marks the file as an Art. 15 response rather than an ad-hoc dump. */
  subjectEmail: string;
  generatedAt: string;
  /** Table name → the rows referencing this person. */
  records: {
    tourRequests: TourRequest[];
    /** Every automatic message sent about one of those enquiries. */
    messageLog: MessageLogEntry[];
    /** Every event quote built from one of those enquiries. */
    quotes: Quote[];
    /** The instalments of those quotes, paid or not. */
    quotePayments: QuotePayment[];
  };
  /** Row counts, so an empty section is obviously empty rather than ambiguous. */
  counts: Record<string, number>;
  /**
   * Whether this address asked to stop the post-tour thank-you, and since
   * when. The suppression list holds a hash, not the address (see
   * `email_opt_outs` in `db/schema.ts`), so it is answered by hashing the
   * address asked about — and `unavailable` when this deployment has no
   * `EMAIL_OPT_OUT_SECRET` to hash with, rather than a false "no".
   */
  emailOptOut:
    | { status: "opted-out"; since: string }
    | { status: "not-opted-out" }
    | { status: "unavailable" };
};

async function emailOptOutFor(subjectEmail: string): Promise<SubjectExport["emailOptOut"]> {
  try {
    const since = await optedOutAt(subjectEmail);
    return since ? { status: "opted-out", since: since.toISOString() } : { status: "not-opted-out" };
  } catch (err) {
    console.error("[subject-data] the opt-out list could not be read", err);
    return { status: "unavailable" };
  }
}

/** Collect every record held about `email`. Returns empty sections, not null. */
export async function exportSubjectData(email: string): Promise<SubjectExport> {
  const subjectEmail = normalizeEmail(email);

  const requests = await db
    .select()
    .from(tourRequests)
    .where(eq(tourRequests.email, subjectEmail))
    .orderBy(desc(tourRequests.createdAt));

  // No enquiries, no query: `inArray` on an empty list is a SQL error in some
  // drivers and a full scan in others, and the answer is known either way.
  const requestIds = requests.map((request) => request.id);

  const messages = requestIds.length
    ? await db
        .select()
        .from(messageLog)
        .where(inArray(messageLog.tourRequestId, requestIds))
        .orderBy(desc(messageLog.createdAt))
    : [];

  const eventQuotes = requestIds.length
    ? await db
        .select()
        .from(quotes)
        .where(inArray(quotes.tourRequestId, requestIds))
        .orderBy(desc(quotes.createdAt))
    : [];

  // Same guard again, one level down: a person with enquiries but no quote has
  // no instalments either, and `inArray([])` is the thing to avoid, not the
  // empty answer.
  const instalments = eventQuotes.length
    ? await db
        .select()
        .from(quotePayments)
        .where(
          inArray(
            quotePayments.quoteId,
            eventQuotes.map((quote) => quote.id),
          ),
        )
        .orderBy(desc(quotePayments.createdAt))
    : [];

  return {
    subjectEmail,
    generatedAt: new Date().toISOString(),
    records: {
      tourRequests: requests,
      messageLog: messages,
      quotes: eventQuotes,
      quotePayments: instalments,
    },
    counts: {
      tourRequests: requests.length,
      messageLog: messages.length,
      quotes: eventQuotes.length,
      quotePayments: instalments.length,
    },
    emailOptOut: await emailOptOutFor(subjectEmail),
  };
}

/** A filename an operator can hand over without renaming it. */
export function subjectExportFilename(email: string, now: Date): string {
  const safeEmail = normalizeEmail(email).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const day = now.toISOString().slice(0, 10);
  return `agorasim-data-export-${safeEmail}-${day}.json`;
}
