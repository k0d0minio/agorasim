import type { Localized } from "@/i18n/config";

/**
 * Confirmation emails, PT and EN.
 *
 * **The wording lives here, in pieces.** Every string a booking email can
 * contain is one entry below, with `{placeholders}` for the facts — so the copy
 * is one file Diogo & Rita can be shown and can argue with, same principle as
 * the rest of `src/content/`. The pieces are assembled twice in
 * `lib/booking-emails.ts`: once into the branded HTML, and once into the plain
 * text alternative. Two renderings, one set of sentences — the alternative
 * being two copies of the same message that drift apart the first time a phone
 * number changes.
 *
 * **The guest's mail goes out in the language they booked in**, which is the
 * language of the `/pt` or `/en` path they booked and confirmed on. The team's
 * goes out in Portuguese, always: it is an internal notification to two
 * Portuguese speakers, and translating it would only mean two versions of an
 * operational message to keep in step.
 *
 * Both mails ship a plain text part as well as the HTML one. A booking
 * confirmation is read on a phone, forwarded, printed at a hotel desk and
 * occasionally opened in a client that shows text only; the version of it that
 * survives all four is text.
 */
export const bookingEmails = {
  /** To the guest, in their own language. */
  guest: {
    subject: {
      pt: "Reserva confirmada — {experience}, {date}",
      en: "Booking confirmed — {experience}, {date}",
    } as Localized,
    /** The grey line next to the subject in an inbox list. */
    preheader: {
      pt: "Referência {ref} · {experience}, {date}",
      en: "Reference {ref} · {experience}, {date}",
    } as Localized,
    /** The green strip across the top of the card. */
    banner: {
      pt: "Reserva confirmada",
      en: "Booking confirmed",
    } as Localized,
    greeting: {
      pt: "Olá {name},",
      en: "Hello {name},",
    } as Localized,
    lead: {
      pt: "A sua reserva está confirmada. Obrigado por escolher a Agorasim.",
      en: "Your booking is confirmed. Thank you for choosing Agorasim.",
    } as Localized,
    detailsHeading: {
      pt: "Detalhes da reserva",
      en: "Your booking",
    } as Localized,
    labels: {
      reference: { pt: "Referência", en: "Reference" } as Localized,
      experience: { pt: "Experiência", en: "Experience" } as Localized,
      date: { pt: "Data", en: "Date" } as Localized,
      party: { pt: "Pessoas", en: "Guests" } as Localized,
      /** Omitted entirely when there are none — see `lib/booking-emails.ts`. */
      addOns: { pt: "Extras", en: "Add-ons" } as Localized,
      total: { pt: "Total pago", en: "Total paid" } as Localized,
    },
    next: {
      title: { pt: "O que acontece a seguir", en: "What happens next" } as Localized,
      body: {
        pt: "Entramos em contacto consigo antes do dia para combinar a hora e o local de encontro.",
        en: "We will be in touch before the day to agree a time and a meeting point.",
      } as Localized,
    },
    changeNote: {
      pt: "Se precisar de alterar alguma coisa, responda a este email ou ligue-nos:",
      en: "If anything needs to change, reply to this email or call us:",
    } as Localized,
    signoff: {
      pt: "Até breve,\nAgorasim",
      en: "See you soon,\nAgorasim",
    } as Localized,
    /** Why this email exists, in the footer. Transactional, so no unsubscribe. */
    footerNote: {
      pt: "Recebeu este email porque reservou uma experiência em {site}.",
      en: "You are receiving this email because you booked an experience at {site}.",
    } as Localized,
  },

  /** To Diogo & Rita. Portuguese only — see the note above. */
  team: {
    subject: "Nova reserva paga — {date} · {name} ({party}p)",
    preheader: "{experience} · {party} pessoas · {total}",
    banner: "Nova reserva paga",
    heading: "Nova reserva paga através do site.",
    detailsHeading: "Reserva",
    labels: {
      reference: "Referência",
      date: "Data",
      experience: "Experiência",
      addOns: "Extras",
      party: "Pessoas",
      total: "Total",
    },
    guestHeading: "Cliente",
    guestLabels: {
      name: "Nome",
      email: "Email",
      phone: "Telefone",
      locale: "Idioma",
    },
    cta: "Ver no painel",
    /** How the same link reads in the plain text part. */
    ctaLine: "Ver no painel: {adminUrl}",
    footerNote: "Notificação automática do site — responda para escrever ao cliente.",
  },
} as const;
