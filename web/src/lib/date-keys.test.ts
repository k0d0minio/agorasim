import { describe, expect, it } from "vitest";

import { formatDay, maskDayInput, parseDayInput } from "@/lib/date-keys";

describe("parseDayInput", () => {
  it("reads a date day first, with any of the separators", () => {
    for (const value of ["12/06/2027", "12.06.2027", "12-06-2027", "12 06 2027", "12062027"]) {
      expect(parseDayInput(value)).toBe("2027-06-12");
    }
  });

  it("pads a one-digit day and month", () => {
    expect(parseDayInput("1/6/2027")).toBe("2027-06-01");
  });

  it("passes a YYYY-MM-DD key as it is", () => {
    expect(parseDayInput("2027-06-12")).toBe("2027-06-12");
  });

  it("refuses a day that does not exist, and a month-first US date", () => {
    for (const value of ["31/02/2027", "06/13/2027", "12/06", "amanhã", ""]) {
      expect(parseDayInput(value)).toBe(null);
    }
  });
});

describe("maskDayInput", () => {
  it("adds the slashes while the guest types digits", () => {
    expect(maskDayInput("1")).toBe("1");
    expect(maskDayInput("12")).toBe("12");
    expect(maskDayInput("120")).toBe("12/0");
    expect(maskDayInput("12/06")).toBe("12/06");
    expect(maskDayInput("12/062")).toBe("12/06/2");
    expect(maskDayInput("12062027")).toBe("12/06/2027");
    expect(maskDayInput("12/06/20279")).toBe("12/06/2027");
  });

  it("leaves a value with other separators alone", () => {
    expect(maskDayInput("12.06.2027")).toBe("12.06.2027");
  });
});

describe("formatDay", () => {
  it("writes the day in words, in both languages", () => {
    expect(formatDay("2027-06-12", "pt")).toBe("sábado, 12 de junho de 2027");
    expect(formatDay("2027-06-12", "en")).toMatch(/^Saturday,? 12 June 2027$/);
  });

  it("keeps a value that is not a key", () => {
    expect(formatDay("15 de agosto", "pt")).toBe("15 de agosto");
  });
});
