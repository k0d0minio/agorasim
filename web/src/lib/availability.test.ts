import { describe, expect, it } from "vitest";

import {
  addMonths,
  bookableDates,
  DEFAULT_CAPACITY,
  describeDay,
  describeMonth,
  dateKey,
  fitsParty,
  formatDay,
  formatMonth,
  isDateKey,
  isMonthInWindow,
  isMonthKey,
  isWeekend,
  monthBounds,
  monthDays,
  monthGrid,
  monthOf,
  monthWindow,
  parseDateKey,
  todayKey,
  weekdayIndex,
} from "@/lib/availability";
import type { AvailabilityRow } from "@/db";

/**
 * The calendar's pure half.
 *
 * Everything here is a wrong answer that would not throw: a February that
 * grows a 30th, a grid whose first column is Sunday, a day in the past
 * offered for sale, a "seats left" that goes negative when capacity is
 * lowered under a paid booking. The reads and writes are not here — they are
 * typed queries covered by the build, per the convention in `sales.test.ts`.
 */

function row(overrides: Partial<AvailabilityRow> = {}): AvailabilityRow {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    date: "2026-08-15",
    slot: "full_day",
    capacity: DEFAULT_CAPACITY,
    status: "open",
    note: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

describe("isDateKey", () => {
  it("accepts a real day in YYYY-MM-DD", () => {
    expect(isDateKey("2026-08-15")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true); // leap year
  });

  it("rejects a day that matches the shape but does not exist", () => {
    // The shape check alone would sell a tour on the 31st of February.
    expect(isDateKey("2026-02-31")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2027-02-29")).toBe(false); // not a leap year
  });

  it("rejects anything that is not the one format", () => {
    expect(isDateKey("15/08/2026")).toBe(false);
    expect(isDateKey("2026-8-15")).toBe(false);
    expect(isDateKey("2026-08-15T10:00:00Z")).toBe(false);
    expect(isDateKey(20260815)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});

describe("dateKey / parseDateKey", () => {
  it("round-trips a key through a Date and back", () => {
    expect(dateKey(parseDateKey("2026-08-15")!)).toBe("2026-08-15");
  });

  it("reads an instant in UTC, so the key does not depend on the server", () => {
    expect(dateKey(new Date("2026-08-15T23:30:00Z"))).toBe("2026-08-15");
  });

  it("gives null for a key that is not a day", () => {
    expect(parseDateKey("2026-02-30")).toBeNull();
  });
});

describe("todayKey", () => {
  it("answers in Lisbon time, not UTC", () => {
    // 00:30 on the 16th in Sintra is still the 15th in UTC (summer, UTC+1).
    // A calendar that used UTC here would grey out a day that has not happened.
    expect(todayKey(new Date("2026-08-15T23:30:00Z"))).toBe("2026-08-16");
    // In winter the offset is zero and the two agree.
    expect(todayKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-15");
  });
});

describe("weekdayIndex / isWeekend", () => {
  it("counts from Monday, the way the grid and Portugal do", () => {
    expect(weekdayIndex("2026-08-17")).toBe(0); // Monday
    expect(weekdayIndex("2026-08-22")).toBe(5); // Saturday
    expect(weekdayIndex("2026-08-23")).toBe(6); // Sunday
  });

  it("knows the weekend", () => {
    expect(isWeekend("2026-08-21")).toBe(false); // Friday
    expect(isWeekend("2026-08-22")).toBe(true);
    expect(isWeekend("2026-08-23")).toBe(true);
  });
});

describe("months", () => {
  it("recognises a month key", () => {
    expect(isMonthKey("2026-08")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-8")).toBe(false);
    expect(isMonthKey("2026-08-15")).toBe(false);
  });

  it("reads the month off a day", () => {
    expect(monthOf("2026-08-15")).toBe("2026-08");
  });

  it("rolls the year over in both directions", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-08", 18)).toBe("2028-02");
    expect(addMonths("2026-08", -20)).toBe("2024-12");
  });

  it("finds the last day without a leap-year table", () => {
    expect(monthBounds("2026-02").last).toBe("2026-02-28");
    expect(monthBounds("2028-02").last).toBe("2028-02-29");
    expect(monthBounds("2026-04").last).toBe("2026-04-30");
    expect(monthBounds("2026-12")).toEqual({ first: "2026-12-01", last: "2026-12-31" });
  });

  it("lists every day of a month, in order and zero-padded", () => {
    const days = monthDays("2026-08");
    expect(days).toHaveLength(31);
    expect(days[0]).toBe("2026-08-01");
    expect(days[8]).toBe("2026-08-09");
    expect(days.at(-1)).toBe("2026-08-31");
  });
});

describe("monthGrid", () => {
  it("pads the month so the 1st lands in its own weekday column", () => {
    // 1 August 2026 is a Saturday — column 5, Monday-first.
    const grid = monthGrid("2026-08");
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(grid[5]).toBe("2026-08-01");
    expect(grid).toHaveLength(5 + 31);
  });

  it("adds no padding when the month starts on a Monday", () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid("2026-06")[0]).toBe("2026-06-01");
  });
});

describe("formatting", () => {
  it("names the month in the reader's language, capitalised", () => {
    expect(formatMonth("2026-08", "en")).toBe("August 2026");
    // pt-PT lower-cases month names; as a heading it wants the capital back.
    expect(formatMonth("2026-08", "pt")).toBe("Agosto de 2026");
  });

  it("writes a full day out for the booking summary", () => {
    expect(formatDay("2026-08-15", "en")).toContain("15 August 2026");
    expect(formatDay("2026-08-15", "pt")).toContain("15 de agosto de 2026");
  });

  it("hands back an unparseable key rather than rendering 'Invalid Date'", () => {
    expect(formatDay("nonsense", "en")).toBe("nonsense");
  });
});

describe("monthWindow", () => {
  it("starts at this month and runs to the horizon", () => {
    expect(monthWindow("2026-08-15")).toEqual({ first: "2026-08", last: "2028-02" });
  });

  it("keeps the pager inside it", () => {
    expect(isMonthInWindow("2026-08", "2026-08-15")).toBe(true);
    expect(isMonthInWindow("2028-02", "2026-08-15")).toBe(true);
    // Last month is gone, and the year 3000 was a mis-tap.
    expect(isMonthInWindow("2026-07", "2026-08-15")).toBe(false);
    expect(isMonthInWindow("2028-03", "2026-08-15")).toBe(false);
  });
});

describe("describeDay", () => {
  const today = "2026-08-10";

  it("is not bookable when nobody has opened the day", () => {
    const day = describeDay({ date: "2026-08-15", row: null, today });
    expect(day).toMatchObject({
      status: null,
      capacity: 0,
      seatsLeft: 0,
      bookable: false,
      past: false,
    });
  });

  it("is bookable when a row says open and seats remain", () => {
    const day = describeDay({ date: "2026-08-15", row: row(), booked: 1, today });
    expect(day.bookable).toBe(true);
    expect(day.seatsLeft).toBe(DEFAULT_CAPACITY - 1);
  });

  it("is not bookable when the team closed it", () => {
    const day = describeDay({
      date: "2026-08-15",
      row: row({ status: "closed", note: "Diogo em casamento" }),
      today,
    });
    expect(day.bookable).toBe(false);
    // The note stays on the record — the admin renders it, the guest never does.
    expect(day.note).toBe("Diogo em casamento");
  });

  it("is not bookable once the seats are gone", () => {
    const day = describeDay({ date: "2026-08-15", row: row(), booked: DEFAULT_CAPACITY, today });
    expect(day.seatsLeft).toBe(0);
    expect(day.bookable).toBe(false);
  });

  it("never reports negative seats when capacity is cut under a paid booking", () => {
    const day = describeDay({ date: "2026-08-15", row: row({ capacity: 1 }), booked: 3, today });
    expect(day.seatsLeft).toBe(0);
    expect(day.bookable).toBe(false);
  });

  it("refuses the past, however open the row is", () => {
    const day = describeDay({ date: "2026-08-09", row: row({ date: "2026-08-09" }), today });
    expect(day.past).toBe(true);
    expect(day.bookable).toBe(false);
  });

  it("still sells today", () => {
    // The day itself is not the past. Whether a same-day booking is *wise* is
    // the team's call, and they make it by closing the day.
    const day = describeDay({ date: today, row: row({ date: today }), today });
    expect(day.past).toBe(false);
    expect(day.bookable).toBe(true);
  });
});

describe("fitsParty", () => {
  const today = "2026-08-10";
  const day = describeDay({ date: "2026-08-15", row: row({ capacity: 3 }), booked: 2, today });

  it("takes a party that fits in what is left", () => {
    expect(fitsParty(day, 1)).toBe(true);
  });

  it("refuses a party larger than the remaining seats", () => {
    // The day is bookable and still a "no" to this group — two different
    // messages for the guest, which is why this is not folded into `bookable`.
    expect(day.bookable).toBe(true);
    expect(fitsParty(day, 2)).toBe(false);
  });

  it("refuses nonsense party sizes", () => {
    expect(fitsParty(day, 0)).toBe(false);
    expect(fitsParty(day, -1)).toBe(false);
  });

  it("refuses any party on a day that cannot be booked at all", () => {
    const closed = describeDay({ date: "2026-08-15", row: row({ status: "closed" }), today });
    expect(fitsParty(closed, 1)).toBe(false);
  });
});

describe("describeMonth", () => {
  const today = "2026-08-10";

  it("returns a cell for every day, row or no row", () => {
    const days = describeMonth({ month: "2026-08", rows: [], today });
    expect(days).toHaveLength(31);
    expect(days.every((day) => day.status === null)).toBe(true);
  });

  it("matches stored rows onto their days and leaves the rest untouched", () => {
    const days = describeMonth({
      month: "2026-08",
      rows: [row({ date: "2026-08-15" }), row({ date: "2026-08-16", status: "closed" })],
      today,
    });

    const byDate = new Map(days.map((day) => [day.date, day]));
    expect(byDate.get("2026-08-15")?.bookable).toBe(true);
    expect(byDate.get("2026-08-16")?.bookable).toBe(false);
    expect(byDate.get("2026-08-17")?.status).toBeNull();
  });

  it("subtracts the bookings it is given", () => {
    const days = describeMonth({
      month: "2026-08",
      rows: [row({ date: "2026-08-15" })],
      bookedByDate: new Map([["2026-08-15", DEFAULT_CAPACITY]]),
      today,
    });

    const fifteenth = days.find((day) => day.date === "2026-08-15")!;
    expect(fifteenth.booked).toBe(DEFAULT_CAPACITY);
    expect(fifteenth.bookable).toBe(false);
  });
});

describe("bookableDates", () => {
  it("keeps only the days a guest could actually pick", () => {
    const today = "2026-08-10";
    const days = describeMonth({
      month: "2026-08",
      rows: [
        row({ date: "2026-08-05" }), // open, but in the past
        row({ date: "2026-08-15" }),
        row({ date: "2026-08-16", status: "closed" }),
        row({ date: "2026-08-17" }),
      ],
      today,
    });

    expect(bookableDates(days)).toEqual(["2026-08-15", "2026-08-17"]);
  });
});
