"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { UserX } from "lucide-react";

import { setBookingNoShow, type NoShowState } from "@/app/admin/sales/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ marked, bookingRef }: { marked: boolean; bookingRef: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      disabled={pending}
      aria-label={marked ? `Retirar a falta da reserva ${bookingRef}` : `Marcar falta na reserva ${bookingRef}`}
    >
      <UserX className="size-4" />
      {pending ? "A guardar…" : marked ? "Retirar falta" : "Marcar falta"}
    </Button>
  );
}

/**
 * "Marcar falta" / "Retirar falta" on one booking.
 *
 * One tap, no confirmation dialog: the mark is reversible with the same tap,
 * moves no money and tells nobody anything — its only effect is that the
 * guest is not sent the next morning's thank-you. That is also why the hint
 * sits beside it: the mark has to be set on the day to count.
 */
export function NoShowToggle({
  bookingId,
  bookingRef,
  marked,
}: {
  bookingId: string;
  bookingRef: string;
  marked: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<NoShowState, FormData>(setBookingNoShow, {});

  // The badge and the audit history read the row that just changed.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="mark" value={marked ? "0" : "1"} />
      <SubmitButton marked={marked} bookingRef={bookingRef} />
      {marked ? null : (
        <span className="text-xs text-muted-foreground">
          Marque no próprio dia — o agradecimento sai na manhã seguinte.
        </span>
      )}
      {state.error ? (
        <p role="alert" className="w-full text-xs font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
