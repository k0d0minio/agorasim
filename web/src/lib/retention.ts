/**
 * Retention — for enquiries that never convert, and for the IP addresses the
 * audit log records alongside them.
 *
 * ⚠️ **The period is not decided.** {@link DEFAULT_RETENTION_DAYS} is a *proposal*
 * — 24 months from last contact — chosen because it is the common practice for
 * warm sales leads in EU tourism and long enough that a guest enquiring one
 * summer and returning the next is still recognised. It has not been signed off
 * by anyone at Agorasim and it is not legal advice. Set `ENQUIRY_RETENTION_DAYS`
 * to whatever is decided; the default is a fallback, not a recommendation.
 * See `.icm/docs/data-protection.md`.
 *
 * **Anonymise, not delete.** Expired rows have their identifying columns cleared
 * (name, email, phone, message) and the rest — party size, locale, status, dates
 * — is kept. What is left cannot identify anyone, so it is no longer personal
 * data, while "how many enquiries did we get in August 2026?" still has an
 * answer. Deleting the rows outright would satisfy the same rule and destroy the
 * only record of the business's own history.
 *
 * **Enquiries that turned into money are excluded.** A booking that happened may
 * carry record-keeping obligations of its own (tax, in particular), and quietly
 * shredding it to satisfy a marketing-lead retention rule would trade one
 * compliance problem for another. Those rows are left alone pending the same
 * human decision — see the doc. `status = 'booked'` was the whole of that test
 * and is no longer: a couple who paid a deposit on an event quote is the same
 * obligation, and a stage that had not been moved was the only thing standing
 * between them and the sweep. {@link leadIsExpired} now also asks whether any
 * quote of theirs has taken money. `lib/quotes.ts` moves the stage as well, and
 * the two are deliberately belt and braces: the stage is what an operator can
 * change by hand, and the deposit is what actually happened.
 *
 * **Quotes are anonymised with the lead they belong to.** `quotes.venue` and the
 * labels on `quotes.line_items` are free text an operator typed about somebody's
 * wedding — a church and a Saturday in June, "flores da Rita" — and
 * `tour_request_id` is `ON DELETE set null`, so an erasure leaves them behind
 * rather than taking them with it. {@link anonymiseQuotesForLead} is what the
 * erasure calls to take them, and the sweep below does the same for every lead
 * it anonymises. The money survives: amounts, quantities, dates and statuses
 * are the business's own record and say nothing about a person once the name
 * and the venue are gone — and keeping the line amounts is what keeps them
 * adding up to the total they were quoted at.
 *
 * **Audit-log IP addresses expire too, and on a much shorter clock.** An IP is
 * personal data, and `audit_log.ip_address` was the one column in this schema
 * with no expiry at all: enquiries were anonymised on a schedule while the
 * addresses of the people who touched them accumulated forever. That asymmetry
 * is not defensible under Art. 5(1)(e), and it is not what the column is for —
 * it exists so that "was this action taken from somewhere unexpected?" has an
 * answer while the question is still live, which is weeks, not years.
 *
 * **The message log expires its provider ids on the same clock.** `message_log`
 * holds no address and no subject line (see its note in `db/schema.ts`), but
 * `provider_message_id` resolves in Resend's dashboard to the whole message —
 * the address, the guest's name, the lot. That makes it a working pointer to
 * personal data held somewhere else, so it expires here for the same reason the
 * audit IP does, and immediately for any send whose enquiry has already been
 * anonymised: this database must not keep a key to data it has itself given up.
 * The row survives, because "a reminder went out on the 14th" is the log's
 * whole job and is no longer about an identifiable person once the enquiry is
 * anonymised. An Art. 17 erasure is the harder case and needs nothing here —
 * deleting the enquiry deletes its sends, by `ON DELETE cascade`.
 *
 * This is the one place the application writes to `audit_log` after the fact,
 * and it is worth being explicit about why that does not contradict the
 * append-only rule in `db/schema.ts`. No entry is added, removed or reordered;
 * the trail still records every action, its actor and its time. One field of
 * corroborating evidence expires on its own schedule, which is minimisation
 * applied to a log rather than an edit to its history.
 */
import "server-only";

import { and, eq, inArray, isNotNull, isNull, lt, ne, notInArray, or, sql } from "drizzle-orm";

import { auditLog, db, messageLog, quotes, tourRequests, type QuoteLineItem } from "@/db";
import { expireLapsedHolds } from "@/lib/bookings";

/** Proposed, **not decided**. Override with `ENQUIRY_RETENTION_DAYS`. */
export const DEFAULT_RETENTION_DAYS = 730;

/**
 * How long an audit entry keeps the IP it was taken from. 90 days, and unlike
 * {@link DEFAULT_RETENTION_DAYS} this one is a recommendation rather than a
 * placeholder: it is the usual window for security log retention, long enough
 * to investigate an incident somebody noticed late and short enough that the
 * column is not a standing record of where two people work from. Override with
 * `AUDIT_IP_RETENTION_DAYS`.
 */
export const DEFAULT_AUDIT_IP_RETENTION_DAYS = 90;

/**
 * How long a `message_log` row keeps the provider's id for the message. 90 days,
 * on the audit-IP reasoning rather than the enquiry one: the id exists so that
 * "did this actually arrive?" can be chased in Resend's dashboard while the
 * question is still live, which is weeks. After that it is only a key to a copy
 * of the mail — the address and the body included — sitting on somebody else's
 * server. Override with `MESSAGE_PROVIDER_ID_RETENTION_DAYS`.
 */
export const DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS = 90;

/**
 * Read a whole-day period out of the environment, falling back to `fallback`.
 *
 * A non-numeric or non-positive value falls back rather than disabling the job:
 * a typo in an environment variable should not silently turn retention off for a
 * year.
 */
function configuredDays(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
): number {
  const raw = env[name]?.trim();
  // Whole digits only. `parseInt` would happily read "30 days" as 30 and
  // "12.5.6" as 12; for a job that erases data, a value we had to guess at is a
  // value we should refuse.
  const parsed = raw && /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (raw) {
      console.warn(`[retention] ignoring ${name}=${raw} — using ${fallback}`);
    }
    return fallback;
  }
  return parsed;
}

/** How long an unconverted enquiry is kept. See {@link DEFAULT_RETENTION_DAYS}. */
export function retentionDays(
  env: Record<string, string | undefined> = process.env,
): number {
  return configuredDays(env, "ENQUIRY_RETENTION_DAYS", DEFAULT_RETENTION_DAYS);
}

/**
 * How long an audit entry keeps its IP address.
 * See {@link DEFAULT_AUDIT_IP_RETENTION_DAYS}.
 */
export function auditIpRetentionDays(
  env: Record<string, string | undefined> = process.env,
): number {
  return configuredDays(
    env,
    "AUDIT_IP_RETENTION_DAYS",
    DEFAULT_AUDIT_IP_RETENTION_DAYS,
  );
}

/**
 * How long a send keeps its provider message id.
 * See {@link DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS}.
 */
export function messageProviderIdRetentionDays(
  env: Record<string, string | undefined> = process.env,
): number {
  return configuredDays(
    env,
    "MESSAGE_PROVIDER_ID_RETENTION_DAYS",
    DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS,
  );
}

/** The instant before which an unconverted enquiry is expired. */
export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** What the values of an anonymised row look like. Exported so tests can assert it. */
export const ANONYMISED = {
  name: "[anonymised]",
  email: "[anonymised]",
  phone: null,
  message: null,
  /**
   * The team's own notes about this person go with the rest of it. They are
   * written by an operator rather than by the guest, which changes nothing:
   * "wanted the 2CV, calling back after her holiday" is personal data about an
   * identified person, and leaving it behind would make the anonymisation a
   * gesture rather than an erasure.
   */
  internalNotes: null,
  /**
   * The venue a wedding or event enquiry named. Free text the guest wrote, on
   * the same reading as `message` and the free-text preferred date below: a
   * church and a Saturday in June is somebody's wedding, and a wedding is
   * published. The hours and the car they asked for stay — neither says
   * anything about a person once the name and the date are gone.
   */
  venue: null,
} as const;

/**
 * What a line item's label becomes. The same marker {@link ANONYMISED} uses, so
 * an anonymised row reads the same way wherever it is rendered.
 */
export const ANONYMISED_LINE_ITEM_LABEL = ANONYMISED.name;

/**
 * A quote's lines with the words taken out and the arithmetic left in.
 *
 * The label is the only part an operator types and the only part that can name
 * a person or a place — "flores da Rita", "transfer Quinta do Hespanhol". The
 * unit price and the quantity are the business's own record of what an event
 * cost, and they stay for the reason the whole job anonymises rather than
 * deletes.
 *
 * Keeping them is also load-bearing rather than merely nice: `validateQuoteInput`
 * refuses a quote whose lines do not add up to its total, so dropping the lines
 * would leave rows the application's own rules call invalid.
 *
 * Pure, and the statement of the rule the SQL below implements.
 */
export function anonymisedLineItems(items: QuoteLineItem[]): QuoteLineItem[] {
  return items.map((item) => ({ ...item, label: ANONYMISED_LINE_ITEM_LABEL }));
}

/**
 * The quote statuses that mean money has actually arrived.
 *
 * A lead with one of these is kept for the same reason a `booked` one is: the
 * record-keeping obligations that attach to a payment are not satisfied by a
 * marketing-retention rule. See the doc's open item 2.
 */
const QUOTE_STATUSES_WITH_MONEY = ["deposit_paid", "paid"] as const;

export type RetentionRun = {
  cutoff: string;
  days: number;
  /** Rows anonymised by this run. */
  anonymised: number;
  /**
   * Abandoned checkout holds relabelled `expired` by this run.
   *
   * Not retention, and not load-bearing: the seat was already free the moment
   * the hold lapsed (`lib/bookings.ts` counts by the clock, not by this
   * status). It rides along here because this is the one scheduled job the
   * deployment has, and a `pending` list full of March's abandoned checkouts
   * is a screen that lies to an operator.
   */
  holdsExpired: number;
  /** Cutoff used for {@link RetentionRun.auditIpsCleared}. */
  auditIpCutoff: string;
  auditIpDays: number;
  /** Audit entries that lost their IP address in this run. */
  auditIpsCleared: number;
  /** Cutoff used for {@link RetentionRun.providerMessageIdsCleared}. */
  providerIdCutoff: string;
  providerIdDays: number;
  /** Sends that lost their provider message id in this run. */
  providerMessageIdsCleared: number;
  /** Quotes that lost their venue and line-item labels in this run. */
  quotesAnonymised: number;
};

/**
 * Run every retention pass: anonymise expired enquiries, expire the IP
 * addresses on old audit entries, and expire the provider ids on old sends.
 *
 * They share a job because they answer the same obligation on the same schedule,
 * and because a deployment that runs one but not the other is the situation this
 * was written to end. They do not share a *period*: an unconverted lead is kept
 * for two years, the address it was submitted from for ninety days, and the
 * handle on a mail sitting in Resend for ninety days or until the enquiry
 * behind it is anonymised, whichever comes first.
 *
 * Both passes are idempotent, so a second run in the same window is a no-op
 * rather than a second pass over the same rows.
 */
export async function runRetention(now: Date = new Date()): Promise<RetentionRun> {
  const days = retentionDays();
  const cutoff = retentionCutoff(now, days);

  const rows = await db
    .update(tourRequests)
    .set({
      ...ANONYMISED,
      anonymisedAt: now,
      updatedAt: now,
      // Consent cannot outlive the address it was given for.
      marketingConsent: false,
      marketingConsentAt: null,
      marketingConsentVersion: null,
      // The free-text preferred date can name a person ("Rita's birthday").
      preferredDate: null,
    })
    .where(expiredLeads(cutoff))
    .returning({ id: tourRequests.id });

  // After the lead pass, so a quote whose couple was anonymised by this very
  // run loses its venue in the same run rather than a day later.
  const quotesAnonymised = await anonymiseQuotesOfAnonymisedLeads(now);

  const { cutoff: auditIpCutoff, days: auditIpDays, cleared } =
    await clearExpiredAuditIps(now);

  // After the anonymisation above, not before: a lead anonymised by this very
  // run loses the provider ids of its sends in the same run rather than a week
  // later.
  const {
    cutoff: providerIdCutoff,
    days: providerIdDays,
    cleared: providerMessageIdsCleared,
  } = await clearExpiredProviderMessageIds(now);

  const holdsExpired = await expireLapsedHolds(now);

  return {
    cutoff: cutoff.toISOString(),
    days,
    anonymised: rows.length,
    holdsExpired,
    auditIpCutoff: auditIpCutoff.toISOString(),
    auditIpDays,
    auditIpsCleared: cleared,
    providerIdCutoff: providerIdCutoff.toISOString(),
    providerIdDays,
    providerMessageIdsCleared,
    quotesAnonymised,
  };
}

/**
 * The enquiries this run may touch: expired, not already anonymised, and with
 * nothing on them that has to be kept.
 *
 * One function rather than a repeated `and(...)`, because
 * {@link countPendingRetention} renders this number to an operator on the
 * submissions screen and a preview that does not match the job is worse than no
 * preview at all.
 *
 * The money test is a `NOT IN` against a subquery, and the
 * `tour_request_id IS NOT NULL` inside it is not decoration: a single null in
 * the right-hand side of `NOT IN` makes the whole predicate `unknown` for every
 * row, which would silently turn retention off the first time a quote was
 * raised without a lead behind it.
 */
function expiredLeads(cutoff: Date) {
  const leadsWithMoney = db
    .select({ id: quotes.tourRequestId })
    .from(quotes)
    .where(
      and(
        isNotNull(quotes.tourRequestId),
        inArray(quotes.status, [...QUOTE_STATUSES_WITH_MONEY]),
      ),
    );

  return and(
    lt(tourRequests.updatedAt, cutoff),
    ne(tourRequests.status, "booked"),
    isNull(tourRequests.anonymisedAt),
    notInArray(tourRequests.id, leadsWithMoney),
  );
}

/**
 * The venue and line-item labels a quote carries, as the values an anonymised
 * row takes.
 *
 * The labels are rewritten in place rather than thrown away — see
 * {@link anonymisedLineItems}, which is this same rule in TypeScript and is
 * what the tests hold. `jsonb_agg … with ordinality` keeps the lines in the
 * order they were quoted in, which plain `jsonb_agg` does not promise, and the
 * `coalesce` is what makes a quote with no lines stay `[]` instead of becoming
 * null.
 */
const ANONYMISED_QUOTE_COLUMNS = {
  venue: null,
  lineItems: sql`(
    select coalesce(
      jsonb_agg(
        jsonb_set(line.item, '{label}', to_jsonb(${ANONYMISED_LINE_ITEM_LABEL}::text))
        order by line.ord
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(${quotes.lineItems}) with ordinality as line(item, ord)
  )`,
};

/**
 * Whether a quote still carries anything an anonymisation would take — the
 * idempotency guard, in the same shape as `ipAddress IS NOT NULL` above.
 *
 * `IS DISTINCT FROM` rather than `<>` so a line with no label at all counts as
 * one to rewrite rather than as an unknown that keeps the row out of the sweep.
 */
const quoteCarriesPersonalData = or(
  isNotNull(quotes.venue),
  sql`exists (
    select 1
    from jsonb_array_elements(${quotes.lineItems}) as line(item)
    where line.item ->> 'label' is distinct from ${ANONYMISED_LINE_ITEM_LABEL}
  )`,
);

/**
 * Take the venue and the line-item labels off every quote built from one
 * enquiry.
 *
 * Called by the Art. 17 erasure **before** it deletes the enquiry, because
 * `quotes.tour_request_id` is `ON DELETE set null`: after the delete these rows
 * are still there and no longer reachable from the person, which is the worst
 * of both. Returns how many were touched, so the erasure can say so.
 */
export async function anonymiseQuotesForLead(
  tourRequestId: string,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .update(quotes)
    .set({ ...ANONYMISED_QUOTE_COLUMNS, updatedAt: now })
    .where(and(eq(quotes.tourRequestId, tourRequestId), quoteCarriesPersonalData))
    .returning({ id: quotes.id });

  return rows.length;
}

/**
 * The same, for every lead the sweep has already anonymised.
 *
 * Keyed on `tour_requests.anonymised_at` rather than on this run's own returned
 * ids, exactly as {@link clearExpiredProviderMessageIds} is: a quote raised for
 * a couple who were anonymised last year — or a run that died between the two
 * passes — is caught by the next run rather than never.
 */
async function anonymiseQuotesOfAnonymisedLeads(now: Date): Promise<number> {
  const anonymisedLeads = db
    .select({ id: tourRequests.id })
    .from(tourRequests)
    .where(isNotNull(tourRequests.anonymisedAt));

  const rows = await db
    .update(quotes)
    .set({ ...ANONYMISED_QUOTE_COLUMNS, updatedAt: now })
    .where(and(inArray(quotes.tourRequestId, anonymisedLeads), quoteCarriesPersonalData))
    .returning({ id: quotes.id });

  return rows.length;
}

/**
 * Null the IP address on audit entries older than the audit-IP window.
 *
 * `ipAddress IS NOT NULL` keeps this idempotent and keeps the write off rows
 * that have already expired — including every entry written by this job itself,
 * which records a null IP because a scheduler is not a person.
 */
async function clearExpiredAuditIps(
  now: Date,
): Promise<{ cutoff: Date; days: number; cleared: number }> {
  const days = auditIpRetentionDays();
  const cutoff = retentionCutoff(now, days);

  const rows = await db
    .update(auditLog)
    .set({ ipAddress: null })
    .where(and(lt(auditLog.createdAt, cutoff), isNotNull(auditLog.ipAddress)))
    .returning({ id: auditLog.id });

  return { cutoff, days, cleared: rows.length };
}

/**
 * Null the provider message id on sends that no longer need one — the ones past
 * the window, and the ones whose enquiry has been anonymised whatever their age.
 *
 * Only the id goes. The row stays, because what it says once the id is gone —
 * this kind of message, about this booking, went out on this day — is the
 * record the Notifications page and the dispatcher exist for, and is not about
 * an identifiable person once the enquiry it points at has been anonymised.
 *
 * `providerMessageId IS NOT NULL` keeps it idempotent and keeps the write off
 * the rows that have already expired, exactly as the audit-IP pass does. A send
 * that never reached Resend has no id and is never touched.
 */
async function clearExpiredProviderMessageIds(
  now: Date,
): Promise<{ cutoff: Date; days: number; cleared: number }> {
  const days = messageProviderIdRetentionDays();
  const cutoff = retentionCutoff(now, days);

  const anonymisedLeads = db
    .select({ id: tourRequests.id })
    .from(tourRequests)
    .where(isNotNull(tourRequests.anonymisedAt));

  const rows = await db
    .update(messageLog)
    .set({ providerMessageId: null, updatedAt: now })
    .where(
      and(
        isNotNull(messageLog.providerMessageId),
        or(
          lt(messageLog.createdAt, cutoff),
          inArray(messageLog.tourRequestId, anonymisedLeads),
        ),
      ),
    )
    .returning({ id: messageLog.id });

  return { cutoff, days, cleared: rows.length };
}

/**
 * How many rows the next run would touch, without touching them. Rendered on the
 * admin submissions screen so the policy is visible rather than a surprise.
 */
export async function countPendingRetention(now: Date = new Date()): Promise<number> {
  const cutoff = retentionCutoff(now, retentionDays());
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tourRequests)
    .where(expiredLeads(cutoff));
  return row?.n ?? 0;
}
