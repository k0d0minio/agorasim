"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import {
  clearAvailability,
  setAvailability,
  type AvailabilityActionState,
} from "@/app/admin/calendar/actions";
import type { AvailabilityDay, DaySlots } from "@/lib/availability";
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
 * Since AGORA-002 it manages **two departures a day per tour**: every day cell
 * carries a morning and an afternoon state, the day sheet edits either or
 * both, and the tour being planned is a tab above the grid (the page passes
 * one tour's month at a time — the slug lives in the URL next to the month).
 *
 * Built to the admin mobile spec (`docs/admin-mobile-design-spec.md`) because
 * it is used standing next to a car, one-handed:
 *
 * - Every day cell is a ≥44px target (T1) laid out in a 7-column grid that
 *   still fits the 320px reflow floor (D2).
 * - Editing a day opens the shared responsive dialog — a bottom sheet on a
 *   phone, a centred dialog from `sm` up (S1).
 * - Month and tour paging are `<Link>`s, not client state (V3): the back-swipe
 *   an installed PWA cannot disable stays meaningful, and a reload lands where
 *   the operator was.
 * - Nothing requires a drag (T6). Capacity is a stepper; the bulk sweeps are
 *   buttons, not a rubber-band selection.
 *
 * The heavy work is the bulk row. "Open every remaining departure this month"
 * is one tap and one round trip — the alternative is sixty taps on 4G in a
 * courtyard, which is how a calendar stops being kept up to date.
 */

/**
 * A day, plus the one thing the client cannot work out for itself: its name.
 *
 * `formatDay` lives in `lib/availability.ts`, which is `server-only` because it
 * also holds the queries — so the page formats the label and sends it down,
 * rather than this component shipping a second copy of the date maths.
 */
export type CalendarDay = DaySlots & { longLabel: string };

/** A tour tab above the grid. */
export type CalendarTour = { slug: string; name: string };

const SLOT_SHORT: Record<string, string> = { morning: "10h", afternoon: "14h" };

/** How one departure reads inside a day cell, at arm's length. */
function slotTone(slot: AvailabilityDay): { className: string; text: string } {
  const short = SLOT_SHORT[slot.slot] ?? slot.slot;
  if (slot.status === null) {
    return { className: "text-muted-foreground/50", text: short };
  }
  if (slot.status === "closed") {
    return { className: "text-destructive", text: `${short}×` };
  }
  if (slot.exclusiveHold) {
    return { className: "font-semibold text-foreground", text: `${short}P` };
  }
  if (slot.seatsLeft === 0) {
    return { className: "font-semibold text-foreground", text: `${short}✓` };
  }
  return { className: "font-semibold text-primary", text: `${short}·${slot.seatsLeft}` };
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
      label: `${dayNumber} — past`,
    };
  }

  const anyOpen = day.slots.some((slot) => slot.status === "open");
  const anyDecided = day.slots.some((slot) => slot.status !== null);
  const spoken = day.slots
    .map((slot) => {
      const short = SLOT_SHORT[slot.slot] ?? slot.slot;
      if (slot.status === null) return `${short} not on sale`;
      if (slot.status === "closed") return `${short} closed`;
      if (slot.exclusiveHold) return `${short} private booking`;
      if (slot.seatsLeft === 0) return `${short} full`;
      return `${short} ${slot.seatsLeft} of ${slot.capacity} seats left`;
    })
    .join(", ");

  return {
    className: anyOpen
      ? "border-primary/50 bg-primary/10"
      : anyDecided
        ? "border-input bg-muted/40"
        : "border-dashed border-input hover:bg-muted",
    disabled: false,
    label: `${dayNumber} — ${spoken}`,
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
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  pendingLabel: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} name={name} value={value} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** The hidden fields every write is addressed with. */
function WriteFields({
  experience,
  dates,
  slots,
}: {
  experience: string;
  dates: string[];
  slots: string[];
}) {
  return (
    <>
      <input type="hidden" name="experience" value={experience} />
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
 * close, or forget them — plus how many seats, and why.
 *
 * "Clear" is a third choice rather than a delete button in a corner: an
 * operator who opened the wrong month wants the departures back to
 * *undecided*, and closing them would leave the calendar asserting a month of
 * refusals nobody meant.
 */
function DayEditor({
  experience,
  day,
  defaultCapacity,
  maxCapacity,
  onDone,
  onOpenChange,
}: {
  experience: string;
  day: CalendarDay;
  defaultCapacity: number;
  maxCapacity: number;
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
  const [capacity, setCapacity] = useState(first?.capacity || defaultCapacity);
  const [note, setNote] = useState(first?.note ?? "");

  const done = save.ok || clear.ok;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);

  const error = save.error ?? clear.error;
  const fieldId = `day-${day.date}`;
  const anyDecided = editable.some((slot) => slot.status !== null);
  const soldInSelection = editable
    .filter((slot) => chosenSlots.includes(slot.slot))
    .reduce((sum, slot) => sum + slot.booked, 0);

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
            {editable
              .map((slot) => {
                const short = SLOT_SHORT[slot.slot] ?? slot.slot;
                if (slot.status === null) return `${short}: not on sale`;
                if (slot.status === "closed") return `${short}: closed`;
                if (slot.exclusiveHold) return `${short}: private booking`;
                return `${short}: ${slot.booked} of ${slot.capacity} sold`;
              })
              .join(" · ")}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div
          role="group"
          aria-label="Which departures"
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
                {slot.slot === "morning" ? "Morning · 10:00" : "Afternoon · 14:00"}
              </button>
            );
          })}
        </div>

        <form action={saveAction} className="flex flex-col gap-4">
          <WriteFields experience={experience} dates={[day.date]} slots={chosenSlots} />
          <input type="hidden" name="capacity" value={capacity} />
          <input type="hidden" name="note" value={note} />

          <div
            role="group"
            aria-labelledby={`${fieldId}-capacity-label`}
            className="flex flex-col gap-1.5"
          >
            <span id={`${fieldId}-capacity-label`} className="text-sm font-medium">
              Seats per departure
            </span>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One seat fewer"
                disabled={capacity <= 1}
                onClick={() => setCapacity((n) => Math.max(1, n - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <output
                aria-live="polite"
                className="min-w-10 text-center font-heading text-2xl font-semibold"
              >
                {capacity}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One seat more"
                disabled={capacity >= maxCapacity}
                onClick={() => setCapacity((n) => Math.min(maxCapacity, n + 1))}
              >
                <Plus className="size-4" />
              </Button>
              {soldInSelection > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {soldInSelection} already sold
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-note`}>Note (only you see this)</Label>
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
              Cancel
            </Button>
            <SubmitButton
              variant="outline"
              name="status"
              value="closed"
              pendingLabel="Closing…"
            >
              Close
            </SubmitButton>
            <SubmitButton name="status" value="open" pendingLabel="Saving…">
              Put on sale
            </SubmitButton>
          </DialogFooter>
        </form>

        {anyDecided ? (
          <form action={clearAction} className="border-t pt-3">
            <WriteFields experience={experience} dates={[day.date]} slots={chosenSlots} />
            <SubmitButton variant="ghost" pendingLabel="Clearing…">
              Clear these departures
            </SubmitButton>
            <p className="mt-1 text-xs text-muted-foreground">
              Removes the decision entirely — they go back to not being on the calendar
              at all.
            </p>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** A month's worth of days a bulk sweep can address: everything not past. */
function sweepable(days: CalendarDay[]): CalendarDay[] {
  return days.filter((day) => day.slots.some((slot) => !slot.past));
}

const BOTH_SLOTS = ["morning", "afternoon"];

/**
 * The bulk row: set up a whole month in one tap.
 *
 * Deliberately only three sweeps. "Open every day", "open weekends" and "close
 * everything" cover how the season is actually planned; anything more
 * expressive is a query builder, and the per-day sheet is right there for the
 * exceptions. Sweeps address both departures of every remaining day.
 */
function BulkActions({
  experience,
  days,
  defaultCapacity,
  onDone,
}: {
  experience: string;
  days: CalendarDay[];
  defaultCapacity: number;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<AvailabilityActionState, FormData>(
    setAvailability,
    {},
  );

  const ok = state.ok;
  useEffect(() => {
    if (ok) onDone();
  }, [ok, onDone]);

  const remaining = sweepable(days);
  const weekends = remaining.filter((day) => day.slots.some((slot) => slot.weekend));

  if (remaining.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This month is behind you — page forward to plan the next one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Set the whole month</p>
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <WriteFields
            experience={experience}
            dates={remaining.map((day) => day.date)}
            slots={BOTH_SLOTS}
          />
          <input type="hidden" name="capacity" value={defaultCapacity} />
          <input type="hidden" name="status" value="open" />
          <SubmitButton variant="outline" pendingLabel="Opening…">
            Open all {remaining.length}
          </SubmitButton>
        </form>

        <form action={formAction}>
          <WriteFields
            experience={experience}
            dates={weekends.map((day) => day.date)}
            slots={BOTH_SLOTS}
          />
          <input type="hidden" name="capacity" value={defaultCapacity} />
          <input type="hidden" name="status" value="open" />
          <SubmitButton variant="outline" pendingLabel="Opening…">
            Open weekends ({weekends.length})
          </SubmitButton>
        </form>

        <form action={formAction}>
          <WriteFields
            experience={experience}
            dates={remaining.map((day) => day.date)}
            slots={BOTH_SLOTS}
          />
          <input type="hidden" name="capacity" value={defaultCapacity} />
          <input type="hidden" name="status" value="closed" />
          <SubmitButton variant="outline" pendingLabel="Closing…">
            Close all
          </SubmitButton>
        </form>
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
        Sweeps touch both departures of every day from today onwards, and they
        overwrite whatever those departures said before. Seats default to{" "}
        {defaultCapacity} per departure; open a day to adjust one.
      </p>
    </div>
  );
}

export function AvailabilityCalendar({
  experience,
  tours,
  month,
  monthLabel,
  weekdays,
  grid,
  days,
  previousMonth,
  nextMonth,
  defaultCapacity,
  maxCapacity,
}: {
  /** The tour whose calendar is on screen. */
  experience: string;
  /** Every bookable tour, for the tabs. */
  tours: CalendarTour[];
  month: string;
  monthLabel: string;
  weekdays: readonly string[];
  /** Month grid with leading `null`s for the blank cells before the 1st. */
  grid: (string | null)[];
  days: CalendarDay[];
  /** `null` at the ends of the window — the arrow renders disabled. */
  previousMonth: string | null;
  nextMonth: string | null;
  defaultCapacity: number;
  maxCapacity: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = new Map(days.map((day) => [day.date, day]));
  const selectedDay = selected ? byDate.get(selected) : undefined;

  const openSlots = days.flatMap((day) =>
    day.slots.filter((slot) => slot.status === "open"),
  );
  const seatsOnSale = openSlots.reduce((sum, slot) => sum + slot.seatsLeft, 0);

  function refresh() {
    setSelected(null);
    router.refresh();
  }

  const calendarHref = (slug: string, monthKey: string) =>
    `/admin/calendar?experience=${slug}&month=${monthKey}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Which tour is being planned. Links, so the URL says. */}
      <div role="tablist" aria-label="Tour" className="flex flex-wrap gap-2">
        {tours.map((tour) => {
          const active = tour.slug === experience;
          return (
            <Button
              key={tour.slug}
              asChild
              variant={active ? "default" : "outline"}
              aria-current={active ? "page" : undefined}
            >
              <Link href={calendarHref(tour.slug, month)}>{tour.name}</Link>
            </Button>
          );
        })}
      </div>

      <Card className="gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            asChild={previousMonth !== null}
            variant="ghost"
            size="icon"
            disabled={previousMonth === null}
            aria-label="Previous month"
          >
            {previousMonth ? (
              <Link href={calendarHref(experience, previousMonth)}>
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
            aria-label="Next month"
          >
            {nextMonth ? (
              <Link href={calendarHref(experience, nextMonth)}>
                <ChevronRight className="size-5" />
              </Link>
            ) : (
              <ChevronRight className="size-5" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((initial, i) => (
            <span key={i} className="py-1">
              {initial}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
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
                  // stays a grid at 320px.
                  "flex min-h-12 touch-manipulation flex-col items-center justify-center rounded-lg border py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed",
                  className,
                )}
              >
                <span>{Number(date.slice(8))}</span>
                {!disabled ? (
                  <span className="flex gap-1 text-[0.55rem] leading-tight font-normal">
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
        {openSlots.length} {openSlots.length === 1 ? "departure" : "departures"} on sale
        this month · {seatsOnSale} {seatsOnSale === 1 ? "seat" : "seats"} still available
      </p>

      <Card className="p-4">
        <BulkActions
          experience={experience}
          days={days}
          defaultCapacity={defaultCapacity}
          onDone={refresh}
        />
      </Card>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-primary">10h·3</span>
          <span>on sale, seats left</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">10h✓</span>
          <span>full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">10hP</span>
          <span>private booking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-destructive">10h×</span>
          <span>closed by you</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/50">10h</span>
          <span>not on sale</span>
        </div>
      </dl>

      {selectedDay ? (
        <DayEditor
          key={selectedDay.date}
          experience={experience}
          day={selectedDay}
          defaultCapacity={defaultCapacity}
          maxCapacity={maxCapacity}
          onDone={refresh}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}
