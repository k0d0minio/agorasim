import type { ContentStatus, RequestStatus } from "@/db/schema";

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
