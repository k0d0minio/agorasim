import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  guestConfirmationEmail,
  teamNotificationEmail,
  type BookingEmailFacts,
} from "@/lib/booking-emails";
import { emailPalette } from "@/lib/email-layout";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site-origin";

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
    experience: "Rural Saloia — experiência privada",
    departure: "Manhã · 10h00",
    departureTimeFollows: false,
    meetingPoint: {
      address: "Av. Mário Firmino Miguel, Sintra (Portela de Sintra)",
      mapsUrl: "https://maps.app.goo.gl/zufzHo8QpmspvzqC9",
    },
    addOns: ["Manzwine"],
    partySize: 2,
    partyLabel: "2 adultos",
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
    // Absolute, because a mail client has no origin to resolve a path against —
    // and against the origin actually serving this deployment, not `site.domain`.
    expect(message.html).toContain(`${siteUrl()}/images/logo.png`);
  });

  /**
   * `site.domain` is the address the site *claims* — the canonical every
   * `<link rel="canonical">`, hreflang pair and JSON-LD `@id` has to carry. It
   * is not, until Diogo & Rita recover the domain, an address that answers:
   * `agorasim.pt` returns 403 to everyone. An email resolved against it ships a
   * broken masthead and a footer link into a dead page — on every confirmation
   * the client sees while testing the sandbox, which is exactly when the site
   * has to look like it works.
   *
   * So the emails follow the deployment's own origin. These pin that, and they
   * are written so they keep passing once `NEXT_PUBLIC_SITE_URL` becomes
   * `https://agorasim.pt` and the two answers converge again.
   */
  describe("links resolve against the origin serving this deployment", () => {
    const ORIGIN = "https://preview.example.com";
    const team = ["diogo@agorasim.pt"];

    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("loads the masthead logo from that origin", () => {
      expect(guestConfirmationEmail(facts()).html).toContain(`${ORIGIN}/images/logo.png`);
    });

    it("points the footer link there, and labels it with the same host", () => {
      const html = guestConfirmationEmail(facts()).html;
      expect(html).toContain(`href="${ORIGIN}"`);
      expect(html).toContain("preview.example.com");
    });

    it("gives the team notification the same masthead", () => {
      expect(teamNotificationEmail(facts(), team).html).toContain(`${ORIGIN}/images/logo.png`);
    });

    it("never resolves an email asset against the canonical domain", () => {
      for (const message of [
        guestConfirmationEmail(facts()),
        teamNotificationEmail(facts(), team),
      ]) {
        expect(message.html).not.toContain(`${site.domain}/images/logo.png`);
      }
    });
  });

  it("promises the hour in writing when the tour has no clock time", () => {
    // Óbidos: "what happens next" says "at your departure time", and without
    // this the guest has paid without that time appearing anywhere.
    const pt = guestConfirmationEmail(
      facts({ locale: "pt", departure: "Partida da manhã", departureTimeFollows: true }),
    );
    const en = guestConfirmationEmail(
      facts({ locale: "en", departure: "Morning departure", departureTimeFollows: true }),
    );

    for (const part of [pt.text, pt.html!]) {
      expect(part).toContain("A hora exata da partida segue por email ou WhatsApp");
    }
    for (const part of [en.text, en.html!]) {
      expect(part).toContain("The exact departure time follows by email or WhatsApp");
    }
  });

  it("says nothing about a time that follows when the departure names one", () => {
    const message = guestConfirmationEmail(facts({ departureTimeFollows: false }));
    expect(message.text).not.toContain("segue por email ou WhatsApp");
    expect(message.html).not.toContain("segue por email ou WhatsApp");
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

  it("tells the team an hour is still owed, only when one is", () => {
    const owed = teamNotificationEmail(facts({ departureTimeFollows: true }), recipients);
    for (const part of [owed.text, owed.html!]) {
      expect(part).toContain("Falta combinar a hora");
    }

    const settled = teamNotificationEmail(facts({ departureTimeFollows: false }), recipients);
    expect(settled.text).not.toContain("Falta combinar a hora");
    expect(settled.html).not.toContain("Falta combinar a hora");
  });

  it("goes to everyone configured, with the guest\'s details on it", () => {
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
