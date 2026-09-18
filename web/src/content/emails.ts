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
      pt: "Boas-vindas à região do campo onde crescemos. Será um prazer conhecermo-nos.\n\nA sua reserva está confirmada.",
      en: "Welcome to the countryside where we grew up. It will be a pleasure to meet you.\n\nYour booking is confirmed.",
    } as Localized,
    detailsHeading: {
      pt: "Detalhes da reserva",
      en: "Your booking",
    } as Localized,
    labels: {
      reference: { pt: "Referência", en: "Reference" } as Localized,
      experience: { pt: "Experiência", en: "Experience" } as Localized,
      date: { pt: "Data", en: "Date" } as Localized,
      departure: { pt: "Partida", en: "Departure" } as Localized,
      /** Linked to the maps pin when the tour has one. */
      meetingPoint: { pt: "Ponto de encontro", en: "Meeting point" } as Localized,
      party: { pt: "Pessoas", en: "Guests" } as Localized,
      /** Omitted entirely when there are none — see `lib/booking-emails.ts`. */
      addOns: { pt: "Extras", en: "Add-ons" } as Localized,
      total: { pt: "Total pago", en: "Total paid" } as Localized,
    },
    /** "2 adultos · 1 criança" — the party row, in the guest's language. */
    partyWords: {
      adult: { pt: "adulto", en: "adult" } as Localized,
      adults: { pt: "adultos", en: "adults" } as Localized,
      child: { pt: "criança (4–12)", en: "child (4–12)" } as Localized,
      children: { pt: "crianças (4–12)", en: "children (4–12)" } as Localized,
      infant: { pt: "bebé", en: "infant" } as Localized,
      infants: { pt: "bebés", en: "infants" } as Localized,
    },
    /** How the departure was sold, appended to the experience row. */
    modeWords: {
      public: { pt: "partida partilhada", en: "shared departure" } as Localized,
      private: { pt: "experiência privada", en: "private experience" } as Localized,
    },
    next: {
      title: { pt: "O que acontece a seguir", en: "What happens next" } as Localized,
      body: {
        pt: "Está tudo marcado: encontramo-nos no ponto de encontro indicado acima, à hora da sua partida. Se precisar de alguma coisa antes do dia, responda a este email.",
        en: "Everything is set: we meet at the meeting point above, at your departure time. If you need anything before the day, just reply to this email.",
      } as Localized,
    },
    /**
     * Added to "what happens next" only for a tour whose departure has no clock
     * time yet — Óbidos today, see `content/logistics.ts`. Without it the
     * paragraph above refers a guest to "your departure time" and this email
     * never says what it is.
     */
    departureTimeNote: {
      pt: "A hora exata da partida segue por email ou WhatsApp antes do dia da experiência — o ponto de encontro é o indicado acima e não muda.",
      en: "The exact departure time follows by email or WhatsApp before the day of your experience — the meeting point is the one above and does not change.",
    } as Localized,
    cancellationNote: {
      pt: "Cancelamento gratuito até 48 horas antes da experiência. Com mau tempo, tentamos sempre reagendar — e reembolsamos em condições extremas.",
      en: "Free cancellation up to 48 hours before the experience. In bad weather we always try to reschedule — and refund in extreme conditions.",
    } as Localized,
    changeNote: {
      pt: "Se precisar de alterar alguma coisa, responda a este email ou ligue-nos:",
      en: "If anything needs to change, reply to this email or call us:",
    } as Localized,
    /**
     * The self-serve cancel link, and the sentence that frames it.
     *
     * Omitted entirely — button, line and all — when the booking has no usable
     * token (`BOOKING_TOKEN_SECRET` unset). A confirmation that promises free
     * cancellation and then shows a dead link is worse than one that leaves the
     * promise to the phone numbers underneath it, which is why
     * `lib/booking-emails.ts` drops the whole block rather than linking to a
     * page that will not know the guest.
     *
     * Worded as "if you need to" rather than as an invitation: it sits in a
     * confirmation, below the part the guest is actually reading.
     */
    cancelLink: {
      label: { pt: "Cancelar a reserva", en: "Cancel this booking" } as Localized,
      note: {
        pt: "Se precisar de cancelar, pode fazê-lo aqui até 48 horas antes da partida — sem custos e com devolução do valor total.",
        en: "If you need to cancel, you can do it here up to 48 hours before departure — free of charge, with the full amount returned.",
      } as Localized,
      /** The plain-text part, where a button is a URL on its own line. */
      textLine: {
        pt: "Cancelar a reserva (até 48h antes): {url}",
        en: "Cancel this booking (up to 48h before): {url}",
      } as Localized,
    },
    signoff: {
      pt: "Até breve,\nDiogo e Rita\nAgorasim",
      en: "See you soon,\nDiogo and Rita\nAgorasim",
    } as Localized,
    /** Why this email exists, in the footer. Transactional, so no unsubscribe. */
    footerNote: {
      pt: "Recebeu este email porque reservou uma experiência em {site}.",
      en: "You are receiving this email because you booked an experience at {site}.",
    } as Localized,
  },

  /**
   * The cancellation notice, in the guest's own language.
   *
   * One message for every way a booking ends, because from the guest's side
   * there is only one fact — their tour is off — and the money is a line in it,
   * not a different email. What varies is said in one place: {@link
   * cancellation.refundLine} when something went back, {@link
   * cancellation.noRefundLine} when nothing did, and the partial case names
   * both amounts rather than letting a guest who paid €340 read "€170
   * refunded" and wonder about the rest.
   *
   * Deliberately silent about *why*. The team cancels for weather, for a car
   * that will not start and for goodwill, and a template that guessed between
   * them would eventually guess wrong at somebody; whoever cancelled is on the
   * phone or in a reply anyway, which is where the reason belongs.
   */
  cancellation: {
    subject: {
      pt: "Reserva cancelada — {experience}, {date}",
      en: "Booking cancelled — {experience}, {date}",
    } as Localized,
    preheader: {
      pt: "Referência {ref} · {date}",
      en: "Reference {ref} · {date}",
    } as Localized,
    banner: {
      pt: "Reserva cancelada",
      en: "Booking cancelled",
    } as Localized,
    greeting: {
      pt: "Olá {name},",
      en: "Hello {name},",
    } as Localized,
    lead: {
      pt: "A sua reserva de {date} foi cancelada.",
      en: "Your booking for {date} has been cancelled.",
    } as Localized,
    detailsHeading: {
      pt: "A reserva cancelada",
      en: "The cancelled booking",
    } as Localized,
    labels: {
      /** What the guest had paid, before any of it went back. */
      paid: { pt: "Total pago", en: "Total paid" } as Localized,
      refund: { pt: "Reembolso", en: "Refund" } as Localized,
    },
    /** The money is going back — in full or in part. */
    refundLine: {
      title: { pt: "O reembolso", en: "Your refund" } as Localized,
      body: {
        pt: "Devolvemos {refund} para o mesmo cartão ou método com que pagou. O valor costuma aparecer em 5 a 10 dias úteis, consoante o banco.",
        en: "We have returned {refund} to the same card or method you paid with. It usually appears within 5 to 10 working days, depending on your bank.",
      } as Localized,
    },
    /** Added only when the refund is smaller than the total — see the note above. */
    partialNote: {
      pt: "Pagou {total} e devolvemos {refund}. Se isto não for o que combinámos, responda a este email.",
      en: "You paid {total} and we returned {refund}. If that is not what we agreed, just reply to this email.",
    } as Localized,
    /** Nothing went back — said plainly rather than left to be noticed. */
    noRefundLine: {
      title: { pt: "Sobre o pagamento", en: "About your payment" } as Localized,
      body: {
        pt: "Não foi devolvido nenhum valor desta reserva. Se acha que devia ter sido, responda a este email ou ligue-nos — resolvemos consigo.",
        en: "No amount has been returned for this booking. If you believe it should have been, reply to this email or call us — we will sort it out with you.",
      } as Localized,
    },
    changeNote: {
      pt: "Se quiser voltar a marcar, ou se isto foi um engano, responda a este email ou ligue-nos:",
      en: "If you would like to book again, or if this was a mistake, reply to this email or call us:",
    } as Localized,
    signoff: {
      pt: "Até uma próxima,\nAgorasim",
      en: "Until next time,\nAgorasim",
    } as Localized,
    footerNote: {
      pt: "Recebeu este email porque tinha uma reserva em {site}.",
      en: "You are receiving this email because you had a booking at {site}.",
    } as Localized,
  },

  /**
   * To the guest, when the team moves their tour to another departure.
   *
   * The client's own weather policy is reschedule-first (info PDF §1.4), so
   * this is the message that policy produces: same booking, same money, same
   * people, a different departure. It is shaped like the confirmation on
   * purpose — a guest who is about to be somewhere at a time needs the details
   * block, the meeting point and the hour, not a paragraph about the change —
   * and it names the old date so the mail reads as a correction of a specific
   * plan rather than a second booking nobody made.
   *
   * Deliberately silent about *why*, like the cancellation copy: whoever moved
   * it is on the phone or in a reply, which is where the weather belongs.
   */
  moved: {
    subject: {
      pt: "Nova data — {experience}, {date}",
      en: "New date — {experience}, {date}",
    } as Localized,
    preheader: {
      pt: "Referência {ref} · agora a {date}",
      en: "Reference {ref} · now on {date}",
    } as Localized,
    banner: {
      pt: "A sua reserva mudou de data",
      en: "Your booking has moved",
    } as Localized,
    greeting: {
      pt: "Olá {name},",
      en: "Hello {name},",
    } as Localized,
    lead: {
      pt: "Passámos o seu passeio de {previousDate} para {date}. O resto fica tudo igual — a mesma experiência, as mesmas pessoas e o valor já pago.",
      en: "We have moved your experience from {previousDate} to {date}. Everything else stays as it was — the same experience, the same guests and the amount you have already paid.",
    } as Localized,
    detailsHeading: {
      pt: "A reserva, com a nova data",
      en: "Your booking, with the new date",
    } as Localized,
    labels: {
      /** The departure this booking used to be on — date and hour together. */
      previous: { pt: "Antes", en: "Previously" } as Localized,
    },
    /** What to do if the new departure does not work for them. */
    note: {
      title: { pt: "Se a nova data não servir", en: "If the new date does not work" } as Localized,
      body: {
        pt: "Responda a este email ou ligue-nos e procuramos outra — e se preferir cancelar, o cancelamento continua gratuito até 48 horas antes da nova data.",
        en: "Reply to this email or call us and we will find another one — and if you would rather cancel, cancellation stays free up to 48 hours before the new date.",
      } as Localized,
    },
    signoff: {
      pt: "Até lá,\nAgorasim",
      en: "See you then,\nAgorasim",
    } as Localized,
    footerNote: {
      pt: "Recebeu este email porque tem uma reserva em {site}.",
      en: "You are receiving this email because you have a booking at {site}.",
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
      departure: "Partida",
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
    /**
     * The job this booking leaves open, said where they will see it: the guest
     * was told the hour follows, so somebody has to send it.
     */
    departureTimeNote: {
      title: "Falta combinar a hora",
      body: "Esta rota ainda não tem hora de partida publicada. O cliente foi informado de que a hora exata segue por email ou WhatsApp antes do dia — combinem-na com ele.",
    },
    cta: "Ver no painel",
    /** How the same link reads in the plain text part. */
    ctaLine: "Ver no painel: {adminUrl}",
    footerNote: "Notificação automática do site — responda para escrever ao cliente.",
  },

  /**
   * To Diogo & Rita, when a guest cancels themselves. Portuguese, like every
   * other message that goes to the team.
   *
   * It exists because the self-serve link is the one path that ends a booking
   * with nobody at the business in the loop: from the Sales board they are the
   * ones who pressed the button and a notification would be telling them what
   * they just did, but a link opened at 23:00 by a guest in another country
   * frees a car and moves money with no other trace than the audit log. This is
   * the message that makes the morning's roster true.
   *
   * The reason is deliberately not guessed at — the guest gave none, and the
   * team's next move is a phone call if they want one.
   */
  teamCancellation: {
    subject: "Reserva cancelada pelo cliente — {date} · {name}",
    preheader: "{experience} · {ref} · reembolso {refund}",
    banner: "Cancelamento do cliente",
    heading: "O cliente cancelou esta reserva através do link do email de confirmação. O lugar já está livre e o reembolso foi pedido ao Stripe.",
    detailsHeading: "Reserva cancelada",
    labels: {
      refund: "Reembolsado",
      cancelledAt: "Cancelada em",
    },
    /** Said only when Stripe refused — the one line that needs a person. */
    refundFailed: {
      title: "O reembolso não passou",
      body: "A reserva está cancelada e o lugar livre, mas o Stripe recusou o reembolso. Emita-o no painel do Stripe e avise o cliente.",
    },
    cta: "Ver no painel",
    ctaLine: "Ver no painel: {adminUrl}",
    footerNote: "Notificação automática do site — responda para escrever ao cliente.",
  },

  /** To the guest, acknowledging their enquiry. Warm §2.6 voice, bilingual. */
  enquiryAck: {
    subject: {
      pt: "Recebemos o seu pedido — Agorasim",
      en: "We received your enquiry — Agorasim",
    } as Localized,
    preheader: {
      pt: "A equipa entra em contacto em breve",
      en: "The team will be in touch soon",
    } as Localized,
    banner: {
      pt: "Pedido recebido",
      en: "Enquiry received",
    } as Localized,
    greeting: {
      pt: "Olá {name},",
      en: "Hello {name},",
    } as Localized,
    lead: {
      pt: "Boas-vindas à região do campo onde crescemos. Será um prazer conhecermo-nos.\n\nRecebemos o seu pedido e a equipa entra em contacto brevemente para combinar os detalhes.",
      en: "Welcome to the countryside where we grew up. It will be a pleasure to meet you.\n\nWe have received your enquiry and the team will be in touch shortly to arrange the details.",
    } as Localized,
    note: {
      title: { pt: "Próximos passos", en: "Next steps" } as Localized,
      body: {
        pt: "Se preferir, pode também contactar-nos diretamente:",
        en: "If you prefer, you can also reach us directly:",
      } as Localized,
    },
    signoff: {
      pt: "Até breve,\nDiogo e Rita\nAgorasim",
      en: "See you soon,\nDiogo and Rita\nAgorasim",
    } as Localized,
    footerNote: {
      pt: "Recebeu este email porque fez um pedido em {site}.",
      en: "You are receiving this email because you made an enquiry at {site}.",
    } as Localized,

    /**
     * What changes when the enquiry is a wedding or an event: the promise.
     *
     * A tour enquiry is answered with a date; these are answered with a price,
     * worked out by hand for that venue and that day (§2.3, §2.6). Only the
     * four lines that say so are rewritten — the greeting, the phone numbers,
     * the sign-off and the footer are the same voice and stay shared, rather
     * than becoming a second copy to keep in step.
     */
    quote: {
      subject: {
        pt: "Recebemos o seu pedido de orçamento — Agorasim",
        en: "We received your quote request — Agorasim",
      } as Localized,
      preheader: {
        pt: "Respondemos em 24–48h com uma proposta",
        en: "We reply within 24–48h with a proposal",
      } as Localized,
      banner: {
        pt: "Pedido de orçamento recebido",
        en: "Quote request received",
      } as Localized,
      lead: {
        pt: "Obrigado por pensar em nós para o seu dia. Será um prazer fazer parte dele.\n\nRecebemos o seu pedido e voltamos ao seu contacto em 24–48h com uma proposta à medida — sem compromisso.",
        en: "Thank you for thinking of us for your day. It would be a pleasure to be part of it.\n\nWe have received your request and will come back to you within 24–48h with a tailored quote — no obligation.",
      } as Localized,
    },
  },

  /** To Diogo & Rita. Portuguese — a new enquiry has arrived. */
  teamEnquiry: {
    subject: "Novo pedido — {name}",
    preheader: "{party} pessoas · {date}",
    banner: "Novo pedido",
    heading: "Alguém enviou um pedido através do site.",
    detailsHeading: "Pedido",
    labels: {
      date: "Data preferida",
      experience: "Experiência",
      party: "Pessoas",
      message: "Mensagem",
    },
    guestHeading: "Cliente",
    guestLabels: {
      name: "Nome",
      email: "Email",
      phone: "Telefone",
      locale: "Idioma",
    },
    cta: "Ver no painel",
    ctaLine: "Ver no painel: {adminUrl}",
    footerNote: "Notificação automática do site — responda para escrever ao cliente.",

    /**
     * The wedding/event copy of the same mail. Portuguese, like the rest of the
     * team's mail, and it swaps the one row that is always empty on these
     * (`Experiência`) for the three a quote is actually written from.
     */
    quote: {
      subject: {
        wedding: "Novo pedido de orçamento (casamento) — {name}",
        event: "Novo pedido de orçamento (evento) — {name}",
      },
      preheader: "{venue} · {date}",
      banner: "Novo pedido de orçamento",
      heading: "Alguém pediu um orçamento através do site.",
      detailsHeading: "Orçamento",
      labels: {
        venue: "Local",
        hours: "Horas de serviço",
        car: "Carro preferido",
      },
    },
  },
} as const;
