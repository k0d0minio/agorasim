import type { Localized } from "@/i18n/config";

/**
 * The couple's quote page — `/[locale]/orcamento/[token]` — and the words on
 * the pay button that page mints a Checkout session from (.icm/intake/README.md § Decisions).
 *
 * The terms themselves are not here: the page renders the events and
 * complaints sections of `terms.ts` verbatim, so what the couple read under
 * the button is the text their receipt carries and the text the terms page
 * publishes. These are only the page's own words around them.
 *
 * `{…}` placeholders are filled by the page. PT and EN kept in step.
 */
export const quotePageContent = {
  metaTitle: { pt: "O seu orçamento", en: "Your quote" } as Localized,
  eyebrow: { pt: "Orçamento {ref}", en: "Quote {ref}" } as Localized,
  greeting: { pt: "Olá {name},", en: "Hello {name}," } as Localized,
  lead: {
    sent: {
      pt: "Aqui está o orçamento que preparámos para o seu dia. Leia as condições abaixo e, quando estiver pronto, pague o sinal para reservar a data.",
      en: "Here is the quote we prepared for your day. Read the conditions below and, when you are ready, pay the deposit to hold the date.",
    } as Localized,
    depositPaid: {
      pt: "O sinal está pago e a data do seu evento está reservada. Obrigado!",
      en: "The deposit is paid and the date of your event is held for you. Thank you!",
    } as Localized,
    paid: {
      pt: "O seu evento está pago na totalidade. Obrigado — até breve!",
      en: "Your event is paid in full. Thank you — see you soon!",
    } as Localized,
  },

  detailsHeading: { pt: "Orçamento", en: "Quote" } as Localized,
  labels: {
    reference: { pt: "Referência", en: "Reference" } as Localized,
    date: { pt: "Data do evento", en: "Event date" } as Localized,
    venue: { pt: "Local", en: "Venue" } as Localized,
    total: { pt: "Total", en: "Total" } as Localized,
  },
  /** A line with more than one unit: "2 × Carro clássico". */
  lineQuantity: "{quantity} × {label}",

  paymentsHeading: { pt: "Pagamentos", en: "Payments" } as Localized,
  /** What each instalment is called — on this page and on Stripe's. */
  instalmentNames: {
    deposit: { pt: "Sinal", en: "Deposit" } as Localized,
    balance: { pt: "Restante", en: "Balance" } as Localized,
  },
  depositLabel: { pt: "Sinal ({percent}%)", en: "Deposit ({percent}%)" } as Localized,
  /** One instalment's state, under its amount. */
  instalmentState: {
    toPay: { pt: "Por pagar", en: "To pay" } as Localized,
    dueBy: { pt: "Por pagar até {date}", en: "Due by {date}" } as Localized,
    /** The balance while the page takes it: from the deposit to its due date. */
    dueByPayNow: {
      pt: "Por pagar até {date} — pode pagar já",
      en: "Due by {date} — you can pay now",
    } as Localized,
    paidOn: { pt: "Pago a {date}", en: "Paid on {date}" } as Localized,
    // Written off by the team: it arrived another way (a transfer).
    settled: { pt: "Liquidado", en: "Settled" } as Localized,
    refunded: { pt: "Reembolsado", en: "Refunded" } as Localized,
  },

  pay: {
    deposit: { pt: "Pagar sinal de {amount}", en: "Pay {amount} deposit" } as Localized,
    balance: { pt: "Pagar restante de {amount}", en: "Pay {amount} balance" } as Localized,
    /**
     * Under the button — the sentence, not a checkbox, as at the tour checkout.
     * The conditions sit below the button, so `noticeConditions` links down to
     * them: "Ao pagar aceita as [condições abaixo] e os [termos de venda]."
     */
    notice: { pt: "Ao pagar aceita as", en: "By paying you accept the" } as Localized,
    noticeConditions: { pt: "condições abaixo", en: "conditions below" } as Localized,
    noticeAnd: { pt: "e os", en: "and the" } as Localized,
    secure: {
      pt: "O pagamento é feito na Stripe. Não guardamos os dados do seu cartão.",
      en: "Payment is taken by Stripe. We never see or store your card details.",
    } as Localized,
  },

  /**
   * The payment step: Stripe's form where the button was, on this page. The
   * heading names what is being paid — "Sinal — 576 €".
   */
  paymentStep: {
    heading: "{instalment} — {amount}",
    back: { pt: "Voltar", en: "Back" } as Localized,
    loading: {
      pt: "A abrir o pagamento seguro…",
      en: "Opening the secure payment…",
    } as Localized,
    /**
     * Stripe's form could not load (a blocked script, the network). Never a
     * redirect to Stripe's own page in its place: the way out is back, or us —
     * the contacts are at the foot of this page.
     */
    failed: {
      pt: "Não foi possível abrir o formulário de pagamento. Volte atrás e tente outra vez, ou fale connosco — os contactos estão mais abaixo.",
      en: "The payment form could not load. Go back and try again, or talk to us — our contacts are below.",
    } as Localized,
  },

  /** The balance's due date has passed (the event day or later): the team takes it from here. */
  closed: {
    title: {
      pt: "O prazo do restante terminou a {date}",
      en: "The balance was due by {date}",
    } as Localized,
    body: {
      pt: "Já não é possível pagar o restante nesta página. Fale connosco — os contactos estão abaixo.",
      en: "The balance can no longer be paid on this page. Please talk to us — our contacts are below.",
    } as Localized,
  },

  /** Back from Stripe, before the payment is on the quote. */
  confirming: {
    title: { pt: "A confirmar o pagamento", en: "Confirming your payment" } as Localized,
    body: {
      pt: "A Stripe já nos avisou — a confirmação chega em instantes, e o recibo segue por email. Pode atualizar esta página.",
      en: "Stripe has told us — the confirmation arrives in a moment, and the receipt follows by email. You can refresh this page.",
    } as Localized,
  },
  /**
   * Back from Stripe on a link that a later email replaced while the couple
   * paid (`lib/quote-return.ts`): the page shows the quote, but takes no
   * payment on the dead link.
   */
  retired: {
    pt: "Este link foi substituído por um mais recente. Para voltar a este orçamento ou pagar o que falta, use o link do último email que lhe enviámos.",
    en: "This link has been replaced by a newer one. To come back to this quote or pay what is left, use the link in the latest email we sent you.",
  } as Localized,
  /** A delayed method (Multibanco): the money is on its way. */
  awaiting: {
    title: { pt: "A aguardar o pagamento", en: "Waiting for your payment" } as Localized,
    body: {
      pt: "Fica registado assim que o banco o confirmar, e enviamos-lhe o recibo por email. Não precisa de pagar outra vez.",
      en: "It is recorded as soon as the bank confirms it, and we email you the receipt. There is no need to pay again.",
    } as Localized,
  },

  /** A tap the server refused — each a sentence, never an error page. */
  refused: {
    unconfigured: {
      pt: "O pagamento online não está disponível neste momento. Ligue-nos ou escreva-nos e tratamos disso consigo.",
      en: "Online payment is not available right now. Call or write to us and we will sort it out with you.",
    } as Localized,
    failed: {
      pt: "Não foi possível abrir o pagamento. Tente outra vez dentro de momentos, ou fale connosco.",
      en: "We could not open the payment. Please try again in a moment, or talk to us.",
    } as Localized,
    closed: {
      pt: "O prazo do restante terminou — fale connosco para o pagar.",
      en: "The balance is past its due date — please talk to us to pay it.",
    } as Localized,
    settled: {
      pt: "Este orçamento já está pago na totalidade.",
      en: "This quote is already paid in full.",
    } as Localized,
    /** A tour quote whose departure filled before the payment (`lib/tour-quote.ts`). */
    noCar: {
      pt: "A partida deste passeio já não tem carro disponível. Ligue-nos ou escreva-nos e combinamos outra data consigo.",
      en: "This tour's departure no longer has a car available. Call or write to us and we will arrange another date with you.",
    } as Localized,
  },

  /**
   * A tour quote (`lib/tour-quote.ts`): one payment, one car, the tour's
   * terms. Each key replaces the event wording above on such a quote.
   */
  tour: {
    lead: {
      sent: {
        pt: "Aqui está o passeio que preparámos para si. Leia as condições abaixo e, quando estiver pronto, pague para o confirmar.",
        en: "Here is the tour we prepared for you. Read the conditions below and, when you are ready, pay to confirm it.",
      } as Localized,
      paid: {
        pt: "O seu passeio está pago e confirmado. Obrigado — até breve!",
        en: "Your tour is paid and confirmed. Thank you — see you soon!",
      } as Localized,
    },
    date: { pt: "Data do passeio", en: "Tour date" } as Localized,
    /** The venue row on a tour quote: the word the admin form uses for it. */
    venue: { pt: "Ponto de encontro", en: "Meeting point" } as Localized,
    departure: { pt: "Partida", en: "Departure" } as Localized,
    departures: {
      morning: { pt: "Manhã (10:00)", en: "Morning (10:00)" } as Localized,
      afternoon: { pt: "Tarde (14:00)", en: "Afternoon (14:00)" } as Localized,
      full_day: { pt: "Dia inteiro", en: "Full day" } as Localized,
    },
    /** The one instalment's name — on this page and on Stripe's. */
    payment: { pt: "Pagamento", en: "Payment" } as Localized,
    pay: { pt: "Pagar {amount}", en: "Pay {amount}" } as Localized,
    acceptedVersion: {
      pt: "Condições aceites com o pagamento: versão de {version}",
      en: "Conditions accepted with the payment: version of {version}",
    } as Localized,
  },

  termsHeading: { pt: "As condições", en: "The conditions" } as Localized,
  termsVersion: {
    pt: "Termos de venda, versão de {date}",
    en: "Terms of sale, version of {date}",
  } as Localized,
  acceptedVersion: {
    pt: "Condições aceites com o pagamento do sinal: versão de {version}",
    en: "Conditions accepted with the deposit: version of {version}",
  } as Localized,
  /**
   * The seller line at the end of the conditions: the trading name, then this
   * link to the terms page, which carries the full "Quem vende" block.
   */
  sellerLink: {
    pt: "Condições e identificação do vendedor",
    en: "Terms and seller details",
  } as Localized,

  contactsHeading: { pt: "Alguma dúvida?", en: "Any questions?" } as Localized,
  contactsBody: {
    pt: "Responda ao email do orçamento, ou ligue-nos:",
    en: "Reply to the quote email, or call us:",
  } as Localized,

  /** Unknown, malformed, replaced, cancelled — one neutral answer for all. */
  invalid: {
    title: { pt: "Este link já não é válido", en: "This link is no longer valid" } as Localized,
    body: {
      pt: "O orçamento pode ter sido substituído por uma nova versão, ou o link pode estar incompleto. Fale connosco e enviamos-lhe o link certo.",
      en: "The quote may have been replaced by a new version, or the link may be incomplete. Talk to us and we will send you the right one.",
    } as Localized,
  },

  /**
   * A throttled lookup, not a dead link — a couple on shared Wi-Fi or a
   * carrier's CGNAT can trip this without their quote ever having changed.
   */
  throttled: {
    title: { pt: "Demasiadas tentativas", en: "Too many attempts" } as Localized,
    body: {
      pt: "Recebemos vários pedidos desta ligação. Aguarde alguns minutos e tente novamente.",
      en: "We've had several requests from this connection. Please wait a few minutes and try again.",
    } as Localized,
  },
} as const;
