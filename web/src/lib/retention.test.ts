import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUDIT_IP_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
  auditIpRetentionDays,
  retentionCutoff,
  retentionDays,
} from "./retention";

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

describe("auditIpRetentionDays", () => {
  it("reads its own variable, not the enquiry one", () => {
    expect(auditIpRetentionDays({ AUDIT_IP_RETENTION_DAYS: "30" })).toBe(30);
    // The two periods are deliberately independent: an unconverted lead is kept
    // for two years, the address it was submitted from for ninety days.
    expect(auditIpRetentionDays({ ENQUIRY_RETENTION_DAYS: "365" })).toBe(
      DEFAULT_AUDIT_IP_RETENTION_DAYS,
    );
  });

  it("defaults to a security-log window, far short of the enquiry period", () => {
    expect(auditIpRetentionDays({})).toBe(DEFAULT_AUDIT_IP_RETENTION_DAYS);
    expect(DEFAULT_AUDIT_IP_RETENTION_DAYS).toBeLessThan(DEFAULT_RETENTION_DAYS);
  });

  it("falls back rather than keeping addresses forever on a bad value", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const raw of ["", "ninety", "0", "-1", "90.5", "90 days"]) {
      expect(auditIpRetentionDays({ AUDIT_IP_RETENTION_DAYS: raw })).toBe(
        DEFAULT_AUDIT_IP_RETENTION_DAYS,
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
