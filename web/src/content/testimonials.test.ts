import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { testimonials, testimonialsFor } from "./testimonials";
import { experiences } from "./experiences";
import { locales } from "@/i18n/config";

/**
 * Two joins here fail silently rather than loudly: a testimonial pointing at a
 * catalogue slug that no longer exists renders on no page at all, and a photo
 * path that does not match a file renders as a broken image on the home page.
 * Both are asserted rather than discovered by someone visiting the site.
 */
describe("the guest testimonials", () => {
  const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

  it("names an experience the catalogue ships", () => {
    const slugs = experiences.map((exp) => exp.slug);
    for (const entry of testimonials) {
      for (const slug of entry.experiences) {
        expect(slugs).toContain(slug);
      }
    }
  });

  it("points at a photo that exists", () => {
    for (const entry of testimonials) {
      expect(entry.photo.startsWith("/images/testimonials/")).toBe(true);
      expect(existsSync(`${publicDir}${entry.photo}`)).toBe(true);
    }
  });

  it("is written in both languages", () => {
    for (const entry of testimonials) {
      for (const locale of locales) {
        for (const field of [entry.quote, entry.origin, entry.photoAlt]) {
          expect(field[locale].trim().length).toBeGreaterThan(0);
        }
      }
      // The PT is a translation, not a copy of the English.
      expect(entry.quote.pt).not.toBe(entry.quote.en);
      expect(entry.photoAlt.pt).not.toBe(entry.photoAlt.en);
    }
  });

  it("puts the signature tour's quotes on its page and nothing on Óbidos", () => {
    expect(testimonialsFor("rural-saloia")).toHaveLength(testimonials.length);
    expect(testimonialsFor("obidos-medieval-villages")).toHaveLength(0);
  });
});
