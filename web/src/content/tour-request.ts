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
    generic: {
      pt: "Não foi possível enviar o pedido. Tente novamente.",
      en: "We could not send your request. Please try again.",
    } as Localized,
  },
} as const;
