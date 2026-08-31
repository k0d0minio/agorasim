"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import {
  clearAvailability,
  setAvailability,
  type AvailabilityActionState,
} from "@/app/admin/calendar/actions";
import type { DaySlots, SlotAvailability } from "@/lib/availability";
import { VEHICLE_CLASSES, type VehicleClass } from "@/lib/fleet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The availability calendar — Diogo & Rita's morning screen.
 *
 * Since AGORA-012 it manages **one shared calendar**, not one per tour: a day
 * cell carries the morning and afternoon of the whole business, because the
 * business has two drivers and four cars and a tour that leaves at 10:00 takes
 * one of each whichever route it is. The tour tabs that used to sit above the
 * grid are gone, and with them the quiet promise that opening a Saturday for
 * one tour left the other alone.
 *
 * What an operator sets is the **roster**: how many drivers are on a departure.
 * The fleet is not a field — four cars and a touring vehicle is a fact about
 * the business, not something to re-enter for every Tuesday — so a car in the
 * garage is a note and a driver taken off, or a closed departure.
 *
 * Built to the admin mobile spec (`docs/admin-mobile-design-spec.md`) because
 * it is used standing next to a car, one-handed:
 *
 * - Every day cell is a ≥44px target (T1) laid out in a 7-column grid that
 *   still fits the 320px reflow floor (D2).
 * - Editing a day opens the shared responsive dialog — a bottom sheet on a
 *   phone, a centred dialog from `sm` up (S1).
 * - Month paging is `<Link>`s, not client state (V3): the back-swipe an
 *   installed PWA cannot disable stays meaningful, and a reload lands where
 *   the operator was.
 * - Nothing requires a drag (T6). The roster is a stepper; the bulk sweeps and
 *   the seasonal window are buttons and two native date fields.
 * - Day-cell captions are 12px, the floor the spec sets (F2), which is why the
 *   two departures in a cell stack instead of sitting side by side.
 *
 * The heavy work is the bulk row and the season card. "Close everything until
 * April" is one gesture and one round trip — the alternative is two hundred
 * taps on 4G in a courtyard, which is how a calendar stops being kept up to
 * date. Both of them ask first: the gesture is cheap to make and expensive to
 * make by accident, so it goes through a confirmation that names the range
 * (see {@link SweepConfirmation}), and the write it performs leaves every note
 * and every adjusted roster in that range alone (see `upsertDays`).
 */

/**
 * A day, plus the one thing the client cannot work out for itself: its name.
 *
 * `formatDay` lives in `lib/availability.ts`, which is `server-only` because it
 * also holds the queries — so the page formats the label and sends it down,
 * rather than this component shipping a second copy of the date maths.
 */
export type CalendarDay = DaySlots & { longLabel: string };

/** One car, as the legend names it. */
export type CalendarVehicle = { name: string; seats: number };

const SLOT_SHORT: Record<string, string> = { morning: "10h", afternoon: "14h" };

/**
 * "2 clássicos, 1 T3" — the cars a departure still has free, in words.
 *
 * Both forms per class, because Portuguese agrees in number and "2 clássico"
 * is not a sentence. `T3` is the van's name rather than a word, so it does not
 * inflect; `turismo` is the class of the non-classic touring vehicle (§2.6).
 */
const CLASS_WORDS: Record<VehicleClass, { one: string; many: string }> = {
  "classic-small": { one: "clássico", many: "clássicos" },
  "classic-van": { one: "T3", many: "T3" },
  touring: { one: "turismo", many: "turismos" },
};

function carsLeft(slot: SlotAvailability): string {
  const parts = VEHICLE_CLASSES.filter((entry) => slot.vehiclesLeft[entry] > 0).map(
    (entry) => {
      const left = slot.vehiclesLeft[entry];
      const words = CLASS_WORDS[entry];
      return `${left} ${left === 1 ? words.one : words.many}`;
    },
  );
  return parts.length > 0 ? parts.join(", ") : "sem veículos";
}

/**
 * "3 de nov. de 2026" — a date the operator can check against the one they meant.
 *
 * The rest of this screen takes its date labels from the server (`longLabel`),
 * because `lib/availability.ts` is `server-only` and because a date rendered
 * during hydration has to match what the server wrote. These strings are built
 * only inside a confirmation the operator has already opened, so there is no
 * server render for them to disagree with. Fixed to UTC for the same reason
 * the keys are: a day key is a day, not an instant, and a browser in Auckland
 * must not read `2026-11-03` back as the 4th.
 */
const dayFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function readableDay(date: string): string {
  return dayFormatter.format(new Date(`${date}T00:00:00Z`));
}

/** "23 dias" / "1 dia" — a confirmation counts what it is about to write. */
function dayCount(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/** Both ends of what a sweep addresses, named so a mis-tap is visible. */
function rangeWords(list: CalendarDay[]): string {
  if (list.length === 0) return "nenhum dia";
  const first = readableDay(list[0].date);
  if (list.length === 1) return first;
  return `${first} a ${readableDay(list[list.length - 1].date)}`;
}

/** How one departure reads inside a day cell, at arm's length. */
function slotTone(slot: SlotAvailability): { className: string; text: string } {
  const short = SLOT_SHORT[slot.slot] ?? slot.slot;
  if (slot.status === null) {
    return { className: "text-muted-foreground/50", text: short };
  }
  if (slot.status === "closed") {
    return { className: "text-destructive", text: `${short}×` };
  }
  if (!slot.bookable) {
    return { className: "font-semibold text-foreground", text: `${short}✓` };
  }
  // The number is drivers still free — how many more tours can leave at all.
  return { className: "font-semibold text-primary", text: `${short}·${slot.driversLeft}` };
}

/** One departure, spoken for a screen reader and for the day sheet's summary. */
function slotSentence(slot: SlotAvailability): string {
  const short = SLOT_SHORT[slot.slot] ?? slot.slot;
  if (slot.status === null) return `${short} não está à venda`;
  if (slot.status === "closed") return `${short} fechada`;
  // "Sem condutores livres" rather than the English's "both drivers out": the
  // roster can be one, and a sentence that says "both" on a one-driver
  // departure is telling the operator something that is not true.
  if (slot.driversLeft === 0) return `${short} sem condutores livres`;
  if (!slot.bookable) return `${short} sem veículos livres`;
  return `${short} ${slot.driversLeft} de ${slot.drivers} condutores livres, ${carsLeft(slot)}`;
}

/** The whole cell: border from the "best" state, captions from both slots. */
function cellAppearance(day: CalendarDay): {
  className: string;
  disabled: boolean;
  label: string;
} {
  const dayNumber = Number(day.date.slice(8));
  const past = day.slots.every((slot) => slot.past);
  if (past) {
    return {
      className: "border-transparent text-muted-foreground/40",
      disabled: true,
      label: `${dayNumber} — já passou`,
    };
  }

  const anyOpen = day.slots.some((slot) => slot.status === "open");
  const anyDecided = day.slots.some((slot) => slot.status !== null);

  return {
    className: anyOpen
      ? "border-primary/50 bg-primary/10"
      : anyDecided
        ? "border-input bg-muted/40"
        : "border-dashed border-input hover:bg-muted",
    disabled: false,
    label: `${dayNumber} — ${day.slots.map(slotSentence).join(", ")}`,
  };
}

/**
 * A submit button that knows the form is in flight.
 *
 * `name`/`value` pass straight through, because several of these forms have
 * two submits — "Put on sale" and "Close" post the same fields and differ only
 * in the `status` they carry.
 */
function SubmitButton({
  children,
  variant,
  pendingLabel,
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  pendingLabel: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      name={name}
      value={value}
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** The days and departures a write is addressed to. */
function WriteFields({ dates, slots }: { dates: string[]; slots: string[] }) {
  return (
    <>
      {dates.map((date) => (
        <input key={date} type="hidden" name="dates" value={date} />
      ))}
      {slots.map((slot) => (
        <input key={slot} type="hidden" name="slots" value={slot} />
      ))}
    </>
  );
}

/**
 * One day's editor: pick which departures the change addresses, then open,
 * close, or forget them — plus how many drivers are on, and why.
 *
 * "Clear" is a third choice rather than a delete button in a corner: an
 * operator who opened the wrong month wants the departures back to
 * *undecided*, and closing them would leave the calendar asserting a month of
 * refusals nobody meant.
 */
function DayEditor({
  day,
  defaultDrivers,
  maxDrivers,
  onDone,
  onOpenChange,
}: {
  day: CalendarDay;
  defaultDrivers: number;
  maxDrivers: number;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [save, saveAction] = useActionState<AvailabilityActionState, FormData>(
    setAvailability,
    {},
  );
  const [clear, clearAction] = useActionState<AvailabilityActionState, FormData>(
    clearAvailability,
    {},
  );
  const editable = day.slots.filter((slot) => !slot.past);
  const [chosenSlots, setChosenSlots] = useState<string[]>(
    editable.map((slot) => slot.slot),
  );
  const first = editable.find((slot) => chosenSlots.includes(slot.slot)) ?? editable[0];
  const [drivers, setDrivers] = useState(first?.drivers || defaultDrivers);
  const [note, setNote] = useState(first?.note ?? "");

  // On the state objects, not on a `done` boolean: `useActionState` returns a
  // fresh object per result, and a boolean that has already flipped to `true`
  // never announces the next success.
  useEffect(() => {
    if (save.ok || clear.ok) onDone();
  }, [save, clear, onDone]);

  const error = save.error ?? clear.error;
  const fieldId = `day-${day.date}`;
  const anyDecided = editable.some((slot) => slot.status !== null);
  const outInSelection = editable
    .filter((slot) => chosenSlots.includes(slot.slot))
    .reduce((sum, slot) => sum + slot.driversUsed, 0);

  function toggleSlot(slot: string) {
    setChosenSlots((previous) =>
      previous.includes(slot)
        ? previous.filter((entry) => entry !== slot)
        : [...previous, slot],
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day.longLabel}</DialogTitle>
          <DialogDescription>
            {editable.map(slotSentence).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div
          role="group"
          aria-label="Que partidas"
          className="flex flex-wrap gap-2"
        >
          {editable.map((slot) => {
            const active = chosenSlots.includes(slot.slot);
            return (
              <button
                key={slot.slot}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSlot(slot.slot)}
                className={cn(
                  "min-h-11 touch-manipulation rounded-lg border px-4 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {slot.slot === "morning" ? "Manhã · 10:00" : "Tarde · 14:00"}
              </button>
            );
          })}
        </div>

        <form action={saveAction} className="flex flex-col gap-4">
          <WriteFields dates={[day.date]} slots={chosenSlots} />
          <input type="hidden" name="drivers" value={drivers} />
          <input type="hidden" name="note" value={note} />

          <div
            role="group"
            aria-labelledby={`${fieldId}-drivers-label`}
            className="flex flex-col gap-1.5"
          >
            <span id={`${fieldId}-drivers-label`} className="text-sm font-medium">
              Condutores em cada partida
            </span>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Menos um condutor"
                disabled={drivers <= 1}
                onClick={() => setDrivers((n) => Math.max(1, n - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <output
                aria-live="polite"
                className="min-w-10 text-center font-heading text-2xl font-semibold"
              >
                {drivers}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Mais um condutor"
                disabled={drivers >= maxDrivers}
                onClick={() => setDrivers((n) => Math.min(maxDrivers, n + 1))}
              >
                <Plus className="size-4" />
              </Button>
              {outInSelection > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {outInSelection} já ocupado{outInSelection === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Quantos passeios podem sair ao mesmo tempo — em todas as rotas. A
              escala normal é de dois; baixe para um quando alguém falta.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-note`}>Nota (só a equipa vê)</Label>
            <Input
              id={`${fieldId}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Casamento, revisão do carro…"
              autoComplete="off"
              enterKeyHint="done"
            />
          </div>

          <DialogFooter>
            {/* Safe action nearest the thumb (T5): the footer paints in
                reverse on a phone, so Cancel is first in the DOM and last on
                screen. */}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton
              variant="outline"
              name="status"
              value="closed"
              pendingLabel="A fechar…"
            >
              Fechar
            </SubmitButton>
            <SubmitButton name="status" value="open" pendingLabel="A guardar…">
              Pôr à venda
            </SubmitButton>
          </DialogFooter>
        </form>

        {anyDecided ? (
          <form action={clearAction} className="border-t pt-3">
            <WriteFields dates={[day.date]} slots={chosenSlots} />
            <SubmitButton variant="ghost" pendingLabel="A limpar…">
              Limpar estas partidas
            </SubmitButton>
            <p className="mt-1 text-xs text-muted-foreground">
              Apaga a decisão por completo — voltam a não existir no calendário.
            </p>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A confirmation the operator has opened, and the action result it was opened
 * after.
 *
 * The second half is what makes closing the dialog a *derived* fact rather
 * than a second copy of the truth. `useActionState` hands back a fresh object
 * for every result and keeps the last one forever, so "has the server answered
 * since this dialog opened?" is an identity comparison and nothing else — no
 * effect that closes the dialog, no `ok` flag that is stuck `true` and quietly
 * stops the *next* sweep from ever opening.
 */
type Confirming<T> = { what: T; after: AvailabilityActionState } | null;

/**
 * What is still being confirmed — `null` once the server has answered.
 *
 * Any answer closes the dialog, success or failure: the write either happened,
 * and the card reads back what it did, or it did not, and the card says why in
 * the same place the buttons are. Neither is something to keep a modal open
 * over.
 */
function stillAsking<T>(
  confirming: Confirming<T>,
  state: AvailabilityActionState,
): T | null {
  return confirming !== null && confirming.after === state ? confirming.what : null;
}

/**
 * The step between a tap and three hundred rows.
 *
 * Same shape as the erasure confirmation in `delete-submission-dialog.tsx`,
 * and for the same reason: a control that rewrites a season on one touch will
 * eventually be touched by a pocket. The destructive path is spelled out —
 * which days, how many departures, what is *not* touched — and the safe path
 * is the default and sits nearest the thumb (T5: the footer paints in reverse
 * on a phone, so Cancel is first in the DOM and last on screen).
 *
 * It stops short of that dialog's "type DELETE". Erasing an enquiry has no
 * undo; a range closed by mistake is reopened with the same control a moment
 * later, and a keyboard between Rita and "open August" is how a calendar stops
 * being kept up to date. What this insists on is that the range be *named*,
 * because the mistake being guarded against is not "I did not mean to press
 * this" so much as "I did not realise it meant that many days".
 *
 * The hidden fields are `children` so the caller stays the one place that says
 * what its own sweep addresses.
 */
function SweepConfirmation({
  open,
  onOpenChange,
  formAction,
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formAction: (formData: FormData) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          {children}
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <SubmitButton
              variant={destructive ? "destructive" : undefined}
              pendingLabel={pendingLabel}
            >
              {confirmLabel}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A month's worth of days a bulk sweep can address: everything not past. */
function sweepable(days: CalendarDay[]): CalendarDay[] {
  return days.filter((day) => day.slots.some((slot) => !slot.past));
}

const BOTH_SLOTS = ["morning", "afternoon"];

/** What one sweep button means, so the button and its confirmation agree. */
type Sweep = {
  id: string;
  /** The button on the card. */
  label: string;
  days: CalendarDay[];
  status: "open" | "closed";
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
};

/**
 * The bulk row: set up a whole month in two taps.
 *
 * Deliberately only three sweeps. "Open every day", "open weekends" and "close
 * everything" cover how the season is actually planned; anything more
 * expressive is a query builder, and the per-day sheet is right there for the
 * exceptions. Sweeps address both departures of every remaining day.
 *
 * Two taps rather than one: the button now opens a {@link SweepConfirmation}
 * naming the range, and the write happens from inside it. Each sweep is
 * described once, in `sweeps`, so the words on the button and the words in the
 * dialog cannot drift apart.
 *
 * What a sweep does *not* do is touch notes and rosters — see `upsertDays`.
 * "Close all" now means the month goes off sale with every "Casamento" and
 * every one-driver Tuesday still on it, which is what the operator pressing it
 * has always meant.
 */
function BulkActions({
  days,
  monthLabel,
  defaultDrivers,
  onDone,
}: {
  days: CalendarDay[];
  /** "August 2026", formatted by the server — the sweeps say which month. */
  monthLabel: string;
  defaultDrivers: number;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<AvailabilityActionState, FormData>(
    setAvailability,
    {},
  );
  const [confirming, setConfirming] = useState<Confirming<string>>(null);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const remaining = sweepable(days);
  const weekends = remaining.filter((day) => day.slots.some((slot) => slot.weekend));

  if (remaining.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este mês já passou — avance para planear o próximo.
      </p>
    );
  }

  const kept =
    "As notas e as escalas de condutores já lançadas nesses dias ficam exatamente " +
    "como estão.";

  const sweeps: Sweep[] = [
    {
      id: "open-all",
      label: `Abrir tudo (${remaining.length})`,
      days: remaining,
      status: "open",
      title: `Pôr ${dayCount(remaining.length)} à venda?`,
      description:
        `As duas partidas de todos os dias de ${rangeWords(remaining)} ficam à ` +
        `venda — ${remaining.length * 2} partidas em ${monthLabel}. ${kept}`,
      confirmLabel: "Pôr à venda",
      pendingLabel: "A abrir…",
    },
    {
      id: "open-weekends",
      label: `Abrir fins de semana (${weekends.length})`,
      days: weekends,
      status: "open",
      title: `Pôr ${weekends.length} ${weekends.length === 1 ? "dia" : "dias"} de fim de semana à venda?`,
      description:
        `As duas partidas de todos os sábados e domingos de ${rangeWords(weekends)} ` +
        `ficam à venda — ${weekends.length * 2} partidas. Os dias de semana não são ` +
        `tocados. ${kept}`,
      confirmLabel: "Pôr à venda",
      pendingLabel: "A abrir…",
    },
    {
      id: "close-all",
      label: "Fechar tudo",
      days: remaining,
      status: "closed",
      title: `Fechar ${dayCount(remaining.length)}?`,
      description:
        `As duas partidas de todos os dias de ${rangeWords(remaining)} saem de ` +
        `venda — ${remaining.length * 2} partidas em ${monthLabel}. As reservas já ` +
        `feitas não são canceladas. ${kept}`,
      confirmLabel: "Fechar",
      pendingLabel: "A fechar…",
      destructive: true,
    },
  ];

  const asked = stillAsking(confirming, state);
  const active = asked ? (sweeps.find((sweep) => sweep.id === asked) ?? null) : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Definir o mês inteiro</p>
      <div className="flex flex-wrap gap-2">
        {sweeps.map((sweep) => (
          <Button
            key={sweep.id}
            type="button"
            variant="outline"
            // A sweep with nothing in it can only produce "no days were
            // selected" — better to be visibly unavailable than to open a
            // dialog whose only outcome is an error.
            disabled={sweep.days.length === 0}
            onClick={() => setConfirming({ what: sweep.id, after: state })}
          >
            {sweep.label}
          </Button>
        ))}
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Estas ações abrangem as duas partidas de todos os dias a partir de hoje e
        perguntam antes de escrever. Os dias que já estão no calendário mantêm as
        notas e as escalas; os dias novos começam com {defaultDrivers} condutores.
      </p>

      {active ? (
        <SweepConfirmation
          key={active.id}
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null);
          }}
          formAction={formAction}
          title={active.title}
          description={active.description}
          confirmLabel={active.confirmLabel}
          pendingLabel={active.pendingLabel}
          destructive={active.destructive}
        >
          <WriteFields
            dates={active.days.map((day) => day.date)}
            slots={BOTH_SLOTS}
          />
          <input type="hidden" name="status" value={active.status} />
        </SweepConfirmation>
      ) : null}
    </div>
  );
}

/**
 * How many days a range covers, inclusive — `0` if it is not a range at all.
 *
 * A date-only string parses as UTC midnight, so the subtraction never meets a
 * daylight-saving hour. Empty, unparseable and backwards ranges all come back
 * as `0`, which is the one answer the season card can safely treat as "there
 * is nothing here to confirm yet".
 */
function spanOfDays(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** `from` plus `n` days, as a key — where a capped range actually stops. */
function addDays(from: string, n: number): string {
  return new Date(Date.parse(from) + n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The seasonal window: open or close a stretch of dates in one gesture.
 *
 * The business has a season (§1.5), and a season is not a month — "closed from
 * the 3rd of November until the 20th of March" spans five month pages and four
 * hundred taps if the only tool is a grid. Two native date fields post `from`
 * and `to` and the server expands them, capped, so this is one round trip
 * whatever the range.
 *
 * Deliberately outside the month pager: it is not a fact about the month on
 * screen, and putting it there would suggest it was.
 *
 * It is also the most destructive control in the admin — one press can rewrite
 * a year — so it is the one that most needs a {@link SweepConfirmation}. The
 * date fields sit outside the form now and are posted as hidden inputs from
 * inside the dialog, so the confirmation is holding the same two dates it just
 * read back to the operator.
 */
function SeasonWindow({ today, defaultDrivers, maxRangeDays, onDone }: {
  today: string;
  defaultDrivers: number;
  /** `MAX_RANGE_DAYS` — where the server stops, so the dialog can say so. */
  maxRangeDays: number;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<AvailabilityActionState, FormData>(
    setAvailability,
    {},
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirming, setConfirming] = useState<Confirming<"open" | "closed">>(null);
  const asked = stillAsking(confirming, state);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  // Half-filled and backwards ranges are refused here as well as server-side:
  // the server's answer would be "no days were selected", which is true and
  // unhelpful.
  const span = spanOfDays(from, to);
  const usable = span > 0;

  // What the write will actually cover. The server expands the range with a
  // cap, so a fortnight and a decade both arrive as at most `maxRangeDays`
  // rows — and a confirmation that promised the decade would be lying about
  // the one thing it exists to state.
  const capped = span > maxRangeDays;
  const writing = capped ? maxRangeDays : span;
  const lastWritten = capped ? addDays(from, maxRangeDays - 1) : to;

  const confirmation = asked
    ? {
        status: asked,
        title:
          asked === "closed"
            ? `Fechar ${dayCount(writing)}?`
            : `Pôr ${dayCount(writing)} à venda?`,
        description:
          (asked === "closed"
            ? `As duas partidas de todos os dias de ${readableDay(from)} a ` +
              `${readableDay(lastWritten)} saem de venda — ${writing * 2} partidas. ` +
              "As reservas já feitas não são canceladas. "
            : `As duas partidas de todos os dias de ${readableDay(from)} a ` +
              `${readableDay(lastWritten)} ficam à venda — ${writing * 2} partidas. `) +
          "As notas e as escalas de condutores já lançadas nesses dias ficam " +
          "exatamente como estão." +
          (capped
            ? ` Cada gesto escreve no máximo ${maxRangeDays} dias, por isso este ` +
              `acaba em ${readableDay(lastWritten)} — repita a partir daí para o resto.`
            : ""),
        confirmLabel: asked === "closed" ? "Fechar" : "Pôr à venda",
        pendingLabel: asked === "closed" ? "A fechar…" : "A abrir…",
      }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Um período de datas</p>
        <p className="text-xs text-muted-foreground">
          A época, um feriado, uma quinzena com os veículos parados — as duas
          partidas de todos os dias entre estas duas, inclusive.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="season-from">De</Label>
          <Input
            id="season-from"
            type="date"
            min={today}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="season-to">Até</Label>
          <Input
            id="season-to"
            type="date"
            min={from || today}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!usable}
          onClick={() => setConfirming({ what: "closed", after: state })}
        >
          Fechar este período
        </Button>
        <Button
          type="button"
          disabled={!usable}
          onClick={() => setConfirming({ what: "open", after: state })}
        >
          Abrir este período
        </Button>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Até um ano de cada vez, e pergunta antes de escrever. Os dias já vendidos
        mantêm as reservas — fechar um dia trava as novas, nunca cancela as
        antigas. Os dias novos no calendário começam com {defaultDrivers}
        condutores; os dias que já têm nota ou escala alterada mantêm as duas.
      </p>

      {confirmation ? (
        <SweepConfirmation
          key={confirmation.status}
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null);
          }}
          formAction={formAction}
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          pendingLabel={confirmation.pendingLabel}
          destructive={confirmation.status === "closed"}
        >
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          {BOTH_SLOTS.map((slot) => (
            <input key={slot} type="hidden" name="slots" value={slot} />
          ))}
          <input type="hidden" name="status" value={confirmation.status} />
        </SweepConfirmation>
      ) : null}
    </div>
  );
}

export function AvailabilityCalendar({
  monthLabel,
  weekdays,
  grid,
  days,
  previousMonth,
  nextMonth,
  defaultDrivers,
  maxDrivers,
  maxRangeDays,
  fleet,
  today,
}: {
  monthLabel: string;
  weekdays: readonly string[];
  /** Month grid with leading `null`s for the blank cells before the 1st. */
  grid: (string | null)[];
  days: CalendarDay[];
  /** `null` at the ends of the window — the arrow renders disabled. */
  previousMonth: string | null;
  nextMonth: string | null;
  defaultDrivers: number;
  maxDrivers: number;
  /** `MAX_RANGE_DAYS`, so the season confirmation can state where a write stops. */
  maxRangeDays: number;
  /** The cars, for the legend — why a departure can be full with a driver free. */
  fleet: CalendarVehicle[];
  /** Today in Lisbon, as the floor of the season fields. */
  today: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = new Map(days.map((day) => [day.date, day]));
  const selectedDay = selected ? byDate.get(selected) : undefined;

  const openSlots = days.flatMap((day) =>
    day.slots.filter((slot) => slot.status === "open"),
  );
  const toursLeft = openSlots.reduce((sum, slot) => sum + slot.driversLeft, 0);

  // Stable, and it has to be: every card below takes it as `onDone` and calls
  // it from an effect that lists it as a dependency. A fresh function each
  // render would re-fire those effects on the render `router.refresh()` itself
  // causes, and the calendar would refresh in a loop.
  const refresh = useCallback(() => {
    setSelected(null);
    router.refresh();
  }, [router]);

  const calendarHref = (monthKey: string) => `/admin/calendar?month=${monthKey}`;

  return (
    <div className="flex flex-col gap-4">
      {/* `p-2` on a phone rather than `p-3`, and a half-step grid gap: the day
          cells carry 12px captions (F2) and seven of them have to fit at the
          320px reflow floor (D2). Measured, because the margin is small enough
          that estimating it is guessing — "10h·2" is 31px in Geist and 32px in
          the metric-matched Arial fallback that paints while Geist is still on
          the wire, against 32px of cell at `p-3 gap-1` and 35px here. The old
          padding fits the loaded font and clips the one an operator on rural 4G
          actually sees first. The card's inset reads the same at 8px; a cell
          losing a character does not. */}
      <Card className="gap-3 p-2 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            asChild={previousMonth !== null}
            variant="ghost"
            size="icon"
            disabled={previousMonth === null}
            aria-label="Mês anterior"
          >
            {previousMonth ? (
              <Link href={calendarHref(previousMonth)}>
                <ChevronLeft className="size-5" />
              </Link>
            ) : (
              <ChevronLeft className="size-5" />
            )}
          </Button>

          <p className="font-heading text-base font-semibold">{monthLabel}</p>

          <Button
            asChild={nextMonth !== null}
            variant="ghost"
            size="icon"
            disabled={nextMonth === null}
            aria-label="Mês seguinte"
          >
            {nextMonth ? (
              <Link href={calendarHref(nextMonth)}>
                <ChevronRight className="size-5" />
              </Link>
            ) : (
              <ChevronRight className="size-5" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-muted-foreground sm:gap-1">
          {weekdays.map((initial, i) => (
            <span key={i} className="py-1">
              {initial}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {grid.map((date, i) => {
            if (date === null) return <span key={`blank-${i}`} />;
            const day = byDate.get(date);
            if (!day) return <span key={date} />;

            const { className, disabled, label } = cellAppearance(day);
            return (
              <button
                key={date}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(date)}
                aria-label={label}
                className={cn(
                  // 44px floor from the primitive scale, and square so the grid
                  // stays a grid at 320px. `overflow-hidden` is the guarantee
                  // that a cell cannot push its neighbour sideways whatever the
                  // caption ends up being.
                  "flex min-h-12 touch-manipulation flex-col items-center justify-center overflow-hidden rounded-lg border py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed",
                  className,
                )}
              >
                <span>{Number(date.slice(8))}</span>
                {!disabled ? (
                  // The two departures stack rather than sit side by side. They
                  // used to be one 8.8px row, which is well under the 12px floor
                  // this admin is built to (F2) and unreadable on the screen the
                  // floor was written for — a phone held at arm's length in the
                  // sun. At 12px two "10h·2" captions do not fit across a cell
                  // on any phone, so the cell grows downwards instead, where
                  // there is room.
                  <span className="flex w-full flex-col items-center text-xs leading-tight font-normal">
                    {day.slots.map((slot) => {
                      const tone = slotTone(slot);
                      return (
                        <span key={slot.slot} className={tone.className}>
                          {tone.text}
                        </span>
                      );
                    })}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">
        {openSlots.length} {openSlots.length === 1 ? "partida" : "partidas"} à venda
        este mês · ainda é possível vender {toursLeft}{" "}
        {toursLeft === 1 ? "passeio" : "passeios"}
      </p>

      <Card className="p-4">
        <BulkActions
          days={days}
          monthLabel={monthLabel}
          defaultDrivers={defaultDrivers}
          onDone={refresh}
        />
      </Card>

      <Card className="p-4">
        <SeasonWindow
          today={today}
          defaultDrivers={defaultDrivers}
          maxRangeDays={maxRangeDays}
          onDone={refresh}
        />
      </Card>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-primary">10h·2</span>
          <span>à venda, com condutores livres</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">10h✓</span>
          <span>esgotada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-destructive">10h×</span>
          <span>fechada por si</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/50">10h</span>
          <span>não está à venda</span>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Uma partida pode estar esgotada com um condutor livre — o grupo precisa de
        um veículo que outro grupo já tem. A frota:{" "}
        {fleet.map((vehicle) => `${vehicle.name} (${vehicle.seats})`).join(" · ")}.
      </p>

      {selectedDay ? (
        <DayEditor
          key={selectedDay.date}
          day={selectedDay}
          defaultDrivers={defaultDrivers}
          maxDrivers={maxDrivers}
          onDone={refresh}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}
