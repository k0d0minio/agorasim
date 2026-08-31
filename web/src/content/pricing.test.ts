import { describe, expect, it } from "vitest";

import { experiences } from "@/content/experiences";
import { fill, fromPriceLabel, pricingContent, tierLabel } from "@/content/pricing";
import type { ExperiencePricing } from "@/lib/pricing";

const pricingOf = (slug: string): ExperiencePricing | null => {
  const experience = experiences.find((entry) => entry.slug === slug);
  if (!experience) throw new Error(`no shipped entry for "${slug}"`);
  return experience.pricing ?? null;
};

/**
 * Two locales, one price list. The figures are asserted elsewhere
 * (`lib/pricing.test.ts`); what is asserted here is that both languages say the
 * same thing about them — a Portuguese sentence that lost its `{price}` renders
 * a literal brace to a guest, and nothing else would catch it.
 */
describe("the pricing copy", () => {
  it("keeps the same placeholders in both languages", () => {
    const placeholders = (text: string) => (text.match(/\{[a-z]+\}/g) ?? []).sort();
    for (const [key, value] of Object.entries(pricingContent)) {
      expect(placeholders(value.pt), key).toEqual(placeholders(value.en));
      expect(value.pt.trim(), key).not.toBe("");
      expect(value.en.trim(), key).not.toBe("");
    }
  });

  it("fills every occurrence of a placeholder", () => {
    expect(fill(pricingContent.adultsRange, "pt", { min: 1, max: 3 })).toBe("1–3 adultos");
    expect(fill(pricingContent.adultsRange, "en", { min: 4, max: 12 })).toBe("4–12 adults");
  });
});

describe("tierLabel", () => {
  it("reads a band, an exact size and the singular", () => {
    expect(tierLabel({ minAdults: 1, maxAdults: 3, groupCents: 22000 }, "pt")).toBe(
      "1–3 adultos",
    );
    expect(tierLabel({ minAdults: 6, maxAdults: 6, groupCents: 40000 }, "en")).toBe("6 adults");
    expect(tierLabel({ minAdults: 1, maxAdults: 1, groupCents: 22000 }, "en")).toBe("1 adult");
  });
});

describe("fromPriceLabel", () => {
  it("quotes the cheapest head, in the guest's language", () => {
    // €58 is the shipped countryside per-person rate for four adults or more.
    expect(fromPriceLabel(pricingOf("rural-saloia"), "en")).toBe("from €58 per person");
    // pt-PT puts the symbol after the amount, with a space this file does not
    // get to choose — so the Portuguese line is read for its parts.
    const pt = fromPriceLabel(pricingOf("rural-saloia"), "pt");
    expect(pt).toMatch(/^desde 58/);
    expect(pt).toContain("por pessoa");
  });

  it("marks an add-on as the addition it is", () => {
    expect(fromPriceLabel(pricingOf("tasco-galapito"), "en")).toBe("+€60 per adult");
  });

  it("says nothing for an experience with no price list", () => {
    expect(fromPriceLabel(null, "pt")).toBeNull();
  });

  it("counts a private-only tour by the group, not by the head", () => {
    const privateOnly: ExperiencePricing = {
      type: "tour",
      private: { tiers: [{ minAdults: 1, maxAdults: 4, groupCents: 30000 }], childCents: 3000 },
    };
    expect(fromPriceLabel(privateOnly, "en")).toBe("from €300 per group");
  });
});
