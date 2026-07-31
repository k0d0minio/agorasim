import type { VariantProps } from "class-variance-authority";
import type {
  AdminRole,
  ContentStatus,
  FeatureRequestPriority,
  FeatureRequestStatus,
  RequestStatus,
} from "@/db/schema";
import type { AuditAction } from "@/lib/audit";
import type { badgeVariants } from "@/components/ui/badge";

/**
 * The password rule, as shown under a password field. Re-exported here so the
 * client forms have one admin-facing module to import their copy from, and so
 * they never reach into `password.ts`, which is `server-only`.
 */
export { MIN_PASSWORD_LENGTH_HINT } from "@/lib/password-policy";

/**
 * The word an operator types to confirm an irreversible erasure.
 *
 * Lives here rather than in `form-schemas.ts` because both sides need it — the
 * dialog to render the instruction and arm its button, the schema to validate
 * the submission — and `form-schemas.ts` is `server-only`.
 */
export const DELETE_CONFIRMATION = "DELETE";

/**
 * Badge variant, taken straight from `ui/badge.tsx`. The hand-written mirror
 * this replaces had already fallen behind — it never gained `ghost` or `link`,
 * both of which the admin uses. Type-only import, so nothing is bundled.
 */
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; variant: BadgeVariant }
> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  quoted: { label: "Quoted", variant: "secondary" },
  booked: { label: "Booked", variant: "outline" },
  archived: { label: "Archived", variant: "outline" },
};

/**
 * Statuses in picker order. Read off the meta record rather than written out
 * again: `Record<RequestStatus, …>` already forces every status to appear
 * exactly once, so the list cannot fall behind the database enum.
 */
export const REQUEST_STATUSES = Object.keys(requestStatusMeta) as RequestStatus[];

export const contentStatusMeta: Record<
  ContentStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Draft", variant: "outline" },
  in_review: { label: "In review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  published: { label: "Published", variant: "default" },
};

export const featureRequestStatusMeta: Record<
  FeatureRequestStatus,
  { label: string; variant: BadgeVariant }
> = {
  new: { label: "New", variant: "default" },
  planned: { label: "Planned", variant: "secondary" },
  in_progress: { label: "In progress", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  declined: { label: "Declined", variant: "outline" },
};

export const FEATURE_REQUEST_STATUSES = Object.keys(
  featureRequestStatusMeta,
) as FeatureRequestStatus[];

export const featureRequestPriorityMeta: Record<
  FeatureRequestPriority,
  { label: string; variant: BadgeVariant }
> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
  high: { label: "High", variant: "secondary" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export const FEATURE_REQUEST_PRIORITIES = Object.keys(
  featureRequestPriorityMeta,
) as FeatureRequestPriority[];

export const adminRoleMeta: Record<
  AdminRole,
  { label: string; variant: BadgeVariant; description: string }
> = {
  owner: {
    label: "Owner",
    variant: "default",
    description:
      "Full access, including team accounts, the audit log, and exporting or erasing guest data.",
  },
  collaborator: {
    label: "Collaborator",
    variant: "secondary",
    description:
      "Everything operational. No team accounts, and no exporting or erasing guest data.",
  },
};

/** Roles in picker order — read off the meta record, so it cannot fall behind. */
export const ADMIN_ROLES = Object.keys(adminRoleMeta) as AdminRole[];

/**
 * Plain-English labels for audit actions.
 *
 * `Record<AuditAction, …>` on purpose: adding an action to `AUDIT_ACTIONS`
 * without giving it a label stops the build, rather than shipping an audit view
 * that renders a raw `tour_request.bulk_deleted` at an operator.
 */
export const auditActionLabels: Record<AuditAction, string> = {
  "admin_user.signed_in": "signed in",
  "admin_user.signed_out": "signed out",
  "admin_user.sessions_revoked": "signed out everywhere",
  "admin_user.created": "created an account",
  "admin_user.disabled": "disabled an account",
  "admin_user.enabled": "re-enabled an account",
  "admin_user.password_changed": "changed their password",
  "tour_request.status_changed": "changed a submission's status",
  "tour_request.bulk_status_changed": "bulk-changed submission statuses",
  "tour_request.deleted": "erased a submission",
  "tour_request.bulk_deleted": "bulk-erased submissions",
  "tour_request.exported": "exported a person's data",
  "tour_request.anonymised_by_retention": "anonymised expired submissions",
  "feature_request.created": "raised a feature request",
  "feature_request.status_changed": "changed a feature request's status",
};

/** Label for an action string read back from the database. */
export function auditActionLabel(action: string): string {
  return auditActionLabels[action as AuditAction] ?? action;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Format a timestamp/date for compact display in admin tables. */
export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

/** Format a timestamp to the minute — for the audit log, where order matters. */
export function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/**
 * "3h ago", for the last-changed line on a row.
 *
 * Rendered on the server, so it is the age at render time rather than a value
 * that ticks. The admin pages are `force-dynamic` and re-render on every
 * request, so it is never more stale than the data beside it.
 */
export function formatRelative(value: Date | string | null, now: Date = new Date()): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
