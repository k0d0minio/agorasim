import { describe, expect, it } from "vitest";

import type { QuotePayment, QuoteStatus } from "@/db";
import {
  applyEventHolds,
  QUOTE_HOLDING_STATUSES,
  quoteHoldsDate,
} from "@/lib/event-holds";
import { emptyOccupancy, type SlotOccupancy } from "@/lib/bookings";
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
