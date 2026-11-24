import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote } from "@/db";
import type { SlotOccupancy } from "@/lib/bookings";
import { FLEET_SIZE, noVehicles } from "@/lib/fleet";

/**
 * The departure check of a tour quote and the team's two buttons on a paid
 * tour quote (JAM-294), through the real `lib/tour-quote-hold.ts`. The
 * occupancy, the availability rows and the quote writes are faked at their
 * boundary. The rule that reads them — `describeSlot`, `tourHoldFits`,
 * `withoutTourHold` — is the real one.
 *
 * Written from the acceptance criteria: a quote without a car takes what is
 * left of its departure, the choice of a car refuses a car that is not free, a
 * quote that is not paid or is cancelled refuses both acts, and each change
 * writes one audit line.
 */

const countSlotOccupancy = vi.fn();
vi.mock("@/lib/bookings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bookings")>()),
  countSlotOccupancy: (...args: unknown[]) => countSlotOccupancy(...args),
}));

const listAvailabilityRows = vi.fn();
vi.mock("@/lib/availability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/availability")>()),
  listAvailabilityRows: (...args: unknown[]) => listAvailabilityRows(...args),
}));

const getQuote = vi.fn();
const setQuoteHoldCar = vi.fn();
vi.mock("@/lib/quotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/quotes")>()),
  getQuote: (...args: unknown[]) => getQuote(...args),
  setQuoteHoldCar: (...args: unknown[]) => setQuoteHoldCar(...args),
}));

const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));

const { changeTourQuoteCar, checkTourHold, tourCarVerdict } = await import("./tour-quote-hold");

const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const OTHER_QUOTE = "bbbbbbbb-2222-4222-8222-222222222222";
const LEAD_ID = "cccccccc-3333-4333-8333-333333333333";
const OPERATOR_ID = "eeeeeeee-5555-4555-8555-555555555555";
const NOW = new Date("2026-06-01T10:00:00Z");
const DATE = "2026-08-15";

/** A paid tour quote that holds its whole morning departure. */
function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: QUOTE_ID,
    tourRequestId: LEAD_ID,
    eventDate: DATE,
    status: "paid",
    kind: "tour",
    holdSlot: "morning",
    holdVehicleClass: null,
    ...overrides,
  } as Quote;
}

/** What `countSlotOccupancy` returns for the morning of the quote's day. */
function occupancyOf(morning: Partial<SlotOccupancy>): Map<string, SlotOccupancy> {
  return new Map([[`${DATE}#morning`, { drivers: 0, vehicles: noVehicles(), ...morning }]]);
}

beforeEach(() => {
  countSlotOccupancy.mockReset();
  countSlotOccupancy.mockResolvedValue(new Map());
  listAvailabilityRows.mockReset();
  listAvailabilityRows.mockResolvedValue([]);
  getQuote.mockReset();
  setQuoteHoldCar.mockReset();
  recordAuditOrWarn.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("checkTourHold — a quote without a car", () => {
  const hold = { slot: "morning", vehicleClass: null } as const;

  it("fits an empty departure", async () => {
    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toEqual({ ok: true });
  });

  it("fits a departure with a booking, while one driver and one car are free", async () => {
    countSlotOccupancy.mockResolvedValue(
      occupancyOf({ drivers: 1, vehicles: { ...noVehicles(), "classic-van": 1 } }),
    );

    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toEqual({ ok: true });
  });

  it("refuses a departure with no driver left", async () => {
    countSlotOccupancy.mockResolvedValue(
      occupancyOf({ drivers: 2, vehicles: { ...noVehicles(), "classic-small": 2 } }),
    );

    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("refuses a departure that another tour quote holds, and a day an event holds", async () => {
    countSlotOccupancy.mockResolvedValue(occupancyOf({ tourHolds: [OTHER_QUOTE] }));
    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toMatchObject({ ok: false });

    countSlotOccupancy.mockResolvedValue(occupancyOf({ eventHolds: [OTHER_QUOTE] }));
    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toMatchObject({ ok: false });
  });

  it("checks both departures of a whole day", async () => {
    countSlotOccupancy.mockResolvedValue(
      new Map([[`${DATE}#afternoon`, { drivers: 2, vehicles: noVehicles() }]]),
    );

    expect(
      await checkTourHold({ date: DATE, hold: { slot: "full_day", vehicleClass: null }, now: NOW }),
    ).toEqual({ ok: false, reason: "unavailable" });
  });

  it("answers no when the count cannot be read", async () => {
    countSlotOccupancy.mockRejectedValue(new Error("connection timeout"));

    expect(await checkTourHold({ date: DATE, hold, now: NOW })).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });
});

describe("tourCarVerdict — which quote shows the two buttons", () => {
  it("allows a paid tour quote with a departure that is today or later", () => {
    expect(tourCarVerdict(quote(), "2026-06-01")).toBe("ok");
    expect(tourCarVerdict(quote({ status: "deposit_paid" }), DATE)).toBe("ok");
    expect(tourCarVerdict(quote({ holdVehicleClass: "classic-van" }), DATE)).toBe("ok");
  });

  it("refuses a quote that is not paid, and a cancelled quote", () => {
    for (const status of ["draft", "sent", "cancelled"] as const) {
      expect(tourCarVerdict(quote({ status }), "2026-06-01")).toBe("not-held");
    }
  });

  it("refuses a wedding or event quote", () => {
    expect(tourCarVerdict(quote({ kind: "event", holdSlot: null }), "2026-06-01")).toBe("not-held");
  });

  it("refuses a departure day that is past", () => {
    expect(tourCarVerdict(quote(), "2026-08-16")).toBe("past");
  });
});

describe("changeTourQuoteCar — the team picks the one car of the group", () => {
  const pick = (vehicleClass: "classic-small" | "classic-van" | "touring" | null) =>
    changeTourQuoteCar({ quoteId: QUOTE_ID, vehicleClass, actorUserId: OPERATOR_ID, now: NOW });

  it("writes the car, though the quote itself holds the whole departure", async () => {
    getQuote.mockResolvedValue(quote());
    // The count that every reader shares: this quote closes the departure.
    countSlotOccupancy.mockResolvedValue(occupancyOf({ tourHolds: [QUOTE_ID] }));
    setQuoteHoldCar.mockResolvedValue(quote({ holdVehicleClass: "classic-van" }));

    expect(await pick("classic-van")).toMatchObject({ status: "changed" });
    expect(setQuoteHoldCar).toHaveBeenCalledWith(QUOTE_ID, "classic-van", NOW);
  });

  it("writes one audit line, with who made the change and what changed", async () => {
    getQuote.mockResolvedValue(quote());
    setQuoteHoldCar.mockResolvedValue(quote({ holdVehicleClass: "classic-small" }));

    await pick("classic-small");

    expect(recordAuditOrWarn).toHaveBeenCalledTimes(1);
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: OPERATOR_ID,
        action: "quote.hold_changed",
        entityType: "tour_request",
        entityId: LEAD_ID,
        before: expect.objectContaining({ slot: "morning", vehicleClass: null }),
        after: expect.objectContaining({ slot: "morning", vehicleClass: "classic-small" }),
      }),
    );
  });

  it("refuses a car that a booking on the departure has already", async () => {
    getQuote.mockResolvedValue(quote());
    countSlotOccupancy.mockResolvedValue(
      occupancyOf({
        drivers: 1,
        vehicles: { ...noVehicles(), "classic-van": FLEET_SIZE["classic-van"] },
        tourHolds: [QUOTE_ID],
      }),
    );

    expect(await pick("classic-van")).toEqual({ status: "no-car", reason: "unavailable" });
    expect(setQuoteHoldCar).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("refuses when the bookings on the departure have every driver", async () => {
    getQuote.mockResolvedValue(quote());
    countSlotOccupancy.mockResolvedValue(
      occupancyOf({
        drivers: 2,
        vehicles: { ...noVehicles(), "classic-small": 2 },
        tourHolds: [QUOTE_ID],
      }),
    );

    expect(await pick("classic-van")).toEqual({ status: "no-car", reason: "unavailable" });
  });

  it("says so when the count cannot be read", async () => {
    getQuote.mockResolvedValue(quote());
    countSlotOccupancy.mockRejectedValue(new Error("connection timeout"));

    expect(await pick("touring")).toEqual({ status: "no-car", reason: "unreadable" });
    expect(setQuoteHoldCar).not.toHaveBeenCalled();
  });

  it("writes nothing when the quote holds that car already", async () => {
    getQuote.mockResolvedValue(quote({ holdVehicleClass: "classic-van" }));

    expect(await pick("classic-van")).toEqual({ status: "unchanged" });
    expect(setQuoteHoldCar).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });
});

describe("changeTourQuoteCar — Reter a partida inteira", () => {
  const holdWhole = () =>
    changeTourQuoteCar({
      quoteId: QUOTE_ID,
      vehicleClass: null,
      actorUserId: OPERATOR_ID,
      now: NOW,
    });

  it("clears the car with no capacity check, and writes one audit line", async () => {
    getQuote.mockResolvedValue(quote({ holdVehicleClass: "classic-van" }));
    setQuoteHoldCar.mockResolvedValue(quote());

    expect(await holdWhole()).toMatchObject({ status: "changed" });
    // The bookings that came in meanwhile keep their car. No count is read.
    expect(countSlotOccupancy).not.toHaveBeenCalled();
    expect(setQuoteHoldCar).toHaveBeenCalledWith(QUOTE_ID, null, NOW);
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quote.hold_changed",
        before: expect.objectContaining({ vehicleClass: "classic-van" }),
        after: expect.objectContaining({ vehicleClass: null }),
      }),
    );
  });

  it("shows a quote that has a car from before JAM-294 the same way", async () => {
    // Migration 0044 wrote `tour` on each row that had a car.
    getQuote.mockResolvedValue(quote({ kind: "tour", holdVehicleClass: "classic-small" }));
    setQuoteHoldCar.mockResolvedValue(quote());

    expect(await holdWhole()).toMatchObject({ status: "changed" });
  });
});

describe("changeTourQuoteCar — the quotes it refuses", () => {
  const act = (vehicleClass: "classic-van" | null = "classic-van") =>
    changeTourQuoteCar({ quoteId: QUOTE_ID, vehicleClass, actorUserId: OPERATOR_ID, now: NOW });

  it("refuses a quote that does not exist", async () => {
    getQuote.mockResolvedValue(null);

    expect(await act()).toEqual({ status: "not-found" });
  });

  it("refuses both acts on a quote that is not paid, and on a cancelled quote", async () => {
    for (const status of ["draft", "sent", "cancelled"] as const) {
      getQuote.mockResolvedValue(quote({ status }));
      expect(await act("classic-van")).toEqual({ status: "not-held" });

      getQuote.mockResolvedValue(quote({ status, holdVehicleClass: "classic-van" }));
      expect(await act(null)).toEqual({ status: "not-held" });
    }
    expect(setQuoteHoldCar).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("refuses a wedding or event quote", async () => {
    getQuote.mockResolvedValue(quote({ kind: "event", holdSlot: null }));

    expect(await act()).toEqual({ status: "not-held" });
  });

  it("refuses a departure day that is past", async () => {
    getQuote.mockResolvedValue(quote({ eventDate: "2026-05-31" }));

    expect(await act()).toEqual({ status: "past" });
    expect(setQuoteHoldCar).not.toHaveBeenCalled();
  });

  it("writes no audit line when the quote was cancelled from the other phone", async () => {
    getQuote.mockResolvedValue(quote());
    setQuoteHoldCar.mockResolvedValue(null);

    expect(await act()).toEqual({ status: "not-held" });
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });
});
