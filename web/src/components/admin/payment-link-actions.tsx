"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Ban, BellRing, Send } from "lucide-react";

import {
  cancelPaymentLink,
  remindUnpaidBooking,
  resendPaymentLink,
  type PaymentLinkActionState,
} from "@/app/admin/sales/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function SubmitButton({
  idle,
  busy,
  icon,
  variant = "outline",
  ariaLabel,
  className,
}: {
  idle: string;
  busy: string;
  icon: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  ariaLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-label={ariaLabel}
      className={className}
    >
      {icon}
      {pending ? busy : idle}
    </Button>
  );
}

/**
 * "Reenviar link" and "Anular link" on a booking that waits on its payment
 * link.
 *
 * Resending is one tap: it costs nothing but the old link, and the customer
 * who lost the email is usually on the phone asking for it. Cancelling asks
 * once more, in place, because it ends the booking — there is no money to
 * return, but the customer's link stops working.
 *
 * With `reminder`, the booking is a site checkout the team reminded
 * (JAM-292): the first button is "Lembrar", which sends the reminder's own
 * email. "Anular link" is the same for both.
 */
export function PaymentLinkActions({
  bookingId,
  bookingRef,
  reminder = false,
}: {
  bookingId: string;
  bookingRef: string;
  reminder?: boolean;
}) {
  const router = useRouter();
  const [resent, resendAction] = useActionState<PaymentLinkActionState, FormData>(
    reminder ? remindUnpaidBooking : resendPaymentLink,
    {},
  );
  const [cancelled, cancelAction] = useActionState<PaymentLinkActionState, FormData>(
    cancelPaymentLink,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  // The sent time and the booking's badge read the row that just changed.
  useEffect(() => {
    if (resent.ok || cancelled.ok) router.refresh();
  }, [resent, cancelled, router]);

  const error = resent.error ?? cancelled.error;
  const message = resent.ok ? resent.message : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={resendAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          {reminder ? (
            <SubmitButton
              idle="Lembrar"
              busy="A enviar…"
              icon={<BellRing className="size-4" />}
              ariaLabel={`Lembrar o cliente do pagamento da reserva ${bookingRef}`}
            />
          ) : (
            <SubmitButton
              idle="Reenviar link"
              busy="A enviar…"
              icon={<Send className="size-4" />}
              ariaLabel={`Reenviar o link de pagamento da reserva ${bookingRef}`}
            />
          )}
        </form>
        {confirming ? (
          <form action={cancelAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="bookingId" value={bookingId} />
            <SubmitButton
              idle="Confirmar anulação"
              busy="A anular…"
              icon={<Ban className="size-4" />}
              variant="destructive"
              ariaLabel={`Confirmar a anulação da reserva ${bookingRef}`}
            />
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
          </form>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
            <Ban className="size-4" />
            Anular link
          </Button>
        )}
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "Lembrar" alone: one tap emails the guest of an unpaid site checkout a new
 * payment link (JAM-292). On the Sales card, and on the lead's page for a
 * booking that has no link to cancel yet.
 *
 * One tap and no question: the email asks for nothing the guest did not start,
 * and a second tap is only a second email with a newer link.
 */
export function RemindBookingButton({
  bookingId,
  bookingRef,
  className,
}: {
  bookingId: string;
  bookingRef: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<PaymentLinkActionState, FormData>(
    remindUnpaidBooking,
    {},
  );

  // "Lembrete enviado" and the booking's badge read the row that just changed.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <form action={action}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <SubmitButton
          idle="Lembrar"
          busy="A enviar…"
          icon={<BellRing className="size-4" />}
          ariaLabel={`Lembrar o cliente do pagamento da reserva ${bookingRef}`}
          className="min-h-11 w-full gap-2"
        />
      </form>
      {state.ok && state.message ? (
        <p className="text-xs text-muted-foreground">{state.message}</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
