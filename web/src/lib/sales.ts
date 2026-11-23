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
 * renders, over the `tour_requests` table and the `bookings` rows behind it.
 * Nothing invented rides along. Four example bookings did, while checkout was
 * being built and the board had no real money to show; they went the day it
 * could, because a placeholder total sitting beside a real one is how a real
 * one gets ignored.
 *
 * There is deliberately no enquiry/booking split in this shape. An instant
 * booking is just a record that arrives already in the `booked` stage, so
 * "where did this row come from" stopped being a question the UI asks — the
 * board's columns answer the question that matters, which is "where is it now".
 *
 * Since checkout shipped, a lead can have a real `bookings` row behind it, and
 * that is where the money on a card comes from. Bookings and enquiries are
 * still one shape here: a paid booking is a lead whose card happens to know
 * what it is worth.
 */
import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, or } from "drizzle-orm";

import {
  bookings,
  db,
  tourRequests,
  type AppLocale,
  type Booking,
  type EnquiryKind,
  type RequestStatus,
  type TourRequest,
} from "@/db";
import { REQUEST_STATUSES } from "@/lib/admin-format";
import {
  SOURCE_MONTHS,
  recentMonths,
  sourceLabel,
  tallySourcesByMonth,
  type SourceMonth,
} from "@/lib/booking-source";
import { awaitsLinkPayment, bookingRef, holdsCapacity } from "@/lib/bookings";
import { formatDay } from "@/lib/date-keys";
import { CLASS_SEATS } from "@/lib/fleet";
import { paymentReminderLog, type PaymentReminderLog } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { canRemind } from "@/lib/payment-reminder";

/**
 * A lead's date as the admin says it: `2027-06-12` → "sábado, 12 de junho de
 * 2027", the format of every other date in the admin. Null when there is no
 * date. Text that is not a `YYYY-MM-DD` date (a free-text answer from before
 * the forms stored one) shows as the guest wrote it.
 */
export function leadDayLabel(date: string | null): string | null {
  return date ? formatDay(date, "pt") : null;
}

/**
 * How far along the money is, as a card says it.
 *
 * Three states (JAM-291): the guest has paid; the guest is on the payment form
 * now, inside a live hold ("In checkout", the card's "A aguardar pagamento");
 * or the team sent a payment link that waits to be paid ("Awaiting payment",
 * the card's "Pagamento pendente"). Deposits are not modelled.
 *
 * A fourth since JAM-292: "Unpaid", the card's "Não paga". It is a checkout
 * the guest left without paying, on a departure that is not past, and it is
 * on the card because the card now has something to do about it: "Lembrar".
 * It holds no seat. A checkout whose departure is past still shows nothing.
 */
export type PaymentState = "Paid in full" | "In checkout" | "Awaiting payment" | "Unpaid";

/** The one row shape the board renders. */
export type SalesRecord = {
  /** Row identity: the `tour_requests` uuid. */
  id: string;
  /** Short human handle, shown on detail surfaces. */
  ref: string;
  /** The lead's own page. */
  href: string;
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
  /**
   * The date in play, in words: the guest's preferred day, or the booked one.
   * See {@link leadDayLabel}.
   */
  when: string | null;
  /**
   * Where a wedding or an event happens. Null on a tour, which departs from
   * the same place every time and has nothing to say here.
   *
   * On the card because triage turns on it: "Mafra, 12 June" and "Algarve,
   * 12 June" are the same lead shape and a completely different answer, and
   * the venue was previously only readable by opening the lead.
   */
  venue: string | null;
  /**
   * The reference the *guest* was given, where a real booking exists.
   *
   * Deliberately separate from {@link SalesRecord.ref}: that one is derived
   * from the `tour_requests` id and is the handle the team has always used,
   * while this is derived from the `bookings` id and is the only string the
   * guest ever sees — it is on their confirmation page and in their email. The
   * two are different uuids, so without this the team is shown one reference
   * and quoted another, and "my booking is BK-ABD1AE" matches nothing on the
   * board.
   */
  bookingRef: string | null;
  /** Money, where any is known — from the `bookings` row behind the lead. */
  value: string | null;
  payment: PaymentState | null;
  /** The `bookings` row the card shows, which "Lembrar" acts on. Null with no booking. */
  bookingId: string | null;
  /**
   * Whether the card offers "Lembrar" (JAM-292): the booking is an unpaid
   * site checkout that can be reminded (`lib/payment-reminder.ts`), and the
   * lead has an email to send it to.
   */
  canRemind: boolean;
  /** When the last reminder went: the card's "Lembrete enviado 12/11 14:05". */
  lastReminderAt: Date | null;
  /**
   * The open car the live booking rides in, when it rides in one: the card
   * says "Carro partilhado" and how full the car is. Null for a car of its own.
   */
  sharedCar?: SharedCarSummary | null;
  createdAt: Date;
  lastContactedAt: Date | null;
  marketingConsent: boolean;
  anonymisedAt: Date | null;
  /**
   * Where the guest's visit started, as the board shows it: `chatgpt.com`,
   * `google`, "Direta ou desconhecida", or "Sem registo" for a row with no
   * record (`lib/booking-source.ts`, JAM-506).
   */
  source: string;
};

/** The reference an enquiry wears: short, stable, greppable. */
export function enquiryRef(id: string): string {
  return `EN-${id.slice(0, 6).toUpperCase()}`;
}

/**
 * What a real, paid booking adds to the lead it belongs to: its reference
 * and the money.
 *
 * Kept as a separate argument rather than folded into {@link TourRequest}
 * because it comes from a different table — `bookings` holds the commercial
 * side, `tour_requests` the person — and the board is where the two are shown
 * as one card.
 */
export type BookingSummary = {
  /** What the guest was told to quote — `bookingRef` of the `bookings` row. */
  ref: string;
  /** Already formatted, e.g. "€340". */
  value: string;
  payment: PaymentState;
  /** The day sold, `YYYY-MM-DD`, which beats the guest's free-text guess. */
  date: string;
  /** The open car it rides in, when it rides in one. */
  sharedCar?: SharedCarSummary | null;
  /** The `bookings` row itself. */
  bookingId?: string;
  /** Whether the booking can be reminded of its payment, the lead's email aside. */
  canRemind?: boolean;
  /** When "Lembrar" last sent its email for this booking. */
  lastReminderAt?: Date | null;
};

/** How full an open car is, across every party in it. */
export type SharedCarSummary = {
  /** Guests aboard, this party included. */
  seatsTaken: number;
  /** Seats the car has. */
  seats: number;
  /** Parties riding in it, this one included. */
  parties: number;
};

/** A `tour_requests` row as a sales record. */
export function recordFromRequest(
  row: TourRequest,
  booking?: BookingSummary,
): SalesRecord {
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
    // The booked day where there is one: it is the day that was actually sold,
    // not the day the guest hoped for before anyone confirmed it.
    when: leadDayLabel(booking?.date ?? row.preferredDate),
    venue: row.venue,
    bookingRef: booking?.ref ?? null,
    value: booking?.value ?? null,
    payment: booking?.payment ?? null,
    bookingId: booking?.bookingId ?? null,
    // The reminder is an email to this person: no address, no button. An
    // anonymised lead has neither a name nor an address left.
    canRemind: Boolean(booking?.canRemind && row.email && !row.anonymisedAt),
    lastReminderAt: booking?.lastReminderAt ?? null,
    sharedCar: booking?.sharedCar ?? null,
    createdAt: row.createdAt,
    lastContactedAt: row.lastContactedAt,
    marketingConsent: row.marketingConsent,
    anonymisedAt: row.anonymisedAt,
    source: sourceLabel(row),
  };
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
  /** Up to {@link SALES_STAGE_LIMIT} per stage. */
  records: SalesRecord[];
  /** Every enquiry in the database, whatever its stage. */
  totalEnquiries: number;
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
 * tallies for the column headers.
 *
 * A `q` changes the shape: instead of the stage-capped board it returns every
 * enquiry whose name, e-mail or phone matches, across all stages, uncapped —
 * the 51st `booked` lead that no column can hold is exactly who a search is
 * for.
 */
export async function listSalesBoard(q?: string): Promise<SalesBoardData> {
  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    const [tallies, leads] = await db.batch([
      db
        .select({ status: tourRequests.status, n: count() })
        .from(tourRequests)
        .groupBy(tourRequests.status),
      db
        .select()
        .from(tourRequests)
        .where(
          or(
            ilike(tourRequests.name, pattern),
            ilike(tourRequests.email, pattern),
            ilike(tourRequests.phone, pattern),
          ),
        )
        .orderBy(desc(tourRequests.createdAt)),
    ]);

    const countsByStatus = EMPTY_COUNTS();
    for (const row of tallies) countsByStatus[row.status] = row.n;

    const money = await bookingSummaries(leads.map((lead) => lead.id));
    const records = leads.map((lead) =>
      recordFromRequest(lead, money.get(lead.id)),
    );

    return {
      records,
      totalEnquiries: records.length,
      countsByStatus,
    };
  }

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

  const leads = perStage.flat();
  const money = await bookingSummaries(leads.map((lead) => lead.id));

  const records = leads.map((lead) => recordFromRequest(lead, money.get(lead.id)));

  return {
    records,
    totalEnquiries: REQUEST_STATUSES.reduce(
      (sum, status) => sum + countsByStatus[status],
      0,
    ),
    countsByStatus,
  };
}

/**
 * The money against a page of leads, in one query.
 *
 * Bookings that are `confirmed`, still holding a live `pending` seat, or
 * waiting on a payment link are shown. A link holds no car, but it is money
 * the customer was asked for. A checkout the guest left unpaid is shown as
 * "Unpaid" while the team can still remind them of it (JAM-292): it is the
 * lead's newest booking and its departure is not past. An older abandoned
 * checkout is not money — putting "€340" on a card for a checkout somebody
 * abandoned in March would have the team chasing a payment nobody owes.
 *
 * A lead with several attempts (they came back and paid the second time) keeps
 * the last one, which is the one that matters ({@link cardBooking}).
 */
export async function bookingSummaries(
  leadIds: string[],
): Promise<Map<string, BookingSummary>> {
  const summaries = new Map<string, BookingSummary>();
  if (leadIds.length === 0) return summaries;

  const rows = await db
    .select()
    .from(bookings)
    .where(inArray(bookings.tourRequestId, leadIds))
    .orderBy(asc(bookings.createdAt));

  const now = new Date();
  const byLead = new Map<string, Booking[]>();
  for (const row of rows) {
    if (!row.tourRequestId) continue;
    const list = byLead.get(row.tourRequestId) ?? [];
    list.push(row);
    byLead.set(row.tourRequestId, list);
  }

  // Only a booking with a link can have had a reminder: the first one gives it its link.
  const reminders = await paymentReminderLog(
    [...byLead.values()].flatMap((list) => {
      const newest = list.at(-1);
      return newest?.paymentLinkTokenHash ? [newest.id] : [];
    }),
  );

  const shown = new Map<string, CardBooking>();
  for (const [leadId, list] of byLead) {
    const card = cardBooking(list, reminders, now);
    if (card) shown.set(leadId, card);
  }

  const cars = await sharedCarSummaries(
    [...shown.values()].flatMap(({ row, payment }) =>
      row.sharedCarId && payment !== "Unpaid" ? [row.sharedCarId] : [],
    ),
  );
  for (const [leadId, { row, payment, canRemind: remindable, lastReminderAt }] of shown) {
    summaries.set(leadId, {
      ref: bookingRef(row.id),
      value: formatPrice(row.amountCents, "en", row.currency),
      payment,
      date: row.date,
      // An unpaid checkout rides in no car, whatever id its checkout left on it.
      sharedCar:
        row.sharedCarId && payment !== "Unpaid" ? (cars.get(row.sharedCarId) ?? null) : null,
      bookingId: row.id,
      canRemind: remindable,
      lastReminderAt,
    });
  }

  return summaries;
}

/** The booking one lead's card shows, and what the card says about its money. */
export type CardBooking = {
  row: Booking;
  payment: PaymentState;
  /** Whether "Lembrar" applies to it (`lib/payment-reminder.ts`). */
  canRemind: boolean;
  lastReminderAt: Date | null;
};

/**
 * Which of one lead's bookings the card shows. `rows` are that lead's
 * bookings, oldest first. Pure, so the rule can be tested without a database.
 *
 * The last live booking wins: paid, inside a live hold, or waiting on a link.
 * With none, the newest booking is shown as "Unpaid" when the team can remind
 * the guest of it. Only the newest booking is ever reminded: an older unpaid
 * checkout is an attempt the guest already replaced.
 */
export function cardBooking(
  rows: readonly Booking[],
  reminders: ReadonlyMap<string, PaymentReminderLog>,
  now: Date = new Date(),
): CardBooking | null {
  const newest = rows.at(-1);
  if (!newest) return null;

  const log = reminders.get(newest.id);
  const remindable = canRemind(newest, { reminded: log !== undefined, now });

  const live = rows.findLast((row) => holdsCapacity(row, now) || awaitsLinkPayment(row));
  if (live) {
    const isNewest = live.id === newest.id;
    return {
      row: live,
      payment: paymentStateOf(live, now),
      canRemind: isNewest && remindable,
      lastReminderAt: isNewest ? (log?.lastSentAt ?? null) : null,
    };
  }
  if (!remindable) return null;
  return {
    row: newest,
    payment: "Unpaid",
    canRemind: true,
    lastReminderAt: log?.lastSentAt ?? null,
  };
}

/**
 * Where the money of one live booking is — see {@link PaymentState}.
 *
 * The caller keeps only live rows: paid, inside a live hold, or waiting on a
 * payment link (`bookingSummaries`).
 */
export function paymentStateOf(
  row: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date = new Date(),
): Exclude<PaymentState, "Unpaid"> {
  if (row.status === "confirmed") return "Paid in full";
  return holdsCapacity(row, now) ? "In checkout" : "Awaiting payment";
}

/**
 * How full each open car is: every paid party that wears its id.
 *
 * Only a paid booking takes a seat here (JAM-291). A guest on the payment form
 * holds a seat against other guests for a few minutes, but the team does not
 * plan a car around it: the card shows it apart, as "A aguardar pagamento".
 * Pure, so the rule can be tested without a database.
 */
export function tallySharedCars(
  rows: readonly Pick<Booking, "sharedCarId" | "vehicleClass" | "partySize" | "status">[],
): Map<string, SharedCarSummary> {
  const cars = new Map<string, SharedCarSummary>();
  for (const row of rows) {
    if (!row.sharedCarId || row.status !== "confirmed") continue;
    const car = cars.get(row.sharedCarId) ?? {
      seatsTaken: 0,
      seats: CLASS_SEATS[row.vehicleClass],
      parties: 0,
    };
    car.seatsTaken += row.partySize;
    car.parties += 1;
    cars.set(row.sharedCarId, car);
  }
  return cars;
}

/** {@link tallySharedCars} over every booking that rides in one of these cars, in one query. */
async function sharedCarSummaries(carIds: string[]): Promise<Map<string, SharedCarSummary>> {
  if (carIds.length === 0) return new Map();
  const rows = await db
    .select({
      sharedCarId: bookings.sharedCarId,
      vehicleClass: bookings.vehicleClass,
      partySize: bookings.partySize,
      status: bookings.status,
    })
    .from(bookings)
    .where(inArray(bookings.sharedCarId, [...new Set(carIds)]));
  return tallySharedCars(rows);
}

/**
 * Every booking behind one lead, newest first — what the lead's own page shows.
 *
 * Deliberately unfiltered, where {@link bookingSummaries} keeps only the live
 * one. A card on the board is a summary and must not offer a total for a
 * checkout somebody abandoned in March; a booking's own page is where the
 * question is "what happened to this?", and a cancelled or refunded row is the
 * answer rather than noise. It is also the only surface a refund can be issued
 * from, and an action cannot sit on a row the page refuses to draw.
 */
export async function bookingsForLead(leadId: string): Promise<Booking[]> {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.tourRequestId, leadId))
    .orderBy(desc(bookings.createdAt));
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

/**
 * The paid bookings of each source, for each of the last months (JAM-506).
 *
 * Read from `bookings`, not from the leads: a booking keeps its source after
 * an erasure removes its lead. Only a confirmed booking counts, because the
 * question is which channel brings a sale. A checkout that nobody paid and a
 * booking that was refunded are not sales.
 *
 * The read starts one day before the oldest month, so that a booking made in
 * the first hour of that month in Lisbon is in it. `tallySourcesByMonth`
 * decides the month of each row.
 */
export async function listSourceCounts(now: Date = new Date()): Promise<SourceMonth[]> {
  const oldest = recentMonths(now, SOURCE_MONTHS).at(-1)!;
  const since = new Date(new Date(`${oldest}-01T00:00:00Z`).getTime() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      createdAt: bookings.createdAt,
      landingUtmSource: bookings.landingUtmSource,
      landingReferrerHost: bookings.landingReferrerHost,
    })
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), gte(bookings.createdAt, since)));
  return tallySourcesByMonth(rows, now);
}
