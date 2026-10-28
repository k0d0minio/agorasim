import type { Localized } from "@/i18n/config";

/**
 * The payment-link page — `/[locale]/reservar/pagar/[token]` — where a customer
 * pays a tour the team registered for them (`lib/payment-link.ts`).
 *
 * The booking is confirmed only on payment and holds no car until then, so the
 * page says both above the button. `{…}` placeholders are filled by the page.
 * PT and EN kept in step. Ungendered Portuguese, as every guest line.
 */
export const paymentLinkContent = {
  metaTitle: { pt: "Pagamento da reserva", en: "Booking payment" } as Localized,
  eyebrow: { pt: "Reserva {ref}", en: "Booking {ref}" } as Localized,
  greeting: { pt: "Olá {name},", en: "Hello {name}," } as Localized,
  lead: {
    payable: {
      pt: "Preparámos a sua reserva. Confirme os detalhes abaixo e pague para a confirmar. Os lugares só ficam guardados depois do pagamento.",
      en: "We have prepared your booking. Check the details below and pay to confirm it. The seats are held only once you pay.",
    } as Localized,
    paid: {
      pt: "Esta reserva está paga e confirmada. Enviámos-lhe os detalhes por email.",
      en: "This booking is paid and confirmed. We have emailed you the details.",
    } as Localized,
    closed: {
      pt: "Esta reserva já não pode ser paga.",
      en: "This booking can no longer be paid.",
    } as Localized,
  },

  detailsHeading: { pt: "A sua reserva", en: "Your booking" } as Localized,
  labels: {
    reference: { pt: "Referência", en: "Reference" } as Localized,
    experience: { pt: "Experiência", en: "Experience" } as Localized,
    date: { pt: "Data", en: "Date" } as Localized,
    departure: { pt: "Partida", en: "Departure" } as Localized,
    party: { pt: "Pessoas", en: "Guests" } as Localized,
    addOns: { pt: "Extras", en: "Add-ons" } as Localized,
    total: { pt: "Total a pagar", en: "Total to pay" } as Localized,
  },

  pay: {
    button: { pt: "Pagar {amount}", en: "Pay {amount}" } as Localized,
    /** Under the button — the sentence, not a checkbox, as at the tour checkout. */
    notice: { pt: "Ao pagar aceita os", en: "By paying you accept the" } as Localized,
    secure: {
      pt: "O pagamento é feito na Stripe. Não guardamos os dados do seu cartão.",
      en: "Payment is taken by Stripe. We never see or store your card details.",
    } as Localized,
  },

  /** The payment step: Stripe's form where the button was. */
  paymentStep: {
    heading: { pt: "Pagamento — {amount}", en: "Payment — {amount}" } as Localized,
    back: { pt: "Voltar", en: "Back" } as Localized,
    loading: {
      pt: "A abrir o pagamento seguro…",
      en: "Opening the secure payment…",
    } as Localized,
    failed: {
      pt: "Não foi possível abrir o formulário de pagamento. Volte atrás e tente outra vez, ou fale connosco — os contactos estão mais abaixo.",
      en: "The payment form could not load. Go back and try again, or talk to us — our contacts are below.",
    } as Localized,
  },

  /** Paid a moment ago: the webhook or the return page is confirming it. */
  confirming: {
    title: { pt: "A confirmar o pagamento", en: "Confirming your payment" } as Localized,
    body: {
      pt: "A Stripe já nos avisou — a confirmação chega em instantes por email. Pode atualizar esta página.",
      en: "Stripe has told us — the confirmation arrives by email in a moment. You can refresh this page.",
    } as Localized,
  },
  /** A delayed method (Multibanco): the money is on its way. */
  awaiting: {
    title: { pt: "A aguardar o pagamento", en: "Waiting for your payment" } as Localized,
    body: {
      pt: "A reserva fica confirmada assim que o banco confirmar o pagamento, e enviamos-lhe os detalhes por email. Não precisa de pagar outra vez.",
      en: "Your booking is confirmed as soon as the bank confirms the payment, and we email you the details. There is no need to pay again.",
    } as Localized,
  },

  /** A tap the server refused — each a sentence, never an error page. */
  refused: {
    full: {
      pt: "Esta partida já não tem lugar para o seu grupo. Ligue-nos para escolher outra data ou outra partida.",
      en: "This departure no longer has room for your group. Call us to choose another date or departure.",
    } as Localized,
    unconfigured: {
      pt: "Os pagamentos online estão indisponíveis de momento. Fale connosco para concluir a reserva.",
      en: "Online payments are unavailable at the moment. Talk to us to complete your booking.",
    } as Localized,
    failed: {
      pt: "Não foi possível abrir o pagamento. Tente de novo daqui a pouco.",
      en: "The payment could not be opened. Please try again in a moment.",
    } as Localized,
  },

  /** Cancelled by the team, expired, or the departure is past. */
  closed: {
    title: { pt: "Esta reserva já não está ativa", en: "This booking is no longer active" } as Localized,
    body: {
      pt: "A reserva foi cancelada ou a data já passou. Fale connosco para combinar outra.",
      en: "The booking was cancelled or its date has passed. Talk to us to arrange another.",
    } as Localized,
  },
  invalid: {
    title: { pt: "Este link não é válido", en: "This link is not valid" } as Localized,
    body: {
      pt: "O link pode ter sido substituído por um mais recente. Procure o último email que lhe enviámos, ou fale connosco.",
      en: "The link may have been replaced by a newer one. Look for the latest email we sent you, or talk to us.",
    } as Localized,
  },
  throttled: {
    title: { pt: "Demasiadas tentativas", en: "Too many attempts" } as Localized,
    body: {
      pt: "Recebemos vários pedidos desta ligação. Aguarde alguns minutos e tente novamente.",
      en: "We've had several requests from this connection. Please wait a few minutes and try again.",
    } as Localized,
  },

  contactsHeading: { pt: "Alguma dúvida?", en: "Any questions?" } as Localized,
  contactsBody: {
    pt: "Responda ao email da reserva, ou ligue-nos:",
    en: "Reply to the booking email, or call us:",
  } as Localized,
} as const;
