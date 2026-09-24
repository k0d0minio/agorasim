import type { Localized } from "@/i18n/config";

/**
 * The thank-you's opt-out page — `/[locale]/reserva/deixar-de-receber/<token>`.
 *
 * One button, and a plain statement of what it does and does not stop: the
 * thank-you (and any other email that is not about one of the guest's own
 * bookings) stops; the booking emails — confirmation, the day-before reminder,
 * a cancellation — keep coming, because they are the booking. The PT is
 * ungendered towards the guest, as every guest line is.
 */
export const optOutContent = {
  title: {
    pt: "Deixar de receber emails da Agorasim",
    en: "Stop emails from Agorasim",
  } as Localized,
  lead: {
    pt: "Deixa de receber o agradecimento depois dos passeios e qualquer outro email que não seja sobre uma reserva sua.",
    en: "You will stop getting the thank-you after a tour, and any other email that is not about one of your bookings.",
  } as Localized,
  keeps: {
    pt: "Os emails sobre as suas reservas — a confirmação, o lembrete na véspera e um cancelamento — continuam a chegar.",
    en: "Emails about your bookings — the confirmation, the reminder the day before and a cancellation — will still arrive.",
  } as Localized,
  button: { pt: "Deixar de receber", en: "Unsubscribe" } as Localized,
  working: { pt: "A guardar…", en: "Saving…" } as Localized,

  doneTitle: { pt: "Feito", en: "Done" } as Localized,
  doneLead: {
    pt: "Não voltamos a enviar-lhe estes emails. Obrigado por nos ter dito.",
    en: "We won't send you these emails again. Thank you for letting us know.",
  } as Localized,

  invalidTitle: { pt: "Este link não é válido", en: "This link isn't valid" } as Localized,
  invalidLead: {
    pt: "Pode estar incompleto. Se quiser deixar de receber os nossos emails, responda a um deles ou escreva-nos para {email}.",
    en: "It may be incomplete. If you want to stop our emails, reply to one of them or write to us at {email}.",
  } as Localized,

  errors: {
    rateLimited: {
      pt: "Demasiadas tentativas seguidas. Tente de novo daqui a alguns minutos.",
      en: "Too many attempts in a row. Please try again in a few minutes.",
    } as Localized,
    generic: {
      pt: "Não conseguimos guardar agora. Tente de novo daqui a pouco.",
      en: "We couldn't save that just now. Please try again shortly.",
    } as Localized,
  },

  backHome: { pt: "Voltar ao início", en: "Back to the home page" } as Localized,
};
