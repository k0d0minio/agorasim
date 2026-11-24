import { describe, expect, it } from "vitest";

import { experiences } from "@/content/experiences";
import { locales } from "@/i18n/config";

import { LEGACY_REDIRECTS } from "./legacy-redirects";
import { href, liveKeys } from "./routes";

/**
 * The redirect table is a hand-written map from one site's URLs to another's,
 * and both ends can drift: the old paths are fixed history, the new ones are
 * whatever `routes.ts` says today. These hold the table to both.
 */

/**
 * Every old WordPress path the crawl of 2026-09-10 found, and the ones the
 * GEO baseline of JAM-478 found that the crawl missed (JAM-500).
 */
const OLD_PATHS = [
  "/sobre",
  "/contactos",
  "/eventos",
  "/politica-de-privacidade",
  "/politica-de-cookies",
  "/centro-de-arbitragem",
  "/rural-oeste",
  "/paisagens-de-sintra",
  "/degustacao-tradicional-saloia",
  "/home-agorasim",
  "/home-teste",
  "/en/rural-oeste",
  "/en/paisagens-de-sintra",
  "/en/degustacao-tradicional-saloia",
  "/en/home-agorasim",
  "/en/centro-de-arbitragem",
  "/en/politica-de-cookies",
  "/en/politica-de-privacidade",
];

/**
 * The URLs the site actually serves, per the route map, in both locales: each
 * live route, and each experience page of the shipped catalogue.
 */
const SERVED = new Set(
  locales.flatMap((locale) => [
    ...liveKeys.map((key) => href(locale, key)),
    ...experiences.map((experience) => href(locale, "experiencias", experience.slug)),
  ]),
);

/** The locale a path starts with: `/en/…` is English, all else Portuguese. */
const localeOf = (path: string) => (path === "/en" || path.startsWith("/en/") ? "en" : "pt");

describe("legacy redirects", () => {
  it("covers every old path exactly once", () => {
    const sources = LEGACY_REDIRECTS.map((redirect) => redirect.source);
    expect([...sources].sort()).toEqual([...OLD_PATHS].sort());
  });

  it("lands each on a route the site serves", () => {
    for (const redirect of LEGACY_REDIRECTS) {
      expect(SERVED, `${redirect.source} → ${redirect.destination}`).toContain(
        redirect.destination,
      );
    }
  });

  it("keeps the locale of the old path", () => {
    for (const redirect of LEGACY_REDIRECTS) {
      expect(localeOf(redirect.destination), redirect.source).toBe(localeOf(redirect.source));
    }
  });

  it("is permanent, and never chains through another entry", () => {
    const sources = new Set(LEGACY_REDIRECTS.map((redirect) => redirect.source));
    for (const redirect of LEGACY_REDIRECTS) {
      expect(redirect.permanent).toBe(true);
      expect(sources.has(redirect.destination)).toBe(false);
    }
  });

  it("keeps sources off served pages, without trailing slash", () => {
    // Next strips the trailing slash itself before these run, and a source
    // that the site serves would shadow a real page.
    for (const redirect of LEGACY_REDIRECTS) {
      expect(redirect.source).toMatch(/^(\/en)?\/[a-z][a-z-]*$/);
      expect(redirect.source).not.toMatch(/^\/(pt|en)$/);
      expect(SERVED.has(redirect.source), redirect.source).toBe(false);
    }
  });
});
