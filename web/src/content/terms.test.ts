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

  // A tour quote's page and receipt quote the tour's own terms instead.
  it("finds the tour's cancellation and weather sections in both languages", () => {
    for (const locale of ["pt", "en"] as const) {
      expect(termsSection("cancellation", locale).body[0]).toMatch(/48h/);
      expect(termsSection("weather", locale).heading).toMatch(/Mau tempo|Bad weather/);
    }
  });

  // A tour quote has no self-serve cancel link, so the section it quotes must
  // name the way its customer cancels: email or phone.
  it("tells a tour quote's customer to cancel by email or phone", () => {
    const pt = termsSection("cancellation", "pt").body.join(" ");
    const en = termsSection("cancellation", "en").body.join(" ");
    expect(pt).toContain("através de um orçamento, não há link");
    expect(pt).toContain("info@agorasim.pt ou telefone-nos");
    expect(en).toContain("through a quote, there is no link");
    expect(en).toContain("info@agorasim.pt or call us");
  });

  it("states when the balance is due and no withdrawal right for a dated event", () => {
    const pt = termsSection("events", "pt").body.join(" ");
    const en = termsSection("events", "en").body.join(" ");
    expect(pt).toContain("a qualquer momento depois do sinal");
    expect(pt).toContain("até à véspera do evento");
    expect(pt).toContain("15 dias antes do evento");
    expect(pt).toContain("não se aplica a casamentos e eventos");
    expect(en).toContain("at any time after the deposit");
    expect(en).toContain("due by the day before the event");
    expect(en).toContain("15 days before the event");
    expect(en).toContain("does not apply to weddings and events");
  });
});
