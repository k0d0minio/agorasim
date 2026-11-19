import { describe, expect, it } from "vitest";

import { formatDay, maskDayFirst, parseDayFirst } from "@/lib/date-keys";

/*
 * The date field of the wedding and event forms (JAM-320). The field was a
 * native date field, which a browser draws in the browser's own language. It
 * is now text in the order day, month, year, and these are its two readers.
 */
describe("parseDayFirst", () => {
  it("reads a date that a person typed day first", () => {
    expect(parseDayFirst("12/06/2027")).toBe("2027-06-12");
    expect(parseDayFirst(" 1/6/2027 ")).toBe("2027-06-01");
    expect(parseDayFirst("12-06-2027")).toBe("2027-06-12");
    expect(parseDayFirst("12.06.2027")).toBe("2027-06-12");
  });

  it("never reads the first number as the month", () => {
    expect(parseDayFirst("06/12/2027")).toBe("2027-12-06");
    // The 13th month does not exist, so this is not a date.
    expect(parseDayFirst("06/13/2027")).toBeNull();
  });

  it("passes a date key, which a page cached with the native field posts", () => {
    expect(parseDayFirst("2027-06-12")).toBe("2027-06-12");
  });

  it("gives null for a day that does not exist and for text that is not a date", () => {
    expect(parseDayFirst("31/02/2027")).toBeNull();
    expect(parseDayFirst("12/06/27")).toBeNull();
    expect(parseDayFirst("junho de 2027")).toBeNull();
    expect(parseDayFirst("")).toBeNull();
  });
});

describe("maskDayFirst", () => {
  /** Type the characters one at a time, as a keyboard does. */
  function type(chars: string): string {
    let value = "";
    for (const char of chars) value = maskDayFirst(value + char, value);
    return value;
  }

  it("puts the slashes in for a person who types only digits", () => {
    expect(type("1")).toBe("1");
    expect(type("12")).toBe("12/");
    expect(type("1206")).toBe("12/06/");
    expect(type("12062027")).toBe("12/06/2027");
  });

  it("stops at eight digits", () => {
    expect(type("120620279")).toBe("12/06/2027");
  });

  it("pads a part that the person closed with a separator", () => {
    expect(type("1/6/2027")).toBe("01/06/2027");
    expect(type("12/06/2027")).toBe("12/06/2027");
  });

  it("does not put a deleted slash back", () => {
    expect(maskDayFirst("12", "12/")).toBe("12");
    expect(maskDayFirst("12/06", "12/06/")).toBe("12/06");
    expect(maskDayFirst("12/", "12/0")).toBe("12/");
  });

  it("reads a pasted date", () => {
    expect(maskDayFirst("12/06/2027")).toBe("12/06/2027");
    expect(maskDayFirst("12.06.2027")).toBe("12/06/2027");
  });
});

describe("formatDay", () => {
  it("writes the day in words, with the weekday", () => {
    expect(formatDay("2027-06-12", "pt")).toBe("sábado, 12 de junho de 2027");
    expect(formatDay("2027-06-12", "en")).toBe("Saturday, 12 June 2027");
  });

  it("gives back text that is not a date key", () => {
    expect(formatDay("15 de agosto", "pt")).toBe("15 de agosto");
  });
});
