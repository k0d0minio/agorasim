"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, UserRoundPlus } from "lucide-react";

import {
  createManualBooking,
  type ManualBookingActionState,
} from "@/app/admin/calendar/actions";
import type { ManualBookingPrefill } from "@/lib/manual-booking";
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

/** One day the sheet can sell, and the departures of it still open. */
export type ManualBookingDay = {
  date: string;
  /** "sábado, 15 de agosto de 2026" — formatted on the server. */
  label: string;
  slots: { slot: string; label: string }[];
};

/**
 * Where the sheet gets the departure it is about to sell.
 *
 * Two mounts, two situations, and they are genuinely different questions
 * rather than one question with an optional half. The Calendar opens this sheet
 * from inside a day: that day is what the operator is looking at, and only the
 * departure is left to choose. The Sales board opens it from a lead, where
 * nothing about the calendar has been decided — so the day is chosen too, out
 * of every day still open between now and the horizon.
 *
 * A union rather than four optional props, because "a date and a list of days"
 * and "neither" are states the sheet has no reading of, and a prop shape that
 * can express them is a prop shape somebody eventually passes.
 */
export type ManualBookingDeparture =
  /** The day is settled; pick one of its open departures. */
  | { kind: "fixed"; date: string; openSlots: ("morning" | "afternoon")[] }
  /** Nothing is settled; pick the day and then its departure. */
  | { kind: "pick"; days: ManualBookingDay[] };

function SubmitButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !armed}>
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
 *
 * It lays out as a *row* — label left, controls right, like the public
 * checkout's stepper — because the three of them stacked in a column is the
 * only shape that fits. Side by side, each `[44px][8px][32px][8px][44px]` pair
 * needs 136px and the phone bottom sheet has ~88px per column to give
 * (375px − 40px of sheet padding, split three ways, less the card's own
 * border and padding), so the adults "+" and the crianças "−" overlapped.
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
    <div
      role="group"
      aria-label={label}
      className="flex items-center justify-between gap-3 px-3 py-2"
    >
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <div className="flex items-center gap-3">
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
 * This sheet is its phone-first entry point: pick the departure — only those
 * actually on sale and with capacity appear — the tour, the format, and the
 * party, name the guest, and either accept the catalogue price or type the
 * deal that was actually struck.
 *
 * **Two mounts, one sheet.** From a day in the Calendar it sells that day
 * (`departure.kind === "fixed"`). From a lead on the Sales board it sells
 * whichever day the operator picks, with the guest already typed in from the
 * enquiry they are answering — because "Rita is on the phone with the person
 * whose card she is looking at" is the case the whole feature exists for, and
 * making her find the day in another screen first is what she was doing
 * before. See {@link ManualBookingDeparture} for why that is a union.
 *
 * **The sheet owns its dialog.** Whatever opened it stays open underneath (it
 * is what the operator was doing), this dialog rises over it as its own sheet
 * and closes itself once the reservation lands — the refresh `onDone` triggers
 * is that landing, showing the new booking dot or the moved card.
 *
 * `open`/`onOpenChange` are optional: left out, the sheet tracks its own
 * open state (the Sales board's mount). The Calendar's day sheet passes them
 * so it can hide itself for the one modal admin spec S7 asks for, and hands
 * `showTrigger={false}` because it renders its own "Nova reserva" button in
 * the day sheet's own layout flow — see `DayEditor`.
 */
export function ManualBookingDialog({
  departure,
  tours,
  lead,
  triggerLabel = "Nova reserva",
  triggerVariant = "secondary",
  triggerClassName = "w-full gap-2 sm:w-auto",
  showTrigger = true,
  open: controlledOpen,
  onOpenChange,
  onDone,
}: {
  departure: ManualBookingDeparture;
  tours: ManualBookingTour[];
  /**
   * The enquiry being answered, where there is one: its fields fill the sheet
   * and its id moves it to `Reservado` when the booking lands. Absent on the
   * Calendar's mount, where the call arrived without a lead behind it.
   */
  lead?: ManualBookingPrefill;
  /** "Nova reserva" in the Calendar, "Registar reserva" on a lead. */
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  /** False when the caller renders its own trigger and only wants the form. */
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDone: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant={triggerVariant}
          onClick={() => setOpen(true)}
          className={triggerClassName}
        >
          <UserRoundPlus className="size-4" />
          {triggerLabel}
        </Button>
      ) : null}

      {open ? (
        <ManualBookingForm
          departure={departure}
          tours={tours}
          lead={lead}
          onDone={onDone}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * The mounted-while-open form. The dialog exists only while a booking is being
 * recorded, so nothing survives to poison a later opener: `open` controls the
 * trigger up here, and this form — its `useActionState` and every field —
 * resets itself by unmounting when the sheet closes. The disappearance IS the
 * reset, which is why there is no "clear on open" effect.
 */
function ManualBookingForm({
  departure,
  tours,
  lead,
  onDone,
  onClose,
}: {
  departure: ManualBookingDeparture;
  tours: ManualBookingTour[];
  lead?: ManualBookingPrefill;
  onDone: () => void;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<ManualBookingActionState, FormData>(
    createManualBooking,
    {},
  );

  // The day: fixed by the Calendar's mount, chosen here on the board's. Kept as
  // one piece of state either way so the hidden `date` field below has a single
  // source, rather than two branches that could post different things.
  const [date, setDate] = useState(departure.kind === "fixed" ? departure.date : "");
  const [slot, setSlot] = useState(
    departure.kind === "fixed" ? (departure.openSlots[0] ?? "morning") : "",
  );
  const [experience, setExperience] = useState(
    // The lead's own tour where it is still sellable — `manualBookingPrefill`
    // has already refused a retired one, so this is never an option the
    // `<Select>` below does not list.
    lead?.experience ?? tours[0]?.slug ?? "",
  );
  const [mode, setMode] = useState<"public" | "private">("public");
  const [adults, setAdults] = useState(lead?.adults ?? 2);
  const [children, setChildren] = useState(lead?.children ?? 0);
  const [infants, setInfants] = useState(lead?.infants ?? 0);

  // The departures of the day chosen, on the board's mount. Changing the day
  // clears the departure, so a morning chosen on the 15th cannot be submitted
  // against the 22nd — the same guard the move picker keeps.
  const slotsForDay = useMemo(
    () =>
      departure.kind === "pick"
        ? (departure.days.find((day) => day.date === date)?.slots ?? [])
        : [],
    [departure, date],
  );

  // Closing on success is derived, as everywhere in this admin: once `ok`
  // lands the booking exists and the sheet has nothing left to say — refresh
  // the calendar behind it (`onDone`) and turn the dialog off (`onClose`,
  // which unmounts this very form).
  useEffect(() => {
    if (!state.ok) return;
    onDone();
    onClose();
  }, [state.ok, onDone, onClose]);

  const errors = state.fieldErrors ?? {};

  // Both halves of the departure are chosen. On the Calendar's mount that is
  // true from the first render; on the board's it guards the two states the
  // action would otherwise have to refuse with an error nobody asked for — a
  // day picked with no departure yet, and a calendar with nothing open at all.
  const armed = Boolean(date && slot);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="date" value={date} />
          {/* The enquiry this sale answers. Its presence is what moves the lead
              to `Reservado` instead of creating a second card for the same
              person — see the action. */}
          {lead ? <input type="hidden" name="leadId" value={lead.leadId} /> : null}

          <DialogHeader>
            <DialogTitle>{lead ? `Registar reserva — ${lead.name}` : "Nova reserva"}</DialogTitle>
            <DialogDescription>
              Venda feita ao telefone ou em pessoa, sem Stripe. O valor de base é o do
              catálogo; diga outro se o que combinou foi diferente.
              {lead
                ? " Os dados vêm do pedido — corrija-os aqui se entretanto mudaram. O pedido passa a Reservado."
                : ""}
            </DialogDescription>
          </DialogHeader>

          <FieldError message={state.error} />

          {departure.kind === "fixed" ? (
            <>
              <div role="group" aria-label="Partida" className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Partida</span>
                <div className="flex gap-2">
                  {departure.openSlots.map((choice) => (
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
            </>
          ) : departure.days.length === 0 ? (
            /* Not an error: the calendar simply has nothing left to sell. Said
               plainly, with the screen that fixes it named — as in the move
               picker, which meets the same wall. */
            <p className="text-sm text-muted-foreground">
              Não há nenhuma partida aberta nos próximos meses. Abra dias no calendário e
              volte aqui.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-booking-date">Dia</Label>
                <Select
                  id="manual-booking-date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlot("");
                  }}
                >
                  <option value="">Escolha um dia</option>
                  {departure.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      {day.label}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.date} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-booking-slot">Partida</Label>
                <Select
                  id="manual-booking-slot"
                  name="slot"
                  value={slot}
                  disabled={!date}
                  onChange={(event) => setSlot(event.target.value)}
                >
                  <option value="">
                    {date ? "Escolha a partida" : "Escolha primeiro o dia"}
                  </option>
                  {slotsForDay.map((entry) => (
                    <option key={entry.slot} value={entry.slot}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.slot} />
                {/*
                  What this list does and does not promise. It is every departure
                  on sale with a driver and a car still free — the calendar's own
                  `bookable` rule. Whether *this* group fits is settled when the
                  booking is registered, because the party and the passeio are
                  still being chosen while the list is on screen.
                */}
                <p className="text-xs text-muted-foreground">
                  Só aparecem os dias com partidas abertas e carro livre. A lotação para
                  este grupo é confirmada ao registar.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-booking-experience">Experiência</Label>
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
            {/* One stepper per row, divided rather than boxed: three cards
                side by side is what overflowed the 375px sheet. */}
            <div className="flex flex-col divide-y rounded-lg border">
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
              defaultValue={lead?.name}
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
              defaultValue={lead?.email}
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
              defaultValue={lead?.phone}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <SubmitButton armed={armed} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}