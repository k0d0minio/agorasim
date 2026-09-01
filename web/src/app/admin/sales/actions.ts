"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { REFUND_CONFIRMATION } from "@/lib/admin-format";
import { cancelAndRefundBooking } from "@/lib/booking-refund";
import { cancelBookingSchema, formValues } from "@/lib/form-schemas";
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
 * eventually forgets a step.
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
