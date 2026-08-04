import { MailCheck } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit";
import { auditActionLabel, formatDateTime, formatRelativeTime } from "@/lib/admin-format";

/**
 * The three small lines every view of a lead repeats: how old it is, who last
 * touched it, and whether they opted into marketing.
 *
 * They lived inside the Submissions page, which meant the board, the table and
 * the detail page each grew their own slightly different version. One copy, four
 * callers.
 */

/** "3h ago", with the exact timestamp behind it. */
export function Received({ at }: { at: Date | string | null }) {
  const date = at instanceof Date ? at : at ? new Date(at) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  return (
    <time dateTime={iso} title={formatDateTime(at)} className="whitespace-nowrap">
      {formatRelativeTime(at)}
    </time>
  );
}

/**
 * "Rita changed a lead's status, 3h ago" — who last touched this row. With a
 * shared password this line had nothing to say.
 */
export function LastChangedBy({
  audit,
  now,
}: {
  audit: AuditLogRow | undefined;
  now: Date;
}) {
  if (!audit) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {/* A null actor is the retention cron, not an unknown person. */}
      {audit.actorName ?? "Scheduled job"} {auditActionLabel(audit.action)},{" "}
      <time dateTime={audit.createdAt.toISOString()} title={formatDateTime(audit.createdAt)}>
        {formatRelativeTime(audit.createdAt, now)}
      </time>
    </p>
  );
}

/** Marketing opt-in, shown next to the address it applies to. */
export function MarketingConsent({
  at,
  version,
}: {
  at: Date | string | null;
  version: string | null;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-primary"
      title={`Consented ${formatDateTime(at)} · text version ${version ?? "unknown"}`}
    >
      <MailCheck className="size-3.5 shrink-0" aria-hidden />
      Marketing opt-in
    </span>
  );
}
