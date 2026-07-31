import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RETENTION_DAYS, retentionCutoff, retentionDays } from "./retention";
import { parseCookieConsent, cookieConsentAssignment } from "./cookie-consent";

describe("retentionDays", () => {
  it("reads the configured period", () => {
    expect(retentionDays({ ENQUIRY_RETENTION_DAYS: "365" })).toBe(365);
  });

  it("falls back to the proposed default when unset", () => {
    expect(retentionDays({})).toBe(DEFAULT_RETENTION_DAYS);
  });

  it("falls back rather than disabling retention on a bad value", () => {
    // A typo in an environment variable must not silently switch the job off.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const raw of ["", "soon", "0", "-30", "12.5.6", "30 days"]) {
      expect(retentionDays({ ENQUIRY_RETENTION_DAYS: raw })).toBe(
        DEFAULT_RETENTION_DAYS,
      );
    }
  });
});

describe("retentionCutoff", () => {
  it("is the given number of days before now", () => {
    const now = new Date("2026-07-31T00:00:00Z");
    expect(retentionCutoff(now, 30).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("counts elapsed days, not calendar years", () => {
    // 730 days back from 1 March 2026 lands on 1 March 2024, because the leap
    // day in February 2024 is behind the cutoff rather than inside the window.
    const now = new Date("2026-03-01T12:00:00Z");
    expect(retentionCutoff(now, 730).toISOString()).toBe("2024-03-01T12:00:00.000Z");
  });
});

describe("parseCookieConsent", () => {
  it("finds a decision among other cookies", () => {
    expect(parseCookieConsent("a=1; agorasim_cookie_consent=granted; b=2")).toBe("granted");
    expect(parseCookieConsent("agorasim_cookie_consent=denied")).toBe("denied");
  });

  it("returns null when nothing was decided", () => {
    expect(parseCookieConsent("")).toBeNull();
    expect(parseCookieConsent("other=1")).toBeNull();
  });

  it("treats an unrecognised value as undecided, so we ask again", () => {
    // Never guess "granted" from a stale or hand-edited cookie: that would load
    // the third-party embed on the strength of a value nobody consented to.
    expect(parseCookieConsent("agorasim_cookie_consent=yes")).toBeNull();
    expect(parseCookieConsent("agorasim_cookie_consent=")).toBeNull();
  });
});

describe("cookieConsentAssignment", () => {
  it("scopes the cookie to the site and keeps it same-site", () => {
    const assignment = cookieConsentAssignment("granted");
    expect(assignment).toContain("agorasim_cookie_consent=granted");
    expect(assignment).toContain("path=/");
    expect(assignment).toContain("SameSite=Lax");
    expect(assignment).toMatch(/max-age=\d+/);
  });
});
