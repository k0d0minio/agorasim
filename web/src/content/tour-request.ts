import type { Localized } from "@/i18n/config";

/**
 * Copy for the public onboarding form (`/[locale]/reservar`) where customers
 * request a tour. Kept alongside the other localized content so PT and EN stay
 * in sync. The experience options are derived from `experiences.ts` at render
 * time so this file only carries chrome/labels.
 */
export const tourRequestContent = {
  title: { pt: "Pedir uma experiência", en: "Request an experience" } as Localized,
  lead: {
    pt: "Diga-nos o que procura e tratamos do resto. Respondemos por email ou telefone para combinar a sua saída pela região Saloia.",
    en: "Tell us what you are looking for and we will take care of the rest. We reply by email or phone to arrange your outing through the Saloia region.",
  } as Localized,

  /**
   * Sets expectations on `/reservar`: the request is real and reaches the team,
   * but the date is confirmed by a person — online payment is still being
   * built. Remove this when checkout ships.
   */
  note: {
    pt: "O pedido chega-nos de imediato e confirmamos a data consigo. O pagamento online está a ser construído.",
    en: "Your request reaches us straight away and we confirm the date with you. Online payment is still being built.",
  } as Localized,

  labels: {
    name: { pt: "Nome", en: "Name" } as Localized,
    email: { pt: "Email", en: "Email" } as Localized,
    phone: { pt: "Telefone (opcional)", en: "Phone (optional)" } as Localized,
    experience: { pt: "Experiência principal", en: "Main experience" } as Localized,
    addOns: { pt: "Complementos", en: "Add-ons" } as Localized,
    partySize: { pt: "Número de pessoas", en: "Number of people" } as Localized,
    preferredDate: {
      pt: "Data preferida (ou período)",
      en: "Preferred date (or period)",
    } as Localized,
    message: { pt: "Mensagem", en: "Message" } as Localized,
    submit: { pt: "Enviar pedido", en: "Send request" } as Localized,
    submitting: { pt: "A enviar…", en: "Sending…" } as Localized,
  },

  placeholders: {
    preferredDate: {
      pt: "Ex.: 15 de agosto, ou flexível",
      en: "e.g. 15 August, or flexible",
    } as Localized,
    message: {
      pt: "Conte-nos mais sobre o que procura…",
      en: "Tell us more about what you are looking for…",
    } as Localized,
    experienceNone: { pt: "Sem preferência", en: "No preference" } as Localized,
  },

  /**
   * The live availability picker. Shown instead of the free-text date field
   * whenever the calendar has a day to offer; when it has none — a fresh
   * environment, or a season nobody has opened yet — the form falls back to
   * asking in words, and none of this renders.
   *
   * Nothing here explains *why* a day is unavailable. The reason lives on the
   * row (`note`) and is the team's business, not the guest's.
   */
  calendar: {
    label: { pt: "Escolha o dia", en: "Pick a day" } as Localized,
    hint: {
      pt: "Mostramos apenas os dias com lugares disponíveis.",
      en: "We only show days with seats still available.",
    } as Localized,
    chosen: { pt: "Dia escolhido", en: "Chosen day" } as Localized,
    clear: { pt: "Limpar", en: "Clear" } as Localized,
    seatsLeft: {
      pt: "lugares",
      en: "seats",
    } as Localized,
    seatLeft: {
      pt: "lugar",
      en: "seat",
    } as Localized,
    previousMonth: { pt: "Mês anterior", en: "Previous month" } as Localized,
    nextMonth: { pt: "Mês seguinte", en: "Next month" } as Localized,
    weekdays: {
      pt: ["S", "T", "Q", "Q", "S", "S", "D"],
      en: ["M", "T", "W", "T", "F", "S", "S"],
    } as Localized<string[]>,
    /** The way out of the calendar, for someone whose day isn't on it. */
    flexible: {
      pt: "Nenhum destes dias serve? Diga-nos quando prefere",
      en: "None of these days work? Tell us when you'd prefer",
    } as Localized,
    backToCalendar: {
      pt: "Voltar ao calendário",
      en: "Back to the calendar",
    } as Localized,
    noneOpen: {
      pt: "Ainda não há dias abertos por aqui — diga-nos quando gostaria de vir e combinamos consigo.",
      en: "No days are open here yet — tell us when you'd like to come and we'll arrange it with you.",
    } as Localized,
  },

  success: {
    title: { pt: "Pedido enviado!", en: "Request sent!" } as Localized,
    body: {
      pt: "Obrigado. Entraremos em contacto muito em breve para combinar os detalhes.",
      en: "Thank you. We will get in touch very soon to arrange the details.",
    } as Localized,
  },

  errors: {
    name: { pt: "Indique o seu nome.", en: "Please enter your name." } as Localized,
    email: {
      pt: "Indique um email válido.",
      en: "Please enter a valid email address.",
    } as Localized,
    /**
     * The chosen day stopped being available between the page being rendered
     * and the form being sent — sold out, closed, or simply a stale tab. The
     * enquiry is not lost: the guest picks again and sends the same form.
     */
    unavailableDate: {
      pt: "Esse dia deixou de estar disponível. Escolha outro, por favor.",
      en: "That day is no longer available. Please choose another one.",
    } as Localized,
    partyTooLarge: {
      pt: "Não temos lugares suficientes nesse dia para o seu grupo. Escolha outro dia ou fale connosco.",
      en: "There aren't enough seats left on that day for your group. Pick another day, or talk to us.",
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
