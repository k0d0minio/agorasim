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
import type { AvailabilityDay } from "@/lib/availability";
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
 * Built to the admin mobile spec (`docs/admin-mobile-design-spec.md`) because
 * it is used standing next to a car, one-handed:
 *
 * - Every day cell is a ≥44px target (T1) laid out in a 7-column grid that
 *   still fits the 320px reflow floor (D2).
 * - Editing a day opens the shared responsive dialog — a bottom sheet on a
 *   phone, a centred dialog from `sm` up (S1).
 * - Month paging is `<Link>`s, not client state (V3): the back-swipe an
 *   installed PWA cannot disable stays meaningful, and the month is in the URL
 *   so a reload lands where the operator was.
 * - Nothing requires a drag (T6). Capacity is a stepper; the bulk sweeps are
 *   buttons, not a rubber-band selection.
 *
 * The heavy work is the bulk row. "Open every remaining day this month" is one
 * tap and one round trip — the alternative is thirty-one taps on 4G in a
 * courtyard, which is how a calendar stops being kept up to date.
 */

/**
 * A day, plus the one thing the client cannot work out for itself: its name.
 *
 * `formatDay` lives in `lib/availability.ts`, which is `server-only` because it
 * also holds the queries — so the page formats the label and sends it down,
 * rather than this component shipping a second copy of the date maths.
 */
export type CalendarDay = AvailabilityDay & { longLabel: string };

/** The four things a cell can be, and how each one reads at arm's length. */
function cellAppearance(day: AvailabilityDay): {
  className: string;
  caption: string | null;
  label: string;
} {
  const dayNumber = Number(day.date.slice(8));

  if (day.past) {
    return {
      className: "border-transparent text-muted-foreground/40",
      caption: null,
      label: `${dayNumber} — past`,
    };
  }
  if (day.status === null) {
    return {
      className: "border-dashed border-input text-muted-foreground hover:bg-muted",
      caption: null,
      label: `${dayNumber} — not on sale`,
    };
  }
  if (day.status === "closed") {
    return {
      className: "border-destructive/40 bg-destructive/10 text-destructive",
      caption: "Closed",
      label: `${dayNumber} — closed`,
    };
  }
  if (day.seatsLeft === 0) {
    return {
      className: "border-input bg-muted font-semibold text-foreground",
      caption: "Full",
      label: `${dayNumber} — full`,
    };
  }
  return {
    className: "border-primary/50 bg-primary/10 font-semibold text-primary",
    caption: `${day.seatsLeft} left`,
    label: `${dayNumber} — open, ${day.seatsLeft} of ${day.capacity} seats left`,
  };
}

/**
 * A submit button that knows the form is in flight.
 *
 * `name`/`value` pass straight through, because several of these forms have
 * two submits — "Put on sale" and "Close this day" post the same fields and
 * differ only in the `status` they carry.
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

/** The hidden `dates` fields a write is addressed to. */
function DateFields({ dates }: { dates: string[] }) {
  return (
    <>
      {dates.map((date) => (
        <input key={date} type="hidden" name="dates" value={date} />
      ))}
    </>
  );
}

/**
 * One day's editor. Open, close, or forget it — plus how many seats, and why.
 *
 * "Clear" is a third choice rather than a delete button in a corner: an
 * operator who opened the wrong month wants the days back to *undecided*, and
 * closing thirty-one days would leave the calendar asserting a month of
 * refusals nobody meant.
 */
function DayEditor({
  day,
  defaultCapacity,
  maxCapacity,
  onDone,
  onOpenChange,
}: {
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
  const [capacity, setCapacity] = useState(day.capacity || defaultCapacity);
  const [note, setNote] = useState(day.note ?? "");

  const done = save.ok || clear.ok;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);

  const error = save.error ?? clear.error;
  const fieldId = `day-${day.date}`;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day.longLabel}</DialogTitle>
          <DialogDescription>
            {day.status === null
              ? "This day is not on sale. Nobody can book it."
              : day.status === "open"
                ? `On sale — ${day.booked} of ${day.capacity} ${day.capacity === 1 ? "seat" : "seats"} sold.`
                : "Closed. Guests are told it is unavailable, never why."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <form action={saveAction} className="flex flex-col gap-4">
          <DateFields dates={[day.date]} />
          <input type="hidden" name="capacity" value={capacity} />
          <input type="hidden" name="note" value={note} />

          <div
            role="group"
            aria-labelledby={`${fieldId}-capacity-label`}
            className="flex flex-col gap-1.5"
          >
            <span id={`${fieldId}-capacity-label`} className="text-sm font-medium">
              Seats on this day
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
              {day.booked > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {day.booked} already sold
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
              Close this day
            </SubmitButton>
            <SubmitButton name="status" value="open" pendingLabel="Saving…">
              Put on sale
            </SubmitButton>
          </DialogFooter>
        </form>

        {day.status !== null ? (
          <form action={clearAction} className="border-t pt-3">
            <DateFields dates={[day.date]} />
            <SubmitButton variant="ghost" pendingLabel="Clearing…">
              Clear this day
            </SubmitButton>
            <p className="mt-1 text-xs text-muted-foreground">
              Removes the decision entirely — the day goes back to not being on the
              calendar at all.
            </p>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** A month's worth of days a bulk sweep can address: everything not past. */
function sweepable(days: CalendarDay[]): CalendarDay[] {
  return days.filter((day) => !day.past);
}

/**
 * The bulk row: set up a whole month in one tap.
 *
 * Deliberately only three sweeps. "Open every day", "open weekends" and "close
 * everything" cover how the season is actually planned; anything more
 * expressive is a query builder, and the per-day sheet is right there for the
 * exceptions.
 */
function BulkActions({
  days,
  defaultCapacity,
  onDone,
}: {
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
  const weekends = remaining.filter((day) => day.weekend);

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
          <DateFields dates={remaining.map((day) => day.date)} />
          <input type="hidden" name="capacity" value={defaultCapacity} />
          <input type="hidden" name="status" value="open" />
          <SubmitButton variant="outline" pendingLabel="Opening…">
            Open all {remaining.length}
          </SubmitButton>
        </form>

        <form action={formAction}>
          <DateFields dates={weekends.map((day) => day.date)} />
          <input type="hidden" name="capacity" value={defaultCapacity} />
          <input type="hidden" name="status" value="open" />
          <SubmitButton variant="outline" pendingLabel="Opening…">
            Open weekends ({weekends.length})
          </SubmitButton>
        </form>

        <form action={formAction}>
          <DateFields dates={remaining.map((day) => day.date)} />
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
        Sweeps only touch days from today onwards, and they overwrite whatever those
        days said before. Seats default to {defaultCapacity}; change a day to adjust it.
      </p>
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
  defaultCapacity,
  maxCapacity,
}: {
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

  const openDays = days.filter((day) => day.status === "open");
  const seatsOnSale = openDays.reduce((sum, day) => sum + day.seatsLeft, 0);

  function refresh() {
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
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
              <Link href={`/admin/calendar?month=${previousMonth}`}>
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
              <Link href={`/admin/calendar?month=${nextMonth}`}>
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

            const { className, caption, label } = cellAppearance(day);
            return (
              <button
                key={date}
                type="button"
                disabled={day.past}
                onClick={() => setSelected(date)}
                aria-label={label}
                className={cn(
                  // 44px floor from the primitive scale, and square so the grid
                  // stays a grid at 320px.
                  "flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-lg border py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed",
                  className,
                )}
              >
                <span>{Number(date.slice(8))}</span>
                {caption ? (
                  <span className="text-[0.625rem] leading-tight font-normal opacity-80">
                    {caption}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">
        {openDays.length} {openDays.length === 1 ? "day" : "days"} on sale this month ·{" "}
        {seatsOnSale} {seatsOnSale === 1 ? "seat" : "seats"} still available
      </p>

      <Card className="p-4">
        <BulkActions days={days} defaultCapacity={defaultCapacity} onDone={refresh} />
      </Card>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-primary/50 bg-primary/10" />
          <span>On sale</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-input bg-muted" />
          <span>Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-destructive/40 bg-destructive/10" />
          <span>Closed by you</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-dashed border-input" />
          <span>Not on sale</span>
        </div>
      </dl>

      {selectedDay ? (
        <DayEditor
          key={selectedDay.date}
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
