"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, UserRoundPlus } from "lucide-react";

import {
  createManualBooking,
  type ManualBookingActionState,
} from "@/app/admin/calendar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

/** An active signature tour the sheet can sell, as `page.tsx` shapes it. */
export type ManualBookingTour = { slug: string; title: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "A registar…" : "Registar e confirmar"}
    </Button>
  );
}

/**
 * One of the "how many are coming" steppers.
 *
 * Same trade as the roster stepper in the day sheet: `[−][count][+]`, steps of
 * one hang off a pair of ≥44px buttons, and the count reads back through
 * `aria-live` for a screen reader. `id` is passed in so each stepper owns
 * distinct references and touch targets.
 */
function Stepper({
  id,
  label,
  unit,
  count,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  count: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 rounded-lg border p-2">
      <span id={`${id}-label`} className="text-center text-xs font-medium">
        {label}
      </span>
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Menos um ${unit}`}
          disabled={count <= min}
          onClick={() => onChange(Math.max(min, count - 1))}
        >
          <Minus className="size-4" />
        </Button>
        <output
          aria-live="polite"
          aria-labelledby={`${id}-label`}
          className="min-w-8 text-center font-heading text-xl font-semibold"
        >
          {count}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Mais um ${unit}`}
          disabled={count >= max}
          onClick={() => onChange(Math.min(max, count + 1))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** A one-or-the-other choice, styled like the day sheet's departure toggles. */
function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 touch-manipulation rounded-lg border px-4 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

/**
 * Record a sale that never went through Stripe.
 *
 * Every cash or phone booking is inserted straight into the calendar,
 * `confirmed` from creation, by the one path that writes
 * `payment_method = 'cash'` (see the action's note in `calendar/actions.ts`).
 * This sheet is its phone-first entry point, opened from the day sheet: pick
 * the departure — only those actually on sale and with capacity appear —
 * the tour, the format, and the party, name the guest, and either accept the
 * catalogue price or type the deal that was actually struck.
 *
 * **The sheet owns its dialog.** The day sheet stays open underneath (it is
 * what the operator was doing), this dialog rises over it as its own sheet and
 * closes itself once the reservation lands — the calendar refresh the day
 * sheet's `onDone` triggers is that landing, showing the new booking dot.
 */
export function ManualBookingDialog({
  date,
  openSlots,
  tours,
  onDone,
}: {
  /** The day being looked at — posted through to the action. */
  date: string;
  /** Departures on sale with capacity left; the choices shown are only these. */
  openSlots: ("morning" | "afternoon")[];
  tours: ManualBookingTour[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ManualBookingActionState, FormData>(
    createManualBooking,
    {},
  );

  const [slot, setSlot] = useState<"morning" | "afternoon">(openSlots[0] ?? "morning");
  const [experience, setExperience] = useState(tours[0]?.slug ?? "");
  const [mode, setMode] = useState<"public" | "private">("public");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  // A fresh sheet on every open, whatever the last booking left behind: the
  // defaults are the defaults, not the previous guest. (After a success the
  // whole dialog unmounts — `onDone` collapses the day sheet — so state never
  // survives to poison the next opener.)
  useEffect(() => {
    if (!open) return;
    setSlot(openSlots[0] ?? "morning");
    setExperience(tours[0]?.slug ?? "");
    setMode("public");
    setAdults(2);
    setChildren(0);
    setInfants(0);
  }, [open, openSlots, tours]);

  // Closing on success is derived, as everywhere in this admin: once `ok`
  // lands the booking exists, the dialog has nothing left to say and the
  // sheet's `onDone` repaints the calendar behind it.
  useEffect(() => {
    if (!state.ok) return;
    setOpen(false);
    onDone();
  }, [state.ok, onDone]);

  const errors = state.fieldErrors ?? {};

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full gap-2 sm:w-auto"
      >
        <UserRoundPlus className="size-4" />
        Nova reserva
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="date" value={date} />

            <DialogHeader>
              <DialogTitle>Nova reserva</DialogTitle>
              <DialogDescription>
                Venda feita ao telefone ou em pessoa, sem Stripe. O valor de base é o do
                catálogo; diga outro se o que combinou foi diferente.
              </DialogDescription>
            </DialogHeader>

            <FieldError message={state.error} />

            <div role="group" aria-label="Partida" className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Partida</span>
              <div className="flex gap-2">
                {openSlots.map((choice) => (
                  <Choice
                    key={choice}
                    active={slot === choice}
                    onClick={() => setSlot(choice)}
                  >
                    {choice === "morning" ? "Manhã · 10:00" : "Tarde · 14:00"}
                  </Choice>
                ))}
              </div>
              <FieldError message={errors.slot} />
            </div>
            <input type="hidden" name="slot" value={slot} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-booking-experience">Passeio</Label>
              <Select
                id="manual-booking-experience"
                name="experience"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
              >
                {tours.map((tour) => (
                  <option key={tour.slug} value={tour.slug}>
                    {tour.title}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.experience} />
            </div>

            <div role="group" aria-label="Formato" className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Formato</span>
              <div className="flex gap-2">
                <Choice active={mode === "public"} onClick={() => setMode("public")}>
                  Partilhado
                </Choice>
                <Choice active={mode === "private"} onClick={() => setMode("private")}>
                  Privado
                </Choice>
              </div>
            </div>
            <input type="hidden" name="mode" value={mode} />

            <div role="group" aria-label="Quantos vêm" className="flex flex-col gap-2">
              <span className="text-sm font-medium">Quantos vêm</span>
              <div className="grid grid-cols-3 gap-2">
                <Stepper
                  id="manual-adults"
                  label="Adultos"
                  unit="adulto"
                  count={adults}
                  min={1}
                  max={8}
                  onChange={setAdults}
                />
                <Stepper
                  id="manual-children"
                  label="Crianças"
                  unit="criança"
                  count={children}
                  min={0}
                  max={8}
                  onChange={setChildren}
                />
                <Stepper
                  id="manual-infants"
                  label="Bebés"
                  unit="bebé"
                  count={infants}
                  min={0}
                  max={8}
                  onChange={setInfants}
                />
              </div>
              <FieldError message={errors.party} />
            </div>
            <input type="hidden" name="adults" value={adults} />
            <input type="hidden" name="children" value={children} />
            <input type="hidden" name="infants" value={infants} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-booking-name">Nome</Label>
              <Input
                id="manual-booking-name"
                name="name"
                required
                autoComplete="name"
                placeholder="Quem reserva"
              />
              <FieldError message={errors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-booking-email">Email</Label>
              <Input
                id="manual-booking-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="nome@exemplo.pt"
              />
              <FieldError message={errors.email} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-booking-phone">Telefone (opcional)</Label>
              <Input
                id="manual-booking-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-booking-amount">Valor combinado (€)</Label>
              <Input
                id="manual-booking-amount"
                name="amount"
                inputMode="decimal"
                placeholder="Preço do catálogo"
                enterKeyHint="done"
              />
              <p className="text-xs text-muted-foreground">
                Em branco, o preço do catálogo. Ou o valor negociado — fica registado
                como combinado.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}