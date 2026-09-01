import type { Localized } from "@/i18n/config";

/**
 * Copy for the self-serve cancel link, PT and EN.
 *
 * **Every sentence here is spoken to somebody holding a booking they want out
 * of**, which is the whole reason this is its own file rather than a corner of
 * `content/booking.ts`: the booking page sells, this page releases, and the two
 * voices are not the same one. Nothing below congratulates anybody or tries to
 * keep the sale.
 *
 * **The refusal is the copy that matters.** Inside 48 hours the page cannot
 * help, and a page that cannot help owes the guest the next thing to do rather
 * than an apology — so `tooLate` ends in phone numbers and a WhatsApp link, not
 * in "sorry for the inconvenience".
 *
 * **One neutral answer covers four failures.** An unknown token, a spent one, a
 * revoked one and a booking that was never confirmed all render {@link unknown}
 * word for word. That is a privacy property, not laziness: a page that said
 * "this link has already been used" would confirm to whoever is holding a
 * stolen or guessed link that a real booking sits behind it.
 */
export const cancellationContent = {
  /** The browser tab. Not indexed — the page carries a noindex. */
  metaTitle: {
    pt: "Cancelar reserva — Agorasim",
    en: "Cancel booking — Agorasim",
  } as Localized,

  /** Shown while the booking is still cancellable, above the summary. */
  title: { pt: "Cancelar a sua reserva", en: "Cancel your booking" } as Localized,
  lead: {
    pt: "Reveja os detalhes antes de confirmar. O cancelamento é gratuito e o reembolso é total.",
    en: "Check the details before you confirm. Cancelling is free and the refund is the full amount.",
  } as Localized,

  /** The summary block. Labels are shared with the confirmation email. */
  detailsHeading: { pt: "A sua reserva", en: "Your booking" } as Localized,

  /**
   * The refund promise, stated before the button rather than after it. A guest
   * deciding whether to press "cancel" is deciding about money.
   */
  refundNote: {
    pt: "Devolvemos {total} para o mesmo cartão. O banco costuma demorar 5 a 10 dias úteis a mostrar o valor.",
    en: "We return {total} to the same card. Banks usually take 5–10 working days to show it.",
  } as Localized,

  /** How long is left, above the confirm step. */
  deadlineNote: {
    pt: "Pode cancelar sem custos até {deadline}.",
    en: "You can cancel free of charge until {deadline}.",
  } as Localized,

  /**
   * The confirm step. "Manter reserva" is the default and comes first — this is
   * an irreversible action reached from a link in an email, which is exactly
   * the shape of thing a mis-tap should not complete.
   */
  confirm: {
    question: {
      pt: "Tem a certeza de que quer cancelar?",
      en: "Are you sure you want to cancel?",
    } as Localized,
    /** The safe way out, and the default. */
    keep: { pt: "Manter reserva", en: "Keep booking" } as Localized,
    /** The destructive one. Named for what it does, not "Yes". */
    cancel: { pt: "Sim, cancelar e reembolsar", en: "Yes, cancel and refund" } as Localized,
    pending: { pt: "A cancelar…", en: "Cancelling…" } as Localized,
  },

  /** After a successful cancellation. */
  done: {
    title: { pt: "Reserva cancelada", en: "Booking cancelled" } as Localized,
    lead: {
      pt: "Está tratado. O reembolso de {total} já foi emitido e enviámos-lhe a confirmação por email.",
      en: "That's done. Your {total} refund has been issued and we've emailed you the confirmation.",
    } as Localized,
    /** Said last, and meant: the door is open. */
    outro: {
      pt: "Se um dia quiser voltar a marcar, teremos muito gosto em recebê-lo.",
      en: "If you'd like to book again another time, we'd love to have you.",
    } as Localized,
  },

  /** Inside the 48-hour window. The one refusal with contacts attached. */
  tooLate: {
    title: {
      pt: "Faltam menos de 48 horas",
      en: "Less than 48 hours to go",
    } as Localized,
    lead: {
      pt: "A esta distância da partida já não conseguimos cancelar automaticamente — os carros e os condutores estão reservados para si. Fale connosco e vemos o que é possível.",
      en: "This close to departure we can't cancel automatically — the cars and drivers are already held for you. Talk to us and we'll see what we can do.",
    } as Localized,
    /** Nudges the realistic outcome without promising it. */
    note: {
      pt: "Remarcar costuma ser mais fácil do que cancelar, e em caso de mau tempo reagendamos sempre que possível.",
      en: "Moving your date is usually easier than cancelling, and in bad weather we reschedule wherever we can.",
    } as Localized,
    contactHeading: { pt: "Fale connosco", en: "Talk to us" } as Localized,
    whatsApp: { pt: "WhatsApp", en: "WhatsApp" } as Localized,
  },

  /** The tour has already run. */
  departed: {
    title: { pt: "Esta experiência já aconteceu", en: "This experience has already run" } as Localized,
    lead: {
      pt: "Esta reserva já não pode ser cancelada. Se houve algum problema no dia, queremos mesmo saber — fale connosco.",
      en: "This booking can't be cancelled any more. If something went wrong on the day, we genuinely want to know — please get in touch.",
    } as Localized,
  },

  /**
   * Unknown, spent, revoked, or never confirmed. Says nothing about which —
   * see the note at the top of this file.
   */
  unknown: {
    title: { pt: "Este link já não funciona", en: "This link no longer works" } as Localized,
    lead: {
      pt: "Pode já ter sido usado, ou ter sido substituído por um email mais recente. Se precisar de alterar ou cancelar uma reserva, fale connosco e tratamos disso.",
      en: "It may already have been used, or replaced by a more recent email. If you need to change or cancel a booking, get in touch and we'll sort it out.",
    } as Localized,
  },

  /** Something broke on our side, mid-cancellation. */
  errors: {
    failed: {
      pt: "Não conseguimos concluir o cancelamento. Nada foi alterado na sua reserva — tente novamente daqui a pouco ou fale connosco.",
      en: "We couldn't complete the cancellation. Nothing on your booking has changed — try again shortly, or talk to us.",
    } as Localized,
    /**
     * The refusal a throttled caller gets. Deliberately says nothing about
     * bookings or tokens: most of the traffic that reaches it is not a guest.
     */
    rateLimited: {
      pt: "Demasiados pedidos. Aguarde um momento e tente novamente.",
      en: "Too many requests. Wait a moment and try again.",
    } as Localized,
  },

  /** Both refusal pages, and the success page, offer a way onward. */
  backHome: { pt: "Voltar ao início", en: "Back to home" } as Localized,
  contactUs: { pt: "Contactos", en: "Contact us" } as Localized,
} as const;

/**
 * The line the confirmation email gains, and the button it hangs on.
 *
 * Here rather than in `content/emails.ts` so that the promise ("free up to 48
 * hours") and the mechanism that honours it are read together — the sentence
 * below is the one that has to stay true to `lib/cancellation.ts`.
 */
export const cancellationEmailCopy = {
  /** Sits under the existing free-cancellation note in the guest's email. */
  intro: {
    pt: "Precisa de cancelar? Pode fazê-lo aqui, sem nos ligar, até 48 horas antes da partida:",
    en: "Need to cancel? You can do it here, without calling us, up to 48 hours before departure:",
  } as Localized,
  button: { pt: "Cancelar reserva", en: "Cancel booking" } as Localized,
  /**
   * The link is a credential, so the mail says so plainly — this is the same
   * warning a password-reset mail carries, for the same reason.
   */
  warning: {
    pt: "Este link é pessoal: quem o tiver pode cancelar a sua reserva. Não o reencaminhe.",
    en: "This link is personal: anyone who has it can cancel your booking. Please don't forward it.",
  } as Localized,
} as const;
