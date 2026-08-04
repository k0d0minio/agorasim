/**
 * One dataset behind the Sales screen.
 *
 * Submissions, the CRM pipeline and Bookings used to be three pages over what is
 * substantially one thing: a person who wants a tour, somewhere along the way to
 * having booked one. Three screens meant three vocabularies for the same record
 * ("Lead" here, "New" there), three layouts to keep in step, and no answer to
 * "what is actually happening this week?" without visiting all three.
 *
 * This module is the join: {@link SalesRecord} is the row shape both views
 * render, whether it came from the `tour_requests` table or — until the payment
 * engine ships — from the example bookings in `admin-preview.ts`. Everything
 * example-shaped carries `example: true` and is labelled as such in the UI;
 * nothing here silently mixes real money with imagined money.
 *
 * The board and the table are two views of *this*, not two datasets.
 */
import "server-only";

import { count, desc, eq } from "drizzle-orm";

import {
  db,
  tourRequests,
  type AppLocale,
  type EnquiryKind,
  type RequestStatus,
  type TourRequest,
} from "@/db";
import { previewBookings, type PreviewBooking } from "@/lib/admin-preview";
import { REQUEST_STATUSES } from "@/lib/admin-format";

/** Where a row came from. Not the same question as what stage it is at. */
export type SalesSource = "enquiry" | "booking";

/** The one row shape the board and the table both render. */
export type SalesRecord = {
  source: SalesSource;
  /** Row identity. A `tour_requests` uuid, or the booking reference. */
  id: string;
  /** Short human handle shown in the table's first column. */
  ref: string;
  /** Detail page, where there is one. Example bookings have none yet. */
  href: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  locale: AppLocale | null;
  /** Tour, wedding or event — the icon the row leads with. */
  kind: EnquiryKind;
  /** Lifecycle stage: the board's columns, the table's status badge. */
  status: RequestStatus;
  experienceSlug: string | null;
  addOns: string[];
  partySize: number | null;
  /** The date in play: the guest's preferred day, or the booked one. */
  when: string | null;
  /** Money, where any is known. Bookings only, until quoting ships. */
  value: string | null;
  payment: PreviewBooking["payment"] | null;
  createdAt: Date;
  lastContactedAt: Date | null;
  marketingConsent: boolean;
  anonymisedAt: Date | null;
  /** True for the placeholder bookings — never presented as real. */
  example: boolean;
};

/** The reference an enquiry wears in the table: short, stable, greppable. */
export function enquiryRef(id: string): string {
  return `EN-${id.slice(0, 6).toUpperCase()}`;
}

/** A `tour_requests` row as a sales record. */
export function recordFromRequest(row: TourRequest): SalesRecord {
  return {
    source: "enquiry",
    id: row.id,
    ref: enquiryRef(row.id),
    href: `/admin/sales/${row.id}`,
    name: row.name,
    email: row.email,
    phone: row.phone,
    locale: row.locale,
    kind: row.kind,
    status: row.status,
    experienceSlug: row.experienceSlug,
    addOns: row.addOns,
    partySize: row.partySize,
    when: row.preferredDate,
    value: null,
    payment: null,
    createdAt: row.createdAt,
    lastContactedAt: row.lastContactedAt,
    marketingConsent: row.marketingConsent,
    anonymisedAt: row.anonymisedAt,
    example: false,
  };
}

/**
 * The example bookings as sales records.
 *
 * They are all `booked`: that is what a paid booking is, and putting them in the
 * board's last column is the honest place for them. `createdAt` is not invented
 * — these rows have no history, so they sort last within their column by virtue
 * of the epoch date rather than by pretending to be recent.
 */
export function exampleBookingRecords(): SalesRecord[] {
  return previewBookings.map((booking) => ({
    source: "booking",
    id: booking.ref,
    ref: booking.ref,
    href: null,
    name: booking.name,
    email: null,
    phone: null,
    locale: null,
    kind: booking.kind,
    status: "booked",
    experienceSlug: booking.experienceSlug,
    addOns: booking.addOns,
    partySize: booking.party,
    when: booking.date,
    value: booking.total,
    payment: booking.payment,
    createdAt: new Date(0),
    lastContactedAt: null,
    marketingConsent: false,
    anonymisedAt: null,
    example: true,
  }));
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export const SALES_SOURCE_FILTERS = ["all", "enquiry", "booking"] as const;
export type SalesSourceFilter = (typeof SALES_SOURCE_FILTERS)[number];

export const SALES_VIEWS = ["board", "table"] as const;
export type SalesView = (typeof SALES_VIEWS)[number];

/** Read the view out of a query string, defaulting to the board. */
export function readView(value: string | undefined): SalesView {
  return (SALES_VIEWS as readonly string[]).includes(value ?? "")
    ? (value as SalesView)
    : "board";
}

export function readSourceFilter(value: string | undefined): SalesSourceFilter {
  return (SALES_SOURCE_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as SalesSourceFilter)
    : "all";
}

/** Read a status filter, where absent (or unknown) means "every stage". */
export function readStatusFilter(value: string | undefined): RequestStatus | null {
  return (REQUEST_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as RequestStatus)
    : null;
}

export type SalesFilters = {
  source: SalesSourceFilter;
  status: RequestStatus | null;
};

/** The Sales screen's own URL, with one facet changed and the rest preserved. */
export function salesHref(
  current: { view: SalesView; filters: SalesFilters; page?: number },
  change: Partial<{
    view: SalesView;
    source: SalesSourceFilter;
    status: RequestStatus | null;
    page: number;
  }> = {},
): string {
  const view = change.view ?? current.view;
  const source = change.source ?? current.filters.source;
  const status = change.status === undefined ? current.filters.status : change.status;
  // Any change of facet invalidates the page number — page 3 of a filter that
  // now matches four rows is an empty screen.
  const page = change.page ?? (Object.keys(change).length > 0 ? 1 : (current.page ?? 1));

  const params = new URLSearchParams();
  if (view !== "board") params.set("view", view);
  if (source !== "all") params.set("source", source);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/admin/sales?${query}` : "/admin/sales";
}

/** Whether a record survives the current filters. */
function matches(record: SalesRecord, filters: SalesFilters): boolean {
  if (filters.source !== "all" && record.source !== filters.source) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type SalesPage = {
  records: SalesRecord[];
  /** Enquiries matching the filter, for pagination — bookings are not paged. */
  totalEnquiries: number;
  /** Example bookings included in `records`, so the UI can say so. */
  exampleCount: number;
  /** Enquiries per stage, unfiltered — the counts on the board's columns. */
  countsByStatus: Record<RequestStatus, number>;
};

const EMPTY_COUNTS = (): Record<RequestStatus, number> =>
  Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    RequestStatus,
    number
  >;

/**
 * One page of the Sales list, plus the per-stage totals the board's headers show.
 *
 * Paging applies to enquiries only. Example bookings are a fixed handful and
 * ride along on every page rather than being interleaved into the offset
 * arithmetic — when real bookings land in a table of their own, they get a real
 * `UNION` and this note goes away.
 */
export async function listSales({
  limit,
  offset,
  filters,
}: {
  limit: number;
  offset: number;
  filters: SalesFilters;
}): Promise<SalesPage> {
  const wantsEnquiries = filters.source !== "booking";
  const where = filters.status ? eq(tourRequests.status, filters.status) : undefined;

  // Three statements, one round trip. The per-stage tallies are deliberately
  // unfiltered: a board whose column headers only counted the current filter
  // would report "0 booked" while filtering to new leads.
  const [[total], rows, tallies] = await db.batch([
    db.select({ n: count() }).from(tourRequests).where(where),
    db
      .select()
      .from(tourRequests)
      .where(where)
      .orderBy(desc(tourRequests.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ status: tourRequests.status, n: count() })
      .from(tourRequests)
      .groupBy(tourRequests.status),
  ]);

  const countsByStatus = EMPTY_COUNTS();
  for (const row of tallies) countsByStatus[row.status] = row.n;

  const records = [...rows.map(recordFromRequest), ...exampleBookingRecords()].filter(
    (record) => matches(record, filters),
  );

  return {
    records,
    totalEnquiries: wantsEnquiries ? (total?.n ?? 0) : 0,
    exampleCount: records.filter((record) => record.example).length,
    countsByStatus,
  };
}

/** Group records into the board's columns, in lifecycle order. */
export function groupByStage(
  records: SalesRecord[],
): { status: RequestStatus; records: SalesRecord[] }[] {
  return REQUEST_STATUSES.map((status) => ({
    status,
    records: records.filter((record) => record.status === status),
  }));
}
