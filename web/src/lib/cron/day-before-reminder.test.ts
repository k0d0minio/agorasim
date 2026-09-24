import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BookingToRemind } from "@/lib/bookings";
import type { EmailMessage } from "@/lib/email";
import type { LoggedSend, MessageSubject } from "@/lib/message-log";

/**
 * The reminder job, tested at its three boundaries: the day's bookings
 * (`lib/bookings`), the log that claims each send (`lib/message-log`) and the
 * catalogue that names the tour.
 *
 * The fake log keys a claim exactly as the date-bound index does —
 * kind, recipient, booking, date — and releases it when a send fails, so
 * "a rerun sends nothing", "a moved booking is reminded again" and "a failed
 * send is retried" are answered here the way Postgres would answer them. That
 * the index itself exists is `message-log.test.ts`'s and the migration's
 * business; what this file proves is that the job claims under the right key
 * on both mornings.
 */

/** The confirmed bookings each day holds, as `confirmedBookingsOn` returns them. */
let bookingsByDate: Record<string, BookingToRemind[]> = {};

/** Claimed `(kind, recipient, booking, date)` keys — the unique index. */
let claims = new Set<string>();
/** Every message that reached the provider, in order. */
let delivered: { subject: MessageSubject; message: EmailMessage }[] = [];
/** Booking ids whose next send the provider refuses. */
let failNext = new Set<string>();
/** Booking ids whose message cannot even be built — the per-booking throw. */
let throwFor = new Set<string>();

const claimKey = (subject: MessageSubject) =>
  `${subject.kind}:${subject.recipient}:${subject.bookingId}:${subject.subjectDate}`;

vi.mock("@/lib/bookings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings")>("@/lib/bookings");
  return {
    ...actual,
    confirmedBookingsOn: async (date: string) => bookingsByDate[date] ?? [],
  };
});

vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: async (subject: MessageSubject, message: EmailMessage): Promise<LoggedSend> => {
    if (throwFor.has(String(subject.bookingId))) throw new Error("boom");
    const key = claimKey(subject);
    if (claims.has(key)) return { status: "duplicate" };
    if (failNext.has(String(subject.bookingId))) {
      // A failed send keeps its row but releases the index — nothing claimed.
      failNext.delete(String(subject.bookingId));
      return { status: "failed", reason: "failed" };
    }
    claims.add(key);
    delivered.push({ subject, message });
    return { status: "sent", providerMessageId: `re_${delivered.length}` };
  },
}));

vi.mock("@/lib/experience-catalogue", () => ({
  listCatalogue: async () => [
    { slug: "rural-saloia", title: { pt: "Rural Saloia", en: "Rural Saloia" } },
    {
      slug: "obidos-medieval-villages",
      title: { pt: "Óbidos & Aldeias Medievais", en: "Óbidos & Medieval Villages" },
    },
    { slug: "manzwine", title: { pt: "Prova Manzwine", en: "Manzwine tasting" } },
  ],
}));

const register = vi.fn();
vi.mock("@/lib/cron/jobs", () => ({ register: (...args: unknown[]) => register(...args) }));

const { dayBeforeReminder, reminderDays, DAY_BEFORE_REMINDER_JOB } = await import(
  "./day-before-reminder"
);

/** 07:00 in Lisbon (WEST) on Friday 14 August — the dispatcher's morning. */
const NOW = new Date("2026-08-14T06:00:00Z");
const TODAY = "2026-08-14";
const TOMORROW = "2026-08-15";

let serial = 0;
function booking(overrides: Partial<BookingToRemind> = {}): BookingToRemind {
  serial += 1;
  return {
    id: `${String(serial).padStart(8, "0")}-0000-4000-8000-000000000000`,
    tourRequestId: `lead-${serial}`,
    name: `Guest ${serial}`,
    email: `guest${serial}@example.com`,
    locale: "pt",
    date: TOMORROW,
    experienceSlug: "rural-saloia",
    slot: "morning",
    mode: "public",
    adults: 2,
    children: 0,
    infants: 0,
    partySize: 2,
    addOns: [],
    ...overrides,
  };
}

/** Put bookings on the days they are dated. */
function seed(...rows: BookingToRemind[]) {
  bookingsByDate = {};
  for (const row of rows) (bookingsByDate[row.date] ??= []).push(row);
}

/** A reminder an earlier run already sent for this booking on this date. */
function alreadyReminded(row: BookingToRemind, date = row.date) {
  claims.add(`day-before-reminder:guest:${row.id}:${date}`);
}

beforeEach(() => {
  bookingsByDate = {};
  claims = new Set();
  delivered = [];
  failNext = new Set();
  throwFor = new Set();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reminderDays", () => {
  it("reads today and tomorrow on Lisbon's calendar, not the server's", () => {
    expect(reminderDays(NOW)).toEqual({ today: TODAY, tomorrow: TOMORROW });
    // 23:30 UTC in summer is already 00:30 the next day in Lisbon.
    expect(reminderDays(new Date("2026-08-14T23:30:00Z"))).toEqual({
      today: "2026-08-15",
      tomorrow: "2026-08-16",
    });
    // In winter Lisbon is on UTC, so the same clock time is still the 14th.
    expect(reminderDays(new Date("2026-01-14T23:30:00Z"))).toEqual({
      today: "2026-01-14",
      tomorrow: "2026-01-15",
    });
  });

  it("crosses months, years and the clock change without skipping a day", () => {
    expect(reminderDays(new Date("2026-12-31T06:00:00Z"))).toEqual({
      today: "2026-12-31",
      tomorrow: "2027-01-01",
    });
    // Sunday 29 March 2026: the clocks go forward in Lisbon.
    expect(reminderDays(new Date("2026-03-29T06:00:00Z"))).toEqual({
      today: "2026-03-29",
      tomorrow: "2026-03-30",
    });
  });
});

describe("dayBeforeReminder", () => {
  it("registers itself with the dispatcher", () => {
    expect(register).toHaveBeenCalledWith(dayBeforeReminder);
  });

  it("reminds every confirmed booking dated tomorrow, once, in its own language, with the pin", async () => {
    const pt = booking();
    const en = booking({ locale: "en", experienceSlug: "obidos-medieval-villages", slot: "afternoon" });
    seed(pt, en);

    await dayBeforeReminder(NOW);

    expect(delivered).toHaveLength(2);
    const [first, second] = delivered;
    expect(first.subject).toMatchObject({
      kind: "day-before-reminder",
      recipient: "guest",
      bookingId: pt.id,
      tourRequestId: pt.tourRequestId,
      subjectDate: TOMORROW,
    });
    expect(first.message.to).toEqual([pt.email]);
    expect(first.message.subject).toContain("Amanhã é o grande dia");
    expect(first.message.text).toContain("https://maps.app.goo.gl/zufzHo8QpmspvzqC9");

    expect(second.message.to).toEqual([en.email]);
    expect(second.message.subject).toContain("Tomorrow is the big day");
    expect(second.message.subject).toContain("Óbidos & Medieval Villages");
    expect(second.message.text).toContain("https://maps.app.goo.gl/ucMojM5V7eGhcvn4A");
    expect(second.message.text).toContain("If you haven't had the exact departure time");
  });

  it("sends nothing on a rerun the same morning", async () => {
    seed(booking(), booking(), booking({ date: TODAY }));

    await dayBeforeReminder(NOW);
    const afterFirst = delivered.length;
    const rerun = await dayBeforeReminder(NOW);

    expect(afterFirst).toBe(3);
    expect(delivered).toHaveLength(3);
    expect(rerun.summary).toContain(`tomorrow ${TOMORROW}: 0 sent, 2 already reminded`);
    expect(rerun.summary).toContain(`today ${TODAY}: 0 sent, 1 already reminded`);
  });

  it("catches up a booking for today nobody reminded, and leaves yesterday's alone", async () => {
    const lateBooking = booking({ date: TODAY });
    const remindedYesterday = booking({ date: TODAY });
    alreadyReminded(remindedYesterday);
    seed(lateBooking, remindedYesterday);

    const result = await dayBeforeReminder(NOW);

    expect(delivered).toHaveLength(1);
    expect(delivered[0].subject.bookingId).toBe(lateBooking.id);
    expect(delivered[0].subject.subjectDate).toBe(TODAY);
    expect(delivered[0].message.subject).toContain("Hoje é o grande dia");
    expect(result.summary).toContain(`today ${TODAY}: 1 sent, 1 already reminded`);
  });

  it("reminds a moved booking again for its new date", async () => {
    // Reminded yesterday for the 14th, then moved to the 15th by the weather.
    const moved = booking({ date: TOMORROW });
    alreadyReminded(moved, TODAY);
    seed(moved);

    await dayBeforeReminder(NOW);

    expect(delivered).toHaveLength(1);
    expect(delivered[0].subject.subjectDate).toBe(TOMORROW);
  });

  it("retries a failed send on the next run", async () => {
    const unlucky = booking({ date: TOMORROW });
    seed(unlucky);
    failNext.add(unlucky.id);

    const first = await dayBeforeReminder(NOW);
    expect(delivered).toHaveLength(0);
    expect(first.summary).toContain(`tomorrow ${TOMORROW}: 0 sent, 0 already reminded, 0 skipped, 1 failed`);

    // The next morning it is today's tour, still before the departure.
    seed({ ...unlucky });
    const next = await dayBeforeReminder(new Date("2026-08-15T06:00:00Z"));
    expect(delivered).toHaveLength(1);
    expect(delivered[0].message.subject).toContain("Hoje é o grande dia");
    expect(next.summary).toContain("today 2026-08-15: 1 sent");
  });

  it("skips and counts a booking with nobody to write to, without failing", async () => {
    const erased = booking({ tourRequestId: null, name: null, email: null });
    const fine = booking();
    seed(erased, fine);

    const result = await dayBeforeReminder(NOW);

    expect(delivered.map((d) => d.subject.bookingId)).toEqual([fine.id]);
    expect(result.summary).toContain(`tomorrow ${TOMORROW}: 1 sent, 0 already reminded, 1 skipped, 0 failed`);
    // Never claimed, so a lead that gains an address is still reminded.
    expect([...claims].some((key) => key.includes(erased.id))).toBe(false);
  });

  it("does not let one broken booking cost the others their reminder", async () => {
    const broken = booking();
    const fine = booking();
    seed(broken, fine);
    throwFor.add(broken.id);

    const result = await dayBeforeReminder(NOW);

    expect(delivered.map((d) => d.subject.bookingId)).toEqual([fine.id]);
    expect(result.summary).toContain("1 sent, 0 already reminded, 0 skipped, 1 failed");
  });

  it("names itself and its counts per morning in the dispatcher's summary", async () => {
    seed(booking(), booking({ date: TODAY }));

    const result = await dayBeforeReminder(NOW);

    expect(result.name).toBe(DAY_BEFORE_REMINDER_JOB);
    expect(result.name).toBe("day-before-reminder");
    expect(result.summary).toBe(
      `tomorrow ${TOMORROW}: 1 sent, 0 already reminded, 0 skipped, 0 failed · today ${TODAY}: 1 sent, 0 already reminded, 0 skipped, 0 failed`,
    );
  });
});
