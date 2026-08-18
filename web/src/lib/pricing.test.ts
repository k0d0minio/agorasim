import { describe, expect, it } from "vitest";

import { experiences } from "@/content/experiences";
import {
  fromPrice,
  isPriced,
  maxAdultsOf,
  priceBooking,
  weekdayOf,
  type ExperiencePricing,
  type PartyCount,
} from "@/lib/pricing";

/**
 * The price list, exercised with Diogo & Rita's own figures.
 *
 * Every expected total below is a row of the prices PDF (Aug 2026) worked by
 * hand — this suite is that document made executable. If a tier is edited and
 * one of these breaks, the question is "did the offer really change?", which
 * is exactly the question that should be asked.
 */

const bySlug = new Map(experiences.map((e) => [e.slug, e.pricing ?? null]));

function pricingOf(slug: string): ExperiencePricing | null {
  const pricing = bySlug.get(slug);
  if (pricing === undefined) throw new Error(`no shipped entry for "${slug}"`);
  return pricing;
}

const countryside = { slug: "rural-saloia", pricing: pricingOf("rural-saloia") };
const obidos = {
  slug: "obidos-medieval-villages",
  pricing: pricingOf("obidos-medieval-villages"),
};
const galapito = { slug: "tasco-galapito", pricing: pricingOf("tasco-galapito") };
const manzwine = { slug: "manzwine", pricing: pricingOf("manzwine") };
const ramilo = { slug: "ramilo-wines", pricing: pricingOf("ramilo-wines") };

const party = (adults: number, children = 0, infants = 0): PartyCount => ({
  adults,
  children,
  infants,
});

// 2026-08-24 is a Monday; the day after is not.
const A_MONDAY = "2026-08-24";
const A_TUESDAY = "2026-08-25";

describe("public countryside tour", () => {
  it("charges 62€ per adult for a small group", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "public",
      party: party(2),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 12400, seats: 2 });
  });

  it("drops to 58€ per adult from the fourth adult", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "public",
      party: party(4),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 23200 });
  });

  it("tiers on adults, not on the whole family", () => {
    // Three adults and a child: the adults still pay the 1–3 rate.
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "public",
      party: party(3, 1),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 3 * 6200 + 3500 });
  });

  it("children pay 35€, infants pay nothing but hold a seat", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "public",
      party: party(2, 1, 1),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 12400 + 3500, seats: 4 });
  });

  it("refuses add-ons on a public departure", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [manzwine],
      mode: "public",
      party: party(2),
    });
    expect(result).toMatchObject({ ok: false, reason: "addons-not-allowed" });
  });
});

describe("private countryside tour", () => {
  it("prices the whole group by adult count", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "private",
      party: party(3),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 22000 });
  });

  it("adds 30€ per child on top of the group figure", () => {
    // Jamie's confirmed worked example: 2 adults + 2 children = 220 + 60.
    const result = priceBooking({
      tour: countryside,
      addOns: [],
      mode: "private",
      party: party(2, 2),
    });
    expect(result).toMatchObject({ ok: true, totalCents: 28000, seats: 4 });
  });

  it("sells up to twelve adults and refuses thirteen", () => {
    expect(
      priceBooking({ tour: countryside, addOns: [], mode: "private", party: party(12) }),
    ).toMatchObject({ ok: true, totalCents: 70000 });

    expect(
      priceBooking({ tour: countryside, addOns: [], mode: "private", party: party(13) }),
    ).toMatchObject({ ok: false, reason: "party-too-large", maxAdults: 12 });
  });
});

describe("Óbidos & medieval villages", () => {
  it("needs two adults for a public departure", () => {
    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "public", party: party(1) }),
    ).toMatchObject({ ok: false, reason: "min-adults", min: 2 });

    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "public", party: party(2) }),
    ).toMatchObject({ ok: true, totalCents: 20000 });
  });

  it("charges children 40€ either way", () => {
    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "public", party: party(2, 1) }),
    ).toMatchObject({ ok: true, totalCents: 24000 });

    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "private", party: party(2, 2) }),
    ).toMatchObject({ ok: true, totalCents: 36000 + 8000 });
  });

  it("prices a private group flat to three adults, per adult from four", () => {
    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "private", party: party(3) }),
    ).toMatchObject({ ok: true, totalCents: 36000 });

    expect(
      priceBooking({ tour: obidos, addOns: [], mode: "private", party: party(4) }),
    ).toMatchObject({ ok: true, totalCents: 44000 });
  });

  it("has no add-ons — every partner stop is on the Saloia route", () => {
    const result = priceBooking({
      tour: obidos,
      addOns: [galapito],
      mode: "private",
      party: party(2),
    });
    expect(result).toMatchObject({ ok: false, reason: "addons-not-allowed" });
  });
});

describe("add-ons on a private countryside tour", () => {
  it("prices the wine stops per adult, never per child", () => {
    const result = priceBooking({
      tour: countryside,
      addOns: [manzwine],
      mode: "private",
      party: party(2, 1),
      date: A_TUESDAY,
    });
    // Group 220 + child 30 + two tastings at 35. The child is not tasting.
    expect(result).toMatchObject({ ok: true, totalCents: 22000 + 3000 + 7000 });
    if (!result.ok) return;
    expect(
      result.lines.filter((line) => line.slug === "manzwine" && line.unit === "child"),
    ).toHaveLength(0);
  });

  it("holds Manzwine to two adults and Ramilo to three", () => {
    expect(
      priceBooking({
        tour: countryside,
        addOns: [manzwine],
        mode: "private",
        party: party(1),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: false, reason: "addon-min-adults", slug: "manzwine", min: 2 });

    expect(
      priceBooking({
        tour: countryside,
        addOns: [ramilo],
        mode: "private",
        party: party(2),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: false, reason: "addon-min-adults", slug: "ramilo-wines", min: 3 });

    expect(
      priceBooking({
        tour: countryside,
        addOns: [ramilo],
        mode: "private",
        party: party(3),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: true, totalCents: 22000 + 3 * 4500 });
  });

  it("refuses Manzwine on a Monday and allows it the day after", () => {
    expect(
      priceBooking({
        tour: countryside,
        addOns: [manzwine],
        mode: "private",
        party: party(2),
        date: A_MONDAY,
      }),
    ).toMatchObject({ ok: false, reason: "addon-closed-day", slug: "manzwine" });

    expect(
      priceBooking({
        tour: countryside,
        addOns: [manzwine],
        mode: "private",
        party: party(2),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: true });
  });

  it("prices the Galapito table for adults and children, minimum two at it", () => {
    expect(
      priceBooking({
        tour: countryside,
        addOns: [galapito],
        mode: "private",
        party: party(1, 1),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: true, totalCents: 22000 + 6000 + 2500 });

    // One adult alone is below the table's minimum of two guests.
    expect(
      priceBooking({
        tour: countryside,
        addOns: [galapito],
        mode: "private",
        party: party(1),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: false, reason: "addon-min-guests", slug: "tasco-galapito", min: 2 });
  });
});

describe("refusals", () => {
  it("refuses a party with no adult, or with broken counts", () => {
    expect(
      priceBooking({ tour: countryside, addOns: [], mode: "public", party: party(0, 2) }),
    ).toMatchObject({ ok: false, reason: "bad-party" });

    expect(
      priceBooking({
        tour: countryside,
        addOns: [],
        mode: "public",
        party: { adults: 1.5, children: 0, infants: 0 },
      }),
    ).toMatchObject({ ok: false, reason: "bad-party" });
  });

  it("refuses an experience with no price list rather than selling it for nothing", () => {
    expect(
      priceBooking({
        tour: { slug: "mystery", pricing: null },
        addOns: [],
        mode: "public",
        party: party(2),
      }),
    ).toMatchObject({ ok: false, reason: "unpriced", slug: "mystery" });
  });

  it("refuses a mode the tour is not sold in", () => {
    const publicOnly: ExperiencePricing = {
      type: "tour",
      public: { tiers: [{ minAdults: 1, maxAdults: 12, perAdultCents: 1000 }], childCents: 500 },
    };
    expect(
      priceBooking({
        tour: { slug: "one-way", pricing: publicOnly },
        addOns: [],
        mode: "private",
        party: party(2),
      }),
    ).toMatchObject({ ok: false, reason: "mode-unavailable", mode: "private" });
  });
});

describe("display helpers", () => {
  it("says what a tour starts from, per person", () => {
    expect(fromPrice(countryside.pricing)).toEqual({ cents: 5800, perGroup: false });
    expect(fromPrice(manzwine.pricing)).toEqual({ cents: 3500, perGroup: false });
    expect(fromPrice(null)).toBeNull();
  });

  it("knows the stepper's ceiling and what is priced at all", () => {
    expect(maxAdultsOf(countryside.pricing)).toBe(12);
    expect(isPriced(countryside.pricing)).toBe(true);
    expect(isPriced(null)).toBe(false);
  });

  it("reads weekdays Monday-first, like the calendar", () => {
    expect(weekdayOf(A_MONDAY)).toBe(0);
    expect(weekdayOf("2026-08-30")).toBe(6);
    expect(weekdayOf("not-a-day")).toBeNull();
  });
});
