import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  guestCancellationEmail,
  guestConfirmationEmail,
  guestEnquiryAckEmail,
  guestMoveEmail,
  guestQuoteReceiptEmail,
  guestQuoteSentEmail,
  guestReminderEmail,
  partyLabel,
  teamCancellationEmail,
  teamEnquiryEmail,
  teamNotificationEmail,
  teamQuoteReceiptEmail,
  type BookingCancellationFacts,
  type BookingEmailFacts,
  type BookingMoveFacts,
  type EnquiryEmailFacts,
  type QuoteReceiptEmailFacts,
  type QuoteSentEmailFacts,
  type ReminderEmailFacts,
  type TeamCancellationFacts,
} from "@/lib/booking-emails";
import { termsContent, termsSection } from "@/content/terms";
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
    experience: "Rural Saloia — por grupo",
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
    cancelUrl: "https://agorasim.pt/pt/reserva/cancelar/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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

// ---------------------------------------------------------------------------
// The cancellation notice
// ---------------------------------------------------------------------------

function cancelled(
  overrides: Partial<BookingCancellationFacts> = {},
): BookingCancellationFacts {
  return {
    ref: "BK-A1B2C3",
    guestName: "Sofia Almeida",
    guestEmail: "sofia@example.com",
    locale: "pt",
    date: "sábado, 15 de agosto de 2026",
    experience: "Rural Saloia — por grupo",
    partyLabel: "2 adultos",
    total: "€340",
    refund: "€340",
    partialRefund: false,
    ...overrides,
  };
}

function moved(overrides: Partial<BookingMoveFacts> = {}): BookingMoveFacts {
  return {
    ...facts(),
    date: "sábado, 22 de agosto de 2026",
    departure: "Tarde · 14h00",
    previousDate: "sábado, 15 de agosto de 2026",
    previousDeparture: "Manhã · 10h00",
    ...overrides,
  };
}

describe("guestMoveEmail", () => {
  it("substitutes every placeholder — no stray braces reach a guest", () => {
    const message = guestMoveEmail(moved());
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
    expect(message.html).not.toMatch(
      /\{(name|ref|experience|date|previousDate|party|total|site)\}/,
    );
  });

  it("names both departures — the one they had and the one they now have", () => {
    const message = guestMoveEmail(moved());
    for (const part of [message.text, message.html!]) {
      // Without the old date the mail reads as a second booking nobody made.
      expect(part).toContain("sábado, 15 de agosto de 2026");
      expect(part).toContain("Manhã · 10h00");
      expect(part).toContain("sábado, 22 de agosto de 2026");
      expect(part).toContain("Tarde · 14h00");
    }
  });

  it("carries the meeting point, as the confirmation did", () => {
    const message = guestMoveEmail(moved());
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("Av. Mário Firmino Miguel, Sintra (Portela de Sintra)");
    }
    expect(message.text).toContain("https://maps.app.goo.gl/zufzHo8QpmspvzqC9");
  });

  it("never wears the confirmation's banner — the date has changed", () => {
    const message = guestMoveEmail(moved());
    expect(message.html).toContain("A sua reserva mudou de data");
    expect(message.html).not.toContain("Reserva confirmada");
  });

  it("offers a cancel link, and omits the block when there is none", () => {
    // A guest whose tour was moved without being asked is the one most likely
    // to want out — and the link in their original confirmation named a
    // departure that no longer exists.
    expect(guestMoveEmail(moved()).html).toContain("Cancelar a reserva");
    const linkless = guestMoveEmail(moved({ cancelUrl: null }));
    expect(linkless.html).not.toContain("Cancelar a reserva");
    expect(linkless.text).not.toContain("Cancelar a reserva");
  });

  it("promises the hour in writing when the tour still owes one", () => {
    const message = guestMoveEmail(moved({ departureTimeFollows: true }));
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("A hora exata da partida segue por email");
    }
  });

  it("writes in the language they booked in", () => {
    const en = guestMoveEmail(
      moved({ locale: "en", date: "Saturday, 22 August 2026", previousDate: "Saturday, 15 August 2026" }),
    );
    expect(en.subject).toContain("New date");
    expect(en.html).toContain('lang="en"');
    expect(en.text).toContain("We have moved your experience");
  });

  it("replies to a person, not to the sending domain", () => {
    expect(guestMoveEmail(moved()).replyTo).toBe(site.email);
  });
});

/** The Óbidos meeting point, from `content/logistics.ts`. */
const OBIDOS_PIN = {
  address: "Alameda Cardeal Cerejeira, Lisboa",
  mapsUrl: "https://maps.app.goo.gl/ucMojM5V7eGhcvn4A",
};

function reminder(overrides: Partial<ReminderEmailFacts> = {}): ReminderEmailFacts {
  const base = facts();
  return {
    when: "tomorrow",
    ref: base.ref,
    guestName: base.guestName,
    guestEmail: base.guestEmail,
    locale: base.locale,
    date: base.date,
    experience: base.experience,
    departure: base.departure,
    departureTimeFollows: base.departureTimeFollows,
    meetingPoint: base.meetingPoint,
    addOns: base.addOns,
    partyLabel: base.partyLabel,
    ...overrides,
  };
}

/** The same guest on Óbidos, whose departures still have no clock time. */
function obidos(overrides: Partial<ReminderEmailFacts> = {}): ReminderEmailFacts {
  return reminder({
    experience: "Óbidos & Aldeias Medievais — por pessoa",
    departure: "Partida da manhã — hora exata confirmada por email",
    departureTimeFollows: true,
    meetingPoint: OBIDOS_PIN,
    ...overrides,
  });
}

describe("guestReminderEmail", () => {
  const [diogo, rita] = site.contacts;

  it("substitutes every placeholder — no stray braces reach a guest", () => {
    for (const message of [
      guestReminderEmail(reminder()),
      guestReminderEmail(obidos({ when: "today", locale: "en" })),
    ]) {
      expect(message.subject).not.toMatch(/\{/);
      expect(message.text).not.toMatch(/\{/);
      expect(message.html).not.toMatch(
        /\{(name|ref|experience|date|site|diogoPhone|ritaPhone)\}/,
      );
    }
  });

  it("says tomorrow is the big day, in the client's words, in both languages", () => {
    const pt = guestReminderEmail(reminder());
    expect(pt.subject).toContain("Amanhã é o grande dia");
    expect(pt.html).toContain('lang="pt"');
    expect(pt.text).toContain("Aqui fica a informação sobre o ponto de encontro");

    const en = guestReminderEmail(reminder({ locale: "en", date: "Saturday, 15 August 2026" }));
    expect(en.subject).toContain("Tomorrow is the big day");
    expect(en.html).toContain('lang="en"');
    expect(en.text).toContain("Here is some information about the meeting point");
  });

  it("says today, not tomorrow, on the same-morning catch-up", () => {
    const pt = guestReminderEmail(reminder({ when: "today" }));
    expect(pt.subject).toContain("Hoje é o grande dia");
    expect(pt.text).not.toContain("Amanhã");
    expect(pt.html).not.toContain("Amanhã é o grande dia");

    const en = guestReminderEmail(reminder({ when: "today", locale: "en" }));
    expect(en.subject).toContain("Today is the big day");
    expect(en.text).not.toMatch(/tomorrow/i);
  });

  it("carries the meeting point linked to its pin, and the rest of the booking", () => {
    const message = guestReminderEmail(reminder());
    expect(message.to).toEqual(["sofia@example.com"]);
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("Sofia Almeida");
      expect(part).toContain("BK-A1B2C3");
      expect(part).toContain("sábado, 15 de agosto de 2026");
      expect(part).toContain("Manhã · 10h00");
      expect(part).toContain("Av. Mário Firmino Miguel, Sintra (Portela de Sintra)");
      expect(part).toContain("2 adultos");
      expect(part).toContain("Manzwine");
    }
    expect(message.html).toContain('href="https://maps.app.goo.gl/zufzHo8QpmspvzqC9"');
    expect(message.text).toContain("https://maps.app.goo.gl/zufzHo8QpmspvzqC9");
  });

  it("omits the meeting-point and add-ons rows when there is nothing to say", () => {
    const message = guestReminderEmail(reminder({ meetingPoint: null, addOns: [] }));
    expect(message.text).not.toContain("Ponto de encontro");
    expect(message.text).not.toContain("Extras");
  });

  it("carries no money line and no cancel link, in either language", () => {
    for (const locale of ["pt", "en"] as const) {
      for (const message of [
        guestReminderEmail(reminder({ locale })),
        guestReminderEmail(obidos({ locale })),
      ]) {
        for (const part of [message.text, message.html!]) {
          expect(part).not.toContain("€");
          expect(part).not.toMatch(/Total pago|Total paid/);
          expect(part).not.toMatch(/Cancelar a reserva|Cancel this booking/);
          expect(part).not.toContain("/cancelar/");
        }
      }
    }
  });

  it("tells an Óbidos guest whom to call for the hour, with both numbers", () => {
    const pt = guestReminderEmail(obidos());
    for (const part of [pt.text, pt.html!]) {
      expect(part).toContain("Se ainda não recebeu de nós a hora exata da partida");
      expect(part).toContain(`Diogo (${diogo.phoneDisplay})`);
      expect(part).toContain(`Rita (${rita.phoneDisplay})`);
      expect(part).toContain("Alameda Cardeal Cerejeira, Lisboa");
    }
    expect(pt.text).toContain(OBIDOS_PIN.mapsUrl);

    const en = guestReminderEmail(obidos({ locale: "en" }));
    // The HTML escapes the apostrophe, as it escapes every copy string.
    expect(en.text).toContain("If you haven't had the exact departure time from us yet");
    expect(en.html).toContain("If you haven&#39;t had the exact departure time from us yet");
    for (const part of [en.text, en.html!]) {
      expect(part).toContain(`Diogo (${diogo.phoneDisplay})`);
      expect(part).toContain(`Rita (${rita.phoneDisplay})`);
    }
  });

  it("says nothing about an hour to come on Rural Saloia, which has one", () => {
    const pt = guestReminderEmail(reminder());
    const en = guestReminderEmail(reminder({ locale: "en" }));
    expect(pt.text).not.toContain("hora exata");
    expect(pt.html).not.toContain("A hora da partida");
    expect(en.text).not.toContain("exact departure time");
  });

  it("greets every guest without guessing their gender", () => {
    // The §2.6 source line is ungendered and the booking never asks, so no PT
    // line may agree with the guest — see `bookingEmails.guest.lead`.
    const gendered =
      /\b(bem-vind[oa]s?|car[oa]s?|querid[oa]s?|pront[oa]s?|obrigad[oa]s?|convidad[oa]s?)\b/i;
    for (const when of ["tomorrow", "today"] as const) {
      for (const message of [
        guestReminderEmail(reminder({ when })),
        guestReminderEmail(obidos({ when })),
      ]) {
        expect(message.subject).not.toMatch(gendered);
        expect(message.text).not.toMatch(gendered);
      }
    }
  });

  it("escapes anything a guest could have typed", () => {
    const message = guestReminderEmail(
      reminder({ guestName: `<script>alert("x")</script> O'Brien` }),
    );
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("O&#39;Brien");
    expect(message.text).toContain("O'Brien");
  });

  it("gives them both phone numbers, dialable, and replies to a person", () => {
    const message = guestReminderEmail(reminder());
    expect(message.html).toContain(`href="tel:${diogo.phone}"`);
    expect(message.html).toContain(`href="tel:${rita.phone}"`);
    expect(message.replyTo).toBe(site.email);
  });
});

describe("guestCancellationEmail", () => {
  it("substitutes every placeholder — no stray braces reach a guest", () => {
    const message = guestCancellationEmail(cancelled());
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
    expect(message.html).not.toMatch(/\{(name|ref|experience|date|total|refund|site)\}/);
  });

  it("says the tour is off, and how much is coming back", () => {
    const message = guestCancellationEmail(cancelled());
    expect(message.to).toEqual(["sofia@example.com"]);
    expect(message.subject).toContain("Reserva cancelada");
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("BK-A1B2C3");
      expect(part).toContain("sábado, 15 de agosto de 2026");
      expect(part).toContain("€340");
    }
  });

  it("never wears the confirmation's banner", () => {
    // A cancellation read as a confirmation is the worst failure this email
    // has: the guest sees the green strip, stops reading, and turns up.
    const message = guestCancellationEmail(cancelled());
    expect(message.html).not.toContain("Reserva confirmada");
    expect(message.html).toContain("Reserva cancelada");
    // The strip itself is the muted grey, not the confirmation's green.
    expect(message.html).toContain(`bgcolor="${emailPalette.textMuted}"`);
  });

  it("names both amounts when only part of the money goes back", () => {
    const message = guestCancellationEmail(
      cancelled({ total: "€340", refund: "€170", partialRefund: true }),
    );
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("€170");
      expect(part).toContain("€340");
    }
  });

  it("says plainly when nothing is refunded, rather than leaving a blank", () => {
    const message = guestCancellationEmail(cancelled({ refund: null }));
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("Não foi devolvido nenhum valor");
    }
    // No refund row, and no empty one either.
    expect(message.html).not.toContain("Reembolso");
  });

  it("writes in the language they booked in", () => {
    const en = guestCancellationEmail(cancelled({ locale: "en" }));
    expect(en.subject).toContain("Booking cancelled");
    expect(en.html).toContain('lang="en"');
    expect(en.text).toContain("has been cancelled");
  });

  it("replies to a person, not to the sending domain", () => {
    expect(guestCancellationEmail(cancelled()).replyTo).toBe(site.email);
  });
});

// ---------------------------------------------------------------------------
// The cancel link the confirmation carries
// ---------------------------------------------------------------------------

describe("guestConfirmationEmail — the cancel link", () => {
  const CANCEL_URL =
    "https://agorasim.pt/pt/reserva/cancelar/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  it("carries the link in both parts, as a button and as a bare URL", () => {
    const message = guestConfirmationEmail(facts({ cancelUrl: CANCEL_URL }));

    expect(message.html).toContain(`href="${CANCEL_URL}"`);
    // On its own line in the text part: a sentence wrapped round a URL is a URL
    // that breaks across lines in somebody's mail client.
    expect(message.text).toContain(CANCEL_URL);
    expect(message.text).toMatch(new RegExp(`\\n[^\\n]*${CANCEL_URL}`));
  });

  it("states the window beside the link, in the guest's language", () => {
    expect(guestConfirmationEmail(facts({ cancelUrl: CANCEL_URL })).html).toContain(
      "até 48 horas antes da partida",
    );
    expect(
      guestConfirmationEmail(facts({ cancelUrl: CANCEL_URL, locale: "en" })).html,
    ).toContain("up to 48 hours before departure");
  });

  /**
   * The whole block goes, not just the anchor. A confirmation that promises
   * free cancellation and then shows a dead button is worse than one that
   * leaves the promise to the phone numbers underneath it.
   */
  it("omits the block entirely when the booking has no token", () => {
    const message = guestConfirmationEmail(facts({ cancelUrl: null }));

    expect(message.html).not.toContain("/reserva/cancelar/");
    expect(message.html).not.toContain("Cancelar a reserva");
    expect(message.text).not.toContain("Cancelar a reserva");
    // And the mail still says what it always said about cancelling.
    expect(message.text).toContain("Cancelamento gratuito até 48 horas");
  });

  it("puts the link below the phone numbers, not above them", () => {
    // Ordering is the cheapest way to say "ring us first" — see the note in
    // `lib/booking-emails.ts`.
    const html = guestConfirmationEmail(facts({ cancelUrl: CANCEL_URL })).html!;

    expect(html.indexOf(site.contacts[0].phoneDisplay)).toBeLessThan(
      html.indexOf(CANCEL_URL),
    );
  });
});

/**
 * The confirmation is the durable medium.
 *
 * The checkout page already states the withdrawal position and links the terms,
 * but a web page is not a durable medium (CJEU C-49/11) and DL 24/2014 art. 6(1)
 * wants the art. 4 information on one. The mail is the only artefact of the sale
 * the guest keeps, so what they were shown before paying has to be in it — in
 * both parts, and in the language they booked in.
 */
describe("guestConfirmationEmail — the terms and the withdrawal right", () => {
  const ORIGIN = "https://preview.example.com";

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("links the terms of sale, at the locale's own path", () => {
    expect(guestConfirmationEmail(facts({ locale: "pt" })).html).toContain(
      `href="${ORIGIN}/pt/termos"`,
    );
    expect(guestConfirmationEmail(facts({ locale: "en" })).html).toContain(
      `href="${ORIGIN}/en/terms"`,
    );
  });

  it("carries the link in the plain text part too, as a bare URL", () => {
    // The part a text-only client shows is the same durable record, so the
    // terms cannot be an anchor the guest never sees.
    expect(guestConfirmationEmail(facts({ locale: "pt" })).text).toContain(
      `Termos de venda: ${ORIGIN}/pt/termos`,
    );
    expect(guestConfirmationEmail(facts({ locale: "en" })).text).toContain(
      `Terms of sale: ${ORIGIN}/en/terms`,
    );
  });

  it("states the withdrawal position, in the guest's language", () => {
    const pt = guestConfirmationEmail(facts({ locale: "pt" }));
    expect(pt.html).toContain("direito de livre resolução de 14 dias não se aplica");
    expect(pt.text).toContain("direito de livre resolução de 14 dias não se aplica");

    const en = guestConfirmationEmail(facts({ locale: "en" }));
    expect(en.html).toContain("14-day right of withdrawal does not apply");
    expect(en.text).toContain("14-day right of withdrawal does not apply");
  });

  it("names the terms the way the pay button named them", () => {
    // One label for the same link, so a guest who read "termos de venda" at
    // checkout meets the same words in the mail — see `content/terms.ts`.
    expect(guestConfirmationEmail(facts({ locale: "pt" })).html).toContain(
      ">termos de venda</a>",
    );
    expect(guestConfirmationEmail(facts({ locale: "en" })).html).toContain(
      ">terms of sale</a>",
    );
  });

  /**
   * The cancel link is the one block this mail drops; the terms are not it.
   * A booking with no token still bought something under terms.
   */
  it("is there whether or not the booking has a cancel link", () => {
    const linkless = guestConfirmationEmail(facts({ cancelUrl: null }));
    expect(linkless.html).toContain(`href="${ORIGIN}/pt/termos"`);
    expect(linkless.text).toContain(`Termos de venda: ${ORIGIN}/pt/termos`);
  });
});

// ---------------------------------------------------------------------------
// The team's copy when a guest cancels themselves
// ---------------------------------------------------------------------------

function guestCancelled(
  overrides: Partial<TeamCancellationFacts> = {},
): TeamCancellationFacts {
  return {
    ref: "BK-A1B2C3",
    guestName: "Sofia Almeida",
    guestEmail: "sofia@example.com",
    guestPhone: "+351912345678",
    locale: "pt",
    date: "sábado, 15 de agosto de 2026",
    experience: "Rural Saloia — por grupo",
    departure: "Manhã · 10h00",
    partyLabel: "2 adultos",
    total: "€340",
    refund: "€340",
    refundFailed: false,
    cancelledAt: "13/08/2026, 23:04",
    adminUrl: "https://agorasim.pt/admin/sales/abc",
    ...overrides,
  };
}

describe("teamCancellationEmail", () => {
  const recipients = ["diogo@agorasim.pt", "rita@agorasim.pt"];

  it("substitutes every placeholder", () => {
    const message = teamCancellationEmail(guestCancelled(), recipients);
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
    expect(message.html).not.toMatch(/\{(name|ref|experience|date|refund|adminUrl)\}/);
  });

  it("says which booking, when, and how much went back", () => {
    const message = teamCancellationEmail(guestCancelled(), recipients);

    expect(message.to).toEqual(recipients);
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("BK-A1B2C3");
      expect(part).toContain("sábado, 15 de agosto de 2026");
      expect(part).toContain("13/08/2026, 23:04");
      expect(part).toContain("€340");
    }
  });

  it("is Portuguese whatever language the guest booked in", () => {
    const message = teamCancellationEmail(guestCancelled({ locale: "en" }), recipients);

    expect(message.html).toContain('lang="pt"');
    expect(message.subject).toContain("Reserva cancelada pelo cliente");
    // The guest's language is reported, not obeyed.
    expect(message.html).toContain("EN");
  });

  it("never wears the new-booking banner", () => {
    const message = teamCancellationEmail(guestCancelled(), recipients);

    expect(message.html).not.toContain("Nova reserva paga");
    expect(message.html).toContain(`bgcolor="${emailPalette.textMuted}"`);
  });

  it("raises the outstanding refund as a job, and only when there is one", () => {
    const failed = teamCancellationEmail(
      guestCancelled({ refund: null, refundFailed: true }),
      recipients,
    );
    for (const part of [failed.text, failed.html!]) {
      expect(part).toContain("O reembolso não passou");
    }

    const fine = teamCancellationEmail(guestCancelled(), recipients);
    expect(fine.text).not.toContain("O reembolso não passou");
    expect(fine.html).not.toContain("O reembolso não passou");
  });

  it("does not offer to dial a number that is not there", () => {
    const message = teamCancellationEmail(
      guestCancelled({ guestPhone: null }),
      recipients,
    );

    expect(message.html).not.toContain("tel:—");
  });

  it("replies to the guest — the next move is writing to them", () => {
    expect(teamCancellationEmail(guestCancelled(), recipients).replyTo).toBe(
      "sofia@example.com",
    );
  });
});

describe("partyLabel", () => {
  it("says only the bands with somebody in them", () => {
    expect(
      partyLabel({ adults: 2, children: 1, infants: 0, partySize: 3 }, "pt"),
    ).toBe("2 adultos · 1 criança (4–12)");
    expect(partyLabel({ adults: 1, children: 0, infants: 0, partySize: 1 }, "en")).toBe(
      "1 adult",
    );
  });

  it("falls back to the head count for a row priced before the bands", () => {
    expect(partyLabel({ adults: 0, children: 0, infants: 0, partySize: 4 }, "pt")).toBe(
      "4",
    );
  });
});

// ---------------------------------------------------------------------------
// Enquiries — the tour form, and the two quote forms
// ---------------------------------------------------------------------------

/**
 * One pair of mails, three doors.
 *
 * `/reservar`, `/casamentos` and `/eventos` all write the same table and all
 * acknowledge themselves with the same two messages — which is the whole point,
 * and also the risk: the promise each one makes is different. A tour is
 * answered with a date and a wedding with a price, and telling a couple that
 * "the team will be in touch to arrange the details" is the kind of wrong that
 * only shows up in somebody's inbox.
 */
function enquiry(overrides: Partial<EnquiryEmailFacts> = {}): EnquiryEmailFacts {
  return {
    kind: "tour",
    guestName: "Sofia Almeida",
    guestEmail: "sofia@example.com",
    guestPhone: "+351912345678",
    locale: "pt",
    partySize: 2,
    preferredDate: "15 de agosto",
    experience: "Rural Saloia",
    adminUrl: "https://agorasim.pt/admin/sales/abc",
    ...overrides,
  };
}

/** A wedding enquiry, with everything the quote is written from. */
function weddingEnquiry(overrides: Partial<EnquiryEmailFacts> = {}): EnquiryEmailFacts {
  return enquiry({
    kind: "wedding",
    partySize: 80,
    preferredDate: "2027-06-12",
    experience: null,
    venue: "Igreja de São Pedro, Mafra",
    serviceHours: "full-day",
    preferredCar: "citroen-2cv",
    ...overrides,
  });
}

describe("guestEnquiryAckEmail", () => {
  it("promises a call back about the details on a tour", () => {
    const message = guestEnquiryAckEmail(enquiry());
    expect(message.subject).toBe("Recebemos o seu pedido — Agorasim");
    expect(message.text).toContain("a equipa entra em contacto");
    expect(message.text).not.toContain("orçamento");
  });

  it("promises a quote on a wedding, and on an event", () => {
    for (const kind of ["wedding", "event"] as const) {
      const message = guestEnquiryAckEmail(weddingEnquiry({ kind }));
      expect(message.subject).toBe("Recebemos o seu pedido de orçamento — Agorasim");
      expect(message.text).toContain("24–48h");
      expect(message.html).toContain("Pedido de orçamento recebido");
    }
  });

  it("answers an English couple in English", () => {
    const message = guestEnquiryAckEmail(weddingEnquiry({ locale: "en" }));
    expect(message.subject).toBe("We received your quote request — Agorasim");
    expect(message.html).toContain('lang="en"');
  });

  it("keeps the shared half of the voice — greeting, phones, sign-off", () => {
    const message = guestEnquiryAckEmail(weddingEnquiry());
    expect(message.text).toContain("Olá Sofia Almeida,");
    expect(message.text).toContain("Diogo");
    expect(message.text).toContain("Rita");
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
  });
});

describe("teamEnquiryEmail", () => {
  const recipients = ["diogo@agorasim.pt", "rita@agorasim.pt"];

  it("says which kind of quote was asked for, in the subject", () => {
    expect(teamEnquiryEmail(enquiry(), recipients).subject).toBe(
      "Novo pedido — Sofia Almeida",
    );
    expect(teamEnquiryEmail(weddingEnquiry(), recipients).subject).toBe(
      "Novo pedido de orçamento (casamento) — Sofia Almeida",
    );
    expect(teamEnquiryEmail(weddingEnquiry({ kind: "event" }), recipients).subject).toBe(
      "Novo pedido de orçamento (evento) — Sofia Almeida",
    );
  });

  it("carries the three facts a quote is priced from, by name not by key", () => {
    const message = teamEnquiryEmail(weddingEnquiry(), recipients);
    for (const part of [message.text, message.html!]) {
      expect(part).toContain("Igreja de São Pedro, Mafra");
      expect(part).toContain("Dia inteiro (até 8h)");
      expect(part).toContain("Josefina");
      // Never the stored keys.
      expect(part).not.toContain("full-day");
      expect(part).not.toContain("citroen-2cv");
    }
  });

  it("drops the experience row a quote never fills in", () => {
    const quote = teamEnquiryEmail(weddingEnquiry(), recipients);
    expect(quote.text).not.toContain("Experiência");
    const tour = teamEnquiryEmail(enquiry(), recipients);
    expect(tour.text).toContain("Experiência: Rural Saloia");
    expect(tour.text).not.toContain("Local:");
  });

  it("says so plainly when a quote enquiry left the fields empty", () => {
    const message = teamEnquiryEmail(
      weddingEnquiry({ venue: null, serviceHours: null, preferredCar: null }),
      recipients,
    );
    expect(message.text).toContain("Local: —");
    expect(message.text).toContain("Horas de serviço: —");
    expect(message.text).toContain("Carro preferido: —");
  });

  it("stays Portuguese, and replies to the guest", () => {
    const message = teamEnquiryEmail(weddingEnquiry({ locale: "en" }), recipients);
    expect(message.html).toContain('lang="pt"');
    expect(message.replyTo).toBe("sofia@example.com");
    expect(message.subject).not.toMatch(/\{/);
    expect(message.text).not.toMatch(/\{/);
  });
});

/**
 * The quote, as the couple receive it. Every figure a couple will be asked to
 * pay is in it, in their language, and the link to the page is the one
 * credential the mail carries.
 */
describe("guestQuoteSentEmail", () => {
  const QUOTE_URL = "https://agorasim.pt/pt/orcamento/Tok3n_valu3-abcdefghijklmnopqrstuvwxyz0123";

  function quoteFacts(overrides: Partial<QuoteSentEmailFacts> = {}): QuoteSentEmailFacts {
    return {
      ref: "QT-A1B2C3",
      guestName: "Inês & Tomás",
      guestEmail: "ines@example.com",
      locale: "pt",
      date: "sábado, 15 de agosto de 2026",
      venue: "Quinta do Hespanhol, Mafra",
      lines: [
        { label: "Carro clássico com motorista, 6 horas", quantity: 2, amount: "1500 €" },
        { label: "Deslocação Ericeira", quantity: 1, amount: "120 €" },
      ],
      total: "1620 €",
      deposit: "486 €",
      depositPercent: 30,
      balance: "1134 €",
      balanceDue: "sábado, 1 de agosto de 2026",
      balanceDueDaysBefore: 14,
      termsWindowDays: 30,
      quoteUrl: QUOTE_URL,
      ...overrides,
    };
  }

  it("addresses the couple and replies to the business inbox", () => {
    const mail = guestQuoteSentEmail(quoteFacts());

    expect(mail.to).toEqual(["ines@example.com"]);
    expect(mail.replyTo).toBe(site.email);
    expect(mail.subject).toBe("O seu orçamento Agorasim — sábado, 15 de agosto de 2026");
  });

  it("states every figure and the link, in both parts", () => {
    const mail = guestQuoteSentEmail(quoteFacts());

    for (const part of [mail.text, mail.html ?? ""]) {
      expect(part).toContain("QT-A1B2C3");
      expect(part).toContain("Quinta do Hespanhol, Mafra");
      expect(part).toContain("1620 €");
      expect(part).toContain("486 €");
      expect(part).toContain("1134 €");
      expect(part).toContain("sábado, 1 de agosto de 2026");
      expect(part).toContain(QUOTE_URL);
    }
    expect(mail.text).toContain("2 × Carro clássico com motorista, 6 horas: 1500 €");
    expect(mail.text).toContain("Deslocação Ericeira: 120 €");
    expect(mail.text).toContain("Sinal (30%): 486 €");
    expect(mail.text).toContain("Ver o orçamento: " + QUOTE_URL);
    expect(mail.text).toContain("a menos de 30 dias do evento");
    expect(mail.text).not.toMatch(/\{\w+\}/);
  });

  it("is written in English for a couple who enquired in English", () => {
    const mail = guestQuoteSentEmail(
      quoteFacts({
        locale: "en",
        date: "Saturday, 15 August 2026",
        balanceDue: "Saturday, 1 August 2026",
        total: "€1,620",
        deposit: "€486",
        balance: "€1,134",
      }),
    );

    expect(mail.subject).toBe("Your Agorasim quote — Saturday, 15 August 2026");
    expect(mail.text).toContain("Deposit (30%): €486");
    expect(mail.text).toContain("Balance: €1,134 · due Saturday, 1 August 2026");
    expect(mail.text).toContain("View your quote: " + QUOTE_URL);
    expect(mail.text).not.toContain("orçamento à medida");
    expect(mail.html).toContain('lang="en"');
  });

  it("leaves out the venue row when the quote has none", () => {
    const mail = guestQuoteSentEmail(quoteFacts({ venue: null }));

    expect(mail.text).not.toContain("Local:");
  });

  it("escapes what Rita typed, so a line label cannot become markup", () => {
    const mail = guestQuoteSentEmail(
      quoteFacts({ lines: [{ label: "<b>Flores</b> & fitas", quantity: 1, amount: "50 €" }] }),
    );

    expect(mail.html).not.toContain("<b>Flores</b>");
    expect(mail.html).toContain("&lt;b&gt;Flores&lt;/b&gt; &amp; fitas");
  });
});

describe("the quote receipts — deposit-received and balance-paid", () => {
  function receiptFacts(overrides: Partial<QuoteReceiptEmailFacts> = {}): QuoteReceiptEmailFacts {
    return {
      instalment: "deposit",
      ref: "QT-A1B2C3",
      guestName: "Inês & Tomás",
      guestEmail: "ines@example.com",
      guestPhone: "+351912345678",
      locale: "pt",
      date: "sábado, 15 de agosto de 2026",
      venue: "Quinta do Hespanhol, Mafra",
      amount: "486 €",
      paidOn: "segunda, 1 de junho de 2026",
      total: "1620 €",
      remaining: { amount: "1134 €", dueDate: "sábado, 1 de agosto de 2026" },
      balanceDueDaysBefore: 14,
      fee: "29,16 €",
      adminUrl: "https://agorasim.pt/admin/sales/abc",
      ...overrides,
    };
  }

  it("carries the events terms verbatim, with their version — the durable copy", () => {
    for (const locale of ["pt", "en"] as const) {
      const mail = guestQuoteReceiptEmail(receiptFacts({ locale }));
      const events = termsSection("events", locale);

      for (const paragraph of events.body) expect(mail.text).toContain(paragraph);
      expect(mail.text).toContain(events.heading);
      expect(mail.text).toContain(termsContent.lastUpdated[locale]);
      // The HTML part escapes, so the headline paragraph is checked escaped.
      expect(mail.html).toContain(
        events.body[1].replace(/&/g, "&amp;").replace(/'/g, "&#39;"),
      );
    }
  });

  it("says what was paid and what is still owed, in the couple's language", () => {
    const pt = guestQuoteReceiptEmail(receiptFacts());
    expect(pt.subject).toBe("Sinal recebido — a data de sábado, 15 de agosto de 2026 está reservada");
    expect(pt.text).toContain("Sinal pago: 486 €");
    expect(pt.text).toContain("Por pagar: 1134 € · até sábado, 1 de agosto de 2026");
    expect(pt.to).toEqual(["ines@example.com"]);
    expect(pt.replyTo).toBe(site.email);

    const en = guestQuoteReceiptEmail(
      receiptFacts({ locale: "en", date: "Saturday, 15 August 2026", remaining: null, instalment: "balance" }),
    );
    expect(en.subject).toBe("Paid in full — Saturday, 15 August 2026");
    expect(en.text).toContain("Balance paid: 486 €");
    expect(en.text).toContain("Nothing — everything is paid");
    // Nothing left to pay: no "what happens next" about a balance.
    expect(en.text).not.toContain("We will send you the link");
  });

  it("links the full terms and never a quote link — the webhook has no token", () => {
    const mail = guestQuoteReceiptEmail(receiptFacts());
    expect(mail.text).toContain(`${siteUrl()}/pt/termos`);
    expect(mail.text).not.toContain("/orcamento/");
    expect(mail.html).not.toContain("/orcamento/");
    expect(mail.text).not.toMatch(/\{\w+\}/);
  });

  it("gives the team the fee and the couple's details, in Portuguese", () => {
    const mail = teamQuoteReceiptEmail(receiptFacts({ locale: "en" }), ["equipa@agorasim.pt"]);
    expect(mail.subject).toBe("Sinal recebido — Inês & Tomás · sábado, 15 de agosto de 2026");
    expect(mail.text).toContain("Comissão (6%): 29,16 €");
    expect(mail.text).toContain("ines@example.com");
    expect(mail.to).toEqual(["equipa@agorasim.pt"]);
    // Reply writes to the couple.
    expect(mail.replyTo).toBe("ines@example.com");

    const platformOnly = teamQuoteReceiptEmail(
      receiptFacts({ fee: null, instalment: "balance", remaining: null }),
      ["equipa@agorasim.pt"],
    );
    expect(platformOnly.subject).toMatch(/^Restante pago/);
    expect(platformOnly.text).toContain("Comissão (6%): —");
  });
});
