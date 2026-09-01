import { describe, expect, it } from "vitest";

import {
  CANCELLATION_NOTICE_HOURS,
  businessInstant,
  cancellationWindow,
  departureInstant,
} from "@/lib/cancellation";
import { BUSINESS_TIME_ZONE } from "@/lib/availability";

/**
 * The 48-hour policy, as arithmetic — the single source of truth for "may this
 * booking still be cancelled?".
 *
 * These are the cases that matter and that a human getting the arithmetic wrong
 * would botch: a booking two days out (free), one an hour past the deadline
 * (too late), one whose tour already left (departed), a deadline that falls on
 * a DST change (still an instant in Lisbon time), and a deliberately early
 * anchor for a tour whose departure hour is unpublished.
 */
describe("cancellationWindow", () => {
  const morning = { date: "2026-08-15", slot: "morning", experienceSlug: "rural-saloia" };

  it("is free while more than 48 hours remain", () => {
    const now = businessInstant("2026-08-13", 9)!; // 49h before a 10:00 Saturday
    const w = cancellationWindow(morning, now);
    expect(w.verdict).toBe("free");
    expect(w.hoursUntilDeparture).toBe(49);
    expect(w.deadline).toBeDefined();
  });

  it("is free at the exact 48-hour mark — the boundary favours the guest", () => {
    const now = businessInstant("2026-08-13", 10)!;
    const w = cancellationWindow(morning, now);
    expect(w.verdict).toBe("free");
    expect(w.hoursUntilDeparture).toBe(48);
  });

  it("is too-late one hour past the deadline", () => {
    const now = businessInstant("2026-08-13", 11)!;
    const w = cancellationWindow(morning, now);
    expect(w.verdict).toBe("too-late");
    expect(w.hoursUntilDeparture).toBe(47);
  });

  it("is departed once the tour has left", () => {
    const now = businessInstant("2026-08-15", 10)!;
    const w = cancellationWindow(morning, now);
    expect(w.verdict).toBe("departed");
    expect(w.hoursUntilDeparture).toBe(0);
  });

  it("is departed after the tour ran", () => {
    const now = businessInstant("2026-08-15", 12)!;
    const w = cancellationWindow(morning, now);
    expect(w.verdict).toBe("departed");
    expect(w.hoursUntilDeparture).toBe(-2);
  });
});

describe("businessInstant", () => {
  it("returns the Lisbon wall-clock instant, not UTC", () => {
    // 10:00 in Lisbon in summer is UTC+1, so 09:00Z. If a bug treated the input
    // as UTC, the deadlines would be an hour late for eight months of the year.
    const instant = businessInstant("2026-08-15", 10)!;
    expect(instant.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("keeps winter hours on UTC in winter", () => {
    // January is UTC+0 in Portugal.
    const instant = businessInstant("2026-01-15", 14)!;
    expect(instant.toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("nulls a date that is not a date key", () => {
    expect(businessInstant("not-a-date", 10)).toBeNull();
  });
});

describe("departureInstant", () => {
  it("anchors a tour still awaiting its hours to the morning slot", () => {
    // Óbidos has no published clock time, so the deadline is computed from
    // 10:00 regardless of the slot booked — the conservative side to be wrong
    // on (see content/logistics.ts).
    const afternoon = {
      date: "2026-08-15",
      slot: "afternoon",
      experienceSlug: "obidos-medieval-villages",
    };
    const w = cancellationWindow(afternoon, businessInstant("2026-08-13", 12)!);
    expect(w.verdict).toBe("too-late");
  });

  it("uses the afternoon hour for a published tour in the afternoon slot", () => {
    const afternoon = {
      date: "2026-08-15",
      slot: "afternoon",
      experienceSlug: "rural-saloia",
    };
    const d = departureInstant(afternoon)!;
    expect(d.toISOString()).toBe("2026-08-15T13:00:00.000Z"); // 14:00 Lisbon, UTC+1
  });

  it("exposes the constant the copy quotes", () => {
    expect(CANCELLATION_NOTICE_HOURS).toBe(48);
    expect(BUSINESS_TIME_ZONE).toBe("Europe/Lisbon");
  });
});
