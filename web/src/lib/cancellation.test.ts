import { describe, expect, it } from "vitest";

import {
  CANCELLATION_NOTICE_HOURS,
  businessInstant,
  cancellationWindow,
  departureInstant,
} from "@/lib/cancellation";

/**
 * The 48-hour boundary.
 *
 * Every assertion here has a refund on the other side of it: one hour of drift
 * is the difference between a guest cancelling for free and a guest being told
 * to phone, and — in the wrong direction — between the business keeping a car
 * for a tour that leaves tomorrow and refunding it. The cases worth writing
 * down are therefore the clock ones: the two sides of the boundary, the exact
 * instant, and the summer/winter offset that a server in the wrong timezone
 * would silently get wrong.
 */

const RURAL = "rural-saloia";
/** Óbidos — the tour whose real departure hour nobody has stated yet. */
const OBIDOS = "obidos-medieval-villages";

function booking(overrides: Partial<Parameters<typeof cancellationWindow>[0]> = {}) {
  return { date: "2026-08-15", slot: "morning", experienceSlug: RURAL, ...overrides };
}

describe("the departure instant", () => {
  it("reads 10:00 in Lisbon as 09:00 UTC in summer", () => {
    // Portugal is WEST (UTC+1) in August. A server that used its own clock
    // would put this an hour out, and so would the deadline built on it.
    expect(businessInstant("2026-08-15", 10)?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("reads 10:00 in Lisbon as 10:00 UTC in winter", () => {
    // WET (UTC+0) in January — the same wall time, a different instant.
    expect(businessInstant("2026-01-15", 10)?.toISOString()).toBe(
      "2026-01-15T10:00:00.000Z",
    );
  });

  it("puts the afternoon departure four hours after the morning one", () => {
    const morning = departureInstant(booking({ slot: "morning" }))!;
    const afternoon = departureInstant(booking({ slot: "afternoon" }))!;
    expect(afternoon.getTime() - morning.getTime()).toBe(4 * 60 * 60 * 1000);
  });

  it("anchors a tour with no confirmed hour to the morning, whichever slot was sold", () => {
    // Óbidos' afternoon time is unknown, so the deadline is measured from the
    // earliest it could plausibly leave. Erring late would mean a deadline that
    // expires after the guest's own cut-off.
    const morning = departureInstant({ ...booking(), experienceSlug: OBIDOS, slot: "morning" });
    const afternoon = departureInstant({
      ...booking(),
      experienceSlug: OBIDOS,
      slot: "afternoon",
    });
    expect(afternoon?.toISOString()).toBe(morning?.toISOString());
  });

  it("returns null for a date that is not a date", () => {
    expect(businessInstant("not-a-date", 10)).toBeNull();
    expect(departureInstant(booking({ date: "2026-13-45" }))).toBeNull();
  });
});

describe("the 48-hour window", () => {
  // The tour leaves 2026-08-15 at 10:00 Lisbon = 09:00Z. The deadline is
  // therefore 2026-08-13 at 09:00Z.
  const deadline = new Date("2026-08-13T09:00:00.000Z");

  it("is free a minute before the deadline", () => {
    const window = cancellationWindow(booking(), new Date(deadline.getTime() - 60_000));
    expect(window.verdict).toBe("free");
  });

  it("is too late a minute after it", () => {
    const window = cancellationWindow(booking(), new Date(deadline.getTime() + 60_000));
    expect(window.verdict).toBe("too-late");
  });

  it("is too late exactly on it — 'up to 48 hours before' has run out", () => {
    // The boundary is `now < deadline`, so the instant itself is outside. A
    // guest arriving at exactly 48 hours is one second of clock skew from
    // either answer; what matters is that the rule is stated, not which way.
    expect(cancellationWindow(booking(), deadline).verdict).toBe("too-late");
  });

  it("reports the deadline it used, so the page can print it", () => {
    const window = cancellationWindow(booking(), new Date("2026-08-01T00:00:00Z"));
    expect(window.deadline?.toISOString()).toBe(deadline.toISOString());
    expect(window.departsAt?.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("keeps the deadline exactly 48 hours before departure", () => {
    const window = cancellationWindow(booking(), new Date("2026-08-01T00:00:00Z"));
    const gap = window.departsAt!.getTime() - window.deadline!.getTime();
    expect(gap).toBe(CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000);
  });

  it("says 'departed' once the tour has left, not 'too late'", () => {
    // Same refusal to the guest, a different sentence — and a different thing
    // to read in a log.
    const window = cancellationWindow(booking(), new Date("2026-08-15T12:00:00Z"));
    expect(window.verdict).toBe("departed");
    expect(window.hoursUntilDeparture).toBeLessThan(0);
  });

  it("counts hours down truncated, never rounded up past the deadline", () => {
    // 03:30 before departure must read as 3, not 4: a page that rounded up
    // could say "48 hours" while the deadline had already gone.
    const window = cancellationWindow(
      booking(),
      new Date("2026-08-15T05:30:00.000Z"),
    );
    expect(window.hoursUntilDeparture).toBe(3);
  });

  it("refuses a booking whose date cannot be parsed rather than guessing", () => {
    const window = cancellationWindow(booking({ date: "soon" }));
    expect(window.verdict).toBe("unknown");
    expect(window.deadline).toBeNull();
  });

  it("holds across the winter offset too", () => {
    // January: departure 10:00Z, so the deadline is 2026-01-13T10:00Z. If the
    // offset were applied as a constant, this case would be the one that broke.
    const january = booking({ date: "2026-01-15" });
    const window = cancellationWindow(january, new Date("2026-01-13T09:59:00Z"));
    expect(window.verdict).toBe("free");
    expect(
      cancellationWindow(january, new Date("2026-01-13T10:01:00Z")).verdict,
    ).toBe("too-late");
  });
});
