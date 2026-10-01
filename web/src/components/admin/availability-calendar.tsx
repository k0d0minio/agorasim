"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, UserRoundPlus, X } from "lucide-react";

import {
  blockDays,
  countLiveBookings,
  saveDayRoster,
  type AvailabilityActionState,
  type BookingCounts,
} from "@/app/admin/calendar/actions";
import type { DaySlots, SlotAvailability } from "@/lib/availability";
import type { BookingStatus, EnquiryKind } from "@/db/schema";
import type { DayBlock } from "@/lib/form-schemas";
import { bookingStatusMeta, enquiryKindMeta } from "@/lib/admin-format";
import { VEHICLE_CLASSES, type VehicleClass } from "@/lib/fleet";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import {
  ManualBookingDialog,
  type ManualBookingTour,
} from "@/components/admin/manual-booking-dialog";

/**
 * The availability calendar — Diogo & Rita's morning screen.
 *
 * Every departure is on sale unless the team blocks it (`open-by-default`),
 * so this screen has one job: say which days the team is off. It works the
 * way a host's calendar works on Airbnb (`admin-block-days`, D-5 and D-13):
 *
 * - **Tap a day** and it is selected. **Tap another** and every day between
 *   the two is selected, whichever order they were tapped in. A third tap
 *   starts again; tapping the lone selected day clears it. A stretch may cross
 *   a month — tap, page with the arrows, tap — because the selection rides in
 *   the URL (`?from=&to=`), so it survives the navigation the pager is.
 * - **A bar** pinned above the bottom toolbar then offers four buttons —
 *   "Bloquear dia inteiro", "Só manhã", "Só tarde", "Desbloquear" — each of
 *   which *sets* every selected day to that state (D-17), behind one
 *   confirmation that warns when bookings sit on what is being blocked
 *   (D-8, D-16). With one day selected it also offers "Ver dia" (D-14).
 * - **The day panel** lists the day's events and bookings, sells a seat on
 *   the phone ("Nova reserva", D-6), and keeps the driver count and the
 *   team's note under "Mais opções" (D-7).
 *
 * There is no "open" tool any more — no month sweeps, no season window, no
 * range button, no "Limpar" (D-9): they existed because days had to be
 * opened.
 *
 * Built mobile-first because it is used standing next to a car, one-handed:
 *
 * - Every day cell is a ≥44px target (T1) laid out in a 7-column grid that
 *   still fits the 320px reflow floor (D2).
 * - A day reads the way it does in Google Calendar or on Airbnb
 *   (`admin-calendar-plain-tiles`): a plain tile is free, a gray tile is
 *   blocked, a small slash in the corner means only one departure is
 *   blocked, and each live booking is a dot under the number — an event
 *   holding the day is a dark square among them. No driver counts on the
 *   tile; those are in "Ver dia" (see {@link tileState}).
 * - The bar is sticky and in flow, like {@link FormActionBar}, so the grid
 *   above it stays tappable for the second tap and iOS's keyboard never
 *   covers it.
 * - Dialogs are the shared responsive dialog — a bottom sheet on a phone, a
 *   centred dialog from `sm` up (S1).
 * - Month paging is `<Link>`s, not client state (V3): the back-swipe an
 *   installed PWA cannot disable stays meaningful, and a reload lands where
 *   the operator was.
 * - Nothing requires a drag or a long-press (T6). The only text on a tile
 *   besides its number is the "+n" past four dots, at the 12px floor (F2).
 */

/**
 * A day, plus the one thing the client cannot work out for itself: its name.
 *
 * `formatDay` lives in `lib/availability.ts`, which is `server-only` because it
 * also holds the queries — so the page formats the label and sends it down,
 * rather than this component shipping a second copy of the date maths.
 */
export type CalendarDay = DaySlots & { longLabel: string };

/** One car, as the fleet line names it. */
export type CalendarVehicle = { name: string; seats: number };

/**
 * One live booking, as the day sheet lists it.
 *
 * Built server-side (`bookingsBetween` in `lib/bookings.ts`), which is where
 * the reference and the guest's name come from: the booking row knows the lead
 * only by id, the lead holds the name, and both are cheaper to join once in
 * SQL than to explain to a client component.
 */
export type CalendarBooking = {
  /** `BK-XXXXXX` — the reference the guest was quoted. Precomputed, server-side. */
  ref: string;
  /** The lead's id — the day sheet links through to its sales page. Nullable after erasure. */
  tourRequestId: string | null;
  /** The guest's name, from the lead. Null once the lead's data has been erased. */
  name: string | null;
  experienceSlug: string;
  slot: "morning" | "afternoon";
  partySize: number;
  status: BookingStatus;
};

/**
 * One deposit-paid wedding or event holding a whole day, as the day sheet
 * lists it (`eventHoldsBetween` in `lib/event-holds.ts`). Its day is off sale
 * for every tour, both departures, while the quote holds it.
 */
export type CalendarEvent = {
  /** `QT-XXXXXX` — the quote's reference. Precomputed, server-side. */
  ref: string;
  /** The lead's id — the sheet links through to its sales page. Null after erasure. */
  tourRequestId: string | null;
  /** Wedding or event; null when the enquiry is gone. */
  kind: EnquiryKind | null;
  /** The couple's or client's name, from the lead. Null once erased. */
  name: string | null;
  venue: string | null;
};

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

/** "ter., 3 de out." — one selected day, as the bar names it. */
const shortDayFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function shortDay(date: string): string {
  return shortDayFormatter.format(new Date(`${date}T00:00:00Z`));
}

/**
 * How many days a stretch covers, inclusive.
 *
 * A date-only string parses as UTC midnight, so the subtraction never meets a
 * daylight-saving hour.
 */
function spanOfDays(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** "3 de out. de 2026" or "7 dias, de 3 de out. de 2026 a 9 de out. de 2026". */
function stretchWords(stretch: Stretch): string {
  if (stretch.from === stretch.to) return readableDay(stretch.from);
  const n = spanOfDays(stretch.from, stretch.to);
  return `${dayCount(n)}, de ${readableDay(stretch.from)} a ${readableDay(stretch.to)}`;
}

/** "1 reserva" / "3 reservas". */
function bookingWords(n: number): string {
  return `${n} ${n === 1 ? "reserva" : "reservas"}`;
}

/**
 * How a day reads at arm's length — three looks, no legend needed.
 *
 * - **blocked** — every departure still to come is blocked: the tile grays
 *   out, as a host's blocked night does on Airbnb.
 * - **partial** — one departure is blocked ("Só manhã" / "Só tarde"): the
 *   tile stays open, with a small slash in its corner; which one is in the
 *   spoken label and in "Ver dia".
 * - **open** — nothing blocked. With no bookings on it, this is the empty
 *   state: the number and nothing else.
 *
 * A full day and a day held by a wedding or event have no look of their own:
 * their dots say why (a dot per booking, a dark square for the event). Gray
 * only ever means "the team blocked this".
 */
function tileState(day: CalendarDay): "blocked" | "partial" | "open" {
  const upcoming = day.slots.filter((slot) => !slot.past);
  const blocked = upcoming.filter((slot) => slot.blocked).length;
  if (blocked === 0) return "open";
  return blocked === upcoming.length ? "blocked" : "partial";
}

/** Dots drawn on a tile before the rest collapse into "+n". */
const MAX_DOTS = 4;

/** One departure, spoken for a screen reader and for the day sheet's summary. */
function slotSentence(slot: SlotAvailability): string {
  const short = SLOT_SHORT[slot.slot] ?? slot.slot;
  if (slot.heldByEvent) return `${short} ocupada por um evento`;
  if (slot.blocked) return `${short} bloqueada`;
  // "Sem condutores livres" rather than the English's "both drivers out": the
  // roster can be one, and a sentence that says "both" on a one-driver
  // departure is telling the operator something that is not true.
  if (slot.driversLeft === 0) return `${short} sem condutores livres`;
  if (!slot.hasRoom) return `${short} sem veículos livres`;
  return `${short} ${slot.driversLeft} de ${slot.drivers} condutores livres, ${carsLeft(slot)}`;
}

/** The whole cell: gray when blocked, plain otherwise (see {@link tileState}). */
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
  return {
    className:
      tileState(day) === "blocked"
        ? "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
        : "border-border bg-card hover:bg-muted/50",
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

/**
 * The wedding or event holding this day, above the tours: kind, who, where,
 * "Dia inteiro", and the quote's reference, linking through to the lead.
 *
 * **The clash marker.** A deposit is paid through Stripe and cannot be
 * refused, so it can land on a day that already has tours sold. Those bookings
 * stay exactly as they are — the marker says how many, and sorting it out is
 * Rita's call, by phone (D-3 in the run `event-holds-capacity`).
 */
function DayEvents({
  events,
  bookingCount,
}: {
  events: CalendarEvent[];
  bookingCount: number;
}) {
  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t pt-3">
      <p className="text-sm font-medium">Evento neste dia</p>
      {events.map((event) => {
        const kind = event.kind ? enquiryKindMeta[event.kind].label : "Evento";
        const row = (
          <>
            <Badge variant="secondary">{kind}</Badge>
            <span className="text-sm font-medium">{event.name ?? event.ref}</span>
            {event.name ? (
              <span className="font-mono text-xs text-muted-foreground">{event.ref}</span>
            ) : null}
            {event.venue ? (
              <span className="text-sm text-muted-foreground">{event.venue}</span>
            ) : null}
            <span aria-hidden>·</span>
            <span className="text-sm text-muted-foreground">Dia inteiro</span>
            {bookingCount > 0 ? (
              <Badge variant="destructive">
                Conflito: {bookingCount} {bookingCount === 1 ? "reserva" : "reservas"} neste dia
              </Badge>
            ) : null}
          </>
        );
        return event.tourRequestId ? (
          <Link
            key={event.ref}
            href={`/admin/sales/${event.tourRequestId}`}
            className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/40 px-2 py-1.5 transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {row}
          </Link>
        ) : (
          <div
            key={event.ref}
            className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/40 px-2 py-1.5"
          >
            {row}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Who is actually coming on a day: one row per live booking, in the same
 * trade the sales page uses — reference, payment state, tour, party — with the
 * row itself linking through to the lead it belongs to.
 *
 * Shown above the controls, not below: "who is on this day" is the first thing
 * an operator asks when they open it, and it is why the tile's green was struck
 * through.
 */
function DayBookings({
  bookings,
  experienceNames,
}: {
  bookings: CalendarBooking[];
  experienceNames: Record<string, string>;
}) {
  const groups = (
    [
      { slot: "morning", label: "Manhã · 10:00", rows: [] as CalendarBooking[] },
      { slot: "afternoon", label: "Tarde · 14:00", rows: [] as CalendarBooking[] },
    ] as const
  )
    .map((group) => ({
      ...group,
      rows: bookings.filter((booking) => booking.slot === group.slot),
    }))
    .filter((group) => group.rows.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <p className="text-sm font-medium">Reservas neste dia</p>
      {groups.map((group) => (
        <div key={group.slot} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
          {group.rows.map((booking) => {
            const meta = bookingStatusMeta[booking.status];
            const experience =
              experienceNames[booking.experienceSlug] ?? booking.experienceSlug;
            const party =
              booking.partySize === 1 ? "1 pessoa" : `${booking.partySize} pessoas`;
            const row = (
              <>
                <span className="text-sm font-medium">
                  {booking.name ?? booking.ref}
                </span>
                {booking.name ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {booking.ref}
                  </span>
                ) : null}
                <Badge variant={meta.variant}>{meta.label}</Badge>
                <span className="text-sm text-muted-foreground">{experience}</span>
                <span aria-hidden>·</span>
                <span className="text-sm text-muted-foreground">{party}</span>
              </>
            );
            return booking.tourRequestId ? (
              <Link
                key={booking.ref}
                href={`/admin/sales/${booking.tourRequestId}`}
                className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/40 px-2 py-1.5 transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {row}
              </Link>
            ) : (
              <div
                key={booking.ref}
                className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/40 px-2 py-1.5"
              >
                {row}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * One day's panel — "Ver dia" (D-6, D-7).
 *
 * Who is on the day comes first: its event, its bookings, and "Nova reserva"
 * for the phone call that sells a seat on it. The roster and the note sit
 * under "Mais opções", closed by default, because the main screen is only
 * blocked or not — and saving them never changes which it is.
 */
function DayPanel({
  day,
  bookings,
  events,
  experienceNames,
  tours,
  defaultDrivers,
  maxDrivers,
  onDone,
  onOpenChange,
}: {
  day: CalendarDay;
  /** The live bookings on this day. */
  bookings: CalendarBooking[];
  /** The deposit-paid events holding this day. */
  events: CalendarEvent[];
  /** Tour slug → name in Portuguese, for the booking rows. */
  experienceNames: Record<string, string>;
  /** Active signature tours, for the manual-booking sheet. */
  tours: ManualBookingTour[];
  defaultDrivers: number;
  maxDrivers: number;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [save, saveAction] = useActionState<AvailabilityActionState, FormData>(
    saveDayRoster,
    {},
  );
  const editable = day.slots.filter((slot) => !slot.past);
  const [drivers, setDrivers] = useState(editable[0]?.drivers || defaultDrivers);
  const [note, setNote] = useState(editable.find((slot) => slot.note)?.note ?? "");
  // Admin spec S7: one modal at a time. The manual-booking sheet needs to
  // outlive this dialog's own DialogContent (so it isn't unmounted along
  // with it), so it mounts as a sibling below and this dialog just hides
  // itself — `open={!bookingOpen}` — while it's up, reappearing on cancel or
  // once the booking lands.
  const [bookingOpen, setBookingOpen] = useState(false);

  // On the state object, not on a `done` boolean: `useActionState` returns a
  // fresh object per result, and a boolean that has already flipped to `true`
  // never announces the next success. The panel is mounted fresh for every
  // "Ver dia", so a success closes it for this opening only.
  useEffect(() => {
    if (save.ok) onDone();
  }, [save, onDone]);

  const fieldId = `day-${day.date}`;
  // The departures the team could still sell — the only ones "Nova reserva"
  // offers. A blocked departure is offered: the phone booking may take it
  // (D-4). A spent or event-held one would only be refused by the action, so
  // it is not offered at all. `bookable` is the team's here — the page reads
  // the month for the `team` audience.
  const openSlots = editable
    .filter((slot) => slot.bookable)
    .map((slot) => slot.slot)
    .filter(
      (slot): slot is "morning" | "afternoon" =>
        slot === "morning" || slot === "afternoon",
    );
  // Drivers already out on the busier departure — the floor the stepper warns
  // about, since one roster now covers both.
  const driversOut = Math.max(0, ...editable.map((slot) => slot.driversUsed));

  return (
    <>
      <Dialog open={!bookingOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{day.longLabel}</DialogTitle>
            <DialogDescription>{editable.map(slotSentence).join(" · ")}</DialogDescription>
          </DialogHeader>

          <DayEvents events={events} bookingCount={bookings.length} />

          <DayBookings bookings={bookings} experienceNames={experienceNames} />

          {openSlots.length > 0 && tours.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBookingOpen(true)}
              className="w-full gap-2 sm:w-auto"
            >
              <UserRoundPlus className="size-4" />
              Nova reserva
            </Button>
          ) : null}

          <details className="group border-t pt-3">
            <summary className="flex min-h-11 cursor-pointer touch-manipulation items-center text-sm font-medium">
              Mais opções
            </summary>

            <form action={saveAction} className="mt-2 flex flex-col gap-4">
              <input type="hidden" name="date" value={day.date} />
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
                  {driversOut > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {driversOut} já ocupado{driversOut === 1 ? "" : "s"}
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

              {save.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {save.error}
                </p>
              ) : null}

              <SubmitButton pendingLabel="A guardar…">Guardar</SubmitButton>
            </form>
          </details>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {openSlots.length > 0 && tours.length > 0 ? (
        <ManualBookingDialog
          // The panel already knows the day: only the departure is left to
          // choose. The Sales board's mount is the other half of this union —
          // see `ManualBookingDeparture`.
          departure={{ kind: "fixed", date: day.date, openSlots }}
          tours={tours}
          onDone={onDone}
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          showTrigger={false}
        />
      ) : null}
    </>
  );
}

/**
 * What is selected: the first tap, and the second when there has been one.
 * Sorted into a {@link Stretch} wherever it is used, so tap order never
 * matters.
 */
export type Selection = { anchor: string; end: string | null };

/** The selection as the two ends of the days it covers, inclusive. */
type Stretch = { from: string; to: string };

function stretchOf(selection: Selection): Stretch {
  const [from, to] = [selection.anchor, selection.end ?? selection.anchor].sort();
  return { from, to };
}

/**
 * The tap rule (D-13): first tap selects a day, a second tap on another day
 * selects the stretch between them, a third starts again, and a tap on the
 * lone selected day clears it.
 */
function afterTap(current: Selection | null, date: string): Selection | null {
  if (current === null || current.end !== null) return { anchor: date, end: null };
  if (current.anchor === date) return null;
  return { anchor: current.anchor, end: date };
}

/** The calendar's address for a month, carrying the selection across pages. */
function calendarHref(month: string, selection: Selection | null): string {
  const params = new URLSearchParams({ month });
  if (selection) {
    const { from, to } = stretchOf(selection);
    params.set("from", from);
    if (selection.end !== null) params.set("to", to);
  }
  return `/admin/calendar?${params.toString()}`;
}

/** What each bar button blocks — the warning counts only these (D-8). */
const BLOCKED_BY: Record<DayBlock, ("morning" | "afternoon")[]> = {
  day: ["morning", "afternoon"],
  morning: ["morning"],
  afternoon: ["afternoon"],
  none: [],
};

/** The four buttons, in the order the bar shows them. */
const BAR_ACTIONS: {
  block: DayBlock;
  label: string;
  variant: React.ComponentProps<typeof Button>["variant"];
}[] = [
  { block: "day", label: "Bloquear dia inteiro", variant: "destructive" },
  { block: "morning", label: "Só manhã", variant: "outline" },
  { block: "afternoon", label: "Só tarde", variant: "outline" },
  { block: "none", label: "Desbloquear", variant: "secondary" },
];

/** The confirmation's title and sentence for one button over one stretch. */
function confirmationWords(block: DayBlock, stretch: Stretch): {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
} {
  const what = stretchWords(stretch);
  const kept = "Os condutores e a nota de cada dia ficam como estão.";
  switch (block) {
    case "day":
      return {
        title: `Bloquear ${what}?`,
        description: `As duas partidas, 10:00 e 14:00, deixam de estar à venda. ${kept}`,
        confirmLabel: "Bloquear",
        pendingLabel: "A bloquear…",
      };
    case "morning":
      return {
        title: `Bloquear só a manhã — ${what}?`,
        description: `A partida das 10:00 deixa de estar à venda; a das 14:00 fica à venda. ${kept}`,
        confirmLabel: "Bloquear manhã",
        pendingLabel: "A bloquear…",
      };
    case "afternoon":
      return {
        title: `Bloquear só a tarde — ${what}?`,
        description: `A partida das 14:00 deixa de estar à venda; a das 10:00 fica à venda. ${kept}`,
        confirmLabel: "Bloquear tarde",
        pendingLabel: "A bloquear…",
      };
    case "none":
      return {
        title: `Desbloquear ${what}?`,
        description: `As duas partidas voltam a estar à venda. ${kept}`,
        confirmLabel: "Desbloquear",
        pendingLabel: "A desbloquear…",
      };
  }
}

/**
 * "1 reserva neste dia — continua marcada" — what blocking leaves standing (D-8).
 *
 * `undefined` counts are still being read; `null` could not be read, and the
 * sentence says the bookings stay rather than claiming there are none.
 */
function bookingWarning(
  block: DayBlock,
  counts: BookingCounts | null | undefined,
  single: boolean,
): string | null {
  const blocked = BLOCKED_BY[block];
  if (blocked.length === 0) return null;
  if (counts === undefined) return "A verificar as reservas…";
  if (counts === null) {
    return "Não foi possível contar as reservas — as que existirem continuam marcadas.";
  }
  const n = blocked.reduce((sum, slot) => sum + counts[slot], 0);
  if (n === 0) return null;
  const where = single ? "neste dia" : "nestes dias";
  return n === 1
    ? `1 reserva ${where} — continua marcada.`
    : `${n} reservas ${where} — continuam marcadas.`;
}

/**
 * A confirmation the operator has opened, and the action result it was opened
 * after — so "has the server answered since?" is an identity comparison:
 * `useActionState` hands back a fresh object for every result.
 */
type Confirming = { block: DayBlock; after: AvailabilityActionState } | null;

/**
 * The bar: what is selected, and the four things to do with it.
 *
 * Sticky and in flow just above the bottom toolbar on a phone, the shape of
 * {@link FormActionBar} and for the same reason (spec §5 V4): iOS's keyboard
 * only shrinks the visual viewport and covers a `fixed` bar outright. In flow,
 * it sits after the grid, so the last row of days is never under it and the
 * second tap of a stretch is always reachable. `z-20` slides it under the
 * header (z-30) and the toolbar (z-40).
 *
 * Every button asks once (D-16). A failed write keeps the confirmation open
 * and says why in it; a successful one hands its message to the calendar,
 * which clears the selection — and so unmounts this bar.
 */
function BlockBar({
  stretch,
  counts,
  onViewDay,
  onClear,
  onDone,
}: {
  stretch: Stretch;
  /** Live bookings per departure across the stretch; see {@link bookingWarning}. */
  counts: BookingCounts | null | undefined;
  /** Present only when one day is selected and its panel can open. */
  onViewDay: (() => void) | null;
  onClear: () => void;
  onDone: (message: string) => void;
}) {
  const [state, formAction] = useActionState<AvailabilityActionState, FormData>(
    blockDays,
    {},
  );
  const [confirming, setConfirming] = useState<Confirming>(null);

  useEffect(() => {
    if (state.ok) onDone(state.message ?? "");
  }, [state, onDone]);

  const single = stretch.from === stretch.to;
  const total = counts ? counts.morning + counts.afternoon : 0;
  const summary = single
    ? shortDay(stretch.from)
    : `${readableDay(stretch.from)} a ${readableDay(stretch.to)} · ${dayCount(spanOfDays(stretch.from, stretch.to))}`;

  const asked = confirming?.block ?? null;
  const words = asked ? confirmationWords(asked, stretch) : null;
  const warning = asked ? bookingWarning(asked, counts, single) : null;
  const answeredError =
    confirming !== null && confirming.after !== state ? state.error : undefined;
  // The warning has to be on screen before anyone confirms a block, so the
  // button waits for the count — but only for a block, and never on a count
  // that failed (that sentence is its own warning).
  const waitingForCount = asked !== null && BLOCKED_BY[asked].length > 0 && counts === undefined;

  return (
    <div
      role="region"
      aria-label="Dias escolhidos"
      className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85 md:bottom-4"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">
          {summary}
          {total > 0 ? (
            <span className="font-normal text-muted-foreground"> · {bookingWords(total)}</span>
          ) : null}
        </p>
        {onViewDay ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onViewDay}>
            Ver dia
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Limpar a seleção"
          onClick={onClear}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {BAR_ACTIONS.map((action) => (
          <Button
            key={action.block}
            type="button"
            variant={action.variant}
            className="h-auto min-h-11 whitespace-normal px-2 py-2 leading-tight"
            onClick={() => setConfirming({ block: action.block, after: state })}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {words && asked ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null);
          }}
        >
          <DialogContent>
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="from" value={stretch.from} />
              <input type="hidden" name="to" value={stretch.to} />
              <input type="hidden" name="block" value={asked} />
              <DialogHeader>
                <DialogTitle>{words.title}</DialogTitle>
                <DialogDescription>{words.description}</DialogDescription>
              </DialogHeader>
              {warning ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium" role="status">
                  {warning}
                </p>
              ) : null}
              {answeredError ? (
                <p className="text-sm text-destructive" role="alert">
                  {answeredError}
                </p>
              ) : null}
              <DialogFooter>
                {/* Safe action nearest the thumb (T5): the footer paints in
                    reverse on a phone, so Cancel is first in the DOM and last
                    on screen. */}
                <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
                  Cancelar
                </Button>
                <SubmitButton
                  variant={asked === "none" ? undefined : "destructive"}
                  pendingLabel={words.pendingLabel}
                  disabled={waitingForCount}
                >
                  {words.confirmLabel}
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** Bookings per departure across a stretch, from the month the page sent. */
function countFrom(
  bookingsByDate: Record<string, CalendarBooking[]>,
  stretch: Stretch,
): BookingCounts {
  const counts: BookingCounts = { morning: 0, afternoon: 0 };
  for (const [date, list] of Object.entries(bookingsByDate)) {
    if (date < stretch.from || date > stretch.to) continue;
    for (const booking of list) counts[booking.slot] += 1;
  }
  return counts;
}

export function AvailabilityCalendar({
  month,
  monthLabel,
  weekdays,
  grid,
  days,
  previousMonth,
  nextMonth,
  defaultDrivers,
  maxDrivers,
  fleet,
  bookingsByDate,
  eventsByDate,
  experienceNames,
  tours,
  initialSelection,
}: {
  /** The month on screen, `YYYY-MM` — the address the selection is kept at. */
  month: string;
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
  /** The cars, for the fleet line. */
  fleet: CalendarVehicle[];
  /** Live bookings grouped by date — the count on the tile and the day panel. */
  bookingsByDate: Record<string, CalendarBooking[]>;
  /** Deposit-paid events grouped by date — each holds its whole day. */
  eventsByDate: Record<string, CalendarEvent[]>;
  /** Tour slug → name in Portuguese, for the day panel's rows. */
  experienceNames: Record<string, string>;
  /** Active signature tours, for the manual-booking sheet. */
  tours: ManualBookingTour[];
  /** The selection the URL carried here — a first tap made on another month. */
  initialSelection: Selection | null;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(initialSelection);
  const [panelOpen, setPanelOpen] = useState(false);
  // The last write's read-back, shown under the grid until the next tap.
  const [notice, setNotice] = useState<string | null>(null);
  // Counts for a stretch reaching outside this month, read from the server.
  const [remote, setRemote] = useState<{ key: string; counts: BookingCounts | null } | null>(
    null,
  );

  const byDate = new Map(days.map((day) => [day.date, day]));
  const stretch = selection ? stretchOf(selection) : null;
  const single = stretch !== null && stretch.from === stretch.to;
  const panelDay = single && stretch ? byDate.get(stretch.from) : undefined;

  // A stretch inside the month on screen is counted from what the page sent;
  // one that runs into another month asks the server, which has the rest.
  const inMonth = stretch !== null && byDate.has(stretch.from) && byDate.has(stretch.to);
  const stretchKey = stretch ? `${stretch.from}/${stretch.to}` : "";
  useEffect(() => {
    if (!stretchKey || inMonth) return;
    const [from, to] = stretchKey.split("/");
    let live = true;
    countLiveBookings(from, to)
      .then((counts) => {
        if (live) setRemote({ key: stretchKey, counts });
      })
      .catch(() => {
        if (live) setRemote({ key: stretchKey, counts: null });
      });
    return () => {
      live = false;
    };
  }, [stretchKey, inMonth]);

  const counts: BookingCounts | null | undefined = !stretch
    ? undefined
    : inMonth
      ? countFrom(bookingsByDate, stretch)
      : remote?.key === stretchKey
        ? remote.counts
        : undefined;

  // On sale this month: every departure still to come that nobody blocked —
  // untouched ones included, since the calendar is open by default.
  const openSlots = days.flatMap((day) =>
    day.slots.filter((slot) => !slot.past && !slot.blocked),
  );
  const toursLeft = openSlots.reduce((sum, slot) => sum + slot.driversLeft, 0);

  /**
   * Keep the address in step with the selection, so the month arrows carry it
   * and a reload comes back to it. `replaceState` rather than a navigation:
   * Next.js syncs its router with it, and a tap must not refetch the month.
   */
  function select(next: Selection | null) {
    setSelection(next);
    setNotice(null);
    window.history.replaceState(null, "", calendarHref(month, next));
  }

  function onDayTap(date: string) {
    select(afterTap(selection, date));
  }

  // Stable, and it has to be: the bar and the panel call these from effects
  // that list them as dependencies. A fresh function each render would re-fire
  // those effects on the render `router.refresh()` itself causes, and the
  // calendar would refresh in a loop.
  const finishBlock = useCallback(
    (message: string) => {
      setSelection(null);
      setNotice(message || null);
      window.history.replaceState(null, "", calendarHref(month, null));
      router.refresh();
    },
    [month, router],
  );
  const finishPanel = useCallback(() => {
    setPanelOpen(false);
    router.refresh();
  }, [router]);

  /** A date's live bookings — the tile's count and the day panel's rows. */
  const bookingsOf = (date: string): CalendarBooking[] => bookingsByDate[date] ?? [];
  /** A date's holding events — the day panel's first rows. */
  const eventsOf = (date: string): CalendarEvent[] => eventsByDate[date] ?? [];

  // A tile is inside the stretch when its key compares between the two ends.
  const inStretch = (date: string): boolean =>
    stretch !== null && date >= stretch.from && date <= stretch.to;

  return (
    <div className="flex flex-col gap-4">
      {/* `p-2` on a phone rather than `p-3`, and a half-step grid gap: seven
          ≥44px-tall cells have to fit across the 320px reflow floor (D2), and
          the "+n" beside four booking dots is the widest thing one carries. */}
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
              <Link href={calendarHref(previousMonth, selection)}>
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
              <Link href={calendarHref(nextMonth, selection)}>
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
            const dateBookings = bookingsOf(date).length;
            const dateEvents = eventsOf(date).length;
            const state = tileState(day);
            const selected = inStretch(date);
            return (
              <button
                key={date}
                type="button"
                disabled={disabled}
                onClick={() => onDayTap(date)}
                aria-label={`${label}${dateBookings > 0 ? `, ${bookingWords(dateBookings)}` : ""}${dateEvents > 0 ? ", evento com sinal pago" : ""}`}
                aria-pressed={selected}
                className={cn(
                  // 44px floor from the primitive scale, and square so the grid
                  // stays a grid at 320px. `overflow-hidden` is the guarantee
                  // that a cell cannot push its neighbour sideways whatever the
                  // caption ends up being.
                  "relative flex min-h-12 touch-manipulation flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed",
                  className,
                  // The selected stretch — a solid ring across the tiles, which
                  // is how a run of days is *seen* to be one stretch.
                  selected && "bg-primary/10 ring-2 ring-primary/60",
                  selection?.anchor === date && selection.end === null && "ring-foreground/70",
                )}
              >
                {state === "partial" ? (
                  // One departure blocked: a small slash in the corner, the
                  // tile otherwise open. `aria-hidden`: the label says which.
                  <span
                    aria-hidden
                    className="absolute top-1 right-1.5 h-2.5 w-0.5 rotate-45 rounded-full bg-muted-foreground/70"
                  />
                ) : null}
                <span className={cn(state === "blocked" && "line-through")}>
                  {Number(date.slice(8))}
                </span>
                {/* A dot per live booking, a dark square per event holding
                    the day — names and tours in "Ver dia". The row keeps its
                    height when empty so every tile's number sits level, and
                    an open day with nothing on it is just its number. */}
                <span aria-hidden className="flex h-2 items-center gap-0.5">
                  {dateEvents > 0 ? (
                    <span className="size-1.5 rounded-[1px] bg-foreground" />
                  ) : null}
                  {Array.from({ length: Math.min(dateBookings, MAX_DOTS) }, (_, n) => (
                    <span key={n} className="size-1.5 rounded-full bg-primary" />
                  ))}
                  {dateBookings > MAX_DOTS ? (
                    <span className="text-xs leading-none text-muted-foreground">
                      +{dateBookings - MAX_DOTS}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* A tap's only visible feedback is the ring on the tiles — nothing a
          screen reader says out loud. This region is mounted whatever the
          selection's state, because a live region inserted together with its
          text is announced only patchily; the text has to arrive into a region
          already there. `sr-only`: the bar carries the same words in ink. */}
      <p role="status" className="sr-only">
        {stretch ? `Escolhido: ${stretchWords(stretch)}. As ações estão em baixo.` : ""}
      </p>

      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {stretch ? (
        <BlockBar
          key={`${stretch.from}/${stretch.to}`}
          stretch={stretch}
          counts={counts}
          onViewDay={panelDay ? () => setPanelOpen(true) : null}
          onClear={() => select(null)}
          onDone={finishBlock}
        />
      ) : null}

      <p className="text-sm text-muted-foreground">
        {openSlots.length} {openSlots.length === 1 ? "partida" : "partidas"} à venda
        este mês · ainda é possível vender {toursLeft}{" "}
        {toursLeft === 1 ? "passeio" : "passeios"}
      </p>

      <p className="text-xs text-muted-foreground">
        Um dia em branco está livre. Cinzento: bloqueado. Um traço no canto: só
        uma das partidas está bloqueada. Cada ponto é uma reserva; o quadrado
        escuro é um evento com sinal pago. Toque em «Ver dia» para ver os
        condutores livres. A frota: {fleet.map((vehicle) => `${vehicle.name} (${vehicle.seats})`).join(" · ")}.
      </p>

      {panelOpen && panelDay ? (
        <DayPanel
          key={panelDay.date}
          day={panelDay}
          bookings={bookingsOf(panelDay.date)}
          events={eventsOf(panelDay.date)}
          experienceNames={experienceNames}
          tours={tours}
          defaultDrivers={defaultDrivers}
          maxDrivers={maxDrivers}
          onDone={finishPanel}
          onOpenChange={setPanelOpen}
        />
      ) : null}
    </div>
  );
}
