import { describe, expect, it } from "vitest";

import type { QuotePayment, QuoteStatus } from "@/db";
import {
  applyDepartureHolds,
  applyEventHolds,
  QUOTE_HOLDING_STATUSES,
  quoteHoldsDate,
  tourHoldGroups,
  withoutTourHold,
} from "@/lib/event-holds";
import { emptyOccupancy, tallyOccupancy, type SlotOccupancy } from "@/lib/bookings";
import { statusAfterPayment } from "@/lib/quotes";

/**
 * The event hold's pure half — the rule the client answered (a deposit-paid
 * wedding or event takes the whole day) and the merge that puts it into the
 * one occupancy count every reader shares. Written from the spec's criteria:
 * `deposit_paid` and `paid` hold, a transfer write-off holds like a Stripe
 * payment, `cancelled` releases, and `draft`/`sent` hold nothing. The query is
 * typed and covered by the build, per the convention in `sales.test.ts`.
 */

const QUOTE_A = "aaaaaaaa-1111-4111-8111-111111111111";
const QUOTE_B = "bbbbbbbb-2222-4222-8222-222222222222";

describe("quoteHoldsDate", () => {
  it("holds the day once the deposit is paid, and keeps holding once the balance is", () => {
    expect(quoteHoldsDate({ status: "deposit_paid" })).toBe(true);
    expect(quoteHoldsDate({ status: "paid" })).toBe(true);
  });

  it("holds nothing for a quote nobody has paid on", () => {
    // A sent quote is an offer, not a date anybody has paid for.
    expect(quoteHoldsDate({ status: "draft" })).toBe(false);
    expect(quoteHoldsDate({ status: "sent" })).toBe(false);
  });

  it("releases the day when the event is called off", () => {
    expect(quoteHoldsDate({ status: "cancelled" })).toBe(false);
  });

  it("names exactly the two holding statuses", () => {
    expect([...QUOTE_HOLDING_STATUSES].sort()).toEqual(["deposit_paid", "paid"]);
  });

  it("holds a deposit written off as paid by transfer, like a Stripe one", () => {
    const payments = (deposit: QuotePayment["status"]) =>
      [
        { kind: "deposit", status: deposit },
        { kind: "balance", status: "pending" },
      ] as Pick<QuotePayment, "kind" | "status">[];

    const viaStripe: QuoteStatus = statusAfterPayment("sent", payments("paid"));
    const viaTransfer: QuoteStatus = statusAfterPayment("sent", payments("cancelled"));

    expect(quoteHoldsDate({ status: viaStripe })).toBe(true);
    expect(quoteHoldsDate({ status: viaTransfer })).toBe(true);
  });
});

describe("applyEventHolds", () => {
  it("takes both departures of a held day, even where nothing was booked", () => {
    const map = applyEventHolds(new Map(), [{ date: "2026-08-15", quoteId: QUOTE_A }]);

    expect(map.get("2026-08-15#morning")?.eventHolds).toEqual([QUOTE_A]);
    expect(map.get("2026-08-15#afternoon")?.eventHolds).toEqual([QUOTE_A]);
    // The day either side is untouched.
    expect(map.has("2026-08-14#morning")).toBe(false);
    expect(map.has("2026-08-16#afternoon")).toBe(false);
  });

  it("leaves the booking counts alone — the day sheet still says what was sold", () => {
    const booked: SlotOccupancy = emptyOccupancy();
    booked.drivers = 1;
    booked.vehicles["classic-small"] = 1;
    const map = new Map([["2026-08-15#morning", booked]]);

    applyEventHolds(map, [{ date: "2026-08-15", quoteId: QUOTE_A }]);

    expect(map.get("2026-08-15#morning")).toMatchObject({
      drivers: 1,
      vehicles: { "classic-small": 1, "classic-van": 0, touring: 0 },
      eventHolds: [QUOTE_A],
    });
  });

  it("lists every quote on a day, and each quote once", () => {
    const map = applyEventHolds(new Map(), [
      { date: "2026-08-15", quoteId: QUOTE_A },
      { date: "2026-08-15", quoteId: QUOTE_B },
      { date: "2026-08-15", quoteId: QUOTE_A },
    ]);

    expect(map.get("2026-08-15#morning")?.eventHolds).toEqual([QUOTE_A, QUOTE_B]);
  });

  it("changes nothing when no quote holds — a released day is rows and bookings alone", () => {
    const booked: SlotOccupancy = emptyOccupancy();
    booked.drivers = 2;
    const map = new Map([["2026-08-15#morning", booked]]);

    applyEventHolds(map, []);

    expect(map.get("2026-08-15#morning")?.eventHolds).toBeUndefined();
    expect(map.size).toBe(1);
  });
});

/**
 * A paid tour quote holds one car, not the day (Jamie, on the pull request of
 * `payment-link-from-scratch`): it enters the tally as one private car on each
 * departure it holds, as a booking would, and never as an event hold.
 */
describe("tourHoldGroups — a paid tour quote as one more car", () => {
  it("takes one driver and one car of its class on its departure", () => {
    const map = tallyOccupancy(
      tourHoldGroups([{ date: "2026-08-15", slot: "morning", vehicleClass: "classic-van" }]),
    );

    expect(map.get("2026-08-15#morning")).toMatchObject({
      drivers: 1,
      vehicles: { "classic-small": 0, "classic-van": 1, touring: 0 },
    });
    expect(map.get("2026-08-15#morning")?.eventHolds).toBeUndefined();
    expect(map.get("2026-08-15#morning")?.openCars).toBeUndefined();
    expect(map.has("2026-08-15#afternoon")).toBe(false);
  });

  it("takes both departures for the whole day", () => {
    const map = tallyOccupancy(
      tourHoldGroups([{ date: "2026-08-15", slot: "full_day", vehicleClass: "classic-small" }]),
    );

    expect(map.get("2026-08-15#morning")?.vehicles["classic-small"]).toBe(1);
    expect(map.get("2026-08-15#afternoon")?.vehicles["classic-small"]).toBe(1);
  });
});

/**
 * JAM-294: a paid tour quote without a car holds its whole departure. It is
 * not a car in the tally. It is a hold on each departure that it takes, and
 * the other departure of the day is not touched.
 */
describe("applyDepartureHolds — a paid tour quote without a car", () => {
  const whole = (slot: "morning" | "afternoon" | "full_day", quoteId = QUOTE_A) =>
    ({ date: "2026-08-15", slot, vehicleClass: null, quoteId }) as const;

  it("is no car in the tally", () => {
    expect(tourHoldGroups([whole("morning")])).toEqual([]);
  });

  it("holds its departure and leaves the other departure of the day alone", () => {
    const map = applyDepartureHolds(new Map(), [whole("morning")]);

    expect(map.get("2026-08-15#morning")?.tourHolds).toEqual([QUOTE_A]);
    expect(map.get("2026-08-15#morning")?.eventHolds).toBeUndefined();
    expect(map.has("2026-08-15#afternoon")).toBe(false);
  });

  it("holds both departures for the whole day", () => {
    const map = applyDepartureHolds(new Map(), [whole("full_day")]);

    expect(map.get("2026-08-15#morning")?.tourHolds).toEqual([QUOTE_A]);
    expect(map.get("2026-08-15#afternoon")?.tourHolds).toEqual([QUOTE_A]);
  });

  it("leaves the booking counts alone, and lists each quote once", () => {
    const booked: SlotOccupancy = emptyOccupancy();
    booked.drivers = 1;
    booked.vehicles["classic-van"] = 1;
    const map = new Map([["2026-08-15#morning", booked]]);

    applyDepartureHolds(map, [whole("morning"), whole("morning"), whole("morning", QUOTE_B)]);

    expect(map.get("2026-08-15#morning")).toMatchObject({
      drivers: 1,
      vehicles: { "classic-small": 0, "classic-van": 1, touring: 0 },
      tourHolds: [QUOTE_A, QUOTE_B],
    });
  });

  it("skips a quote that holds one car — the tally counts that one", () => {
    const withCar = {
      date: "2026-08-15",
      slot: "morning",
      vehicleClass: "classic-small",
      quoteId: QUOTE_A,
    } as const;

    expect(applyDepartureHolds(new Map(), [withCar]).size).toBe(0);
    expect(tallyOccupancy(tourHoldGroups([withCar])).get("2026-08-15#morning")?.drivers).toBe(1);
  });
});

describe("withoutTourHold — the departure as if the quote held nothing", () => {
  it("removes the quote's hold on the whole departure, and no other quote's", () => {
    const occupancy: SlotOccupancy = { ...emptyOccupancy(), tourHolds: [QUOTE_A, QUOTE_B] };

    expect(withoutTourHold(occupancy, { quoteId: QUOTE_A, vehicleClass: null }).tourHolds).toEqual([
      QUOTE_B,
    ]);
    // A copy: the count that every reader shares is not changed.
    expect(occupancy.tourHolds).toEqual([QUOTE_A, QUOTE_B]);
  });

  it("gives back the one car and its driver when the quote holds a car", () => {
    const occupancy: SlotOccupancy = emptyOccupancy();
    occupancy.drivers = 2;
    occupancy.vehicles["classic-small"] = 1;
    occupancy.vehicles["classic-van"] = 1;

    const released = withoutTourHold(occupancy, { quoteId: QUOTE_A, vehicleClass: "classic-van" });

    expect(released).toMatchObject({
      drivers: 1,
      vehicles: { "classic-small": 1, "classic-van": 0, touring: 0 },
    });
    expect(occupancy.vehicles["classic-van"]).toBe(1);
  });
});
