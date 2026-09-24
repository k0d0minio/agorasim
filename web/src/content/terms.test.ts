import { describe, expect, it } from "vitest";

import { TERMS_VERSION, termsContent, termsSection } from "./terms";

describe("TERMS_VERSION", () => {
  // A quote is stamped with this; the couple read the date the page prints.
  // The two are one fact written twice, so the test is what keeps them one.
  it("is the day the terms page says it was last updated", () => {
    const day = new Date(`${TERMS_VERSION}T00:00:00Z`);
    const format = (locale: string) =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(day);

    expect(format("pt-PT")).toBe(termsContent.lastUpdated.pt);
    expect(format("en-GB")).toBe(termsContent.lastUpdated.en);
  });
});

describe("termsSection", () => {
  // The quote page and the quote receipts quote these two sections verbatim,
  // found by key — a content edit that drops a key must fail here, not render
  // an empty terms block above a pay button.
  it("finds the events and complaints sections in both languages", () => {
    for (const locale of ["pt", "en"] as const) {
      expect(termsSection("events", locale).heading).toMatch(/Casamentos|Weddings/);
      expect(termsSection("complaints", locale).heading).toMatch(/Reclamações|Complaints/);
    }
  });

  it("states the balance by link and no withdrawal right for a dated event", () => {
    const pt = termsSection("events", "pt").body.join(" ");
    const en = termsSection("events", "en").body.join(" ");
    expect(pt).toContain("14 dias antes do evento");
    expect(pt).toContain("não se aplica a casamentos e eventos");
    expect(en).toContain("14 days before the event");
    expect(en).toContain("does not apply to weddings and events");
  });
});
