import { describe, expect, it } from "vitest";

import { experiences } from "@/content/experiences";
import {
  fromPrice,
  isPriced,
  maxAdultsOf,
  parseExperiencePricing,
  priceBooking,
  priceRange,
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
    // Group 220 + the tour's own child surcharge 30 + the table: adult 60, child 25.
    expect(
      priceBooking({
        tour: countryside,
        addOns: [galapito],
        mode: "private",
        party: party(1, 1),
        date: A_TUESDAY,
      }),
    ).toMatchObject({ ok: true, totalCents: 22000 + 3000 + 6000 + 2500 });

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

  it("ranges a tour from its cheapest head to its dearest group", () => {
    // Both ends are rows of the prices PDF: €58 a head on a full per-person
    // departure, €700 for twelve adults in private.
    expect(priceRange(countryside.pricing)).toEqual({ lowCents: 5800, highCents: 70000 });
    // Óbidos: €100 public per adult, €360 for a private group of up to three.
    expect(priceRange(obidos.pricing)).toEqual({ lowCents: 10000, highCents: 36000 });
    // An add-on has one figure, so its range is that figure twice.
    expect(priceRange(manzwine.pricing)).toEqual({ lowCents: 3500, highCents: 3500 });
    expect(priceRange(null)).toBeNull();
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

describe("parseExperiencePricing", () => {
  /** What the driver hands back for a `jsonb` column: a plain parsed value. */
  const asStored = (pricing: ExperiencePricing) =>
    JSON.parse(JSON.stringify(pricing)) as unknown;

  it("reads every shipped price list back unchanged", () => {
    for (const experience of experiences) {
      const pricing = experience.pricing ?? null;
      if (!pricing) continue;
      expect(parseExperiencePricing(asStored(pricing))).toEqual(pricing);
    }
  });

  it("keeps `allowsAddOns` only where it is explicitly true", () => {
    const tiers = [{ minAdults: 1, maxAdults: 3, groupCents: 22000 }];
    const withFlag = parseExperiencePricing({
      type: "tour",
      private: { tiers, childCents: 3000, allowsAddOns: true },
    });
    const without = parseExperiencePricing({
      type: "tour",
      private: { tiers, childCents: 3000, allowsAddOns: "yes" },
    });

    expect(withFlag).toMatchObject({ private: { allowsAddOns: true } });
    // Anything short of `true` is a no: an add-on attached to a tour that does
    // not pass the partner is a stop nobody can drive to.
    expect(without?.type === "tour" && without.private?.allowsAddOns).toBeUndefined();
  });

  it("treats an absent optional as absent, however it was written", () => {
    expect(
      parseExperiencePricing({
        type: "addon",
        perAdultCents: 3500,
        childCents: null,
        minAdults: null,
        closedWeekdays: undefined,
      }),
    ).toEqual({ type: "addon", perAdultCents: 3500, childCents: null });
  });

  it("drops whatever else the column happens to hold", () => {
    // Normalised, not passed through: only the fields the arithmetic reads
    // come out, so a stray key cannot reach a price line or a summary.
    expect(
      parseExperiencePricing({
        type: "addon",
        perAdultCents: 3500,
        childCents: null,
        notes: "ask Rita",
      }),
    ).toEqual({ type: "addon", perAdultCents: 3500, childCents: null });
  });

  it.each([
    ["not an object", "62 euros"],
    ["null", null],
    ["an array", [{ type: "tour" }]],
    ["an unknown type", { type: "wedding", perAdultCents: 6200 }],
    ["a tour with neither mode", { type: "tour" }],
    ["a mode with no tiers", { type: "tour", public: { tiers: [], childCents: 3500 } }],
    [
      "a mode with no child rate",
      { type: "tour", public: { tiers: [{ minAdults: 1, maxAdults: 3, perAdultCents: 6200 }] } },
    ],
    [
      "a tier that prices neither the head nor the group",
      { type: "tour", public: { tiers: [{ minAdults: 1, maxAdults: 3 }], childCents: 3500 } },
    ],
    [
      "a tier band that ends before it starts",
      {
        type: "tour",
        public: { tiers: [{ minAdults: 4, maxAdults: 2, perAdultCents: 6200 }], childCents: 3500 },
      },
    ],
    [
      "cents that are not whole",
      {
        type: "tour",
        public: { tiers: [{ minAdults: 1, maxAdults: 3, perAdultCents: 62.5 }], childCents: 3500 },
      },
    ],
    [
      "cents that are negative",
      {
        type: "tour",
        public: { tiers: [{ minAdults: 1, maxAdults: 3, perAdultCents: -6200 }], childCents: 3500 },
      },
    ],
    ["an add-on with no adult rate", { type: "addon", childCents: 2500 }],
    [
      "a closed-weekday that is not a weekday",
      { type: "addon", perAdultCents: 3500, childCents: null, closedWeekdays: [9] },
    ],
  ])("refuses %s", (_label, stored) => {
    // Refusing means unpriced, which the site already knows how to be: the
    // tour renders, the checkout stands down, the enquiry form takes the lead.
    expect(parseExperiencePricing(stored)).toBeNull();
  });

  it("refuses the whole list when one mode of it is broken", () => {
    // Half a price list is worse than none: it would sell the public departure
    // and quietly misprice — or crash on — the private one.
    expect(
      parseExperiencePricing({
        type: "tour",
        public: { tiers: [{ minAdults: 1, maxAdults: 3, perAdultCents: 6200 }], childCents: 3500 },
        private: { tiers: "the whole car", childCents: 3000 },
      }),
    ).toBeNull();
  });
});
