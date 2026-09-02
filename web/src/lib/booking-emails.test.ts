import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  guestCancellationEmail,
  guestConfirmationEmail,
  guestMoveEmail,
  partyLabel,
  teamCancellationEmail,
  teamNotificationEmail,
  type BookingCancellationFacts,
  type BookingEmailFacts,
  type BookingMoveFacts,
  type TeamCancellationFacts,
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
    experience: "Rural Saloia — experiência privada",
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
    experience: "Rural Saloia — experiência privada",
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
