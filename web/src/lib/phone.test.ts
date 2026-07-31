import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toTelHref, toWhatsAppHref, toWhatsAppNumber } from "./phone.ts";

describe("toTelHref", () => {
  it("keeps an explicit international prefix", () => {
    assert.equal(toTelHref("+351 926 210 707"), "tel:+351926210707");
  });

  it("strips punctuation a dialler ignores", () => {
    assert.equal(toTelHref("(926) 210-707"), "tel:926210707");
  });

  it("returns null for nothing dialable", () => {
    assert.equal(toTelHref(null), null);
    assert.equal(toTelHref(""), null);
    assert.equal(toTelHref("call me"), null);
    assert.equal(toTelHref("12345"), null);
  });
});

describe("toWhatsAppNumber", () => {
  it("accepts a + prefixed number", () => {
    assert.equal(toWhatsAppNumber("+44 7700 900123"), "447700900123");
  });

  it("converts a 00 prefix to a bare international number", () => {
    assert.equal(toWhatsAppNumber("0044 7700 900123"), "447700900123");
  });

  it("infers Portugal for a nine-digit mobile", () => {
    assert.equal(toWhatsAppNumber("926 210 707"), "351926210707");
    assert.equal(toWhatsAppNumber("919272077"), "351919272077");
  });

  it("refuses to guess a country it cannot establish", () => {
    // A national number from somewhere else — deep-linking would reach a
    // stranger, so the UI shows no WhatsApp link at all.
    assert.equal(toWhatsAppNumber("07700 900123"), null);
    assert.equal(toWhatsAppNumber("212 555 0143"), null);
    assert.equal(toWhatsAppNumber("+123"), null);
    assert.equal(toWhatsAppNumber(null), null);
  });
});

describe("toWhatsAppHref", () => {
  it("builds a wa.me link when the number resolves", () => {
    assert.equal(toWhatsAppHref("+351926210707"), "https://wa.me/351926210707");
  });

  it("is null when the number does not", () => {
    assert.equal(toWhatsAppHref("07700 900123"), null);
  });
});
