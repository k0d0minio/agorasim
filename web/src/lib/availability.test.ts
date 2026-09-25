import { describe, expect, it } from "vitest";

import {
  addMonths,
  DEFAULT_DRIVERS,
  describeMonth,
  describeSlot,
  dateKey,
  expandDateRange,
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
  occupancySlotKey,
  parseDateKey,
  todayKey,
  toPublicDay,
  TOUR_SLOTS,
  weekdayIndex,
} from "@/lib/availability";
import { FLEET_SIZE, noVehicles, type VehicleClass } from "@/lib/fleet";
import type { SlotOccupancy } from "@/lib/bookings";
import type { AvailabilityRow } from "@/db";

/**
 * The calendar's pure half.
 *
 * Everything here is a wrong answer that would not throw: a February that
 * grows a 30th, a grid whose first column is Sunday, a departure in the past
 * offered for sale, a "drivers left" that goes negative when the roster is cut
 * under a paid booking — and, since AGORA-012, the two the old per-tour model
 * got wrong outright: a departure selling a driver Óbidos has already taken,
 * and a second party of five being offered a T3 that is out with the first.
 * The reads and writes are not here — they are typed queries covered by the
 * build, per the convention in `sales.test.ts`.
 */

const CLASSIC_TOUR = "rural-saloia";
const TOURING_TOUR = "obidos-medieval-villages";

function row(overrides: Partial<AvailabilityRow> = {}): AvailabilityRow {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    date: "2026-08-15",
    slot: "morning",
    drivers: DEFAULT_DRIVERS,
    status: "open",
    note: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

/** Occupancy as a list of "this class of car went out", one driver each. */
function committed(...classes: VehicleClass[]): SlotOccupancy {
  const vehicles = noVehicles();
  for (const entry of classes) vehicles[entry] += 1;
  return { drivers: classes.length, vehicles };
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

describe("describeSlot", () => {
  const today = "2026-08-10";

  it("is not bookable when nobody has opened the departure", () => {
    const slot = describeSlot({ date: "2026-08-15", slot: "morning", row: null, today });
    expect(slot).toMatchObject({
      status: null,
      drivers: 0,
      driversLeft: 0,
      onSale: false,
      bookable: false,
      past: false,
    });
  });

  it("is bookable when a row says open and a driver and a car are free", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row(),
      occupancy: committed("classic-small"),
      today,
    });
    expect(slot.bookable).toBe(true);
    expect(slot.driversUsed).toBe(1);
    expect(slot.driversLeft).toBe(DEFAULT_DRIVERS - 1);
    expect(slot.vehiclesLeft["classic-small"]).toBe(FLEET_SIZE["classic-small"] - 1);
    // The car that went out is the only one the count touches.
    expect(slot.vehiclesLeft["classic-van"]).toBe(FLEET_SIZE["classic-van"]);
  });

  it("counts a booking on the other tour against the same drivers", () => {
    // The whole of AGORA-012 in one assertion. Óbidos took the touring
    // vehicle, which the classics never share — but it took a *driver*, and
    // the old per-tour calendars could not see that at all.
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ drivers: 2 }),
      occupancy: committed("touring", "classic-small"),
      today,
    });
    expect(slot.driversLeft).toBe(0);
    expect(slot.bookable).toBe(false);
    // Cars to spare, and nobody to drive them.
    expect(slot.vehiclesLeft["classic-van"]).toBe(FLEET_SIZE["classic-van"]);
  });

  it("is not bookable when the team closed it", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ status: "closed", note: "Diogo em casamento" }),
      today,
    });
    expect(slot.onSale).toBe(false);
    expect(slot.bookable).toBe(false);
    // The note stays on the record — the admin renders it, the guest never does.
    expect(slot.note).toBe("Diogo em casamento");
  });

  it("never reports negative drivers when the roster is cut under a booking", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ drivers: 1 }),
      occupancy: committed("classic-small", "classic-van"),
      today,
    });
    expect(slot.driversLeft).toBe(0);
    expect(slot.bookable).toBe(false);
  });

  it("refuses the past, however open the row is", () => {
    const slot = describeSlot({
      date: "2026-08-09",
      slot: "morning",
      row: row({ date: "2026-08-09" }),
      today,
    });
    expect(slot.past).toBe(true);
    expect(slot.bookable).toBe(false);
  });

  it("still sells today", () => {
    // The day itself is not the past. Whether a same-day booking is *wise* is
    // the team's call, and they make it by closing the day.
    const slot = describeSlot({
      date: today,
      slot: "morning",
      row: row({ date: today }),
      today,
    });
    expect(slot.past).toBe(false);
    expect(slot.bookable).toBe(true);
  });
});

describe("fitsParty", () => {
  const today = "2026-08-10";
  const open = (occupancy?: SlotOccupancy) =>
    describeSlot({ date: "2026-08-15", slot: "morning", row: row(), occupancy, today });

  it("puts a small party in a small classic and a bigger one in the T3", () => {
    expect(fitsParty(open(), CLASSIC_TOUR, 3)).toEqual({
      ok: true,
      vehicleClass: "classic-small",
    });
    expect(fitsParty(open(), CLASSIC_TOUR, 4)).toEqual({
      ok: true,
      vehicleClass: "classic-van",
    });
  });

  it("puts Óbidos in the touring vehicle, whatever the party", () => {
    // §2.6: the classic cars stay on the Saloia routes. A party of two going to
    // Óbidos must not take a 2CV off them.
    for (const size of [2, 5, 8]) {
      expect(fitsParty(open(), TOURING_TOUR, size)).toEqual({
        ok: true,
        vehicleClass: "touring",
      });
    }
  });

  it("refuses a second party that needs a car already out", () => {
    // A driver is free and the day is open — and the only T3 is on the road.
    const slot = open(committed("classic-van"));
    expect(slot.bookable).toBe(true);
    expect(fitsParty(slot, CLASSIC_TOUR, 5)).toEqual({ ok: false, reason: "no-vehicle" });
    // The same departure will still take a couple: the small classics are free.
    expect(fitsParty(slot, CLASSIC_TOUR, 2).ok).toBe(true);
  });

  it("refuses everyone once both drivers are out", () => {
    const slot = open(committed("classic-small", "classic-small"));
    expect(fitsParty(slot, CLASSIC_TOUR, 2)).toEqual({ ok: false, reason: "no-driver" });
  });

  it("refuses a group above the biggest car, pending AGORA-019", () => {
    // Nine needs two cars and therefore two drivers. Who drives the third car
    // for their stated maximum of 14 is an open question with the client, and
    // guessing it here would guess a person into existence.
    expect(fitsParty(open(), CLASSIC_TOUR, 9)).toEqual({
      ok: false,
      reason: "party-too-large",
    });
    expect(fitsParty(open(), TOURING_TOUR, 14)).toEqual({
      ok: false,
      reason: "party-too-large",
    });
  });

  it("refuses nonsense party sizes", () => {
    expect(fitsParty(open(), CLASSIC_TOUR, 0)).toEqual({ ok: false, reason: "bad-party" });
    expect(fitsParty(open(), CLASSIC_TOUR, -1)).toEqual({ ok: false, reason: "bad-party" });
  });

  it("refuses any party on a departure that is not on sale", () => {
    const closed = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ status: "closed" }),
      today,
    });
    expect(fitsParty(closed, CLASSIC_TOUR, 2)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});

describe("describeMonth", () => {
  const today = "2026-08-10";

  it("returns a cell for every day with both departures, row or no row", () => {
    const days = describeMonth({ month: "2026-08", rows: [], today });
    expect(days).toHaveLength(31);
    expect(
      days.every(
        (day) =>
          day.slots.length === TOUR_SLOTS.length &&
          day.slots.every((slot) => slot.status === null),
      ),
    ).toBe(true);
  });

  it("matches stored rows onto their departures and leaves the rest untouched", () => {
    const days = describeMonth({
      month: "2026-08",
      rows: [
        row({ date: "2026-08-15" }),
        row({ date: "2026-08-15", slot: "afternoon", status: "closed" }),
      ],
      today,
    });

    const fifteenth = days.find((day) => day.date === "2026-08-15")!;
    const morning = fifteenth.slots.find((slot) => slot.slot === "morning")!;
    const afternoon = fifteenth.slots.find((slot) => slot.slot === "afternoon")!;
    expect(morning.bookable).toBe(true);
    expect(afternoon.bookable).toBe(false);
    expect(days.find((day) => day.date === "2026-08-16")!.slots[0].status).toBeNull();
  });

  it("subtracts the occupancy it is given, per departure", () => {
    const days = describeMonth({
      month: "2026-08",
      rows: [row({ date: "2026-08-15" }), row({ date: "2026-08-15", slot: "afternoon" })],
      occupancy: new Map([
        [
          occupancySlotKey("2026-08-15", "morning"),
          committed("classic-small", "touring"),
        ],
      ]),
      today,
    });

    const fifteenth = days.find((day) => day.date === "2026-08-15")!;
    const morning = fifteenth.slots.find((slot) => slot.slot === "morning")!;
    const afternoon = fifteenth.slots.find((slot) => slot.slot === "afternoon")!;
    expect(morning.driversUsed).toBe(2);
    expect(morning.bookable).toBe(false);
    // The afternoon is a different pool entirely.
    expect(afternoon.bookable).toBe(true);
  });
});

describe("toPublicDay", () => {
  it("tells a guest only what they may know about each departure", () => {
    const [day] = describeMonth({
      month: "2026-08",
      rows: [row({ date: "2026-08-01", note: "Diogo em casamento" })],
      occupancy: new Map([
        [occupancySlotKey("2026-08-01", "morning"), committed("classic-small")],
      ]),
      today: "2026-07-01",
    });

    // The exact shape is the assertion. The stored row also carries the note,
    // the status and the roster — between them a fair sketch of the family's
    // diary — and the way to guarantee a guest is never told *why* a day is
    // unavailable is for the reason not to be in the payload at all.
    expect(toPublicDay(day)).toEqual({
      date: "2026-08-01",
      bookable: true,
      slots: [
        {
          slot: "morning",
          driversLeft: DEFAULT_DRIVERS - 1,
          vehiclesLeft: {
            ...FLEET_SIZE,
            "classic-small": FLEET_SIZE["classic-small"] - 1,
          },
        },
        // Never opened, so nothing is advertised on it.
        { slot: "afternoon", driversLeft: 0, vehiclesLeft: noVehicles() },
      ],
    });
  });

  it("advertises nothing on a departure that cannot be booked", () => {
    // A closed departure with a full fleet must not advertise it.
    const [day] = describeMonth({
      month: "2026-08",
      rows: [row({ date: "2026-08-01", status: "closed" })],
      today: "2026-07-01",
    });
    expect(toPublicDay(day).bookable).toBe(false);
    expect(
      toPublicDay(day).slots.every(
        (slot) =>
          slot.driversLeft === 0 &&
          Object.values(slot.vehiclesLeft).every((free) => free === 0),
      ),
    ).toBe(true);
  });
});

describe("expandDateRange", () => {
  it("lists every day of the window, both ends included", () => {
    expect(expandDateRange("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("gives one day for a range that starts and ends the same day", () => {
    expect(expandDateRange("2026-08-15", "2026-08-15")).toEqual(["2026-08-15"]);
  });

  it("gives nothing for a backwards or unparseable range", () => {
    // A mis-tap, not an attack — nothing written beats an error page.
    expect(expandDateRange("2026-09-02", "2026-08-30")).toEqual([]);
    expect(expandDateRange("late August", "2026-08-30")).toEqual([]);
  });

  it("stops at the cap, so a crafted end date cannot write a century", () => {
    expect(expandDateRange("2026-01-01", "2999-12-31")).toHaveLength(366);
    expect(expandDateRange("2026-01-01", "2026-12-31", 5)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
    ]);
  });
});

describe("a day held by a deposit-paid event", () => {
  const today = "2026-08-10";
  const QUOTE = "aaaaaaaa-1111-4111-8111-111111111111";

  /** What `countSlotOccupancy` hands back for a held departure. */
  function held(...classes: VehicleClass[]): SlotOccupancy {
    return { ...committed(...classes), eventHolds: [QUOTE] };
  }

  it("is not bookable, though the row is open and every car is free", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row(),
      occupancy: held(),
      today,
    });
    expect(slot).toMatchObject({
      onSale: true,
      heldByEvent: true,
      bookable: false,
      driversLeft: 0,
      vehiclesLeft: noVehicles(),
    });
  });

  it("is refused to every party as unavailable — the checkout's and the manual booking's answer", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "afternoon",
      row: row({ slot: "afternoon" }),
      occupancy: held(),
      today,
    });
    expect(fitsParty(slot, CLASSIC_TOUR, 2)).toEqual({ ok: false, reason: "unavailable" });
    expect(fitsParty(slot, TOURING_TOUR, 6)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("keeps counting the tours already sold on it", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row(),
      occupancy: held("classic-small"),
      today,
    });
    expect(slot.driversUsed).toBe(1);
    expect(slot.vehiclesUsed["classic-small"]).toBe(1);
  });

  it("closes both departures of the day in the month the calendars render", () => {
    const month = describeMonth({
      month: "2026-08",
      rows: [row({ slot: "morning" }), row({ slot: "afternoon", id: "x" })],
      occupancy: new Map([
        [occupancySlotKey("2026-08-15", "morning"), held()],
        [occupancySlotKey("2026-08-15", "afternoon"), held()],
      ]),
      today,
    });
    const day = month.find((entry) => entry.date === "2026-08-15")!;
    expect(day.slots.every((slot) => !slot.bookable && slot.heldByEvent)).toBe(true);
  });

  it("returns to what the rows and bookings alone say once released", () => {
    const released = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row(),
      occupancy: { ...committed("classic-small"), eventHolds: [] },
      today,
    });
    expect(released.heldByEvent).toBe(false);
    expect(released.bookable).toBe(true);

    // A day Rita never opened stays unopened: the release reopens nothing.
    const neverOpened = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: null,
      occupancy: { ...committed(), eventHolds: [] },
      today,
    });
    expect(neverOpened.bookable).toBe(false);
    expect(neverOpened.status).toBeNull();
  });

  it("tells a guest only that the day is unavailable — never that an event is on", () => {
    const day = {
      date: "2026-08-15",
      slots: TOUR_SLOTS.map((slot) =>
        describeSlot({
          date: "2026-08-15",
          slot,
          row: row({ slot, note: "Casamento — Quinta do Hespanhol" }),
          occupancy: held(),
          today,
        }),
      ),
    };
    const publicDay = toPublicDay(day);
    expect(publicDay.bookable).toBe(false);
    expect(publicDay.slots.every((slot) => slot.driversLeft === 0)).toBe(true);
    const payload = JSON.stringify(publicDay);
    expect(payload).not.toMatch(/event|heldByEvent|eventHolds|Casamento|Quinta/i);
  });
});
