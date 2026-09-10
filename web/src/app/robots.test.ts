import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";
import { site } from "@/content/site";

/**
 * Previews already carry production canonicals, so this is the second lock on
 * the same door: a crawler that reaches a Vercel preview is refused outright,
 * while production — and anything not on Vercel at all — is welcomed and told
 * where the sitemap lives.
 */
describe("robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("welcomes crawlers on production and points them at the canonical sitemap", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const result = robots();
    expect(result.host).toBe(site.domain);
    expect(result.sitemap).toBe(`${site.domain}/sitemap.xml`);
    expect(result.rules).toEqual(
      expect.arrayContaining([{ userAgent: "*", allow: "/", disallow: "/admin" }]),
    );
  });

  it("leaves a deployment that is not on Vercel alone", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(robots().sitemap).toBe(`${site.domain}/sitemap.xml`);
  });

  it("refuses every crawler on a preview deployment", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const result = robots();
    expect(result.rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    expect(result.sitemap).toBeUndefined();
  });
});
