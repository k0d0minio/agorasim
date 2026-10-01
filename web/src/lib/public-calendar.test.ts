import { describe, expect, it } from "vitest";

import { isInOnlineWindow, type PublicMonth } from "@/lib/availability";
import { firstOnlineDay, todayKey } from "@/lib/date-keys";
import {
  applyOnlineNotice,
  monthPair,
  summaryDay,
  summaryLine,
} from "@/lib/public-calendar";

/** A departure with a driver and every class of car free. */
const open = () => ({
  driversLeft: 1,
  vehiclesLeft: { "classic-small": 1, "classic-van": 1, touring: 1 },
});

/**
 * An October 2026 month as the server would have described it on `builtOn`:
 * every day from the first online day of that date is bookable, both
 * departures, and everything before it is off sale.
 */
function october(builtOn: string): PublicMonth {
  const first = firstOnlineDay(builtOn);
  const days = Array.from({ length: 31 }, (_, i) => {
    const date = `2026-10-${String(i + 1).padStart(2, "0")}`;
    const bookable = date >= first;
    const slot = (name: "morning" | "afternoon") =>
      bookable
        ? { slot: name, ...open() }
        : {
            slot: name,
            driversLeft: 0,
            vehiclesLeft: { "classic-small": 0, "classic-van": 0, touring: 0 },
          };
    return { date, bookable, slots: [slot("morning"), slot("afternoon")] };
  });
  return {
    month: "2026-10",
    label: "Outubro de 2026",
    grid: [],
    days,
    hasOpenings: days.some((day) => day.bookable),
  };
}

const dayOf = (months: PublicMonth[], date: string) =>
  months.flatMap((month) => month.days).find((day) => day.date === date);

describe("the browser's notice check (D-3)", () => {
  it("crosses out tomorrow on a page built yesterday, and keeps the day after", () => {
    // 00:30 in Lisbon on 15 October (summer time, UTC+1) — still the 14th in UTC.
    const today = todayKey(new Date("2026-10-14T23:30:00Z"));
    expect(today).toBe("2026-10-15");

    // The cached page was described on the 14th, so it still offers the 16th.
    const stale = [october("2026-10-14")];
    expect(dayOf(stale, "2026-10-16")?.bookable).toBe(true);

    const fresh = applyOnlineNotice(stale, today);
    const tomorrow = dayOf(fresh, "2026-10-16");
    expect(tomorrow?.bookable).toBe(false);
    for (const slot of tomorrow?.slots ?? []) {
      expect(slot.driversLeft).toBe(0);
      expect(Object.values(slot.vehiclesLeft).every((free) => free === 0)).toBe(true);
    }
    expect(dayOf(fresh, "2026-10-17")?.bookable).toBe(true);
  });

  it("offers exactly the days the server's online window accepts", () => {
    const today = "2026-10-15";
    const fresh = applyOnlineNotice([october("2026-10-01")], today);
    for (const day of fresh[0].days) {
      expect(day.bookable).toBe(isInOnlineWindow(day.date, today));
    }
  });

  it("only removes: a day the payload had off sale stays off sale", () => {
    const fresh = applyOnlineNotice([october("2026-10-20")], "2026-10-15");
    expect(dayOf(fresh, "2026-10-21")?.bookable).toBe(false);
    expect(dayOf(fresh, "2026-10-22")?.bookable).toBe(true);
  });

  it("leaves an up-to-date payload untouched", () => {
    const months = [october("2026-10-15")];
    expect(applyOnlineNotice(months, "2026-10-15")).toBe(months);
  });

  it("recomputes whether the month still has openings", () => {
    const fresh = applyOnlineNotice([october("2026-10-01")], "2026-10-31");
    expect(fresh[0].hasOpenings).toBe(false);
  });
});

describe("the two-month view", () => {
  it("shows the month in focus and the next one", () => {
    expect(monthPair(0, 6)).toEqual({ first: 0, second: 1 });
    expect(monthPair(3, 6)).toEqual({ first: 3, second: 4 });
  });

  it("ends on the last two months, never past the window", () => {
    expect(monthPair(4, 6)).toEqual({ first: 4, second: 5 });
    expect(monthPair(5, 6)).toEqual({ first: 4, second: 5 });
  });

  it("shows one month when there is only one", () => {
    expect(monthPair(0, 1)).toEqual({ first: 0, second: null });
  });
});

describe("the summary line", () => {
  it("reads the day without a year, in both languages", () => {
    expect(summaryDay("2026-10-14", "pt")).toBe("Quarta, 14 de outubro");
    expect(summaryDay("2026-10-14", "en")).toBe("Wednesday, 14 October");
  });

  it("adds the departure when one is chosen", () => {
    expect(summaryLine("2026-10-14", "pt", "10h00")).toBe("Quarta, 14 de outubro · 10h00");
    expect(summaryLine("2026-10-14", "en", "10:00")).toBe("Wednesday, 14 October · 10:00");
    expect(summaryLine("2026-10-14", "pt", "manhã")).toBe("Quarta, 14 de outubro · manhã");
    expect(summaryLine("2026-10-14", "en", "morning")).toBe("Wednesday, 14 October · morning");
  });

  it("is the day alone before a time is chosen", () => {
    expect(summaryLine("2026-10-14", "pt", null)).toBe("Quarta, 14 de outubro");
    expect(summaryLine("2026-10-14", "en")).toBe("Wednesday, 14 October");
  });

  it("starts the week on Monday and ends it on Sunday", () => {
    expect(summaryDay("2026-10-12", "pt")).toBe("Segunda, 12 de outubro");
    expect(summaryDay("2026-10-18", "en")).toBe("Sunday, 18 October");
  });
});
