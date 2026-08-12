import { describe, expect, it } from "vitest";

import {
  guestConfirmationEmail,
  teamNotificationEmail,
  type BookingEmailFacts,
} from "@/lib/booking-emails";
import { site } from "@/content/site";

/**
 * The two emails a paid booking causes.
 *
 * These are the only messages the business sends automatically, and every
 * failure mode here is one a guest sees: a `{name}` that never got substituted,
 * a blank "Add-ons:" line that reads like something broke, a Portuguese
 * confirmation sent to someone who booked in English, or a reply-to that goes
 * nowhere a person reads.
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
  });

  it("carries the facts the guest will check it for", () => {
    const message = guestConfirmationEmail(facts());
    expect(message.to).toEqual(["sofia@example.com"]);
    expect(message.text).toContain("Sofia Almeida");
    expect(message.text).toContain("BK-A1B2C3");
    expect(message.text).toContain("sábado, 15 de agosto de 2026");
    expect(message.text).toContain("€340");
    expect(message.text).toContain("Manzwine");
  });

  it("writes in the language they booked in", () => {
    expect(guestConfirmationEmail(facts({ locale: "pt" })).subject).toContain(
      "Reserva confirmada",
    );
    expect(guestConfirmationEmail(facts({ locale: "en" })).subject).toContain(
      "Booking confirmed",
    );
  });

  it("omits the add-ons line entirely when there are none", () => {
    // Not an empty "Extras:" line — a confirmation with a blank field on it
    // reads like something went wrong with the booking.
    const message = guestConfirmationEmail(facts({ addOns: [] }));
    expect(message.text).not.toContain("Extras:");
    expect(message.text).not.toMatch(/\n\n\n/);
  });

  it("replies to a person, not to the sending address", () => {
    expect(guestConfirmationEmail(facts()).replyTo).toBe(site.email);
  });

  it("gives them both phone numbers", () => {
    const message = guestConfirmationEmail(facts());
    for (const contact of site.contacts) {
      expect(message.text).toContain(contact.phoneDisplay);
    }
  });
});

describe("teamNotificationEmail", () => {
  const recipients = ["diogo@agorasim.pt", "rita@agorasim.pt"];

  it("goes to everyone configured, with the guest's details on it", () => {
    const message = teamNotificationEmail(facts(), recipients);
    expect(message.to).toEqual(recipients);
    expect(message.text).toContain("sofia@example.com");
    expect(message.text).toContain("+351912345678");
    expect(message.text).toContain("https://agorasim.pt/admin/sales/abc");
  });

  it("stays Portuguese even when the guest booked in English", () => {
    // It is an internal note to two Portuguese speakers; translating it would
    // only mean two versions of an operational message to keep in step.
    const message = teamNotificationEmail(facts({ locale: "en" }), recipients);
    expect(message.subject).toContain("Nova reserva paga");
    expect(message.text).toContain("Idioma: EN");
  });

  it("replies to the guest — the most likely next action", () => {
    expect(teamNotificationEmail(facts(), recipients).replyTo).toBe("sofia@example.com");
  });

  it("says so plainly when there is no phone number", () => {
    const message = teamNotificationEmail(facts({ guestPhone: null }), recipients);
    expect(message.text).toContain("Telefone: —");
  });

  it("substitutes every placeholder", () => {
    const message = teamNotificationEmail(facts({ addOns: [] }), recipients);
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
  });
});
