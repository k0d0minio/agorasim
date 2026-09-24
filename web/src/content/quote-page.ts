import type { Localized } from "@/i18n/config";

/**
 * The couple's quote page — `/[locale]/orcamento/[token]` — and the words on
 * the pay button that page mints a Checkout session from (D25).
 *
 * The terms themselves are not here: the page renders the events and
 * complaints sections of `terms.ts` verbatim, so what the couple read above
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
    paidOn: { pt: "Pago a {date}", en: "Paid on {date}" } as Localized,
    // Written off by the team: it arrived another way (a transfer).
    settled: { pt: "Liquidado", en: "Settled" } as Localized,
    refunded: { pt: "Reembolsado", en: "Refunded" } as Localized,
  },

  pay: {
    deposit: { pt: "Pagar sinal de {amount}", en: "Pay {amount} deposit" } as Localized,
    balance: { pt: "Pagar restante de {amount}", en: "Pay {amount} balance" } as Localized,
    /** Under the button — the sentence, not a checkbox, as at the tour checkout. */
    notice: {
      pt: "Ao pagar aceita as condições acima e os",
      en: "By paying you accept the conditions above and the",
    } as Localized,
    secure: {
      pt: "O pagamento é feito na Stripe. Não guardamos os dados do seu cartão.",
      en: "Payment is taken by Stripe. We never see or store your card details.",
    } as Localized,
  },

  notYet: {
    title: {
      pt: "O restante é pago a partir de {date}",
      en: "The balance is paid from {date}",
    } as Localized,
    body: {
      pt: "Enviamos-lhe o link {days} dias antes do evento, e a partir desse dia também o pode pagar aqui.",
      en: "We send you the link {days} days before the event, and from that day you can also pay it here.",
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
    notDue: {
      pt: "O restante ainda não está a pagamento — a data em que fica está indicada acima.",
      en: "The balance is not payable yet — the day it becomes payable is shown above.",
    } as Localized,
    settled: {
      pt: "Este orçamento já está pago na totalidade.",
      en: "This quote is already paid in full.",
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
  fullTermsLink: {
    pt: "Ler os termos de venda completos",
    en: "Read the full terms of sale",
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
} as const;
