import { describe, expect, it } from "vitest";

import { bookingBarTarget } from "@/lib/booking-bar-target";

describe("bookingBarTarget", () => {
  it("points the weddings and events pages at their own quote form", () => {
    expect(bookingBarTarget("/pt/casamentos", "pt")).toEqual({
      kind: "quote",
      href: "/pt/casamentos#orcamento",
    });
    expect(bookingBarTarget("/en/eventos", "en")).toEqual({
      kind: "quote",
      href: "/en/eventos#orcamento",
    });
    expect(bookingBarTarget("/pt/eventos/", "pt")).toMatchObject({ kind: "quote" });
  });

  it("is hidden on a couple's quote page and on the booking page", () => {
    expect(bookingBarTarget("/pt/orcamento/abcDEF123_-xyz", "pt")).toEqual({ kind: "hidden" });
    expect(bookingBarTarget("/en/orcamento/abcDEF123_-xyz", "en")).toEqual({ kind: "hidden" });
    expect(bookingBarTarget("/pt/reservar", "pt")).toEqual({ kind: "hidden" });
  });

  it("keeps pointing everywhere else at the tour checkout", () => {
    for (const path of ["/pt", "/en/experiencias", "/pt/sobre", "/pt/experiencias/rural-saloia"]) {
      expect(bookingBarTarget(path, path.startsWith("/en") ? "en" : "pt")).toEqual({
        kind: "booking",
      });
    }
  });
});
