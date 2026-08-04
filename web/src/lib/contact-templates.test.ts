import { describe, expect, it } from "vitest";

import {
  contactBody,
  contactSubject,
  mailtoHref,
  whatsAppHref,
} from "@/lib/contact-templates";

/**
 * The opening message an operator sends from a lead's page. It has to be in the
 * language the guest wrote in, and it has to survive being put in a URL — a
 * `mailto:` whose body breaks on the first accented character is worse than no
 * template at all.
 */
describe("contactSubject", () => {
  it("names the experience they asked about", () => {
    expect(
      contactSubject({ name: "Sofia Almeida", locale: "pt", experience: "Rural Saloia" }),
    ).toBe("Agorasim — Rural Saloia");
  });

  it("falls back to a general subject when nothing was chosen", () => {
    expect(contactSubject({ name: "Sofia", locale: "en", experience: null })).toBe(
      "Agorasim — your enquiry",
    );
  });
});

describe("contactBody", () => {
  it("greets in Portuguese for a Portuguese enquiry", () => {
    const body = contactBody({ name: "Sofia Almeida", locale: "pt", experience: null });
    expect(body).toContain("Olá Sofia,");
    expect(body).toContain("Obrigado pelo seu contacto.");
  });

  it("greets in English for an English one", () => {
    const body = contactBody({ name: "Anna Keller", locale: "en", experience: "Manzwine" });
    expect(body).toContain("Hello Anna,");
    expect(body).toContain("Thank you for your enquiry about Manzwine.");
  });

  it("uses the first name only", () => {
    // "Olá Sofia Almeida" reads like a form letter, which is what this exists
    // to avoid.
    expect(contactBody({ name: "Sofia Almeida", locale: "pt", experience: null })).toContain(
      "Olá Sofia,",
    );
  });

  it("defaults to Portuguese when the locale is unknown", () => {
    // Rows imported or created by hand can have no locale on them.
    expect(contactBody({ name: "Sofia", locale: null, experience: null })).toContain("Olá");
  });

  it("leaves room to write before the sign-off", () => {
    const body = contactBody({ name: "Sofia", locale: "pt", experience: null });
    expect(body).toMatch(/\n\n\n/);
    expect(body.trimEnd().endsWith("Agorasim")).toBe(true);
  });
});

describe("links", () => {
  it("encodes the subject and body into a mailto", () => {
    const href = mailtoHref("sofia@example.com", {
      name: "Sofia",
      locale: "pt",
      experience: "Rural Saloia",
    });

    expect(href.startsWith("mailto:sofia@example.com?")).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(params.get("subject")).toBe("Agorasim — Rural Saloia");
    expect(params.get("body")).toContain("Olá Sofia,");
  });

  it("encodes the message into a wa.me link", () => {
    const href = whatsAppHref("351912345678", {
      name: "Sofia",
      locale: "pt",
      experience: null,
    });

    expect(href.startsWith("https://wa.me/351912345678?text=")).toBe(true);
    // Accents and newlines both have to come back out intact.
    expect(decodeURIComponent(href.split("text=")[1])).toContain("Olá Sofia,");
  });
});
