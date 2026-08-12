import { describe, expect, it } from "vitest";

import {
  guestConfirmationEmail,
  teamNotificationEmail,
  type BookingEmailFacts,
} from "@/lib/booking-emails";
import { emailPalette } from "@/lib/email-layout";
import { site } from "@/content/site";

/**
 * The two emails a paid booking causes.
 *
 * These are the only messages the business sends automatically, and every
 * failure mode here is one a guest sees: a `{name}` that never got substituted,
 * a blank "Extras:" line that reads like something broke, a Portuguese
 * confirmation sent to someone who booked in English, a reply-to that goes
 * nowhere a person reads — or an apostrophe in a name that closes an attribute
 * and takes the rest of the email with it.
 */

function facts(overrides: Partial<BookingEmailFacts> = {}): BookingEmailFacts {
  return {
    ref: "BK-A1B2C3",
    guestName: "Sofia Almeida",
    guestEmail: "sofia@example.com",
    guestPhone: "+351912345678",
    locale: "pt",
    date: "sábado, 15 de agosto de 2026",
    experience: "Rural Saloia",
    addOns: ["Manzwine"],
    partySize: 2,
    total: "€340",
    adminUrl: "https://agorasim.pt/admin/sales/abc",
    ...overrides,
  };
}

describe("guestConfirmationEmail", () => {
  it("substitutes every placeholder — no stray braces reach a guest", () => {
    const message = guestConfirmationEmail(facts());
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
    // The HTML carries CSS, which is full of braces; the copy inside it is not.
    expect(message.html).not.toMatch(/\{(name|ref|experience|date|party|total|site)\}/);
  });

  it("carries the facts the guest will check it for, in both parts", () => {
    const message = guestConfirmationEmail(facts());
    expect(message.to).toEqual(["sofia@example.com"]);
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("Sofia Almeida");
      expect(part).toContain("BK-A1B2C3");
      expect(part).toContain("sábado, 15 de agosto de 2026");
      expect(part).toContain("€340");
      expect(part).toContain("Manzwine");
    }
  });

  it("writes in the language they booked in", () => {
    const pt = guestConfirmationEmail(facts({ locale: "pt" }));
    const en = guestConfirmationEmail(facts({ locale: "en" }));

    expect(pt.subject).toContain("Reserva confirmada");
    expect(en.subject).toContain("Booking confirmed");

    expect(pt.text).toContain("Total pago");
    expect(en.text).toContain("Total paid");

    expect(pt.html).toContain("Total pago");
    expect(en.html).toContain("Total paid");
    // Screen readers and Gmail's translate prompt both read this attribute.
    expect(pt.html).toContain('lang="pt"');
    expect(en.html).toContain('lang="en"');
  });

  it("omits the add-ons line entirely when there are none", () => {
    // Not an empty "Extras:" line — a confirmation with a blank field on it
    // reads like something went wrong with the booking.
    const message = guestConfirmationEmail(facts({ addOns: [] }));
    expect(message.text).not.toContain("Extras:");
    expect(message.text).not.toMatch(/\n\n\n/);
    expect(message.html).not.toContain("Extras");
  });

  it("escapes anything a guest could have typed", () => {
    // A name is free text on a public form. Unescaped, this closes the
    // paragraph it lands in and everything after it is somebody else's markup.
    const message = guestConfirmationEmail(
      facts({ guestName: `<script>alert("x")</script> O'Brien` }),
    );
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("O&#39;Brien");
    // The text part is not markup and needs no escaping.
    expect(message.text).toContain("O'Brien");
  });

  it("is a complete HTML document wearing the site's palette", () => {
    const message = guestConfirmationEmail(facts());
    expect(message.html).toMatch(/^<!DOCTYPE html>/);
    expect(message.html).toContain("</html>");
    expect(message.html).toContain(emailPalette.primary);
    expect(message.html).toContain(emailPalette.page);
    // Absolute, because a mail client has no origin to resolve a path against.
    expect(message.html).toContain(`${site.domain}/images/logo.png`);
  });

  it("replies to a person, not to the sending address", () => {
    expect(guestConfirmationEmail(facts()).replyTo).toBe(site.email);
  });

  it("gives them both phone numbers, dialable", () => {
    const message = guestConfirmationEmail(facts());
    for (const contact of site.contacts) {
      expect(message.text).toContain(contact.phoneDisplay);
      expect(message.html).toContain(`tel:${contact.phone}`);
    }
  });
});

describe("teamNotificationEmail", () => {
  const recipients = ["diogo@agorasim.pt", "rita@agorasim.pt"];

  it("goes to everyone configured, with the guest's details on it", () => {
    const message = teamNotificationEmail(facts(), recipients);
    expect(message.to).toEqual(recipients);
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("sofia@example.com");
      expect(part).toContain("+351912345678");
      expect(part).toContain("https://agorasim.pt/admin/sales/abc");
    }
  });

  it("stays Portuguese even when the guest booked in English", () => {
    // It is an internal note to two Portuguese speakers; translating it would
    // only mean two versions of an operational message to keep in step.
    const message = teamNotificationEmail(facts({ locale: "en" }), recipients);
    expect(message.subject).toContain("Nova reserva paga");
    expect(message.text).toContain("Idioma: EN");
    expect(message.html).toContain('lang="pt"');
    expect(message.html).toContain("EN");
  });

  it("makes the guest reachable in one tap", () => {
    const message = teamNotificationEmail(facts(), recipients);
    expect(message.html).toContain("mailto:sofia@example.com");
    expect(message.html).toContain("tel:+351912345678");
  });

  it("replies to the guest — the most likely next action", () => {
    expect(teamNotificationEmail(facts(), recipients).replyTo).toBe("sofia@example.com");
  });

  it("says so plainly when there is no phone number", () => {
    const message = teamNotificationEmail(facts({ guestPhone: null }), recipients);
    expect(message.text).toContain("Telefone: —");
    // And does not offer a `tel:` link to nothing.
    expect(message.html).not.toContain("tel:—");
  });

  it("substitutes every placeholder", () => {
    const message = teamNotificationEmail(facts({ addOns: [] }), recipients);
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
    expect(message.html).not.toMatch(/\{(name|ref|experience|date|party|total|adminUrl)\}/);
  });
});
