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
    /**
     * The §2.6 welcome. The English source line is ungendered and the guest's
     * gender is never asked for, so the Portuguese has to be ungendered too:
     * the noun "Boas-vindas" instead of an agreeing adjective, and the
     * reciprocal "conhecermo-nos" instead of a pronoun that has to pick one.
     * Any new PT guest line follows the same rule — there is no gender logic
     * anywhere in `lib/booking-emails.ts`, by design.
     */
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
    /**
     * The withdrawal right and the terms of sale, in the footer — the one part
     * of this mail that is there for the law rather than for the guest.
     *
     * The checkout page says both already (`terms.ts`), but a web page is not a
     * durable medium (CJEU C-49/11) and DL 24/2014 art. 6(1) wants the art. 4
     * information on one. A confirmation email is: it arrives, it stays, and
     * the guest can reread it a month later. So the statement the guest was
     * shown before paying is repeated here, with the terms one tap away.
     *
     * `{terms}` becomes a link to `/{locale}/termos`, labelled from
     * `terms.ts` `checkoutNotice.linkLabel` so the terms are named the same way
     * at the pay button and in the mail that follows it. One sentence, because
     * the 14 days and the 48 hours are the same fact seen twice and a guest who
     * wants the rest has the link.
     */
    withdrawalNote: {
      pt: "O direito de livre resolução de 14 dias não se aplica a experiências reservadas para uma data específica (artigo 17.º, n.º 1, alínea l), do Decreto-Lei n.º 24/2014) — em vez dele aplica-se a política de cancelamento acima, descrita nos {terms}.",
      en: "The 14-day right of withdrawal does not apply to experiences booked for a specific date (Article 17(1)(l) of Portuguese Decree-Law 24/2014) — the cancellation policy above applies instead, and is set out in the {terms}.",
    } as Localized,
    /** The plain-text part, where a link is a URL on its own line. */
    termsTextLine: {
      pt: "Termos de venda: {url}",
      en: "Terms of sale: {url}",
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

  /**
   * The §2.6 reminder — "Olá, Tomorrow is the big day, here is some
   * information about the meeting point" — sent by the daily dispatcher
   * (`lib/cron/day-before-reminder.ts`).
   *
   * **Two mornings, one message.** The run at 06:00 UTC reminds tomorrow's
   * bookings; it also catches today's bookings nobody reminded yet — a booking
   * made, or a tour moved, after yesterday's run — with the `today` wording.
   * Everything but the words for *when* is shared.
   *
   * **No money and no cancel link.** A reminder is logistics: cash and card
   * bookings read the same, and by the day before the 48-hour free
   * cancellation has closed, so offering the link would offer nothing.
   *
   * The PT is ungendered, as every guest line is (see `guest.lead`).
   */
  reminder: {
    tomorrow: {
      subject: {
        pt: "Amanhã é o grande dia — {experience}, {date}",
        en: "Tomorrow is the big day — {experience}, {date}",
      } as Localized,
      banner: {
        pt: "Amanhã é o grande dia",
        en: "Tomorrow is the big day",
      } as Localized,
      lead: {
        pt: "Amanhã é o grande dia! Aqui fica a informação sobre o ponto de encontro.",
        en: "Tomorrow is the big day! Here is some information about the meeting point.",
      } as Localized,
      signoff: {
        pt: "Até amanhã,\nDiogo e Rita\nAgorasim",
        en: "See you tomorrow,\nDiogo and Rita\nAgorasim",
      } as Localized,
    },
    today: {
      subject: {
        pt: "Hoje é o grande dia — {experience}, {date}",
        en: "Today is the big day — {experience}, {date}",
      } as Localized,
      banner: {
        pt: "Hoje é o grande dia",
        en: "Today is the big day",
      } as Localized,
      lead: {
        pt: "Hoje é o grande dia! Aqui fica a informação sobre o ponto de encontro.",
        en: "Today is the big day! Here is some information about the meeting point.",
      } as Localized,
      signoff: {
        pt: "Até já,\nDiogo e Rita\nAgorasim",
        en: "See you soon,\nDiogo and Rita\nAgorasim",
      } as Localized,
    },
    preheader: {
      pt: "Referência {ref} · onde nos encontramos e a que horas",
      en: "Reference {ref} · where we meet and when",
    } as Localized,
    greeting: {
      pt: "Olá {name},",
      en: "Hello {name},",
    } as Localized,
    detailsHeading: {
      pt: "A sua experiência",
      en: "Your experience",
    } as Localized,
    /**
     * Only for a tour whose departures still have no clock time — Óbidos
     * today (`content/logistics.ts`). The confirmation promised the hour "by
     * email or WhatsApp"; this is the morning that promise must have been kept,
     * so the guest who has not had it is told whom to call, with the numbers in
     * the sentence rather than somewhere below it.
     */
    departureTime: {
      title: { pt: "A hora da partida", en: "Your departure time" } as Localized,
      body: {
        pt: "Se ainda não recebeu de nós a hora exata da partida, ligue ou envie mensagem ao Diogo ({diogoPhone}) ou à Rita ({ritaPhone}).",
        en: "If you haven't had the exact departure time from us yet, call or message Diogo ({diogoPhone}) or Rita ({ritaPhone}).",
      } as Localized,
    },
    changeNote: {
      pt: "Se precisar de alguma coisa, responda a este email ou ligue-nos:",
      en: "If you need anything, reply to this email or call us:",
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
    /** Same §2.6 welcome as the confirmation, ungendered for the same reason. */
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

  /**
   * To the couple: the quote Rita built on the Sales board, and the link to
   * the page where the deposit holds the date (D25).
   *
   * The money is stated in full here — the total, the deposit, the balance and
   * when it falls due — because this mail is the offer, the thing a couple
   * forwards to the parents paying for it. The page repeats it and adds the
   * button; the mail must stand on its own if the page is never opened.
   *
   * Ungendered Portuguese, as every guest line: see `guest.lead`.
   */
  quoteSent: {
    subject: {
      pt: "O seu orçamento Agorasim — {date}",
      en: "Your Agorasim quote — {date}",
    } as Localized,
    preheader: {
      pt: "{total} · o sinal de {deposit} reserva a data",
      en: "{total} · a {deposit} deposit holds the date",
    } as Localized,
    banner: { pt: "O seu orçamento", en: "Your quote" } as Localized,
    greeting: { pt: "Olá {name},", en: "Hello {name}," } as Localized,
    lead: {
      pt: "Obrigado por pensar em nós para o seu dia. Preparámos o orçamento à medida — os detalhes estão abaixo.",
      en: "Thank you for thinking of us for your day. Here is the quote we prepared for it — the details are below.",
    } as Localized,
    detailsHeading: { pt: "Orçamento", en: "Quote" } as Localized,
    labels: {
      reference: { pt: "Referência", en: "Reference" } as Localized,
      date: { pt: "Data do evento", en: "Event date" } as Localized,
      venue: { pt: "Local", en: "Venue" } as Localized,
      total: { pt: "Total", en: "Total" } as Localized,
      deposit: { pt: "Sinal ({percent}%)", en: "Deposit ({percent}%)" } as Localized,
      balance: { pt: "Restante", en: "Balance" } as Localized,
    },
    /** The balance row's value: the amount and the day it is asked for. */
    balanceDue: { pt: "{amount} · até {date}", en: "{amount} · due {date}" } as Localized,
    /** A line with more than one unit: "2 × Carro clássico". */
    lineQuantity: "{quantity} × {label}",
    next: {
      title: { pt: "Como reservar a data", en: "How to hold the date" } as Localized,
      body: {
        pt: "A data fica reservada com o pagamento do sinal, na página do orçamento. O restante é pedido automaticamente {days} dias antes do evento.",
        en: "The date is held once the deposit is paid, on the quote page. The balance is requested automatically {days} days before the event.",
      } as Localized,
    },
    cta: { pt: "Ver o orçamento", en: "View your quote" } as Localized,
    ctaTextLine: { pt: "Ver o orçamento: {url}", en: "View your quote: {url}" } as Localized,
    /** D9 — the default deposit terms, until the client's lawyer answers. */
    termsNote: {
      pt: "O sinal não é reembolsável a menos de {days} dias do evento; a data pode ser alterada sem custos, sujeita a disponibilidade.",
      en: "The deposit is non-refundable within {days} days of the event; the date can be changed free of charge, subject to availability.",
    } as Localized,
    questions: {
      pt: "Alguma dúvida? Responda a este email ou ligue-nos:",
      en: "Any questions? Reply to this email or call us:",
    } as Localized,
    signoff: {
      pt: "Até breve,\nDiogo e Rita\nAgorasim",
      en: "See you soon,\nDiogo and Rita\nAgorasim",
    } as Localized,
    footerNote: {
      pt: "Recebeu este email porque pediu um orçamento em {site}.",
      en: "You are receiving this email because you asked for a quote at {site}.",
    } as Localized,
  },

  /**
   * The receipt a couple get when an instalment of their quote is paid —
   * `deposit-received` for the sinal, `balance-paid` for the rest.
   *
   * It is also the durable copy of the terms (DL 24/2014 art. 4(1), 17(1)(l)):
   * the events section of `terms.ts` travels in it verbatim, with its version,
   * so what the couple agreed to is in their inbox and not only on a page we
   * control. There is no link to the quote page: this mail is usually sent by
   * the webhook, which never holds the plaintext token, so the receipt points
   * at the quote email instead (decided with the operator at Build).
   */
  quoteReceipt: {
    subject: {
      deposit: {
        pt: "Sinal recebido — a data de {date} está reservada",
        en: "Deposit received — {date} is held for you",
      } as Localized,
      balance: {
        pt: "Pagamento concluído — {date}",
        en: "Paid in full — {date}",
      } as Localized,
    },
    preheader: {
      deposit: {
        pt: "Recebemos {amount} · o restante é pedido até {due}",
        en: "We received {amount} · the balance is due by {due}",
      } as Localized,
      balance: {
        pt: "Recebemos {amount} · está tudo pago",
        en: "We received {amount} · everything is paid",
      } as Localized,
    },
    banner: {
      deposit: { pt: "Sinal recebido", en: "Deposit received" } as Localized,
      balance: { pt: "Pagamento concluído", en: "Paid in full" } as Localized,
    },
    greeting: { pt: "Olá {name},", en: "Hello {name}," } as Localized,
    lead: {
      deposit: {
        pt: "Recebemos o seu sinal — a data do seu evento está reservada. Obrigado!",
        en: "We have received your deposit — the date of your event is held for you. Thank you!",
      } as Localized,
      balance: {
        pt: "Recebemos o pagamento do restante — o seu evento está pago na totalidade. Obrigado!",
        en: "We have received the balance — your event is paid in full. Thank you!",
      } as Localized,
    },
    detailsHeading: { pt: "Recibo", en: "Receipt" } as Localized,
    labels: {
      reference: { pt: "Referência", en: "Reference" } as Localized,
      date: { pt: "Data do evento", en: "Event date" } as Localized,
      venue: { pt: "Local", en: "Venue" } as Localized,
      paid: {
        deposit: { pt: "Sinal pago", en: "Deposit paid" } as Localized,
        balance: { pt: "Restante pago", en: "Balance paid" } as Localized,
      },
      paidOn: { pt: "Pago em", en: "Paid on" } as Localized,
      total: { pt: "Total do orçamento", en: "Quote total" } as Localized,
      remaining: { pt: "Por pagar", en: "Still to pay" } as Localized,
    },
    /** The "still to pay" row after the deposit: the amount and its day. */
    remainingDue: { pt: "{amount} · até {date}", en: "{amount} · due {date}" } as Localized,
    fullyPaid: { pt: "Nada — está tudo pago", en: "Nothing — everything is paid" } as Localized,
    next: {
      title: { pt: "O que acontece a seguir", en: "What happens next" } as Localized,
      body: {
        pt: "Enviamos-lhe o link para pagar o restante {days} dias antes do evento. O seu orçamento continua disponível no link do email em que o recebeu.",
        en: "We will send you the link to pay the balance {days} days before the event. Your quote stays available at the link in the email you received it with.",
      } as Localized,
    },
    /** Heading over the events terms, reproduced verbatim below it. */
    termsHeading: {
      pt: "As condições do seu evento (versão de {version})",
      en: "The conditions of your event (version of {version})",
    } as Localized,
    fullTerms: {
      pt: "Termos de venda completos: {url}",
      en: "Full terms of sale: {url}",
    } as Localized,
    fullTermsLink: {
      pt: "Ler os termos de venda completos",
      en: "Read the full terms of sale",
    } as Localized,
    questions: {
      pt: "Alguma dúvida? Responda a este email ou ligue-nos:",
      en: "Any questions? Reply to this email or call us:",
    } as Localized,
    signoff: {
      pt: "Até breve,\nDiogo e Rita\nAgorasim",
      en: "See you soon,\nDiogo and Rita\nAgorasim",
    } as Localized,
    footerNote: {
      pt: "Recebeu este email porque pagou um orçamento em {site}.",
      en: "You are receiving this email because you paid a quote at {site}.",
    } as Localized,
  },

  /** To Diogo & Rita. Portuguese — an instalment of a quote was paid. */
  teamQuoteReceipt: {
    subject: {
      deposit: "Sinal recebido — {name} · {date}",
      balance: "Restante pago — {name} · {date}",
    },
    preheader: "{ref} · {amount}",
    banner: {
      deposit: "Sinal recebido",
      balance: "Restante pago",
    },
    heading: {
      deposit: "O sinal do orçamento {ref} foi pago — a data está reservada.",
      balance: "O restante do orçamento {ref} foi pago — está tudo pago.",
    },
    detailsHeading: "Pagamento",
    labels: {
      reference: "Referência",
      date: "Data do evento",
      venue: "Local",
      amount: "Valor pago",
      fee: "Comissão (6%)",
      total: "Total do orçamento",
      remaining: "Por pagar",
    },
    remainingDue: "{amount} · até {date}",
    fullyPaid: "Nada",
    /** No connected account: the charge is the platform's and carries no fee. */
    noFee: "—",
    guestHeading: "Cliente",
    guestLabels: {
      name: "Nome",
      email: "Email",
      phone: "Telefone",
    },
    cta: "Ver no painel",
    ctaLine: "Ver no painel: {adminUrl}",
    footerNote: "Notificação automática do site — responda para escrever ao cliente.",
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
