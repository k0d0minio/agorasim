import type { Locale, Localized } from "@/i18n/config";

/**
 * The wedding and event quote form — everything both copies of it share.
 *
 * Two pages ask the same question in two voices: `/casamentos` asks a couple
 * about their wedding, `/eventos` asks a company about its day out. What
 * changes between them is the wording of the labels, which each page owns
 * (`weddingsContent.quote`, `events.quote`); what does not change is the list
 * of fields, the service-hours options, and every sentence the *form itself*
 * says back — sending, sent, and the three ways a submission can fail.
 *
 * Those live here so a fixed typo is fixed once, in both languages, on both
 * pages. `content/tour-request.ts` is the same idea for `/reservar`; the two
 * forms are deliberately not merged, because a tour enquiry picks an
 * experience off the catalogue and a quote enquiry names a venue.
 */

/** The shape each page fills in with its own voice. */
export type QuoteFormCopy = {
  title: Localized;
  lead: Localized;
  labels: {
    names: Localized;
    email: Localized;
    phone: Localized;
    date: Localized;
    venue: Localized;
    venuePlaceholder: Localized;
    hours: Localized;
    car: Localized;
    /** The "no preference" option at the top of the car picker. */
    carNone: Localized;
    partySize: Localized;
    message: Localized;
    messagePlaceholder: Localized;
    submit: Localized;
  };
};

/**
 * How long the cars are wanted for.
 *
 * Keyed, not free text: the option a guest picks is stored as `half-day`
 * whichever language they picked it in, so the Sales board reads the same
 * thing for a Portuguese couple and an English one. A select that posted its
 * own label would have put "Full day (up to 8h)" in a Portuguese admin screen.
 */
export const SERVICE_HOURS = [
  {
    value: "half-day",
    label: { pt: "Meio dia (até 4h)", en: "Half day (up to 4h)" } as Localized,
  },
  {
    value: "full-day",
    label: { pt: "Dia inteiro (até 8h)", en: "Full day (up to 8h)" } as Localized,
  },
  {
    value: "unsure",
    label: { pt: "Ainda não sabemos", en: "We don't know yet" } as Localized,
  },
] as const;

export type ServiceHours = (typeof SERVICE_HOURS)[number]["value"];

/** True for a value the picker could actually have produced. */
export function isServiceHours(value: string): value is ServiceHours {
  return SERVICE_HOURS.some((option) => option.value === value);
}

/**
 * The stored key as a sentence, or the key itself if it is one this build no
 * longer offers — an old row must still read as something.
 */
export function serviceHoursLabel(value: string, locale: Locale): string {
  const option = SERVICE_HOURS.find((entry) => entry.value === value);
  return option ? option.label[locale] : value;
}

/** Everything the form says on its own behalf, in both languages. */
export const quoteRequestShared = {
  labels: {
    submitting: { pt: "A enviar…", en: "Sending…" } as Localized,
    /** Optional on purpose — see `quote-actions.ts`. Said, not implied. */
    optional: { pt: "(opcional)", en: "(optional)" } as Localized,
  },

  placeholders: {
    partySize: { pt: "Ex.: 40", en: "e.g. 40" } as Localized,
  },

  success: {
    title: { pt: "Pedido enviado!", en: "Request sent!" } as Localized,
    body: {
      pt: "Obrigado. Respondemos em 24–48h com uma proposta à vossa medida.",
      en: "Thank you. We reply within 24–48h with a proposal made for you.",
    } as Localized,
  },

  errors: {
    name: { pt: "Indique o seu nome.", en: "Please enter your name." } as Localized,
    email: {
      pt: "Indique um email válido.",
      en: "Please enter a valid email address.",
    } as Localized,
    generic: {
      pt: "Não foi possível enviar o pedido. Tente novamente.",
      en: "We could not send your request. Please try again.",
    } as Localized,
    rateLimited: {
      pt: "Recebemos vários pedidos seus. Aguarde alguns minutos antes de enviar outro.",
      en: "We have received several requests from you. Please wait a few minutes before sending another.",
    } as Localized,
  },
} as const;
