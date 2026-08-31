import { describe, expect, it } from "vitest";

import { formatPostDate, isoDate, readingMinutes } from "@/lib/blog-format";

describe("formatPostDate", () => {
  it("writes the date the way each language writes it", () => {
    expect(formatPostDate("2026-07-14", "pt")).toBe("14 de julho de 2026");
    expect(formatPostDate("2026-07-14", "en")).toBe("14 July 2026");
  });

  it("reads the date at midday UTC, so no timezone moves it a day", () => {
    // The bug this prevents: `new Date("2026-07-14")` is midnight UTC, which is
    // the 13th for any reader west of Greenwich — including, on a bad day, the
    // build machine rendering the card.
    expect(formatPostDate("2026-01-01", "en")).toBe("1 January 2026");
  });
});

describe("readingMinutes", () => {
  it("counts the words, not the paragraphs", () => {
    const paragraph = Array.from({ length: 200 }, () => "palavra").join(" ");
    expect(readingMinutes([paragraph])).toBe(1);
    expect(readingMinutes([paragraph, paragraph, paragraph])).toBe(3);
  });

  it("never claims an article takes no time at all", () => {
    // Rounding a short post to "0 min de leitura" reads as an error, not as a
    // short post.
    expect(readingMinutes([])).toBe(1);
    expect(readingMinutes(["Três palavras aqui."])).toBe(1);
  });
});

describe("isoDate", () => {
  it("narrows both column shapes to the same day", () => {
    // `timestamp` columns arrive as Dates, `date` columns as strings.
    expect(isoDate(new Date("2026-07-14T09:30:00Z"))).toBe("2026-07-14");
    expect(isoDate("2026-07-14")).toBe("2026-07-14");
    expect(isoDate("2026-07-14T00:00:00.000Z")).toBe("2026-07-14");
  });

  it("reads an absent or unusable date as no date", () => {
    expect(isoDate(null)).toBeNull();
    expect(isoDate(undefined)).toBeNull();
    expect(isoDate("")).toBeNull();
    expect(isoDate("14/07/2026")).toBeNull();
    expect(isoDate(new Date("nonsense"))).toBeNull();
  });
});
