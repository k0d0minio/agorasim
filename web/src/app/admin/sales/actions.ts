"use server";

import { revalidatePath } from "next/cache";

import { departureLabel } from "@/content/logistics";
import { t } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin-auth";
import { REFUND_CONFIRMATION } from "@/lib/admin-format";
import { formatDay } from "@/lib/availability";
import { moveBookingToDeparture } from "@/lib/booking-move";
import { cancelAndRefundBooking } from "@/lib/booking-refund";
import { cancelBookingSchema, formValues, moveBookingSchema } from "@/lib/form-schemas";
import { formatPrice } from "@/lib/money";

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
