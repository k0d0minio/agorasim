/**
 * The audit trail — one writer, called by every mutating admin action.
 *
 * It is a single helper rather than an insert copy-pasted into each action on
 * purpose: an audit log is only worth having if the shape of its rows is
 * uniform, and "every action remembers to log correctly" is not an invariant a
 * codebase can hold by convention.
 *
 * **Two ways to call it, and the difference matters.**
 *
 * - {@link recordAudit} throws if the write fails. Use it *before* an
 *   irreversible action — notably erasure — so that a failure to record the
 *   deletion prevents the deletion. An untraceable erasure is worse than a
 *   failed one.
 * - {@link recordAuditOrWarn} logs and swallows. Use it after routine,
 *   reversible mutations (a status change), where losing the trail entry is
 *   regrettable but telling the operator their saved change failed — when it
 *   did not — is worse.
 *
 * **Personal data.** `before`/`after` are the changed slice of the row, and for
 * guest records they must not carry the guest's name, email, phone or message:
 * an erasure entry that quoted the address it erased would defeat the erasure.
 * {@link redactSubject} turns those identifiers into a stable, non-reversing
 * fingerprint that is enough to answer "was this person's data deleted?" without
 * storing the person.
 */
import "server-only";

import { desc, eq, inArray, and } from "drizzle-orm";

import { db, auditLog, adminUsers, type AuditLogEntry } from "@/db";
import { clientIp } from "@/lib/request-ip";

/**
 * Every action name the audit log can record.
 *
 * A closed union rather than free-form strings: the audit view groups and
 * labels by action, and a typo in an action name is a row that quietly never
 * shows up under the filter it belongs to.
 */
export const AUDIT_ACTIONS = [
  "admin_user.signed_in",
  "admin_user.signed_out",
  "admin_user.sessions_revoked",
  "admin_user.created",
  "admin_user.disabled",
  "admin_user.enabled",
  "admin_user.password_changed",
  "tour_request.status_changed",
  "tour_request.updated",
  "tour_request.contact_logged",
  "tour_request.deleted",
  "tour_request.exported",
  "tour_request.anonymised_by_retention",
  "feature_request.created",
  "feature_request.status_changed",
  "experience.created",
  "experience.updated",
  "experience.image_uploaded",
  "experience.archived",
  "experience.restored",
  "experience.reordered",
  "experience.deleted",
  "availability.opened",
  "availability.closed",
  "availability.cleared",
  "booking.confirmed",
  "booking.expired",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** The thing an action happened to. */
export type AuditEntityType =
  | "admin_user"
  | "tour_request"
  | "feature_request"
  | "experience"
  | "availability"
  | "booking";

export type AuditInput = {
  /** The signed-in operator, or `null` for an automated job (the retention cron). */
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  /** Primary key of the affected row, where a single one applies. */
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  /**
   * Override the client IP. Only the retention cron needs this (it has a request,
   * but the "caller" is a scheduler, not a person); everything else omits it and
   * the request's IP is read here.
   */
  ipAddress?: string | null;
};

/**
 * Append one entry. Throws if the write fails — see the module note for when
 * that is what you want.
 */
export async function recordAudit(entry: AuditInput): Promise<void> {
  await db.insert(auditLog).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    // `!== undefined`, not `??`: an explicit `null` from a background caller
    // means "there is no client IP", and must not fall through to reading one.
    ipAddress: entry.ipAddress !== undefined ? entry.ipAddress : await safeClientIp(),
  });
}

/**
 * Append one entry, logging rather than throwing if it fails. For routine
 * mutations that have already succeeded.
 */
export async function recordAuditOrWarn(entry: AuditInput): Promise<void> {
  try {
    await recordAudit(entry);
  } catch (err) {
    console.error(`[audit] failed to record ${entry.action}`, err);
  }
}

/**
 * A non-identifying stand-in for a data subject, for entries about deleting
 * their data.
 *
 * Deliberately lossy and deliberately *not* a hash of the address: a SHA of an
 * email is still personal data under the GDPR, because anyone holding a list of
 * candidate addresses can confirm a match. This keeps only the shape — enough to
 * recognise "yes, an erasure for a gmail address on the 4th happened" when
 * answering an accountability question, not enough to reconstruct who.
 */
export function redactSubject(subject: {
  email?: string | null;
  name?: string | null;
}): Record<string, unknown> {
  const email = subject.email?.trim() ?? "";
  const at = email.lastIndexOf("@");
  const domain = at > -1 ? email.slice(at + 1).toLowerCase() : null;

  return {
    redacted: true,
    emailDomain: domain,
    emailLength: email.length || null,
    nameInitial: subject.name?.trim()?.[0]?.toUpperCase() ?? null,
  };
}

/** An audit row joined to the operator who caused it, for the log views. */
export type AuditLogRow = AuditLogEntry & {
  actorName: string | null;
  actorEmail: string | null;
};

const rowColumns = {
  id: auditLog.id,
  actorUserId: auditLog.actorUserId,
  action: auditLog.action,
  entityType: auditLog.entityType,
  entityId: auditLog.entityId,
  before: auditLog.before,
  after: auditLog.after,
  ipAddress: auditLog.ipAddress,
  createdAt: auditLog.createdAt,
  actorName: adminUsers.name,
  actorEmail: adminUsers.email,
} as const;

/** A page of the audit log, newest first. */
export async function listAuditLog(options: {
  limit: number;
  offset: number;
}): Promise<AuditLogRow[]> {
  return db
    .select(rowColumns)
    .from(auditLog)
    .leftJoin(adminUsers, eq(auditLog.actorUserId, adminUsers.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(options.limit)
    .offset(options.offset);
}

/**
 * Every entry for one record, newest first — the history on a lead's own page.
 *
 * Capped rather than paged: the point is "what has happened to this person's
 * enquiry", and a lead with more than a few dozen entries is a different
 * problem from the one this list answers.
 */
export async function listAuditForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 20,
): Promise<AuditLogRow[]> {
  return db
    .select(rowColumns)
    .from(auditLog)
    .leftJoin(adminUsers, eq(auditLog.actorUserId, adminUsers.id))
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/**
 * The most recent entry for each of `entityIds` — what the compact
 * "last changed by X" line on a row renders from.
 *
 * One query for the whole page rather than one per row: the alternative is 25
 * round trips to render a table that already cost one.
 */
export async function lastAuditByEntity(
  entityType: AuditEntityType,
  entityIds: string[],
): Promise<Map<string, AuditLogRow>> {
  const latest = new Map<string, AuditLogRow>();
  if (entityIds.length === 0) return latest;

  const rows = await db
    .select(rowColumns)
    .from(auditLog)
    .leftJoin(adminUsers, eq(auditLog.actorUserId, adminUsers.id))
    .where(
      and(
        eq(auditLog.entityType, entityType),
        inArray(auditLog.entityId, entityIds),
      ),
    )
    .orderBy(desc(auditLog.createdAt));

  // Ordered newest-first, so the first row seen for an id is the latest one.
  for (const row of rows) {
    if (row.entityId && !latest.has(row.entityId)) latest.set(row.entityId, row);
  }
  return latest;
}

/**
 * The request's client IP, or `null`. Wrapped because `headers()` throws outside
 * a request scope, and a background caller should still get its audit row.
 */
async function safeClientIp(): Promise<string | null> {
  try {
    return await clientIp();
  } catch {
    return null;
  }
}
