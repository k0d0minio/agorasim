import { describe, expect, it } from "vitest";

import { formatPrice, parsePriceInput, priceInputValue } from "@/lib/money";

/**
 * Money, in and out.
 *
 * Small surface, and every one of these is a way to charge somebody the wrong
 * amount or to read a typo as a free tour. The decimal-separator cases are not
 * hypothetical: this is a Portuguese business, the price field is filled in on
 * a phone, and the keyboard offers whichever separator it feels like.
 */

describe("parsePriceInput", () => {
  it("reads what an operator actually types", () => {
    expect(parsePriceInput("145")).toBe(14500);
    // Portugal writes the decimal with a comma, and the phone keyboard offers
    // whichever it feels like.
    expect(parsePriceInput("145,50")).toBe(14550);
    expect(parsePriceInput("145.50")).toBe(14550);
    expect(parsePriceInput(" 145 ")).toBe(14500);
    expect(parsePriceInput("0.99")).toBe(99);
  });

  it("rounds a stray third digit to the nearest cent", () => {
    expect(parsePriceInput("145.505")).toBe(14551);
  });

  it("treats blank and unreadable as 'no price', never as free", () => {
    for (const value of ["", "   ", "free", "€145", "1e3", "-10", "0", "145,5,5"]) {
      expect(parsePriceInput(value)).toBeNull();
    }
  });

  it("round-trips through the field it fills", () => {
    expect(priceInputValue(parsePriceInput("145"))).toBe("145");
    expect(priceInputValue(parsePriceInput("145,50"))).toBe("145.50");
    expect(priceInputValue(null)).toBe("");
    expect(priceInputValue(0)).toBe("");
  });
});

describe("formatPrice", () => {
  it("drops the cents when there are none, and keeps them when there are", () => {
    expect(formatPrice(14500, "en")).toBe("€145");
    expect(formatPrice(14550, "en")).toBe("€145.50");
  });

  it("formats in the reader's language", () => {
    // pt-PT puts the symbol after the amount and uses a comma.
    expect(formatPrice(14550, "pt")).toContain("145,50");
  });
});
