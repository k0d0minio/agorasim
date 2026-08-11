import type { Localized } from "@/i18n/config";

/**
 * Copy for the paid booking flow on `/[locale]/reservar`.
 *
 * This file used to carry illustrative prices and a hardcoded August 2026
 * calendar so a design preview could read as real. Both are gone: prices come
 * from the catalogue (`experiences.price_cents`, set by the team), the calendar
 * comes from the `availability` table, and nothing here invents a commercial
 * fact any more.
 *
 * What is left is chrome — labels, the reassurances a payment page owes a
 * guest, and the error messages for the four ways a booking can fail between
 * choosing a day and paying for it.
 */
export const bookingContent = {
  title: { pt: "Reserve a sua experiência", en: "Book your experience" } as Localized,
  lead: {
    pt: "Escolha o dia, o grupo e os extras — e pague online em minutos. Sem esperas, sem trocas de emails.",
    en: "Pick your day, your group and your extras — and pay online in minutes. No waiting, no email back-and-forth.",
  } as Localized,

  labels: {
    yourDetails: { pt: "Os seus dados", en: "Your details" } as Localized,
    name: { pt: "Nome", en: "Name" } as Localized,
    email: { pt: "Email", en: "Email" } as Localized,
    phone: { pt: "Telefone (opcional)", en: "Phone (optional)" } as Localized,
    message: { pt: "Alguma nota para nós? (opcional)", en: "Anything we should know? (optional)" } as Localized,
    messagePlaceholder: {
      pt: "Alergias, aniversários, cadeira de bebé…",
      en: "Allergies, birthdays, a child seat…",
    } as Localized,

    experience: { pt: "A sua experiência", en: "Your experience" } as Localized,
    partySize: { pt: "Número de pessoas", en: "Group size" } as Localized,
    partyHint: {
      pt: "Grupos pequenos — os lugares disponíveis em cada dia estão no calendário.",
      en: "Small groups — the seats left on each day are shown on the calendar.",
    } as Localized,
    fewer: { pt: "Menos uma pessoa", en: "One person fewer" } as Localized,
    more: { pt: "Mais uma pessoa", en: "One person more" } as Localized,

    addOns: { pt: "Complete o seu dia", en: "Complete your day" } as Localized,
    addOnsHint: {
      pt: "Paragens extra de sabores e artesãos da região — adicione as que lhe apetecerem.",
      en: "Extra stops for regional flavours and artisans — add whichever you fancy.",
    } as Localized,

    summary: { pt: "Resumo da reserva", en: "Booking summary" } as Localized,
    perPerson: { pt: "por pessoa", en: "per person" } as Localized,
    total: { pt: "Total", en: "Total" } as Localized,
    people: { pt: "pessoas", en: "people" } as Localized,
    person: { pt: "pessoa", en: "person" } as Localized,
    noDate: { pt: "Sem data escolhida", en: "No date selected" } as Localized,

    pay: { pt: "Pagar e confirmar reserva", en: "Pay & confirm booking" } as Localized,
    paying: { pt: "A abrir o pagamento…", en: "Opening payment…" } as Localized,
    securePayment: {
      pt: "Pagamento seguro através da Stripe. Não guardamos os dados do seu cartão.",
      en: "Secure payment through Stripe. We never see or store your card details.",
    } as Localized,
    /** Shown only when the deployment is running against Stripe test keys. */
    testMode: {
      pt: "Modo de teste — nenhum pagamento real será cobrado.",
      en: "Test mode — no real payment will be taken.",
    } as Localized,
    /** How long the seat is held while they are on Stripe's page. */
    holdNote: {
      pt: "Guardamos os seus lugares durante 30 minutos enquanto conclui o pagamento.",
      en: "We hold your seats for 30 minutes while you complete the payment.",
    } as Localized,
  },

  errors: {
    name: { pt: "Indique o seu nome.", en: "Please enter your name." } as Localized,
    email: {
      pt: "Indique um email válido.",
      en: "Please enter a valid email address.",
    } as Localized,
    chooseDate: {
      pt: "Escolha um dia no calendário.",
      en: "Please choose a day on the calendar.",
    } as Localized,
    partySize: {
      pt: "Indique quantas pessoas vão.",
      en: "Tell us how many people are coming.",
    } as Localized,
    dayGone: {
      pt: "Esse dia deixou de estar disponível. Escolha outro, por favor.",
      en: "That day is no longer available. Please choose another one.",
    } as Localized,
    partyTooLarge: {
      pt: "Não há lugares suficientes nesse dia para o seu grupo. Escolha outro dia.",
      en: "There aren't enough seats left on that day for your group. Please pick another.",
    } as Localized,
    /**
     * Payments are off, or the experience has no price yet. One message for
     * both, because from the guest's side they are the same situation and the
     * same next step: send the enquiry instead and we will arrange it.
     */
    paymentsOff: {
      pt: "Neste momento não é possível pagar online. Envie-nos o pedido e tratamos da sua reserva consigo.",
      en: "Online payment isn't available right now. Send us your request and we'll arrange the booking with you.",
    } as Localized,
    rateLimited: {
      pt: "Recebemos vários pedidos seus. Aguarde alguns minutos antes de tentar novamente.",
      en: "We've had several attempts from you. Please wait a few minutes before trying again.",
    } as Localized,
    generic: {
      pt: "Não foi possível iniciar o pagamento. Tente novamente.",
      en: "We couldn't start the payment. Please try again.",
    } as Localized,
  },

  /** The page the guest lands on after paying. */
  confirmation: {
    title: { pt: "Reserva confirmada", en: "Booking confirmed" } as Localized,
    lead: {
      pt: "Obrigado! O pagamento foi recebido e a sua reserva está confirmada.",
      en: "Thank you! Your payment went through and your booking is confirmed.",
    } as Localized,
    emailNote: {
      pt: "Enviámos a confirmação para o seu email. Falamos consigo antes do dia para combinar a hora e o local.",
      en: "We've emailed you the confirmation. We'll be in touch before the day to agree a time and a meeting point.",
    } as Localized,
    reference: { pt: "Referência", en: "Reference" } as Localized,

    /**
     * Payment taken, confirmation not recorded yet — the webhook is in flight,
     * or the payment method settles later (Multibanco). Never says "failed":
     * their money has left and telling them otherwise would be wrong.
     */
    pendingTitle: { pt: "A confirmar o pagamento", en: "Confirming your payment" } as Localized,
    pendingLead: {
      pt: "Recebemos o seu pedido e estamos a confirmar o pagamento. Receberá um email assim que estiver tudo certo — normalmente em poucos minutos.",
      en: "We've got your booking and we're confirming the payment. You'll get an email as soon as it's done — usually within a few minutes.",
    } as Localized,

    /** Landed here with a session we cannot resolve. */
    unknownTitle: { pt: "Não encontrámos essa reserva", en: "We couldn't find that booking" } as Localized,
    unknownLead: {
      pt: "Se pagou e não recebeu confirmação, fale connosco e resolvemos já.",
      en: "If you paid and haven't had a confirmation, get in touch and we'll sort it out straight away.",
    } as Localized,

    backHome: { pt: "Voltar ao início", en: "Back to the homepage" } as Localized,
    contactUs: { pt: "Falar connosco", en: "Get in touch" } as Localized,
  },
} as const;
