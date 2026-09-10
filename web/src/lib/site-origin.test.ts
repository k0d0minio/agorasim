import { afterEach, describe, expect, it, vi } from "vitest";

import { CANONICAL_HOME, canonicalOrigin, siteUrl, siteUrlLabel } from "./site-origin";

/**
 * Two questions, one env var. `canonicalOrigin()` is what the site *claims*
 * (canonicals, sitemap, robots host, JSON-LD ids); `siteUrl()` is where this
 * deployment *answers* (Stripe returns, email assets). They read the same
 * `NEXT_PUBLIC_SITE_URL` and differ only in what they fall back to when it is
 * unset — and that difference is the whole point: a preview must keep
 * advertising the production address while its own links still work.
 */
describe("canonicalOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the hardcoded home when nothing is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(canonicalOrigin()).toBe(CANONICAL_HOME);
    expect(CANONICAL_HOME).toBe("https://agorasim.pt");
  });

  it("follows NEXT_PUBLIC_SITE_URL, trimmed and without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  https://agorasim.jamienisbet.com/ ");
    expect(canonicalOrigin()).toBe("https://agorasim.jamienisbet.com");
  });

  it("treats a blank value as unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "   ");
    expect(canonicalOrigin()).toBe(CANONICAL_HOME);
  });

  it("is unchanged on switch day, when the env is set to the home itself", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agorasim.pt");
    expect(canonicalOrigin()).toBe(CANONICAL_HOME);
  });

  it("never falls back to the Vercel preview URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "agorasim-git-feature-k0d0minio.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "agorasim.vercel.app");
    expect(canonicalOrigin()).toBe(CANONICAL_HOME);
    // …whereas the serving origin does, so a preview's own links still answer.
    expect(siteUrl()).toBe("https://agorasim.vercel.app");
  });
});

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the configured origin, normalised the same way as the canonical", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://agorasim.pt/");
    expect(siteUrl()).toBe("https://agorasim.pt");
    expect(siteUrl()).toBe(canonicalOrigin());
  });

  it("is localhost for a developer with nothing set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("labels an origin without its scheme", () => {
    expect(siteUrlLabel("https://agorasim.pt")).toBe("agorasim.pt");
  });
});
