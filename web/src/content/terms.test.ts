import { describe, expect, it } from "vitest";

import { TERMS_VERSION, termsContent } from "./terms";

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
