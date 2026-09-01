"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { cancelBooking, type CancelBookingState } from "@/app/admin/sales/actions";
import { REFUND_CONFIRMATION } from "@/lib/admin-format";
import { formatPrice, parseAmountInput, priceInputValue } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ConfirmButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending || !armed}>
      {pending ? "A cancelar…" : "Cancelar e reembolsar"}
    </Button>
  );
}

/**
 * Cancel one paid booking, and decide what goes back with it.
 *
 * The typed confirmation is the same gesture as the erasure dialog and for the
 * same reason: this one moves money and tells a guest their tour is off, and a
 * one-click version of it sitting on a booking card would eventually be pressed
 * by accident. The word is {@link REFUND_CONFIRMATION} rather than "CANCELAR" —
 * the way out of this dialog is a button that says exactly that.
 *
 * **The amount is a field, not a choice between two buttons.** Rita's judgement
 * is the policy (bad weather, goodwill, a late cancellation), so the box starts
 * at the full refundable amount, takes anything down to `0`, and reads back
 * what it is about to do in words before the button will arm.
 */
export function CancelBookingDialog({
  booking,
  guestName,
}: {
  booking: {
    id: string;
    ref: string;
    /** What the guest paid, in cents. */
    amountCents: number;
    /** What has already gone back, in cents. */
    refundedAmountCents: number;
    currency: string;
    /** `YYYY-MM-DD` — the day being called off, for the dialog's first line. */
    date: string;
  };
  guestName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const refundable = Math.max(0, booking.amountCents - booking.refundedAmountCents);
  // Starts at everything that is still returnable — the common case is "give
  // it all back". `priceInputValue` renders nothing for a zero, and an empty
  // box would leave the button un-armable on a booking with nothing left.
  const [amount, setAmount] = useState(() => priceInputValue(refundable) || "0");
  const [state, formAction] = useActionState<CancelBookingState, FormData>(
    cancelBooking,
    {},
  );

  // Refresh once the cancellation lands: the booking card, the audit history
  // and the board all read the row that just changed. As in the erasure dialog,
  // the dialog's own visibility is derived from `state.ok` rather than set here.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const parsed = parseAmountInput(amount);
  const amountValid = parsed !== null && parsed <= refundable;
  const money = (cents: number) => formatPrice(cents, "pt", booking.currency);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Cancelar e reembolsar a reserva ${booking.ref}`}
      >
        <TriangleAlert className="size-4" />
        Cancelar e reembolsar
      </Button>

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}

      <Dialog open={open && !state.ok} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <DialogHeader>
              <DialogTitle>Cancelar a reserva {booking.ref}?</DialogTitle>
              <DialogDescription>
                O passeio de {guestName} a {booking.date} deixa de existir e o carro fica
                outra vez disponível para essa partida. O cliente recebe um email a dizer
                que a reserva foi cancelada e quanto lhe é devolvido. Não há como voltar
                atrás.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`refund-${booking.id}`}>Valor a reembolsar (€)</Label>
              <Input
                id={`refund-${booking.id}`}
                name="refundAmount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pago: {money(booking.amountCents)}
                {booking.refundedAmountCents > 0
                  ? ` · já reembolsado: ${money(booking.refundedAmountCents)}`
                  : ""}{" "}
                · máximo agora: {money(refundable)}. Escreva 0 para cancelar sem devolver
                nada.
              </p>
              <p className="text-xs" role="status">
                {amountValid && parsed !== null
                  ? parsed > 0
                    ? `Vão ser devolvidos ${money(parsed)}.`
                    : "Não é devolvido nenhum valor."
                  : `Indique um valor entre 0 e ${money(refundable)}.`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`confirm-cancel-${booking.id}`}>
                Escreva {REFUND_CONFIRMATION} para confirmar
              </Label>
              <Input
                id={`confirm-cancel-${booking.id}`}
                name="confirm"
                autoComplete="off"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Voltar
              </Button>
              <ConfirmButton armed={amountValid && typed === REFUND_CONFIRMATION} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
