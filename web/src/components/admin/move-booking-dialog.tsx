"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CalendarDays } from "lucide-react";
import { moveBooking, type MoveBookingState } from "@/app/admin/sales/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** One day the booking could move to, and the departures of it that fit. */
export type MoveOption = {
  date: string;
  /** "sábado, 15 de agosto de 2026" — formatted on the server. */
  label: string;
  slots: { slot: string; label: string }[];
};

function ConfirmButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !armed}>
      {pending ? "A mover…" : "Mover a reserva"}
    </Button>
  );
}

/**
 * Move one paid booking to another departure — the bad-weather reschedule.
 *
 * **The picker only offers departures that can actually take this booking.**
 * The options are built on the server by `lib/booking-move.ts`, which runs the
 * same capacity rule the checkout runs, so a day that is closed, full, or has
 * only the wrong class of car left is never on the list. The action re-checks
 * anyway — this list was rendered at some earlier moment, and a departure can
 * fill up while the dialog is open — but the operator is not sent looking for
 * the one day in three that will be accepted.
 *
 * **No typed confirmation, unlike cancelling.** A refund moves money and cannot
 * be undone; a move is an edit, and moving it back is the same two taps. What
 * guards it is that both the day and the departure have to be chosen.
 */
export function MoveBookingDialog({
  booking,
  guestName,
  options,
}: {
  booking: {
    id: string;
    ref: string;
    /** Where it is now, already formatted: "sábado, 15 de agosto · Manhã · 10h00". */
    current: string;
  };
  guestName: string;
  options: MoveOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [state, formAction] = useActionState<MoveBookingState, FormData>(moveBooking, {});

  // The chosen day's departures. Changing the day clears the departure below,
  // so a morning chosen on the 15th cannot be submitted against the 22nd.
  const slots = useMemo(
    () => options.find((option) => option.date === date)?.slots ?? [],
    [options, date],
  );

  // Refresh once the move lands: the booking card, the audit history and the
  // board all read the row that just changed. As in the cancel dialog, the
  // dialog's visibility is derived from `state.ok` rather than set here.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const chosen = slots.find((entry) => entry.slot === slot);
  const armed = Boolean(date && chosen);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Mover a reserva ${booking.ref} para outra partida`}
      >
        <CalendarDays className="size-4" />
        Mover reserva
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
              <DialogTitle>Mover a reserva {booking.ref}?</DialogTitle>
              <DialogDescription>
                O passeio de {guestName} passa de {booking.current} para a partida que
                escolher. O pagamento, as pessoas e o valor ficam como estão, e o cliente
                recebe um email com a nova data e o ponto de encontro.
              </DialogDescription>
            </DialogHeader>

            {options.length === 0 ? (
              // Not an error: the calendar simply has nowhere to put this
              // party. Said plainly, with the screen that fixes it named.
              <p className="text-sm text-muted-foreground">
                Não há nenhuma partida com lugar para este grupo nos próximos meses. Abra
                dias no calendário e volte aqui.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`move-date-${booking.id}`}>Nova data</Label>
                  <Select
                    id={`move-date-${booking.id}`}
                    name="date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setSlot("");
                    }}
                  >
                    <option value="">Escolha um dia</option>
                    {options.map((option) => (
                      <option key={option.date} value={option.date}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`move-slot-${booking.id}`}>Partida</Label>
                  <Select
                    id={`move-slot-${booking.id}`}
                    name="slot"
                    value={slot}
                    disabled={!date}
                    onChange={(event) => setSlot(event.target.value)}
                  >
                    <option value="">
                      {date ? "Escolha a partida" : "Escolha primeiro o dia"}
                    </option>
                    {slots.map((entry) => (
                      <option key={entry.slot} value={entry.slot}>
                        {entry.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Só aparecem os dias e as partidas com condutor e carro livres para
                    este grupo.
                  </p>
                </div>

                <p className="text-xs" role="status">
                  {armed
                    ? `Vai passar de ${booking.current} para ${
                        options.find((option) => option.date === date)!.label
                      } · ${chosen!.label}.`
                    : "Escolha o dia e a partida."}
                </p>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Voltar
              </Button>
              <ConfirmButton armed={armed} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
