"use server";

import { revalidatePath } from "next/cache";

import { departureLabel } from "@/content/logistics";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { EVENT_CANCEL_CONFIRMATION, REFUND_CONFIRMATION } from "@/lib/admin-format";
import { formatDay } from "@/lib/availability";
import { moveBookingToDeparture } from "@/lib/booking-move";
import { setNoShow } from "@/lib/booking-no-show";
import { cancelAndRefundBooking } from "@/lib/booking-refund";
import {
  bookingNoShowSchema,
  cancelBookingSchema,
  cancelHeldQuoteSchema,
  formValues,
  moveBookingSchema,
  quoteDraftSchema,
  quoteIdSchema,
  refundQuotePaymentSchema,
  resendQuoteSchema,
} from "@/lib/form-schemas";
import { formatPrice } from "@/lib/money";
import {
  createDraftForLead,
  discardQuoteDraft,
  resendQuote,
  saveDraft,
  sendQuote,
  startNewVersion,
  type DraftOutcome,
  type SendOutcome,
} from "@/lib/quote-builder";
import { cancelHeldQuote, refundQuotePayment } from "@/lib/quote-refund";

/**
 * Writes to a booking from the Sales board.
 *
 * These follow the house rules for admin actions (the note at the top of
 * `app/admin/actions.ts`): `requireAdmin()` as the first statement, audit
 * through the single writer in `lib/audit.ts`, and failures reported to the
 * operator rather than swallowed. What is different here is that the work
 * itself is not in this file: `lib/booking-refund.ts` holds it, because the
 * guest's own cancel link has to do exactly the same thing and two copies of
 * "refund, free the car, write the audit row, email the guest" is one copy that
 * eventually forgets a step. The move below is arranged the same way, in
 * `lib/booking-move.ts`, so that the availability re-check a reschedule needs
 * is the very one the checkout runs.
 *
 * **`requireAdmin()`, not `requireOwner()`.** Cancelling a tour and returning
 * the money is operational work — the reason the action exists is that guests
 * phone and message Rita instead of using a link — and the role split in
 * `lib/admin-auth.ts` reserves `owner` for accounts and guest personal data,
 * not for the day job. The typed confirmation, not the role, is what stands
 * between a mis-tap and a refund.
 */

export type CancelBookingState = {
  ok?: boolean;
  error?: string;
  /** What happened, read back to the operator in their own words. */
  message?: string;
};

/**
 * Cancel a paid booking and return some or all of the money.
 *
 * Works regardless of the 48-hour window the guest's own link will respect:
 * this is the path for bad weather, a car that will not start, and goodwill —
 * the team's judgement is the policy here, and a rule that overrode it would
 * only send them to the Stripe dashboard, where the seat and the email are lost.
 */
export async function cancelBooking(
  _prevState: CancelBookingState,
  formData: FormData,
): Promise<CancelBookingState> {
  const actor = await requireAdmin();

  const parsed = cancelBookingSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        `Escreva ${REFUND_CONFIRMATION} para confirmar.`,
    };
  }

  const { bookingId, refundAmount } = parsed.data;

  const outcome = await cancelAndRefundBooking({
    bookingId,
    refundCents: refundAmount,
    via: "admin",
    actorUserId: actor.id,
  });

  switch (outcome.status) {
    case "cancelled": {
      // The public calendar renders occupancy and is cached; the car this
      // booking was holding is free from the moment the status landed, and a
      // seat Rita can see and a guest cannot buy is the bug this prevents.
      revalidatePath("/", "layout");

      const money =
        outcome.refundedCents > 0
          ? `Reembolso de ${formatPrice(outcome.refundedCents, "pt", outcome.booking.currency)} enviado.`
          : "Sem reembolso.";
      return { ok: true, message: `Reserva cancelada. ${money} O cliente foi avisado.` };
    }

    case "not-found":
      return { error: "Essa reserva já não existe." };

    case "not-cancellable":
      // Also what a double-submitted form gets: the second one finds the
      // booking already over, which is the truth and not an error to hide.
      return {
        error: "Só é possível cancelar uma reserva paga — esta já não está confirmada.",
      };

    case "amount-too-large":
      return {
        error: `O máximo a reembolsar nesta reserva é ${formatPrice(outcome.maxCents, "pt", outcome.booking.currency)}.`,
      };

    case "refund-unavailable":
      return {
        error:
          "Esta reserva não tem pagamento no Stripe para reembolsar. " +
          "Pode cancelá-la sem reembolso (0) e devolver o dinheiro por fora.",
      };

    case "refund-failed":
      // Deliberately precise: the booking *is* cancelled and the car *is* free,
      // and only the money is outstanding. "Something went wrong" here would
      // have the operator cancel it again and wonder why it refuses.
      return {
        error:
          "A reserva foi cancelada e o lugar libertado, mas o Stripe recusou o reembolso. " +
          "Emita-o no painel do Stripe e avise o cliente.",
      };
  }
}

export type NoShowState = { ok?: boolean; error?: string };

/**
 * Mark a paid booking as a no-show ("Marcar falta") — or clear the mark
 * ("Retirar falta"). The only effect is that the guest is not sent the
 * post-tour thank-you; the work and the audit entry are in
 * `lib/booking-no-show.ts`. `requireAdmin()`, like cancelling and moving:
 * whether a guest turned up is the day job.
 *
 * No `revalidatePath`: the mark renders on admin pages only, which are
 * dynamic (see the note at the top of `app/admin/actions.ts`).
 */
export async function setBookingNoShow(
  _prevState: NoShowState,
  formData: FormData,
): Promise<NoShowState> {
  const actor = await requireAdmin();

  const parsed = bookingNoShowSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Essa reserva já não existe." };

  const outcome = await setNoShow({
    bookingId: parsed.data.bookingId,
    noShow: parsed.data.mark,
    actorUserId: actor.id,
  });
  switch (outcome.status) {
    case "marked":
    case "cleared":
    case "unchanged":
      // A double-submitted form lands here as `unchanged` — already the
      // state asked for, which is the truth and not an error.
      return { ok: true };
    case "not-found":
      return { error: "Essa reserva já não existe." };
    case "not-markable":
      return {
        error: "Só é possível marcar falta numa reserva paga, no dia do passeio ou depois.",
      };
  }
}

export type MoveBookingState = {
  ok?: boolean;
  error?: string;
  /** Where the booking ended up, read back to the operator in their own words. */
  message?: string;
};

/**
 * Move a paid booking to another departure — the bad-weather reschedule.
 *
 * The client's weather policy is reschedule first and refund only in extreme
 * conditions (info PDF §1.4), and this is the action that policy needs: the
 * same booking, the same payment, a different day. Cancelling and re-selling
 * would lose the payment linkage and cost the guest a second checkout.
 *
 * `requireAdmin()` for the same reason cancelling does not need `requireOwner()`
 * — moving a tour because it is going to rain is the day job, not an account or
 * a personal-data decision.
 *
 * The work is in `lib/booking-move.ts`: the availability re-check, the write,
 * the audit entry and the guest's email. This decides who may ask and turns the
 * outcome into a sentence.
 */
export async function moveBooking(
  _prevState: MoveBookingState,
  formData: FormData,
): Promise<MoveBookingState> {
  const actor = await requireAdmin();

  const parsed = moveBookingSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Escolha a nova data e a partida.",
    };
  }

  const { bookingId, date, slot } = parsed.data;

  const outcome = await moveBookingToDeparture({
    bookingId,
    date,
    slot,
    actorUserId: actor.id,
  });

  switch (outcome.status) {
    case "moved": {
      // The public calendar renders occupancy and is cached: this move freed a
      // car on one departure and took one on another, and both have to be true
      // on the booking page before the next guest looks at it.
      revalidatePath("/", "layout");

      const departure = t(
        departureLabel(outcome.booking.experienceSlug, outcome.booking.slot),
        "pt",
      );
      return {
        ok: true,
        message: `Reserva movida para ${formatDay(outcome.booking.date, "pt")} · ${departure}. O cliente foi avisado.`,
      };
    }

    case "not-found":
      return { error: "Essa reserva já não existe." };

    case "not-movable":
      // Also what the loser of a race gets: somebody else moved or cancelled it
      // between this page being rendered and the button being pressed.
      return {
        error:
          "Só é possível mover uma reserva paga — esta já não está confirmada, " +
          "ou já foi movida entretanto. Recarregue a página.",
      };

    case "same-departure":
      return { error: "A reserva já está nessa partida." };

    case "invalid":
      return { error: "Essa data ou partida não existe no calendário." };

    case "unavailable":
      // The re-check's own reason, worded for the person reading it. A party
      // too large for the fleet cannot arise from the picker — it lists only
      // departures this party fits — but the action does not trust the picker.
      return {
        error:
          outcome.reason === "no-vehicle"
            ? "Nessa partida já não há um carro para um grupo deste tamanho."
            : outcome.reason === "unreadable"
              ? "Não foi possível confirmar essa partida. Tente outra vez."
              : outcome.reason === "party-too-large" || outcome.reason === "bad-party"
                ? "Este grupo não cabe numa partida vendida online — trate desta reserva por telefone."
                : "Essa partida não está à venda ou já está cheia. Escolha outra.",
      };
  }
}

// ---------------------------------------------------------------------------
// The quote builder — a wedding or event lead's Orçamento card
// ---------------------------------------------------------------------------

/**
 * What every quote action hands back to the card.
 *
 * The work is in `lib/quote-builder.ts`, arranged like the move above; these
 * decide who may ask and turn an outcome into Rita's words. `requireAdmin()`
 * for the reason moving a booking needs no more: quoting a wedding is the day
 * job. No `revalidatePath` for the Sales detail — it is dynamic and the card
 * calls `router.refresh()` on success (the note at the top of
 * `app/admin/actions.ts`). The two that call off a held event do bust the
 * public site: its calendar is cached, and the day is back on sale.
 */
export type QuoteActionState = {
  ok?: boolean;
  error?: string;
  /** What happened, read back to the operator in their own words. */
  message?: string;
};

/** A draft write's outcome, as a sentence. */
function draftMessage(outcome: DraftOutcome, saved: string): QuoteActionState {
  switch (outcome.status) {
    case "saved":
      return { ok: true, message: saved };
    case "not-found":
      return { error: "Esse pedido ou orçamento já não existe." };
    case "not-quotable":
      return { error: "Só se fazem orçamentos para casamentos e eventos com os dados do cliente." };
    case "already-quoted":
      // Also the second of two phones pressing "Criar" at once.
      return { error: "Este pedido já tem um orçamento. Recarregue a página." };
    case "not-editable":
      return {
        error: "Este orçamento já não é um rascunho — foi enviado ou descartado entretanto. Recarregue a página.",
      };
    case "invalid":
      return {
        error: outcome.problems.includes("zero-total")
          ? "O total do orçamento tem de ser maior que zero."
          : outcome.problems.includes("no-lines")
            ? "Acrescente pelo menos uma linha ao orçamento."
            : "O orçamento tem dados inválidos. Reveja as linhas e a data.",
      };
  }
}

/** "Criar orçamento" or "Guardar" — the builder's form, create or edit. */
export async function saveQuoteDraft(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = quoteDraftSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Reveja o orçamento." };
  }

  const { leadId, quoteId, ...input } = parsed.data;
  const outcome = quoteId
    ? await saveDraft({ quoteId, input, actorUserId: actor.id })
    : await createDraftForLead({ leadId: leadId!, input, actorUserId: actor.id });

  return draftMessage(outcome, quoteId ? "Rascunho guardado." : "Rascunho criado.");
}

/** "Descartar rascunho". */
export async function discardQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = quoteIdSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Pedido inválido." };

  const discarded = await discardQuoteDraft({
    quoteId: parsed.data.quoteId,
    actorUserId: actor.id,
  });
  return discarded
    ? { ok: true, message: "Rascunho descartado." }
    : { error: "Este orçamento já não é um rascunho. Recarregue a página." };
}

/** "Nova versão" — a draft copied from the sent quote. */
export async function newQuoteVersion(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = quoteIdSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Pedido inválido." };

  const outcome = await startNewVersion({
    quoteId: parsed.data.quoteId,
    actorUserId: actor.id,
  });
  if (outcome.status === "not-editable") {
    return {
      error:
        "Só se cria uma nova versão de um orçamento enviado e ainda por pagar, " +
        "e só se não houver já um rascunho. Recarregue a página.",
    };
  }
  return draftMessage(
    outcome,
    "Nova versão criada como rascunho. O orçamento enviado continua válido até enviar esta.",
  );
}

/** A send's outcome, as a sentence — the quote, and then its email. */
function sendMessage(outcome: SendOutcome, done: string): QuoteActionState {
  switch (outcome.status) {
    case "sent": {
      const replaced = outcome.superseded > 0 ? " A versão anterior deixou de ser válida." : "";
      if (outcome.email === "sent" || outcome.email === "duplicate") {
        return { ok: true, message: `${done}${replaced}` };
      }
      // Precise, like the refund that failed after the cancellation: the quote
      // *is* sent and the lead *has* moved; only the mail is outstanding.
      return {
        ok: true,
        message:
          `O orçamento ficou enviado, mas o email não saiu.${replaced} ` +
          "Use «Reenviar» para mandar um novo link.",
      };
    }
    case "not-found":
      return { error: "Esse orçamento já não existe." };
    case "not-quotable":
      return { error: "Este pedido já não tem os dados do cliente — não é possível enviar." };
    case "not-sendable":
      // The second of two taps, or two phones: somebody already did this.
      return { error: "Este orçamento já foi enviado entretanto. Recarregue a página." };
    case "already-paid":
      return {
        error:
          "Este pedido já tem um orçamento com o sinal pago — não é possível enviar outro. " +
          "Descarte este rascunho.",
      };
    case "unconfigured":
      return {
        error:
          "O envio de orçamentos não está configurado neste ambiente (falta a chave dos links ou do email). Nada foi alterado.",
      };
  }
}

/** "Enviar orçamento" — a draft goes to the couple. */
export async function sendLeadQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = quoteIdSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Pedido inválido." };

  const outcome = await sendQuote({ quoteId: parsed.data.quoteId, actorUserId: actor.id });
  return sendMessage(outcome, "Orçamento enviado ao cliente.");
}

/** "Reenviar" — the same quote behind a new link, emailed again. */
export async function resendLeadQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = resendQuoteSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pedido inválido." };
  }

  const outcome = await resendQuote({
    quoteId: parsed.data.quoteId,
    sentAt: parsed.data.sentAt,
    actorUserId: actor.id,
  });
  return sendMessage(outcome, "Orçamento reenviado com um novo link. O link anterior deixou de funcionar.");
}

/**
 * "Reembolsar" on one instalment of a quote — the deposit, the balance or an
 * extra, in full or in part, and the event called off with it when the box
 * says so.
 *
 * The work is in `lib/quote-refund.ts`, which the webhook shares for a refund
 * made in the Stripe dashboard, so the two cannot write the books differently.
 * `requireAdmin()` for the reason the tour refund gives: the typed
 * confirmation, not the role, stands between a mis-tap and the money.
 */
export async function refundLeadQuotePayment(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = refundQuotePaymentSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        `Escreva ${REFUND_CONFIRMATION} para confirmar.`,
    };
  }

  const { paymentId, refundAmount, cancelEvent } = parsed.data;
  const outcome = await refundQuotePayment({
    paymentId,
    refundCents: refundAmount,
    cancelEvent,
    actorUserId: actor.id,
  });

  switch (outcome.status) {
    case "refunded": {
      // A cancelled event gives its day back to the tours (`lib/event-holds.ts`),
      // and the public calendar that shows it is cached.
      if (outcome.eventCancelled) revalidatePath("/", "layout");
      const money = formatPrice(outcome.refundedCents, "pt", outcome.payment.currency);
      return {
        ok: true,
        message: outcome.eventCancelled
          ? `Reembolso de ${money} enviado e evento cancelado. O cliente foi avisado.`
          : `Reembolso de ${money} enviado. O cliente foi avisado.`,
      };
    }

    case "not-found":
      return { error: "Esse pagamento já não existe. Recarregue a página." };

    case "not-refundable":
      // Also what a double-submitted form gets once the first one has given
      // everything back.
      return {
        error:
          outcome.payment.status === "refunded"
            ? "Este pagamento já foi reembolsado na totalidade."
            : "Só é possível reembolsar um pagamento que foi pago.",
      };

    case "amount-invalid":
      return {
        error: `O valor tem de estar entre 0,01 € e ${formatPrice(outcome.maxCents, "pt", outcome.payment.currency)}.`,
      };

    case "refund-unavailable":
      return {
        error:
          "Este pagamento não foi feito pelo Stripe, por isso não há nada para reembolsar aqui. " +
          "Devolva o dinheiro pela mesma via em que o recebeu.",
      };

    case "refund-failed":
      // Nothing was written: the row, the quote and the couple's inbox are as
      // they were, which is what makes "try again" the right advice.
      return {
        error:
          "O Stripe recusou o reembolso — nada foi alterado e o evento não foi cancelado. " +
          "Tente de novo daqui a pouco, ou emita-o no painel do Stripe.",
      };
  }
}

/**
 * "Cancelar evento" — call off a quote whose deposit has already gone back in
 * full, so its balance is never asked for. No money moves and no email goes:
 * the couple were told about the refund when it happened.
 */
export async function cancelLeadHeldQuote(
  _prevState: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const actor = await requireAdmin();

  const parsed = cancelHeldQuoteSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        `Escreva ${EVENT_CANCEL_CONFIRMATION} para confirmar.`,
    };
  }

  const outcome = await cancelHeldQuote({
    quoteId: parsed.data.quoteId,
    actorUserId: actor.id,
  });

  switch (outcome.status) {
    case "cancelled":
      // The day it held is back on sale — bust the cached public calendar.
      revalidatePath("/", "layout");
      return { ok: true, message: "Evento cancelado. O saldo já não será pedido." };
    case "not-found":
      return { error: "Este orçamento já não existe. Recarregue a página." };
    case "not-held":
      return {
        error:
          outcome.quote.status === "cancelled"
            ? "Este evento já está cancelado."
            : "Só é possível cancelar aqui um evento cujo sinal foi reembolsado na totalidade.",
      };
  }
}
