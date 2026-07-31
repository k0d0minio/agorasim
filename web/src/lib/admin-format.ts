import type {
  ContentStatus,
  FeatureRequestPriority,
  FeatureRequestStatus,
  RequestStatus,
} from "@/db/schema";

/** Badge variant used by the admin UI (mirrors `ui/badge.tsx` variants). */
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "contacted",
  "quoted",
  "booked",
  "archived",
];

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

export const contentStatusMeta: Record<
  ContentStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Draft", variant: "outline" },
  in_review: { label: "In review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  published: { label: "Published", variant: "default" },
};

export const FEATURE_REQUEST_STATUSES: FeatureRequestStatus[] = [
  "new",
  "planned",
  "in_progress",
  "completed",
  "declined",
];

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

export const FEATURE_REQUEST_PRIORITIES: FeatureRequestPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const featureRequestPriorityMeta: Record<
  FeatureRequestPriority,
  { label: string; variant: BadgeVariant }
> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
  high: { label: "High", variant: "secondary" },
  urgent: { label: "Urgent", variant: "destructive" },
};

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
