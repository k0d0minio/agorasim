import type { VariantProps } from "class-variance-authority";
import type {
  AdminRole,
  ContentStatus,
  EnquiryKind,
  ExperienceKind,
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

/**
 * The lead lifecycle: the status badge on a row, and the columns of the Sales
 * board. One vocabulary for both — the board used to invent its own stage names
 * ("Lead") next to a table that said "New" for the same record.
 */
export const requestStatusMeta: Record<
  RequestStatus,
  { label: string; variant: BadgeVariant; hint: string }
> = {
  new: { label: "New", variant: "default", hint: "Untouched — nobody has replied yet" },
  contacted: { label: "Contacted", variant: "secondary", hint: "Waiting on their answer" },
  quoted: { label: "Quoted", variant: "secondary", hint: "Proposal sent" },
  booked: { label: "Booked", variant: "outline", hint: "Confirmed" },
  archived: { label: "Archived", variant: "outline", hint: "Done, or gone quiet" },
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
  "tour_request.status_changed": "changed a lead's status",
  "tour_request.bulk_status_changed": "bulk-changed lead statuses",
  "tour_request.updated": "edited a lead's details",
  "tour_request.contact_logged": "logged reaching out",
  "tour_request.deleted": "erased a submission",
  "tour_request.bulk_deleted": "bulk-erased submissions",
  "tour_request.exported": "exported a person's data",
  "tour_request.anonymised_by_retention": "anonymised expired submissions",
  "feature_request.created": "raised a feature request",
  "feature_request.status_changed": "changed a feature request's status",
  "experience.created": "added an experience",
  "experience.updated": "edited an experience",
  "experience.image_uploaded": "uploaded an experience photo",
  "experience.archived": "archived an experience",
  "experience.restored": "restored an experience",
  "experience.reordered": "reordered the catalogue",
  "experience.deleted": "deleted an experience",
};

/**
 * The three kinds of job a lead can be about, as the admin words them. Mirrors
 * `enquiryKindEnum`; the icons live in `lib/experience-icons.ts`.
 */
export const enquiryKindMeta: Record<EnquiryKind, { label: string }> = {
  tour: { label: "Tour" },
  wedding: { label: "Wedding" },
  event: { label: "Event" },
};

export const ENQUIRY_KINDS = Object.keys(enquiryKindMeta) as EnquiryKind[];

/** Catalogue entry kinds, as the editor words them. */
export const experienceKindMeta: Record<
  ExperienceKind,
  { label: string; hint: string; variant: BadgeVariant }
> = {
  signature: {
    label: "Signature",
    hint: "The main tour, featured on the homepage and the experiences page.",
    variant: "default",
  },
  complement: {
    label: "Add-on",
    hint: "A complement guests can add to the signature experience.",
    variant: "secondary",
  },
};

export const EXPERIENCE_KINDS = Object.keys(experienceKindMeta) as ExperienceKind[];

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

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a timestamp/date for compact display in admin tables. */
export function formatDate(value: Date | string | null): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** Full date *and* time — used as the title/secondary line next to an age. */
export function formatDateTime(value: Date | string | null): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * How long ago something happened, in the largest unit that still reads
 * naturally: "just now", "12m ago", "3h ago", "2d ago", "5w ago", "3mo ago".
 *
 * Triage is the job on Submissions and Feature requests, and for triage the age
 * of a lead matters far more than its calendar date — so this is the primary
 * line, with `formatDateTime` as the exact value behind it.
 */
export function formatRelativeTime(
  value: Date | string | null,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return "—";

  const diff = now.getTime() - date.getTime();
  // Clock skew, or a date in the future: don't claim it happened in the past.
  if (diff < 0) return "just now";
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
  return `${Math.floor(diff / YEAR)}y ago`;
}
