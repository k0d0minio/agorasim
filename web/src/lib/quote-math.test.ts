import { describe, expect, it } from "vitest";

import { balanceDueKey } from "./quote-math";
import { balanceDueDate } from "./quotes";

/**
 * The builder's live preview computes the balance due date in the browser with
 * `balanceDueKey`; the server writes it with `balanceDueDate`. They are two
 * functions for one date, so this is what keeps them one answer.
 */
describe("balanceDueKey", () => {
  it.each(["2026-08-15", "2026-03-10", "2026-11-05", "2027-01-10", "2028-03-14"])(
    "agrees with the server for an event on %s",
    (eventDate) => {
      expect(balanceDueKey(eventDate)).toBe(balanceDueDate(eventDate));
    },
  );

  it("answers nothing for a date that is not a calendar day", () => {
    expect(balanceDueKey("")).toBeNull();
    expect(balanceDueKey("2026-02-31")).toBeNull();
    expect(balanceDueKey("15/08/2026")).toBeNull();
  });
});
