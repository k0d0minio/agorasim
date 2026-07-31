/**
 * Retention for enquiries that never convert.
 *
 * ⚠️ **The period is not decided.** {@link DEFAULT_RETENTION_DAYS} is a *proposal*
 * — 24 months from last contact — chosen because it is the common practice for
 * warm sales leads in EU tourism and long enough that a guest enquiring one
 * summer and returning the next is still recognised. It has not been signed off
 * by anyone at Agorasim and it is not legal advice. Set `ENQUIRY_RETENTION_DAYS`
 * to whatever is decided; the default is a fallback, not a recommendation.
 * See `docs/data-protection.md`.
 *
 * **Anonymise, not delete.** Expired rows have their identifying columns cleared
 * (name, email, phone, message) and the rest — party size, locale, status, dates
 * — is kept. What is left cannot identify anyone, so it is no longer personal
 * data, while "how many enquiries did we get in August 2026?" still has an
 * answer. Deleting the rows outright would satisfy the same rule and destroy the
 * only record of the business's own history.
 *
 * **Booked enquiries are excluded.** A booking that happened may carry
 * record-keeping obligations of its own (tax, in particular), and quietly
 * shredding it to satisfy a marketing-lead retention rule would trade one
 * compliance problem for another. Those rows are left alone pending the same
 * human decision — see the doc.
 */
import "server-only";

import { and, isNull, lt, ne, sql } from "drizzle-orm";

import { db, tourRequests } from "@/db";

/** Proposed, **not decided**. Override with `ENQUIRY_RETENTION_DAYS`. */
export const DEFAULT_RETENTION_DAYS = 730;

/**
 * The configured retention period in days.
 *
 * A non-numeric or non-positive value falls back to the default rather than
 * disabling the job: a typo in an environment variable should not silently turn
 * retention off for a year.
 */
export function retentionDays(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.ENQUIRY_RETENTION_DAYS?.trim();
  // Whole digits only. `parseInt` would happily read "30 days" as 30 and
  // "12.5.6" as 12; for a job that erases data, a value we had to guess at is a
  // value we should refuse.
  const parsed = raw && /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (raw) {
      console.warn(
        `[retention] ignoring ENQUIRY_RETENTION_DAYS=${raw} — using ${DEFAULT_RETENTION_DAYS}`,
      );
    }
    return DEFAULT_RETENTION_DAYS;
  }
  return parsed;
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
} as const;

export type RetentionRun = {
  cutoff: string;
  days: number;
  /** Rows anonymised by this run. */
  anonymised: number;
};

/**
 * Anonymise every expired, unconverted, not-already-anonymised enquiry.
 *
 * Idempotent: `anonymisedAt IS NULL` means a second run in the same window is a
 * no-op rather than a second pass over the same rows.
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
    .where(
      and(
        lt(tourRequests.updatedAt, cutoff),
        ne(tourRequests.status, "booked"),
        isNull(tourRequests.anonymisedAt),
      ),
    )
    .returning({ id: tourRequests.id });

  return { cutoff: cutoff.toISOString(), days, anonymised: rows.length };
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
    .where(
      and(
        lt(tourRequests.updatedAt, cutoff),
        ne(tourRequests.status, "booked"),
        isNull(tourRequests.anonymisedAt),
      ),
    );
  return row?.n ?? 0;
}
