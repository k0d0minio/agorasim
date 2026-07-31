import { describe, expect, it } from "vitest";

import { toTelHref, toWhatsAppHref, toWhatsAppNumber } from "./phone";

describe("toTelHref", () => {
  it("keeps an explicit international prefix", () => {
    expect(toTelHref("+351 926 210 707")).toBe("tel:+351926210707");
  });

  it("strips punctuation a dialler ignores", () => {
    expect(toTelHref("(926) 210-707")).toBe("tel:926210707");
  });

  it("returns null for nothing dialable", () => {
    expect(toTelHref(null)).toBe(null);
    expect(toTelHref("")).toBe(null);
    expect(toTelHref("call me")).toBe(null);
    expect(toTelHref("12345")).toBe(null);
  });
});

describe("toWhatsAppNumber", () => {
  it("accepts a + prefixed number", () => {
    expect(toWhatsAppNumber("+44 7700 900123")).toBe("447700900123");
  });

  it("converts a 00 prefix to a bare international number", () => {
    expect(toWhatsAppNumber("0044 7700 900123")).toBe("447700900123");
  });

  it("infers Portugal for a nine-digit mobile", () => {
    expect(toWhatsAppNumber("926 210 707")).toBe("351926210707");
    expect(toWhatsAppNumber("919272077")).toBe("351919272077");
  });

  it("refuses to guess a country it cannot establish", () => {
    // A national number from somewhere else — deep-linking would reach a
    // stranger, so the UI shows no WhatsApp link at all.
    expect(toWhatsAppNumber("07700 900123")).toBe(null);
    expect(toWhatsAppNumber("212 555 0143")).toBe(null);
    expect(toWhatsAppNumber("+123")).toBe(null);
    expect(toWhatsAppNumber(null)).toBe(null);
  });
});

describe("toWhatsAppHref", () => {
  it("builds a wa.me link when the number resolves", () => {
    expect(toWhatsAppHref("+351926210707")).toBe("https://wa.me/351926210707");
  });

  it("is null when the number does not", () => {
    expect(toWhatsAppHref("07700 900123")).toBe(null);
  });
});
