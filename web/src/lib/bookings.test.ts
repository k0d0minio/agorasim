import { describe, expect, it } from "vitest";

import {
  BOOKING_HOLD_MINUTES,
  bookingRef,
  holdExpiryFrom,
  occupiesSeat,
} from "@/lib/bookings";
import type { Booking } from "@/db";

/**
 * The seats.
 *
 * The money moved to `lib/pricing.ts` (and `pricing.test.ts` exercises the
 * real price list). What stays here is the demand-side arithmetic that costs
 * somebody something real when it is wrong: an abandoned checkout sitting on
 * the last seat of a Saturday in August, or releasing a seat somebody paid
 * for. Formatting and parsing money live in `money.test.ts`; the queries
 * themselves are typed and covered by the build, per `sales.test.ts`.
 */

describe("bookingRef", () => {
  it("is short, stable and derived from the id", () => {
    const id = "abcdef12-0000-0000-0000-000000000000";
    expect(bookingRef(id)).toBe("BK-ABCDEF");
    expect(bookingRef(id)).toBe(bookingRef(id));
  });
});

describe("holdExpiryFrom", () => {
  it("gives the hold exactly the configured lifetime", () => {
    const now = new Date("2026-08-15T10:00:00Z");
    expect(holdExpiryFrom(now).getTime() - now.getTime()).toBe(
      BOOKING_HOLD_MINUTES * 60_000,
    );
  });
});

describe("occupiesSeat", () => {
  const now = new Date("2026-08-15T10:00:00Z");

  const booking = (overrides: Partial<Pick<Booking, "status" | "holdExpiresAt">>) =>
    ({
      status: "pending",
      holdExpiresAt: new Date("2026-08-15T10:30:00Z"),
      ...overrides,
    }) as Pick<Booking, "status" | "holdExpiresAt">;

  it("counts a confirmed booking forever", () => {
    expect(occupiesSeat(booking({ status: "confirmed" }), now)).toBe(true);
    // Even long after any hold time — the seat is sold, not held.
    expect(
      occupiesSeat(
        booking({ status: "confirmed", holdExpiresAt: new Date("2026-08-01T00:00:00Z") }),
        now,
      ),
    ).toBe(true);
  });

  it("counts a pending booking only while its hold is live", () => {
    expect(occupiesSeat(booking({}), now)).toBe(true);
    // The moment the hold lapses the seat frees itself — no sweeper involved,
    // which is the design: a sweeper that fails silently would leave August
    // looking sold out.
    expect(
      occupiesSeat(booking({ holdExpiresAt: new Date("2026-08-15T09:59:59Z") }), now),
    ).toBe(false);
  });

  it("never counts a closed booking", () => {
    for (const status of ["cancelled", "expired", "refunded"] as const) {
      expect(occupiesSeat(booking({ status }), now)).toBe(false);
    }
  });
});
