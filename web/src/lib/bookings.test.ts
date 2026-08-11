import { describe, expect, it } from "vitest";

import {
  BOOKING_HOLD_MINUTES,
  bookingRef,
  holdExpiryFrom,
  isSellable,
  occupiesSeat,
  quote,
} from "@/lib/bookings";
import type { Experience } from "@/content/experiences";
import type { Booking } from "@/db";

/**
 * The money and the seats.
 *
 * Everything here is a wrong answer that costs somebody something real: a tour
 * sold for nothing because its price was never set, a party charged for one
 * person, an abandoned checkout sitting on the last seat of a Saturday in
 * August. Formatting and parsing money live in `money.test.ts`; the queries
 * themselves are typed and covered by the build, per `sales.test.ts`.
 */

function experience(overrides: Partial<Experience> = {}): Experience {
  return {
    slug: "rural-saloia",
    kind: "signature",
    icon: "car",
    title: { pt: "Rural Saloia", en: "Rural Saloia" },
    tagline: { pt: "", en: "" },
    summary: { pt: "", en: "" },
    description: { pt: [], en: [] },
    duration: { pt: "", en: "" },
    highlights: { pt: [], en: [] },
    image: "/images/car.jpg",
    imageAlt: { pt: "", en: "" },
    faqs: [],
    priceCents: 14500,
    ...overrides,
  };
}

const manzwine = experience({ slug: "manzwine", kind: "complement", priceCents: 2500 });

describe("bookingRef", () => {
  it("is short, stable and derived from the id", () => {
    const id = "abcdef12-0000-0000-0000-000000000000";
    expect(bookingRef(id)).toBe("BK-ABCDEF");
    expect(bookingRef(id)).toBe(bookingRef(id));
  });
});

describe("quote", () => {
  it("prices the tour and every add-on per person", () => {
    const result = quote({
      experience: experience(),
      addOns: [manzwine],
      partySize: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Two guests, two tastings: (145 + 25) × 2.
    expect(result.totalCents).toBe((14500 + 2500) * 2);
    expect(result.items).toEqual([
      { slug: "rural-saloia", kind: "signature", unitCents: 14500, quantity: 2 },
      { slug: "manzwine", kind: "complement", unitCents: 2500, quantity: 2 },
    ]);
  });

  it("refuses an experience with no price rather than selling it for nothing", () => {
    // The state everything is in until Diogo & Rita set real prices. A €0 tour
    // is a worse outcome than no tour.
    const result = quote({
      experience: experience({ priceCents: null }),
      addOns: [],
      partySize: 2,
    });

    expect(result).toMatchObject({ ok: false, reason: "unpriced", slug: "rural-saloia" });
  });

  it("refuses an unpriced add-on too, naming the one that failed", () => {
    const result = quote({
      experience: experience(),
      addOns: [experience({ slug: "olaria-mz", kind: "complement", priceCents: undefined })],
      partySize: 1,
    });

    expect(result).toMatchObject({ ok: false, reason: "unpriced", slug: "olaria-mz" });
  });

  it("refuses a slug the catalogue does not know, rather than dropping it", () => {
    // The enquiry form drops unknown slugs, because an enquiry is not a
    // contract. Dropping one here would charge for a smaller day than the
    // guest chose.
    const result = quote({
      experience: experience(),
      addOns: [undefined],
      partySize: 2,
      requested: { experience: "rural-saloia", addOns: ["retired-tasting"] },
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "unknown-experience",
      slug: "retired-tasting",
    });
  });

  it("refuses a missing main experience", () => {
    const result = quote({
      experience: undefined,
      addOns: [],
      partySize: 2,
      requested: { experience: "made-up", addOns: [] },
    });

    expect(result).toMatchObject({ ok: false, reason: "unknown-experience", slug: "made-up" });
  });

  it.each([0, -1, 1.5, Number.NaN])("refuses a party size of %s", (partySize) => {
    expect(quote({ experience: experience(), addOns: [], partySize })).toMatchObject({
      ok: false,
      reason: "bad-party-size",
    });
  });
});

describe("isSellable", () => {
  it("needs a price above zero", () => {
    expect(isSellable(experience())).toBe(true);
    expect(isSellable(experience({ priceCents: null }))).toBe(false);
    expect(isSellable(experience({ priceCents: 0 }))).toBe(false);
    expect(isSellable(undefined)).toBe(false);
  });
});

describe("holdExpiryFrom", () => {
  it("is the shortest expiry a Stripe Checkout Session accepts", () => {
    // The hold and the session are given the same deadline, so they cannot
    // disagree about whether paying is still possible.
    expect(BOOKING_HOLD_MINUTES).toBe(30);
    const now = new Date("2026-08-11T10:00:00Z");
    expect(holdExpiryFrom(now).toISOString()).toBe("2026-08-11T10:30:00.000Z");
  });
});

describe("occupiesSeat", () => {
  const now = new Date("2026-08-11T10:00:00Z");
  const live = new Date("2026-08-11T10:20:00Z");
  const lapsed = new Date("2026-08-11T09:45:00Z");

  function booking(overrides: Partial<Pick<Booking, "status" | "holdExpiresAt">>) {
    return { status: "pending" as const, holdExpiresAt: live, ...overrides };
  }

  it("counts a confirmed booking whatever its hold says", () => {
    expect(occupiesSeat(booking({ status: "confirmed", holdExpiresAt: lapsed }), now)).toBe(
      true,
    );
  });

  it("counts a pending booking while its hold is live", () => {
    expect(occupiesSeat(booking({}), now)).toBe(true);
  });

  it("releases a pending booking the moment its hold lapses", () => {
    // By the clock, not by a sweeper: nothing has to have run for the seat to
    // be free again, which is what stops a failed job making August look sold
    // out.
    expect(occupiesSeat(booking({ holdExpiresAt: lapsed }), now)).toBe(false);
  });

  it("ignores everything that is over", () => {
    for (const status of ["expired", "cancelled", "refunded"] as const) {
      expect(occupiesSeat(booking({ status, holdExpiresAt: live }), now)).toBe(false);
    }
  });
});
