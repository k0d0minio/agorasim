import { describe, expect, it } from "vitest";
import { isValidNif, parseTaxId, TAX_ID_MAX_LENGTH } from "@/lib/tax-id";

describe("isValidNif", () => {
  it("accepts NIFs with a right check digit", () => {
    expect(isValidNif("123456789")).toBe(true);
    expect(isValidNif("501964843")).toBe(true);
    // A remainder below 2 gives the check digit 0.
    expect(isValidNif("100000010")).toBe(true);
  });

  it("refuses a wrong check digit and a wrong shape", () => {
    expect(isValidNif("123456780")).toBe(false);
    expect(isValidNif("12345678")).toBe(false);
    expect(isValidNif("12345678a")).toBe(false);
  });
});

describe("parseTaxId", () => {
  it("reads an empty field as no tax number", () => {
    expect(parseTaxId("")).toEqual({ ok: true, value: null });
    expect(parseTaxId("   ")).toEqual({ ok: true, value: null });
    expect(parseTaxId(undefined)).toEqual({ ok: true, value: null });
  });

  it("stores a Portuguese NIF as its nine digits", () => {
    expect(parseTaxId("123456789")).toEqual({ ok: true, value: "123456789" });
    expect(parseTaxId("PT 123 456 789")).toEqual({ ok: true, value: "123456789" });
    expect(parseTaxId("pt123456789")).toEqual({ ok: true, value: "123456789" });
  });

  it("refuses a Portuguese NIF with a wrong check digit", () => {
    expect(parseTaxId("123456780")).toEqual({ ok: false });
    expect(parseTaxId("PT123456780")).toEqual({ ok: false });
  });

  it("accepts a foreign tax number as free text", () => {
    expect(parseTaxId("DE 123456789 0")).toEqual({ ok: true, value: "DE1234567890" });
    expect(parseTaxId("fr12-345678901")).toEqual({ ok: true, value: "FR12345678901" });
  });

  it("refuses a foreign tax number that is too long", () => {
    expect(parseTaxId("X".repeat(TAX_ID_MAX_LENGTH + 1))).toEqual({ ok: false });
  });
});
