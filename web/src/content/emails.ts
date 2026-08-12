import type { Localized } from "@/i18n/config";

/**
 * Confirmation emails, PT and EN.
 *
 * Written as plain text with `{placeholders}` rather than as templates in code,
 * so the wording is one file Diogo & Rita can be shown and can argue with —
 * same principle as the rest of `src/content/`. The substitution happens in
 * `lib/booking-emails.ts`, which is where the tests are.
 *
 * The guest's mail goes out in the language they booked in. The team's goes out
 * in Portuguese, always: it is an internal notification to two Portuguese
 * speakers, and translating it would only mean two versions of an operational
 * message to keep in step.
 *
 * Deliberately plain. A booking confirmation is read on a phone, forwarded, and
 * printed at a hotel desk; the version of it that survives all three is text.
 */
export const bookingEmails = {
  /** To the guest, in their own language. */
  guest: {
    subject: {
      pt: "Reserva confirmada — {experience}, {date}",
      en: "Booking confirmed — {experience}, {date}",
    } as Localized,
    body: {
      pt: `Olá {name},

A sua reserva está confirmada. Obrigado por escolher a Agorasim.

Referência: {ref}
Experiência: {experience}
Data: {date}
Pessoas: {party}
{addOns}Total pago: {total}

Entramos em contacto consigo antes do dia para combinar a hora e o local de encontro. Se precisar de alterar alguma coisa, responda a este email ou ligue-nos:

Diogo {diogo}
Rita {rita}

Até breve,
Agorasim
{site}`,
      en: `Hello {name},

Your booking is confirmed. Thank you for choosing Agorasim.

Reference: {ref}
Experience: {experience}
Date: {date}
Guests: {party}
{addOns}Total paid: {total}

We will be in touch before the day to agree a time and a meeting point. If anything needs to change, reply to this email or call us:

Diogo {diogo}
Rita {rita}

See you soon,
Agorasim
{site}`,
    } as Localized,
    /** Rendered in place of `{addOns}` — omitted entirely when there are none. */
    addOnsLine: {
      pt: "Extras: {list}\n",
      en: "Add-ons: {list}\n",
    } as Localized,
  },

  /** To Diogo & Rita. Portuguese only — see the note above. */
  team: {
    subject: "Nova reserva paga — {date} · {name} ({party}p)",
    body: `Nova reserva paga através do site.

Referência: {ref}
Data: {date}
Experiência: {experience}
{addOns}Pessoas: {party}
Total: {total}

Cliente: {name}
Email: {email}
Telefone: {phone}
Idioma: {locale}

Ver no painel: {adminUrl}`,
    addOnsLine: "Extras: {list}\n",
  },
} as const;
