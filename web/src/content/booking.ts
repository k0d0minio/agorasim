import type { Localized } from "@/i18n/config";

/**
 * Copy for the instant-booking flow (`/[locale]/reservar`) — proposal Feature 3
 * (instant tour booking + Stripe payments). The flow is a design preview while
 * payments are wired up, so it also carries the "in development" explanations.
 *
 * Prices here are **illustrative placeholders** so the design reads real —
 * final pricing is set by Diogo & Rita before the feature goes live.
 */
export const bookingContent = {
  title: { pt: "Reserve a sua experiência", en: "Book your experience" } as Localized,
  lead: {
    pt: "Escolha o dia, o grupo e os extras — e pague online em minutos. Sem esperas, sem trocas de emails.",
    en: "Pick your day, your group and your extras — and pay online in minutes. No waiting, no email back-and-forth.",
  } as Localized,

  inDev: {
    pt: "A reserva instantânea com pagamento online está a ser construída — este é o desenho final. Os valores apresentados são exemplos.",
    en: "Instant booking with online payment is being built — this is the final design. The prices shown are examples.",
  } as Localized,

  steps: {
    experience: { pt: "Experiência", en: "Experience" } as Localized,
    date: { pt: "Data e grupo", en: "Date & group" } as Localized,
    extras: { pt: "Extras", en: "Extras" } as Localized,
    payment: { pt: "Pagamento", en: "Payment" } as Localized,
  },

  labels: {
    chooseExperience: {
      pt: "Escolha a sua experiência",
      en: "Choose your experience",
    } as Localized,
    chooseDate: { pt: "Escolha o dia", en: "Pick a day" } as Localized,
    partySize: { pt: "Número de pessoas", en: "Group size" } as Localized,
    partyHint: {
      pt: "Grupos pequenos — os nossos clássicos levam até 3 convidados por carro.",
      en: "Small groups — our classics take up to 3 guests per car.",
    } as Localized,
    addOns: { pt: "Complete o seu dia", en: "Complete your day" } as Localized,
    addOnsHint: {
      pt: "Paragens extra de sabores e artesãos da região — adicione as que lhe apetecerem.",
      en: "Extra stops for regional flavours and artisans — add whichever you fancy.",
    } as Localized,
    payment: { pt: "Como quer pagar?", en: "How would you like to pay?" } as Localized,
    deposit: { pt: "Sinal de 30%", en: "30% deposit" } as Localized,
    depositHint: {
      pt: "Garanta já a data; o restante é pago no dia.",
      en: "Lock the date now; the rest is paid on the day.",
    } as Localized,
    full: { pt: "Valor total", en: "Full amount" } as Localized,
    fullHint: {
      pt: "Tudo tratado antes do passeio.",
      en: "Everything settled before the tour.",
    } as Localized,
    summary: { pt: "Resumo da reserva", en: "Booking summary" } as Localized,
    perPerson: { pt: "por pessoa", en: "per person" } as Localized,
    dueToday: { pt: "A pagar agora", en: "Due today" } as Localized,
    dueOnDay: { pt: "No dia do passeio", en: "On tour day" } as Localized,
    total: { pt: "Total", en: "Total" } as Localized,
    examplePrices: {
      pt: "Valores de exemplo — a confirmar no lançamento.",
      en: "Example prices — to be confirmed at launch.",
    } as Localized,
    pay: { pt: "Pagar e confirmar reserva", en: "Pay & confirm booking" } as Localized,
    payNote: {
      pt: "O pagamento seguro (Stripe) ficará ativo em breve.",
      en: "Secure payment (Stripe) will be enabled soon.",
    } as Localized,
    securePayment: {
      pt: "Pagamento seguro por Stripe. Cancelamento gratuito até 48h antes.",
      en: "Secure payment by Stripe. Free cancellation up to 48h before.",
    } as Localized,
    noDate: { pt: "Sem data escolhida", en: "No date selected" } as Localized,
    people: { pt: "pessoas", en: "people" } as Localized,
    person: { pt: "pessoa", en: "person" } as Localized,
    included: { pt: "Incluído", en: "Included" } as Localized,
  },

  /** Names of the payment methods shown as trust chips under the pay button. */
  paymentMethods: ["Visa / Mastercard", "Apple Pay", "Google Pay", "MB WAY", "Multibanco"],

  /**
   * Illustrative per-person prices (EUR) keyed by experience slug — design
   * placeholders only, clearly flagged as examples in the UI.
   */
  previewPrices: {
    "rural-saloia": 145,
    "tasco-galapito": 35,
    manzwine: 25,
    "ramilo-wines": 25,
    "olaria-mz": 20,
  } as Record<string, number>,

  /** Fallback preview price for slugs missing above. */
  previewPriceFallback: 30,

  /**
   * The illustrative month rendered in the availability calendar. Fixed (not
   * "today") so the static preview is deterministic; the live feature will use
   * real availability. August 2026 starts on a Saturday.
   */
  calendar: {
    monthLabel: { pt: "Agosto 2026", en: "August 2026" } as Localized,
    daysInMonth: 31,
    /** Column index (0 = Monday) of day 1. */
    firstDayColumn: 5,
    weekdays: {
      pt: ["S", "T", "Q", "Q", "S", "S", "D"],
      en: ["M", "T", "W", "T", "F", "S", "S"],
    } as Localized<string[]>,
    /** Example fully-booked days, to show how unavailability reads. */
    unavailable: [2, 9, 15, 16, 23, 30] as number[],
  },
} as const;
