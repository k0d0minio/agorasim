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
 * **Booked enquiries are excluded.** A booking that happened may carry
 * record-keeping obligations of its own (tax, in particular), and quietly
 * shredding it to satisfy a marketing-lead retention rule would trade one
 * compliance problem for another. Those rows are left alone pending the same
 * human decision — see the doc.
 *
 * **Audit-log IP addresses expire too, and on a much shorter clock.** An IP is
 * personal data, and `audit_log.ip_address` was the one column in this schema
 * with no expiry at all: enquiries were anonymised on a schedule while the
 * addresses of the people who touched them accumulated forever. That asymmetry
 * is not defensible under Art. 5(1)(e), and it is not what the column is for —
 * it exists so that "was this action taken from somewhere unexpected?" has an
 * answer while the question is still live, which is weeks, not years.
 *
 * This is the one place the application writes to `audit_log` after the fact,
 * and it is worth being explicit about why that does not contradict the
 * append-only rule in `db/schema.ts`. No entry is added, removed or reordered;
 * the trail still records every action, its actor and its time. One field of
 * corroborating evidence expires on its own schedule, which is minimisation
 * applied to a log rather than an edit to its history.
 */
import "server-only";

import { and, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";

import { auditLog, db, tourRequests } from "@/db";

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
} as const;

export type RetentionRun = {
  cutoff: string;
  days: number;
  /** Rows anonymised by this run. */
  anonymised: number;
  /** Cutoff used for {@link RetentionRun.auditIpsCleared}. */
  auditIpCutoff: string;
  auditIpDays: number;
  /** Audit entries that lost their IP address in this run. */
  auditIpsCleared: number;
};

/**
 * Run both retention passes: anonymise expired enquiries, and expire the IP
 * addresses on old audit entries.
 *
 * They share a job because they answer the same obligation on the same schedule,
 * and because a deployment that runs one but not the other is the situation this
 * was written to end. They do not share a *period*: an unconverted lead is kept
 * for two years, the address it was submitted from for ninety days.
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
    .where(
      and(
        lt(tourRequests.updatedAt, cutoff),
        ne(tourRequests.status, "booked"),
        isNull(tourRequests.anonymisedAt),
      ),
    )
    .returning({ id: tourRequests.id });

  const { cutoff: auditIpCutoff, days: auditIpDays, cleared } =
    await clearExpiredAuditIps(now);

  return {
    cutoff: cutoff.toISOString(),
    days,
    anonymised: rows.length,
    auditIpCutoff: auditIpCutoff.toISOString(),
    auditIpDays,
    auditIpsCleared: cleared,
  };
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
