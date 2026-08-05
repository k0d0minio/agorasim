/**
 * One dataset behind the Sales screen.
 *
 * Submissions, the CRM pipeline and Bookings used to be three pages over what is
 * substantially one thing: a person who wants a tour, somewhere along the way to
 * having booked one. Three screens meant three vocabularies for the same record
 * ("Lead" here, "New" there), three layouts to keep in step, and no answer to
 * "what is actually happening this week?" without visiting all three.
 *
 * This module is the join: {@link SalesRecord} is the row shape the board
 * renders, whether it came from the `tour_requests` table or — until the payment
 * engine ships — from the example bookings in `admin-preview.ts`. Everything
 * example-shaped carries `example: true` and is labelled as such in the UI;
 * nothing here silently mixes real money with imagined money.
 *
 * There is deliberately no enquiry/booking split in this shape. An instant
 * booking is just a record that arrives already in the `booked` stage, so
 * "where did this row come from" stopped being a question the UI asks — the
 * board's columns answer the question that matters, which is "where is it now".
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

/** The one row shape the board renders. */
export type SalesRecord = {
  /** Row identity. A `tour_requests` uuid, or the booking reference. */
  id: string;
  /** Short human handle, shown on detail surfaces. */
  ref: string;
  /** Detail page, where there is one. Example bookings have none yet. */
  href: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  locale: AppLocale | null;
  /** Tour, wedding or event — the icon the card leads with. */
  kind: EnquiryKind;
  /** Lifecycle stage: which of the board's columns this card sits in. */
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

/** The reference an enquiry wears: short, stable, greppable. */
export function enquiryRef(id: string): string {
  return `EN-${id.slice(0, 6).toUpperCase()}`;
}

/** A `tour_requests` row as a sales record. */
export function recordFromRequest(row: TourRequest): SalesRecord {
  return {
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
// Reads
// ---------------------------------------------------------------------------

/**
 * How many records each column fetches, most recent first.
 *
 * Offset pagination over a board is incoherent — page 2 of a five-column board
 * is four near-empty columns — so the board is bounded per stage instead. The
 * column header still shows the true per-stage total from `countsByStatus`, so
 * a column holding its 50 newest of 180 is visibly capped rather than quietly
 * lying about how much work exists.
 */
export const SALES_STAGE_LIMIT = 50;

export type SalesBoardData = {
  /** Up to {@link SALES_STAGE_LIMIT} per stage, plus the example bookings. */
  records: SalesRecord[];
  /** Every enquiry in the database, whatever its stage. */
  totalEnquiries: number;
  /** Example bookings included in `records`, so the UI can say so. */
  exampleCount: number;
  /** Enquiries per stage, uncapped — the true counts on the board's columns. */
  countsByStatus: Record<RequestStatus, number>;
};

const EMPTY_COUNTS = (): Record<RequestStatus, number> =>
  Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])) as Record<
    RequestStatus,
    number
  >;

/**
 * Everything the Sales board renders, in one round trip: the newest
 * {@link SALES_STAGE_LIMIT} enquiries of each stage, and the uncapped per-stage
 * tallies for the column headers. The example bookings ride along until real
 * bookings exist.
 */
export async function listSalesBoard(): Promise<SalesBoardData> {
  // One bounded SELECT per stage plus the tallies — six statements, one
  // `db.batch` round trip on Neon's HTTP driver.
  const [tallies, ...perStage] = await db.batch([
    db
      .select({ status: tourRequests.status, n: count() })
      .from(tourRequests)
      .groupBy(tourRequests.status),
    ...REQUEST_STATUSES.map((status) =>
      db
        .select()
        .from(tourRequests)
        .where(eq(tourRequests.status, status))
        .orderBy(desc(tourRequests.createdAt))
        .limit(SALES_STAGE_LIMIT),
    ),
  ]);

  const countsByStatus = EMPTY_COUNTS();
  for (const row of tallies) countsByStatus[row.status] = row.n;

  const records = [
    ...perStage.flat().map(recordFromRequest),
    ...exampleBookingRecords(),
  ];

  return {
    records,
    totalEnquiries: REQUEST_STATUSES.reduce(
      (sum, status) => sum + countsByStatus[status],
      0,
    ),
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
