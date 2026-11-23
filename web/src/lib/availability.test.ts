import { describe, expect, it } from "vitest";

import {
  addDays,
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
  isInOnlineWindow,
  isMonthInWindow,
  isMonthKey,
  isWeekend,
  monthBounds,
  monthDays,
  monthGrid,
  monthOf,
  monthWindow,
  occupancySlotKey,
  onlineWindow,
  parseDateKey,
  todayKey,
  toPublicDay,
  TOUR_SLOTS,
  weekdayIndex,
} from "@/lib/availability";
import {
  FLEET_SIZE,
  freeSeats,
  noVehicles,
  slotFitsParty,
  type OpenCar,
  type SeatingMode,
  type VehicleClass,
} from "@/lib/fleet";
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

  it("is bookable when nobody has touched the departure, with the full roster", () => {
    // D-1: the calendar is open by default. No row is an open departure.
    const slot = describeSlot({ date: "2026-08-15", slot: "morning", row: null, today });
    expect(slot).toMatchObject({
      status: null,
      blocked: false,
      drivers: DEFAULT_DRIVERS,
      driversLeft: DEFAULT_DRIVERS,
      onSale: true,
      hasRoom: true,
      bookable: true,
      past: false,
      note: null,
    });
    expect(DEFAULT_DRIVERS).toBe(2);
  });

  it("keeps a row's own roster and note on an open departure", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ drivers: 1, note: "Rita no médico" }),
      occupancy: committed("classic-small"),
      today,
    });
    expect(slot.drivers).toBe(1);
    expect(slot.driversLeft).toBe(0);
    expect(slot.bookable).toBe(false);
    expect(slot.note).toBe("Rita no médico");
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

  it("is not bookable online when the team blocked it", () => {
    const slot = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ status: "closed", note: "Diogo em casamento" }),
      today,
    });
    expect(slot.blocked).toBe(true);
    expect(slot.onSale).toBe(false);
    expect(slot.bookable).toBe(false);
    // Blocked is not full: the drivers and the cars are all still there.
    expect(slot.hasRoom).toBe(true);
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

  it("does not sell today or tomorrow online, and sells the day after", () => {
    // D-3: two calendar days' notice. On Monday the 10th, Wednesday the 12th is
    // the first day a guest can book — both departures.
    const at = (date: string) =>
      TOUR_SLOTS.map((slot) => describeSlot({ date, slot, row: null, today }));
    expect(at("2026-08-10").some((slot) => slot.bookable)).toBe(false);
    expect(at("2026-08-11").some((slot) => slot.bookable)).toBe(false);
    expect(at("2026-08-12").every((slot) => slot.bookable)).toBe(true);
    // Not on sale online, but not full either — the admin must not read "esgotada".
    expect(at("2026-08-11").every((slot) => slot.hasRoom && !slot.onSale)).toBe(true);
  });

  it("counts the notice in Lisbon days, not UTC", () => {
    // 00:30 on Tuesday the 11th in Sintra is still Monday the 10th in UTC
    // (summer, UTC+1). Tuesday is today, so Wednesday is tomorrow and refused;
    // Thursday is the first bookable day.
    const lisbonToday = todayKey(new Date("2026-08-10T23:30:00Z"));
    expect(lisbonToday).toBe("2026-08-11");
    const on = (date: string) =>
      describeSlot({ date, slot: "morning", row: null, today: lisbonToday }).bookable;
    expect(on("2026-08-12")).toBe(false);
    expect(on("2026-08-13")).toBe(true);
  });

  it("sells online up to the last day of the sixth month, this one counted", () => {
    // D-2: from August, the window ends on the 31st of January.
    const on = (date: string) =>
      describeSlot({ date, slot: "afternoon", row: null, today }).bookable;
    expect(on("2027-01-31")).toBe(true);
    expect(on("2027-02-01")).toBe(false);
  });

  describe("a departure of today", () => {
    // Lisbon is UTC+1 in summer (10:00 = 09:00Z) and UTC+0 in winter.
    const check = (iso: string, slot: "morning" | "afternoon", audience: "team" | "online") => {
      const now = new Date(iso);
      return describeSlot({ date: todayKey(now), slot, row: null, now, audience });
    };

    it.each([
      ["summer 09:59", "2026-08-10T08:59:00Z", "morning", false],
      ["summer 10:00", "2026-08-10T09:00:00Z", "morning", true],
      ["summer 10:01", "2026-08-10T09:01:00Z", "morning", true],
      ["winter 09:59", "2026-12-10T09:59:00Z", "morning", false],
      ["winter 10:01", "2026-12-10T10:01:00Z", "morning", true],
      ["summer 13:59, afternoon", "2026-08-10T12:59:00Z", "afternoon", false],
      ["summer 14:01, afternoon", "2026-08-10T13:01:00Z", "afternoon", true],
      ["winter 14:01, afternoon", "2026-12-10T14:01:00Z", "afternoon", true],
    ] as const)("%s: past=%s for the team", (_label, iso, slot, past) => {
      const described = check(iso, slot, "team");
      expect(described.past).toBe(past);
      expect(described.bookable).toBe(!past);
    });

    it("leaves the afternoon on sale once the morning has gone", () => {
      const now = new Date("2026-08-10T12:00:00Z"); // 13:00 Lisbon
      expect(check("2026-08-10T12:00:00Z", "morning", "team").bookable).toBe(false);
      expect(check("2026-08-10T12:00:00Z", "afternoon", "team").bookable).toBe(true);
      expect(todayKey(now)).toBe("2026-08-10");
    });
  });

  describe("for the team", () => {
    const team = (options: Partial<Parameters<typeof describeSlot>[0]>) =>
      describeSlot({ date: "2026-08-15", slot: "morning", today, ...options, audience: "team" });

    it("sells today and tomorrow", () => {
      // D-4: the phone call is how a late guest gets a tour.
      expect(team({ date: today, row: null }).bookable).toBe(true);
      expect(team({ date: "2026-08-11", row: null }).bookable).toBe(true);
    });

    it("sells a blocked departure", () => {
      const slot = team({ row: row({ status: "closed", note: "Folga" }) });
      expect(slot.blocked).toBe(true);
      expect(slot.bookable).toBe(true);
      expect(fitsParty(slot, CLASSIC_TOUR, 2)).toEqual({
        ok: true,
        vehicleClass: "classic-small",
        joins: null,
      });
    });

    it("sells past the guest's six months, up to the admin calendar's horizon", () => {
      expect(team({ date: "2027-03-01", row: null }).bookable).toBe(true);
      // From August 2026 the admin pager reaches February 2028, and no further.
      expect(team({ date: "2028-02-29", row: null }).bookable).toBe(true);
      expect(team({ date: "2028-03-01", row: null }).bookable).toBe(false);
      expect(team({ date: "2099-01-01", row: null }).bookable).toBe(false);
    });

    it("never sells the past", () => {
      expect(team({ date: "2026-08-09", row: null }).bookable).toBe(false);
    });

    it("is still bound by capacity, blocked or not", () => {
      const full = team({
        row: row({ status: "closed" }),
        occupancy: committed("classic-small", "classic-small"),
      });
      expect(full.bookable).toBe(false);
      expect(fitsParty(full, CLASSIC_TOUR, 2)).toEqual({ ok: false, reason: "no-driver" });

      const noVan = team({ date: "2026-08-11", occupancy: committed("classic-van") });
      expect(fitsParty(noVan, CLASSIC_TOUR, 5)).toEqual({ ok: false, reason: "no-vehicle" });
    });
  });
});

describe("the online window", () => {
  it("runs from two days out to the end of the sixth month", () => {
    expect(onlineWindow("2026-10-05")).toEqual({ first: "2026-10-07", last: "2027-03-31" });
    // Notice that crosses a month and a year end.
    expect(onlineWindow("2026-12-31")).toEqual({ first: "2027-01-02", last: "2027-05-31" });
  });

  it("includes both ends and nothing outside them", () => {
    expect(isInOnlineWindow("2026-10-06", "2026-10-05")).toBe(false);
    expect(isInOnlineWindow("2026-10-07", "2026-10-05")).toBe(true);
    expect(isInOnlineWindow("2027-03-31", "2026-10-05")).toBe(true);
    expect(isInOnlineWindow("2027-04-01", "2026-10-05")).toBe(false);
  });
});

describe("addDays", () => {
  it("steps over month, year and leap-day boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 2)).toBe("2027-01-02");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not moved by the clock change", () => {
    // Portugal springs forward on the last Sunday of March; a key is a day.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
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
      joins: null,
    });
    expect(fitsParty(open(), CLASSIC_TOUR, 4)).toEqual({
      ok: true,
      vehicleClass: "classic-van",
      joins: null,
    });
  });

  it("puts Óbidos in the touring vehicle, whatever the party", () => {
    // §2.6: the classic cars stay on the Saloia routes. A party of two going to
    // Óbidos must not take a 2CV off them.
    for (const size of [2, 5, 8]) {
      expect(fitsParty(open(), TOURING_TOUR, size)).toEqual({
        ok: true,
        vehicleClass: "touring",
        joins: null,
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

  it("refuses any party on a departure a guest cannot book", () => {
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

/**
 * "Só um condutor" on the morning (`one-driver-off-per-departure`): the
 * morning sells one car, the afternoon keeps both drivers, and a guest sees
 * the same.
 */
describe("one driver on one departure", () => {
  const today = "2026-07-01";
  const oneDriverMorning = [row({ date: "2026-08-15", slot: "morning", drivers: 1 })];

  it("sells one car on the morning and leaves the afternoon at two drivers", () => {
    const days = describeMonth({ month: "2026-08", rows: oneDriverMorning, today });
    const fifteenth = days.find((day) => day.date === "2026-08-15")!;
    const morning = fifteenth.slots.find((slot) => slot.slot === "morning")!;
    const afternoon = fifteenth.slots.find((slot) => slot.slot === "afternoon")!;
    expect(morning).toMatchObject({ drivers: 1, driversLeft: 1, bookable: true });
    expect(afternoon).toMatchObject({ drivers: DEFAULT_DRIVERS, driversLeft: DEFAULT_DRIVERS });
  });

  it("stops selling the morning once one booking takes its driver", () => {
    const days = describeMonth({
      month: "2026-08",
      rows: oneDriverMorning,
      occupancy: new Map([
        [occupancySlotKey("2026-08-15", "morning"), committed("classic-small")],
      ]),
      today,
    });
    const fifteenth = days.find((day) => day.date === "2026-08-15")!;
    const [morning, afternoon] = toPublicDay(fifteenth).slots;
    expect(morning.driversLeft).toBe(0);
    expect(afternoon.driversLeft).toBe(DEFAULT_DRIVERS);
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
          openSeats: {},
        },
        // Never touched, so open with everything free.
        {
          slot: "afternoon",
          driversLeft: DEFAULT_DRIVERS,
          vehiclesLeft: FLEET_SIZE,
          openSeats: {},
        },
      ],
    });
  });

  it("advertises nothing on a departure that cannot be booked", () => {
    // A blocked departure with a full fleet must not advertise it. Both are
    // blocked here: an untouched departure is open, and would.
    const [day] = describeMonth({
      month: "2026-08",
      rows: [
        row({ date: "2026-08-01", status: "closed" }),
        row({ date: "2026-08-01", slot: "afternoon", status: "closed" }),
      ],
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
    const team = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ status: "closed" }),
      occupancy: held(),
      today,
      audience: "team",
    });
    // The team skips the block, never the event: nobody is free to drive.
    expect(team.bookable).toBe(false);
    expect(fitsParty(team, CLASSIC_TOUR, 2)).toEqual({ ok: false, reason: "unavailable" });

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

    // A day Rita blocked stays blocked: the release reopens nothing.
    const blocked = describeSlot({
      date: "2026-08-15",
      slot: "morning",
      row: row({ status: "closed" }),
      occupancy: { ...committed(), eventHolds: [] },
      today,
    });
    expect(blocked.bookable).toBe(false);
    expect(blocked.blocked).toBe(true);
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

/**
 * The open group tour on one departure: per-person parties of one tour share a
 * car up to its seats, and a private group never shares. Each case sits on the
 * seat limit, where a wrong answer puts a fourth guest in a 2CV or sends a
 * second driver out for a party that had a seat.
 */
describe("the open group tour", () => {
  const today = "2026-08-10";
  const openCar = (overrides: Partial<OpenCar> = {}): OpenCar => ({
    id: "eeeeeeee-0000-4000-8000-000000000001",
    experienceSlug: CLASSIC_TOUR,
    vehicleClass: "classic-small",
    seatsTaken: 2,
    ...overrides,
  });
  /** One open car on the road, plus any cars of their own, one driver each. */
  const withCars = (cars: OpenCar[], ...own: VehicleClass[]): SlotOccupancy => {
    const occupancy = committed(...cars.map((car) => car.vehicleClass), ...own);
    return { ...occupancy, openCars: cars };
  };
  const departure = (occupancy: SlotOccupancy, options: { now?: Date; date?: string } = {}) =>
    describeSlot({
      date: options.date ?? "2026-08-15",
      slot: "morning",
      row: row(),
      occupancy,
      today: options.now ? undefined : today,
      now: options.now,
      audience: "team",
    });

  it("seats a per-person party of one in the 2CV a couple opened", () => {
    const fit = fitsParty(departure(withCars([openCar()])), CLASSIC_TOUR, 1, "public");
    expect(fit).toEqual({ ok: true, vehicleClass: "classic-small", joins: openCar().id });
  });

  it("sends a couple that does not fit an open 2CV to the VW T3, not to a second 2CV", () => {
    // JAM-290: the car an open-group party opens is the van while it is free.
    const fit = fitsParty(departure(withCars([openCar()])), CLASSIC_TOUR, 2, "public");
    expect(fit).toEqual({ ok: true, vehicleClass: "classic-van", joins: null });
  });

  it("sends a per-person party of four to the T3 when the open car has one seat left", () => {
    const fit = fitsParty(departure(withCars([openCar()])), CLASSIC_TOUR, 4, "public");
    expect(fit).toEqual({ ok: true, vehicleClass: "classic-van", joins: null });
  });

  it("never seats a private group in an open car", () => {
    // Both drivers out, one of them in a 2CV with a free seat.
    const full = departure(withCars([openCar()], "classic-small"));
    expect(fitsParty(full, CLASSIC_TOUR, 1, "private")).toEqual({
      ok: false,
      reason: "no-driver",
    });
    expect(fitsParty(full, CLASSIC_TOUR, 1)).toEqual({ ok: false, reason: "no-driver" });
  });

  it("stays bookable with every driver out while an open car has a seat", () => {
    const slot = departure(withCars([openCar()], "classic-small"));
    expect(slot).toMatchObject({ driversLeft: 0, hasRoom: true, bookable: true });
    expect(fitsParty(slot, CLASSIC_TOUR, 1, "public").ok).toBe(true);
    expect(fitsParty(slot, CLASSIC_TOUR, 2, "public")).toEqual({
      ok: false,
      reason: "no-driver",
    });
  });

  it("is full once the last open car has no seat and no driver is free", () => {
    const slot = departure(withCars([openCar({ seatsTaken: 3 })], "classic-small"));
    expect(slot).toMatchObject({ hasRoom: false, bookable: false });
  });

  it("tells a guest the free seats per tour, and nothing about the cars", () => {
    const [day] = describeMonth({
      month: "2026-08",
      rows: [],
      occupancy: new Map([
        [occupancySlotKey("2026-08-15", "morning"), withCars([openCar()], "classic-small")],
      ]),
      today,
      audience: "online",
    }).filter((entry) => entry.date === "2026-08-15");
    const morning = toPublicDay(day).slots[0];
    expect(morning).toEqual({
      slot: "morning",
      driversLeft: 0,
      vehiclesLeft: { ...FLEET_SIZE, "classic-small": FLEET_SIZE["classic-small"] - 2 },
      openSeats: { [CLASSIC_TOUR]: 1 },
    });
  });

  // Lisbon is UTC+1 in summer (10:00 = 09:00Z) and UTC+0 in winter. An open
  // seat is no seat once its car has left.
  it.each([
    ["summer, before", "2026-08-15T08:59:00Z", true],
    ["summer, after", "2026-08-15T09:01:00Z", false],
    ["winter, before", "2026-12-15T09:59:00Z", true],
    ["winter, after", "2026-12-15T10:01:00Z", false],
  ] as const)("sells the last open seat of today's 10:00 %s it leaves", (_label, iso, sells) => {
    const now = new Date(iso);
    const slot = departure(withCars([openCar()], "classic-small"), {
      now,
      date: todayKey(now),
    });
    expect(fitsParty(slot, CLASSIC_TOUR, 1, "public").ok).toBe(sells);
  });
});

/**
 * The open group rides in the VW T3 (JAM-290).
 *
 * Diogo and Rita booked three couples on one open-group departure: two couples
 * took two small classics and both drivers, and the third was refused. Each
 * case here is a booking in that story. `seat` writes a fit into the
 * occupancy the way the booking row and `tallyOccupancy` do, so a case reads
 * the departure that the bookings before it left.
 */
describe("the open group in the VW T3", () => {
  const today = "2026-08-10";
  const departure = (
    occupancy?: SlotOccupancy,
    options: { drivers?: number; date?: string } = {},
  ) =>
    describeSlot({
      date: options.date ?? "2026-08-15",
      slot: "morning",
      row: row({ drivers: options.drivers ?? DEFAULT_DRIVERS }),
      occupancy,
      today,
    });

  /** Book one party: the fit the checkout would write, and the departure after it. */
  function seat(
    occupancy: SlotOccupancy,
    partySize: number,
    mode: SeatingMode,
    newCarId: string,
  ): { fit: ReturnType<typeof fitsParty>; occupancy: SlotOccupancy } {
    const fit = fitsParty(departure(occupancy), CLASSIC_TOUR, partySize, mode);
    if (!fit.ok) return { fit, occupancy };
    const openCars = (occupancy.openCars ?? []).map((car) => ({ ...car }));
    if (fit.joins) {
      const car = openCars.find((entry) => entry.id === fit.joins);
      if (car) car.seatsTaken += partySize;
      return { fit, occupancy: { ...occupancy, openCars } };
    }
    const vehicles = { ...occupancy.vehicles };
    vehicles[fit.vehicleClass] += 1;
    if (mode === "public") {
      openCars.push({
        id: newCarId,
        experienceSlug: CLASSIC_TOUR,
        vehicleClass: fit.vehicleClass,
        seatsTaken: partySize,
      });
    }
    return { fit, occupancy: { drivers: occupancy.drivers + 1, vehicles, openCars } };
  }

  /** `count` open-group couples, booked one after the other on an empty departure. */
  function couples(count: number) {
    let occupancy: SlotOccupancy = { drivers: 0, vehicles: noVehicles() };
    const fits: ReturnType<typeof fitsParty>[] = [];
    for (let index = 0; index < count; index += 1) {
      const booked = seat(occupancy, 2, "public", `van-${index}`);
      fits.push(booked.fit);
      occupancy = booked.occupancy;
    }
    return { fits, occupancy };
  }

  it("seats three couples in one VW T3 with one driver", () => {
    const { fits, occupancy } = couples(3);
    expect(fits).toEqual([
      { ok: true, vehicleClass: "classic-van", joins: null },
      { ok: true, vehicleClass: "classic-van", joins: "van-0" },
      { ok: true, vehicleClass: "classic-van", joins: "van-0" },
    ]);
    expect(occupancy.drivers).toBe(1);
    expect(occupancy.vehicles).toEqual({ ...noVehicles(), "classic-van": 1 });
    expect(occupancy.openCars).toEqual([
      { id: "van-0", experienceSlug: CLASSIC_TOUR, vehicleClass: "classic-van", seatsTaken: 6 },
    ]);
    // The second driver is still free for another tour.
    expect(departure(occupancy).driversLeft).toBe(DEFAULT_DRIVERS - 1);
  });

  it("seats a fourth couple in the same van: 8 of 8 seats", () => {
    const { fits, occupancy } = couples(4);
    expect(fits[3]).toEqual({ ok: true, vehicleClass: "classic-van", joins: "van-0" });
    expect(occupancy.drivers).toBe(1);
    expect(occupancy.openCars).toHaveLength(1);
    expect(occupancy.openCars?.[0].seatsTaken).toBe(8);
    expect(freeSeats(occupancy.openCars![0])).toBe(0);
  });

  it.each([1, 2, 3])(
    "opens a small classic with the second driver for a fifth party of %i",
    (partySize) => {
      const full = couples(4).occupancy;
      const { fit, occupancy } = seat(full, partySize, "public", "second-car");
      expect(fit).toEqual({ ok: true, vehicleClass: "classic-small", joins: null });
      expect(occupancy.drivers).toBe(2);
      expect(occupancy.vehicles).toEqual({
        ...noVehicles(),
        "classic-van": 1,
        "classic-small": 1,
      });
      // The next party joins that second car while it has the seats.
      const nextSize = partySize === 3 ? 1 : 3 - partySize;
      const next = fitsParty(departure(occupancy), CLASSIC_TOUR, nextSize, "public");
      expect(next).toEqual(
        partySize === 3
          ? { ok: false, reason: "no-driver" }
          : { ok: true, vehicleClass: "classic-small", joins: "second-car" },
      );
    },
  );

  it("refuses a fifth party when the full van has the only driver", () => {
    const full = couples(4).occupancy;
    const slot = departure(full, { drivers: 1 });
    expect(fitsParty(slot, CLASSIC_TOUR, 2, "public")).toEqual({
      ok: false,
      reason: "no-driver",
    });
    // Nothing is left to sell: the guest's calendar shows the departure as full.
    expect(slot).toMatchObject({ hasRoom: false, bookable: false });
  });

  it("refuses a fifth party of four to eight: only the van carries it, and the van is full", () => {
    const full = couples(4).occupancy;
    for (const partySize of [4, 8]) {
      expect(fitsParty(departure(full), CLASSIC_TOUR, partySize, "public")).toEqual({
        ok: false,
        reason: "no-vehicle",
      });
    }
  });

  it("never splits a party: a couple opens the second car when the van has one seat", () => {
    // Seven aboard. The couple does not fit the last seat, and is not divided.
    const seven = seat(couples(3).occupancy, 1, "public", "unused").occupancy;
    expect(seven.openCars?.[0].seatsTaken).toBe(7);
    const { fit, occupancy } = seat(seven, 2, "public", "second-car");
    expect(fit).toEqual({ ok: true, vehicleClass: "classic-small", joins: null });
    // The last seat of the van is still for sale to one guest.
    expect(fitsParty(departure(occupancy), CLASSIC_TOUR, 1, "public").ok).toBe(true);
  });

  it("still gives a private couple a small classic, with the van free", () => {
    const other = departure(undefined, { date: "2026-08-16" });
    expect(fitsParty(other, CLASSIC_TOUR, 2, "private")).toEqual({
      ok: true,
      vehicleClass: "classic-small",
      joins: null,
    });
    // Private is the default: a caller that does not say gets the same car.
    expect(fitsParty(other, CLASSIC_TOUR, 2)).toEqual({
      ok: true,
      vehicleClass: "classic-small",
      joins: null,
    });
  });

  it("gives a private couple a small classic beside the open van, and never a seat in it", () => {
    const { occupancy } = couples(1);
    expect(fitsParty(departure(occupancy), CLASSIC_TOUR, 2, "private")).toEqual({
      ok: true,
      vehicleClass: "classic-small",
      joins: null,
    });
  });

  it("uses the small classics for the open group when a private group holds the VW T3", () => {
    const privateVan = seat({ drivers: 0, vehicles: noVehicles() }, 6, "private", "unused");
    expect(privateVan.fit).toEqual({ ok: true, vehicleClass: "classic-van", joins: null });
    for (const partySize of [1, 2, 3]) {
      expect(
        fitsParty(departure(privateVan.occupancy), CLASSIC_TOUR, partySize, "public"),
      ).toEqual({ ok: true, vehicleClass: "classic-small", joins: null });
    }
    for (const partySize of [4, 8]) {
      expect(
        fitsParty(departure(privateVan.occupancy), CLASSIC_TOUR, partySize, "public"),
      ).toEqual({ ok: false, reason: "no-vehicle" });
    }
  });

  it("leaves Óbidos in the touring vehicle", () => {
    expect(fitsParty(departure(), TOURING_TOUR, 2, "public")).toEqual({
      ok: true,
      vehicleClass: "touring",
      joins: null,
    });
  });

  it("offers a guest's calendar exactly the departures the checkout accepts", () => {
    // The browser runs `slotFitsParty` over the public payload. The server runs
    // `fitsParty` over the departure. They must agree for every party.
    const privateVan = seat({ drivers: 0, vehicles: noVehicles() }, 6, "private", "unused");
    const departures: [string, SlotOccupancy | undefined, number][] = [
      ["empty", undefined, DEFAULT_DRIVERS],
      ["one couple in the van", couples(1).occupancy, DEFAULT_DRIVERS],
      ["three couples in the van", couples(3).occupancy, DEFAULT_DRIVERS],
      ["three couples in the van, one driver", couples(3).occupancy, 1],
      ["the van full", couples(4).occupancy, DEFAULT_DRIVERS],
      ["the van full, one driver", couples(4).occupancy, 1],
      ["the van full and a second car", seat(couples(4).occupancy, 2, "public", "b").occupancy, 2],
      ["a private group in the van", privateVan.occupancy, DEFAULT_DRIVERS],
    ];
    for (const [label, occupancy, drivers] of departures) {
      const slot = departure(occupancy, { drivers });
      const [shown] = toPublicDay({ date: slot.date, slots: [slot] }).slots;
      for (const mode of ["public", "private"] as const) {
        for (let partySize = 1; partySize <= 9; partySize += 1) {
          expect(
            slotFitsParty(shown, CLASSIC_TOUR, partySize, mode),
            `${label}: ${mode} party of ${partySize}`,
          ).toBe(fitsParty(slot, CLASSIC_TOUR, partySize, mode).ok);
        }
      }
    }
  });
});
