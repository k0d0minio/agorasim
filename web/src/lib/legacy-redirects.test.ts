import { describe, expect, it } from "vitest";

import { LEGACY_REDIRECTS } from "./legacy-redirects";
import { href, liveKeys } from "./routes";

/**
 * The redirect table is a hand-written map from one site's URLs to another's,
 * and both ends can drift: the old paths are fixed history, the new ones are
 * whatever `routes.ts` says today. These hold the table to both.
 */

/** Every old WordPress navigation path the crawl of 2026-09-10 found. */
const OLD_PATHS = [
  "/sobre",
  "/contactos",
  "/eventos",
  "/politica-de-privacidade",
  "/politica-de-cookies",
  "/centro-de-arbitragem",
];

/** The Portuguese URLs the site actually serves, per the route map. */
const SERVED = new Set(liveKeys.map((key) => href("pt", key)));

describe("legacy redirects", () => {
  it("covers every old navigation path exactly once", () => {
    const sources = LEGACY_REDIRECTS.map((redirect) => redirect.source);
    expect([...sources].sort()).toEqual([...OLD_PATHS].sort());
  });

  it("lands each on a route the site serves in Portuguese", () => {
    for (const redirect of LEGACY_REDIRECTS) {
      expect(SERVED, `${redirect.source} → ${redirect.destination}`).toContain(
        redirect.destination,
      );
    }
  });

  it("is permanent, and never chains through another entry", () => {
    const sources = new Set(LEGACY_REDIRECTS.map((redirect) => redirect.source));
    for (const redirect of LEGACY_REDIRECTS) {
      expect(redirect.permanent).toBe(true);
      expect(sources.has(redirect.destination)).toBe(false);
    }
  });

  it("keeps sources at the root, without locale or trailing slash", () => {
    // Next strips the trailing slash itself before these run, and a `/pt/…`
    // source here would shadow a real page.
    for (const redirect of LEGACY_REDIRECTS) {
      expect(redirect.source).toMatch(/^\/[a-z][a-z-]*$/);
      expect(redirect.source).not.toMatch(/^\/(pt|en)$/);
    }
  });
});
