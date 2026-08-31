import { describe, expect, it } from "vitest";

import { experienceJsonLd, serializeJsonLd } from "./jsonld";
import { experiences, type Experience } from "@/content/experiences";
import { site } from "@/content/site";

/**
 * These are about the *injection* boundary, not about schema.org correctness.
 * The builders above `serializeJsonLd` produce plain objects and are covered by
 * types; what needs asserting is that whatever ends up inside them cannot escape
 * the `<script>` element it is written into.
 */
describe("serializeJsonLd", () => {
  it("round-trips to the original object", () => {
    const item = { "@type": "FAQPage", name: "Rural Saloia", count: 3, nested: { ok: true } };
    expect(JSON.parse(serializeJsonLd(item))).toEqual(item);
  });

  it("cannot be closed out of its script element", () => {
    // The attack: an HTML parser inside <script> stops at the first `</script`
    // it sees, even mid-string, and reads the rest as markup.
    const hostile = { name: "</script><img src=x onerror=alert(1)>" };
    const serialized = serializeJsonLd(hostile);

    expect(serialized).not.toContain("</script");
    expect(serialized).not.toContain("<img");
    expect(serialized).not.toContain("<");
    // Escaped, not mangled — a consumer still reads the string that was written.
    expect(JSON.parse(serialized)).toEqual(hostile);
  });

  it("escapes every tag-open, not just the closing tag", () => {
    const serialized = serializeJsonLd({ a: "<b>", b: "a < b", c: "<!--" });
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c");
    expect(JSON.parse(serialized)).toEqual({ a: "<b>", b: "a < b", c: "<!--" });
  });

  it("escapes the JS line terminators that are legal inside JSON", () => {
    const item = { name: "line\u2028break", other: "para\u2029break" };
    const serialized = serializeJsonLd(item);

    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(JSON.parse(serialized)).toEqual(item);
  });

  it("leaves ordinary content alone", () => {
    // Portuguese copy is the common case; nothing here should be touched.
    const item = { name: "Sintra · Mafra · Ericeira", desc: "Passeios de carro clássico" };
    expect(serializeJsonLd(item)).toBe(JSON.stringify(item));
  });
});

/**
 * The `offers` block is the one part of a page's structured data that makes a
 * *commercial* claim, so it is asserted against the same figures the prices PDF
 * (Aug 2026) carries — the tables on the page and this block read the same
 * catalogue field, and this is where that stops being a comment and becomes a
 * test.
 */
describe("experienceJsonLd offers", () => {
  const bySlug = (slug: string): Experience => {
    const experience = experiences.find((entry) => entry.slug === slug);
    if (!experience) throw new Error(`no shipped entry for "${slug}"`);
    return experience;
  };

  it("publishes the tour's real range, in euros", () => {
    expect(experienceJsonLd(bySlug("rural-saloia"), "pt").offers).toEqual({
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      // €58 a head at the top per-person tier … €700 for twelve adults private.
      lowPrice: 58,
      highPrice: 700,
      availability: "https://schema.org/InStock",
      url: `${site.domain}/pt/reservar`,
    });
  });

  it("points each locale at its own booking page", () => {
    const offers = experienceJsonLd(bySlug("obidos-medieval-villages"), "en").offers as Record<
      string,
      unknown
    >;
    expect(offers.lowPrice).toBe(100);
    expect(offers.highPrice).toBe(360);
    expect(offers.url).toBe(`${site.domain}/en/reservar`);
  });

  it("says nothing at all about an experience with no price list", () => {
    const unpriced: Experience = { ...bySlug("rural-saloia"), pricing: null };
    expect(experienceJsonLd(unpriced, "pt")).not.toHaveProperty("offers");
  });
});
