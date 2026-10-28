import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  BOOKING_HOLD_MINUTES,
  bookingRef,
  emptyOccupancy,
  holdExpiryFrom,
  holdsCapacity,
  remindableOnSql,
  tallyOccupancy,
  thankableOnSql,
  type OccupancyGroup,
} from "@/lib/bookings";
import type { Booking } from "@/db";

/**
 * The demand side.
 *
 * The money moved to `lib/pricing.ts` (and `pricing.test.ts` exercises the
 * real price list). What stays here is the arithmetic that costs somebody
 * something real when it is wrong: an abandoned checkout sitting on the last
 * driver of a Saturday in August, or releasing a car somebody paid for.
 * Formatting and parsing money live in `money.test.ts`; the queries themselves
 * are typed and covered by the build, per `sales.test.ts`.
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

describe("emptyOccupancy", () => {
  it("starts every class at zero, and hands back a fresh tally each time", () => {
    const first = emptyOccupancy();
    first.drivers += 1;
    first.vehicles["classic-small"] += 1;
    // A shared object here would leak one departure's bookings into the next.
    expect(emptyOccupancy()).toEqual({
      drivers: 0,
      vehicles: { "classic-small": 0, "classic-van": 0, touring: 0 },
    });
  });
});

describe("holdsCapacity", () => {
  const now = new Date("2026-08-15T10:00:00Z");

  const booking = (overrides: Partial<Pick<Booking, "status" | "holdExpiresAt">>) =>
    ({
      status: "pending",
      holdExpiresAt: new Date("2026-08-15T10:30:00Z"),
      ...overrides,
    }) as Pick<Booking, "status" | "holdExpiresAt">;

  it("counts a confirmed booking forever", () => {
    expect(holdsCapacity(booking({ status: "confirmed" }), now)).toBe(true);
    // Even long after any hold time — the car is sold, not held.
    expect(
      holdsCapacity(
        booking({ status: "confirmed", holdExpiresAt: new Date("2026-08-01T00:00:00Z") }),
        now,
      ),
    ).toBe(true);
  });

  it("counts a pending booking only while its hold is live", () => {
    expect(holdsCapacity(booking({}), now)).toBe(true);
    // The moment the hold lapses the car frees itself — no sweeper involved,
    // which is the design: a sweeper that fails silently would leave August
    // looking sold out.
    expect(
      holdsCapacity(booking({ holdExpiresAt: new Date("2026-08-15T09:59:59Z") }), now),
    ).toBe(false);
  });

  it("never counts a closed booking", () => {
    for (const status of ["cancelled", "expired", "refunded"] as const) {
      expect(holdsCapacity(booking({ status }), now)).toBe(false);
    }
  });
});

describe("remindableOnSql", () => {
  /** The filter rendered as Postgres would receive it. */
  const rendered = () => new PgDialect().sqlToQuery(remindableOnSql("2026-08-15") as SQL);

  it("asks for that one day's confirmed bookings, and no other status", () => {
    const { sql, params } = rendered();
    expect(sql).toContain('"bookings"."date" = $');
    expect(sql).toContain('"bookings"."status" = $');
    expect(params).toContain("2026-08-15");
    expect(params).toContain("confirmed");
    // A pending hold is somebody on Stripe's page, not a guest who is coming;
    // the rest are history. Cash bookings are `confirmed` and need no clause.
    for (const status of ["pending", "expired", "cancelled", "refunded"]) {
      expect(params).not.toContain(status);
    }
    expect(sql).not.toMatch(/payment_method/);
  });

  it("keeps to the two operational departures", () => {
    const { params } = rendered();
    expect(params).toEqual(expect.arrayContaining(["morning", "afternoon"]));
    expect(params).not.toContain("full_day");
  });
});

describe("thankableOnSql", () => {
  const rendered = () => new PgDialect().sqlToQuery(thankableOnSql("2026-08-15") as SQL);

  it("is the reminder's rule — that day, confirmed only, the two departures", () => {
    const { sql, params } = rendered();
    expect(sql).toContain('"bookings"."date" = $');
    expect(sql).toContain('"bookings"."status" = $');
    expect(params).toEqual(
      expect.arrayContaining(["2026-08-15", "confirmed", "morning", "afternoon"]),
    );
    for (const status of ["pending", "expired", "cancelled", "refunded"]) {
      expect(params).not.toContain(status);
    }
    // Cash bookings are confirmed like Stripe ones — no payment clause.
    expect(sql).not.toMatch(/payment_method/);
  });

  it("leaves out a booking the team marked as a no-show", () => {
    expect(rendered().sql).toContain('"bookings"."no_show_at" is null');
  });
});

describe("tallyOccupancy", () => {
  const group = (overrides: Partial<OccupancyGroup> = {}): OccupancyGroup => ({
    date: "2026-08-15",
    slot: "morning",
    vehicleClass: "classic-small",
    sharedCarId: null,
    experienceSlug: "rural-saloia",
    bookings: 1,
    seats: 2,
    ...overrides,
  });

  it("counts a car of its own per private booking", () => {
    const entry = tallyOccupancy([group({ bookings: 2, seats: 5 })]).get("2026-08-15#morning");
    expect(entry).toMatchObject({ drivers: 2, vehicles: { "classic-small": 2 } });
    expect(entry?.openCars).toBeUndefined();
  });

  it("counts an open car once, however many parties ride in it", () => {
    // Two per-person parties, of two and of one, in one 2CV: one driver, one car.
    const entry = tallyOccupancy([
      group({ sharedCarId: "car-a", bookings: 2, seats: 3 }),
    ]).get("2026-08-15#morning");
    expect(entry).toMatchObject({ drivers: 1, vehicles: { "classic-small": 1 } });
    expect(entry?.openCars).toEqual([
      {
        id: "car-a",
        experienceSlug: "rural-saloia",
        vehicleClass: "classic-small",
        seatsTaken: 3,
      },
    ]);
  });

  it("keeps private and open cars on one departure apart", () => {
    const entry = tallyOccupancy([
      group({ vehicleClass: "classic-van", bookings: 1, seats: 6 }),
      group({ sharedCarId: "car-a", bookings: 1, seats: 2 }),
    ]).get("2026-08-15#morning");
    expect(entry).toMatchObject({
      drivers: 2,
      vehicles: { "classic-small": 1, "classic-van": 1, touring: 0 },
    });
    expect(entry?.openCars).toHaveLength(1);
  });

  it("takes a driver for a class the fleet no longer knows, and offers no seat in it", () => {
    const entry = tallyOccupancy([
      group({ vehicleClass: "landau", sharedCarId: "car-x" }),
    ]).get("2026-08-15#morning");
    expect(entry?.drivers).toBe(1);
    expect(entry?.openCars).toBeUndefined();
  });
});
