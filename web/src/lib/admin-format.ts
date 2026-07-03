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

/** Format a timestamp/date for compact display in admin tables. */
export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}
