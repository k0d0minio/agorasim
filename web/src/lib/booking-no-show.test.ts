import { describe, expect, it } from "vitest";

import { canMarkNoShow } from "./booking-no-show";

/** The rule behind "Marcar falta" — who can have missed a tour, and when. */
describe("canMarkNoShow", () => {
  /** 23:30 UTC on 14 August is already the 15th in Lisbon (WEST). */
  const LATE_EVENING = new Date("2026-08-14T23:30:00Z");

  const booking = (overrides: Partial<Parameters<typeof canMarkNoShow>[0]> = {}) => ({
    status: "confirmed" as const,
    date: "2026-08-15",
    noShowAt: null,
    ...overrides,
  });

  it("allows a paid booking on the day of the tour and after, on Lisbon's calendar", () => {
    expect(canMarkNoShow(booking(), LATE_EVENING)).toBe(true);
    expect(canMarkNoShow(booking({ date: "2026-08-01" }), LATE_EVENING)).toBe(true);
  });

  it("refuses a tour that has not happened yet", () => {
    expect(canMarkNoShow(booking({ date: "2026-08-16" }), LATE_EVENING)).toBe(false);
    // The same instant is still the 14th on the server's UTC calendar — Lisbon decides.
    expect(canMarkNoShow(booking(), new Date("2026-08-14T22:30:00Z"))).toBe(false);
  });

  it("refuses anything but a paid booking, and one already marked", () => {
    for (const status of ["pending", "cancelled", "expired", "refunded"] as const) {
      expect(canMarkNoShow(booking({ status }), LATE_EVENING)).toBe(false);
    }
    expect(canMarkNoShow(booking({ noShowAt: new Date() }), LATE_EVENING)).toBe(false);
  });
});
