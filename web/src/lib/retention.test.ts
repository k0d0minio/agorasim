import { describe, expect, it, vi } from "vitest";

import {
  ANONYMISED,
  ANONYMISED_LINE_ITEM_LABEL,
  DEFAULT_AUDIT_IP_RETENTION_DAYS,
  DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
  anonymisedLineItems,
  auditIpRetentionDays,
  messageProviderIdRetentionDays,
  retentionCutoff,
  retentionDays,
} from "./retention";
import { lineItemsTotal } from "./quotes";
import type { QuoteLineItem } from "@/db";

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

describe("messageProviderIdRetentionDays", () => {
  it("reads its own variable", () => {
    expect(
      messageProviderIdRetentionDays({ MESSAGE_PROVIDER_ID_RETENTION_DAYS: "30" }),
    ).toBe(30);
    expect(messageProviderIdRetentionDays({ AUDIT_IP_RETENTION_DAYS: "7" })).toBe(
      DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS,
    );
  });

  it("defaults to the debugging window, far short of the enquiry period", () => {
    // The id is a key to the whole message in Resend's dashboard, so it is kept
    // only while "did this arrive?" is still a live question.
    expect(messageProviderIdRetentionDays({})).toBe(
      DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS,
    );
    expect(DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS).toBeLessThan(
      DEFAULT_RETENTION_DAYS,
    );
  });

  it("falls back rather than keeping the id forever on a bad value", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const raw of ["", "ninety", "0", "-1", "90.5"]) {
      expect(
        messageProviderIdRetentionDays({ MESSAGE_PROVIDER_ID_RETENTION_DAYS: raw }),
      ).toBe(DEFAULT_MESSAGE_PROVIDER_ID_RETENTION_DAYS);
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

describe("anonymisedLineItems", () => {
  const lines: QuoteLineItem[] = [
    { label: "4 carros clássicos — Igreja de São Pedro", unitCents: 45_000, quantity: 4 },
    { label: "Flores da Rita", unitCents: 12_000, quantity: 1 },
  ];

  it("takes the words an operator typed about somebody's day", () => {
    expect(anonymisedLineItems(lines).map((line) => line.label)).toEqual([
      ANONYMISED_LINE_ITEM_LABEL,
      ANONYMISED_LINE_ITEM_LABEL,
    ]);
    // The same marker the enquiry columns use, so an anonymised row reads the
    // same way wherever it is rendered.
    expect(ANONYMISED_LINE_ITEM_LABEL).toBe(ANONYMISED.name);
  });

  it("leaves the money and the count alone, so the lines still add up", () => {
    const anonymised = anonymisedLineItems(lines);
    expect(lineItemsTotal(anonymised)).toBe(lineItemsTotal(lines));
    expect(anonymised.map((line) => [line.unitCents, line.quantity])).toEqual([
      [45_000, 4],
      [12_000, 1],
    ]);
    // Order is part of the record: the lines are read back in the order they
    // were quoted in.
    expect(anonymised).toHaveLength(lines.length);
  });

  it("is idempotent, and a no-op on a quote that is a single agreed figure", () => {
    expect(anonymisedLineItems(anonymisedLineItems(lines))).toEqual(
      anonymisedLineItems(lines),
    );
    expect(anonymisedLineItems([])).toEqual([]);
  });

  it("does not mutate the rows it was handed", () => {
    const original = structuredClone(lines);
    anonymisedLineItems(lines);
    expect(lines).toEqual(original);
  });
});

describe("the venue the guest named", () => {
  it("is cleared alongside the free text on the enquiry itself", () => {
    // A church and a Saturday in June is somebody's wedding, on the same
    // reading as `message` — the hours and the car they asked for stay.
    expect(ANONYMISED.venue).toBeNull();
    expect(ANONYMISED.message).toBeNull();
    expect(ANONYMISED.internalNotes).toBeNull();
  });
});
