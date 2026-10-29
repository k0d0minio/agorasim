"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Ban, Send } from "lucide-react";

import {
  cancelPaymentLink,
  resendPaymentLink,
  type PaymentLinkActionState,
} from "@/app/admin/sales/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({
  idle,
  busy,
  icon,
  variant = "outline",
  ariaLabel,
}: {
  idle: string;
  busy: string;
  icon: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-label={ariaLabel}>
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
 */
export function PaymentLinkActions({
  bookingId,
  bookingRef,
}: {
  bookingId: string;
  bookingRef: string;
}) {
  const router = useRouter();
  const [resent, resendAction] = useActionState<PaymentLinkActionState, FormData>(
    resendPaymentLink,
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
          <SubmitButton
            idle="Reenviar link"
            busy="A enviar…"
            icon={<Send className="size-4" />}
            ariaLabel={`Reenviar o link de pagamento da reserva ${bookingRef}`}
          />
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
