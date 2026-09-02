import { describe, expect, it } from "vitest";

import {
  cancellationWindow,
  departureInstant,
  formatDeadline,
  FREE_CANCELLATION_HOURS,
} from "./cancellation-window";

/**
 * The 48-hour promise.
 *
 * Everything here is a way of getting the boundary wrong that a guest would
 * feel: an hour of DST drift, a deadline measured from midnight instead of from
 * the departure, an afternoon tour treated like a morning one. Each of those is
 * either free cancellation the business did not offer or free cancellation it
 * refused, and both are the kind of mistake somebody phones about.
 *
 * Portugal is WET (UTC+0) in winter and WEST (UTC+1) in summer, which is why
 * every expectation below is written as an explicit UTC instant.
 */

describe("departureInstant", () => {
  it("puts the morning departure at 10:00 Lisbon, UTC+1 in summer", () => {
    expect(departureInstant("2026-08-15", "morning")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("puts the afternoon departure at 14:00 Lisbon", () => {
    expect(departureInstant("2026-08-15", "afternoon")?.toISOString()).toBe(
      "2026-08-15T13:00:00.000Z",
    );
  });

  it("follows the clock back in winter, when Lisbon is UTC", () => {
    expect(departureInstant("2026-01-15", "morning")?.toISOString()).toBe(
      "2026-01-15T10:00:00.000Z",
    );
    expect(departureInstant("2026-01-15", "afternoon")?.toISOString()).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });

  // The day the clocks go forward (last Sunday of March). The naive
  // "subtract the offset once" conversion reads the offset on the wrong side of
  // the transition and lands an hour out.
  it("is right on the day the clocks change", () => {
    expect(departureInstant("2026-03-29", "morning")?.toISOString()).toBe(
      "2026-03-29T09:00:00.000Z",
    );
    // And the day the clocks go back.
    expect(departureInstant("2026-10-25", "morning")?.toISOString()).toBe(
      "2026-10-25T10:00:00.000Z",
    );
  });

  /**
   * `full_day` is dead in practice — the 0012 migration moved its rows — but
   * the enum value still exists, so it must not fall through to `undefined`.
   * The earlier hour is the conservative answer: it closes the window sooner.
   */
  it("gives an unknown slot the earlier departure rather than no departure", () => {
    expect(departureInstant("2026-08-15", "full_day")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
    expect(departureInstant("2026-08-15", "whatever")?.toISOString()).toBe(
      "2026-08-15T09:00:00.000Z",
    );
  });

  it("refuses a date that is not a day", () => {
    expect(departureInstant("2026-02-31", "morning")).toBeNull();
    expect(departureInstant("not-a-date", "morning")).toBeNull();
  });
});

describe("cancellationWindow", () => {
  const booking = { date: "2026-08-15", slot: "morning" };

  it("measures the deadline from the departure, not from midnight", () => {
    const result = cancellationWindow(booking, new Date("2026-08-01T00:00:00Z"));

    expect(result?.departsAt.toISOString()).toBe("2026-08-15T09:00:00.000Z");
    expect(result?.deadline.toISOString()).toBe("2026-08-13T09:00:00.000Z");
  });

  /**
   * The failure the day-only version of this would produce: 09:00 on the 13th
   * is 48 hours before *midnight* on the 15th and 48 hours *minus one hour*
   * before the tour. The guest is inside the window and must be told so.
   */
  it("closes an hour before a midnight-based deadline would", () => {
    const result = cancellationWindow(booking, new Date("2026-08-13T09:30:00Z"));

    expect(result?.open).toBe(false);
  });

  it("is open right up to the boundary, and inclusive of it", () => {
    expect(
      cancellationWindow(booking, new Date("2026-08-13T08:59:59Z"))?.open,
    ).toBe(true);
    // "Up to 48 hours before" — exactly 48 hours is still up to 48 hours.
    expect(
      cancellationWindow(booking, new Date("2026-08-13T09:00:00Z"))?.open,
    ).toBe(true);
    expect(
      cancellationWindow(booking, new Date("2026-08-13T09:00:01Z"))?.open,
    ).toBe(false);
  });

  it("is closed once the tour has left", () => {
    expect(
      cancellationWindow(booking, new Date("2026-08-16T00:00:00Z"))?.open,
    ).toBe(false);
  });

  it("gives the afternoon departure four more hours than the morning one", () => {
    const morning = cancellationWindow(booking, new Date("2026-08-01T00:00:00Z"));
    const afternoon = cancellationWindow(
      { date: "2026-08-15", slot: "afternoon" },
      new Date("2026-08-01T00:00:00Z"),
    );

    expect(
      afternoon!.deadline.getTime() - morning!.deadline.getTime(),
    ).toBe(4 * 60 * 60 * 1000);
  });

  it("is exactly the promised number of hours wide", () => {
    const result = cancellationWindow(booking, new Date("2026-08-01T00:00:00Z"))!;

    expect(result.departsAt.getTime() - result.deadline.getTime()).toBe(
      FREE_CANCELLATION_HOURS * 60 * 60 * 1000,
    );
  });

  // "We cannot tell when this leaves" must never be readable as "yes".
  it("refuses to answer for a booking whose date is unreadable", () => {
    expect(cancellationWindow({ date: "2026-02-31", slot: "morning" })).toBeNull();
  });
});

describe("formatDeadline", () => {
  it("says the deadline in Lisbon time, not in UTC", () => {
    // 09:00Z in August is 10:00 in Sintra. A guest told 09:00 has been given an
    // hour that does not exist on their side of the promise.
    const pt = formatDeadline(new Date("2026-08-13T09:00:00Z"), "pt");

    expect(pt).toContain("10:00");
    expect(pt).toContain("2026");
  });

  it("speaks both languages", () => {
    const at = new Date("2026-08-13T09:00:00Z");

    expect(formatDeadline(at, "pt")).toContain("agosto");
    expect(formatDeadline(at, "en")).toContain("August");
  });
});
