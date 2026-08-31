"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import type { PublicMonth, PublicSlot } from "@/lib/availability";
import { slotFitsParty, type VehicleCounts } from "@/lib/fleet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The public availability picker on `/reservar`.
 *
 * It replaces the free-text "preferred date" field with the days that are
 * actually for sale — the hardcoded August 2026 preview grid with its invented
 * busy days is gone, and so is the guesswork of a guest asking for a day the
 * car is booked.
 *
 * Three things it deliberately does:
 *
 * - **Posts into the field the caller names.** The enquiry form takes
 *   `preferredDate` and accepts the guest's own words; the checkout takes
 *   `date` and accepts only a real day. `name` is a required prop rather than
 *   a default precisely because getting it wrong is invisible: the form looks
 *   right, the guest picks a day, and the server never sees one.
 * - **Keeps a way out.** "None of these days work?" swaps the grid for a text
 *   box in an enquiry, and becomes a link to the contact page in a checkout. A
 *   calendar that can only say no is a booking page that throws away everyone
 *   whose holiday falls in the wrong week.
 * - **Pages without the network.** Every month is already in the payload, so
 *   the arrows are client state. `/reservar` is statically rendered and this
 *   keeps it that way; the admin's calendar pages through the URL because it is
 *   dynamic and its months are unbounded.
 *
 * **It asks the same question the server will.** Since AGORA-012 a departure is
 * not "N seats left"; it is a driver and a class of car, shared by every tour.
 * The payload carries those counts and this component runs `slotFitsParty` from
 * `lib/fleet.ts` over them — the very function the checkout action decides
 * with — so a day the browser offers is a day the server would accept. When no
 * party is named (the enquiry form), a day is offered if it could take anyone
 * at all.
 *
 * The server checks the day again on submit (`checkSlotAvailable`) — this is a
 * convenience, never the guard.
 */
/**
 * "15 de agosto de 2026" from a `YYYY-MM-DD` key.
 *
 * A local copy of what `formatDay` does server-side, because that module is
 * `server-only` — it holds the queries too — and the alternative is shipping a
 * formatted label for all ~180 days in the payload to render one of them. The
 * key is parsed as UTC midnight so the day never shifts under a browser
 * timezone; `new Date("2026-08-15")` is already UTC, and this says so.
 */
function formatChosenDay(key: string, locale: Locale): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function BookingDatePicker({
  locale,
  months,
  name,
  allowFlexible = true,
  contactHref,
  /** Pre-fill after a failed submit, so a rejected day is not silently lost. */
  defaultValue,
  defaultSlot,
  error,
  headingId,
  slotName,
  slotHeading,
  slotLabels,
  experienceSlug,
  partySize,
  onSlotChange,
  onDateChange,
}: {
  locale: Locale;
  months: PublicMonth[];
  /**
   * The form field this posts into. **Required, deliberately.**
   *
   * Two forms use this picker and they want different names — the enquiry form
   * takes `preferredDate` (free text welcome), the checkout takes `date` (a
   * real day or nothing). It used to default to `preferredDate`, which meant
   * the checkout silently posted a field its schema never read: every booking
   * failed validation on a date the guest could plainly see they had chosen.
   * Making the caller say it is what stops that happening again.
   */
  name: string;
  /**
   * Whether "none of these days work?" swaps the grid for a text box.
   *
   * True for an enquiry, where "late August, flexible" is a fine answer. False
   * for a checkout, which cannot charge a card for a day nobody has picked —
   * there, the same prompt becomes a link to {@link contactHref}.
   */
  allowFlexible?: boolean;
  /** Where the "none of these days work?" link goes when not flexible. */
  contactHref?: string;
  defaultValue?: string;
  /**
   * The departure to open on, paired with {@link defaultValue}.
   *
   * Only the checkout has one to restore — a guest coming back from Stripe had
   * picked a day *and* a time, and handing back the day alone is half the form.
   */
  defaultSlot?: "morning" | "afternoon" | null;
  error?: string;
  /**
   * Renders "pick a day" as the step's own `h2` under this id, for a form whose
   * other steps are headed sections — the checkout. Left unset by the enquiry
   * form, where the calendar is one field among several and a bold line is the
   * right weight.
   */
  headingId?: string;
  /**
   * When set, picking a day reveals its departures as chips and the chosen one
   * posts into this field. The enquiry form leaves it unset — a preference does
   * not need a departure; a checkout does.
   */
  slotName?: string;
  /** "Pick your departure" — required whenever `slotName` is set. */
  slotHeading?: string;
  /** What each departure is called for the tour being booked. */
  slotLabels?: Record<"morning" | "afternoon", string>;
  /**
   * The route being booked, when one is known.
   *
   * With {@link partySize} it decides which class of car the party needs, and
   * therefore which departures can actually take them: Óbidos draws the touring
   * vehicle, a couple on the countryside route take a small classic, five take
   * the T3. Left unset by the enquiry form, which has no route to speak of yet
   * — there a day is usable if any car at all is free.
   */
  experienceSlug?: string;
  /** Everyone coming, infants included. Paired with {@link experienceSlug}. */
  partySize?: number;
  /** Tells the form which slot is chosen, for its live summary. */
  onSlotChange?: (slot: "morning" | "afternoon" | null) => void;
  /** Tells the form which day is chosen — the add-on rules read the weekday. */
  onDateChange?: (date: string | null) => void;
}) {
  const c = tourRequestContent.calendar;
  const l = locale;

  /**
   * Whether one departure could take this party.
   *
   * Two questions, and which one is asked depends on what the caller knows. A
   * checkout names the route and the party, so the answer is exact — the same
   * `slotFitsParty` the server will run. An enquiry names neither, so the
   * answer is the loose one: is anything at all still free on it.
   */
  const slotUsable = (slot: { driversLeft: number; vehiclesLeft: VehicleCounts }) => {
    if (slot.driversLeft < 1) return false;
    if (!experienceSlug || !partySize) {
      return Object.values(slot.vehiclesLeft).some((free) => free > 0);
    }
    return slotFitsParty(slot, experienceSlug, partySize);
  };

  // Open on the first month that has something to offer, not blankly on this
  // one: in November, a calendar that opens on an empty November reads as
  // "closed" when the answer is "not until April".
  const initialMonth = Math.max(
    0,
    months.findIndex((month) => month.hasOpenings),
  );

  const [monthIndex, setMonthIndex] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(
    defaultValue && months.some((m) => m.days.some((d) => d.date === defaultValue))
      ? defaultValue
      : null,
  );
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | null>(
    // A departure without its day is not a departure: when the day handed in is
    // not on this calendar, the departure that came with it goes too.
    selected ? (defaultSlot ?? null) : null,
  );
  /**
   * Set when a day was dropped because the party grew past what it had free —
   * see the effect below. Cleared as soon as another day is chosen.
   */
  const [dropped, setDropped] = useState(false);

  const chooseSlot = (slot: "morning" | "afternoon" | null) => {
    setSelectedSlot(slot);
    onSlotChange?.(slot);
  };

  const chooseDay = (date: string | null) => {
    setDropped(false);
    setSelected(date);
    onDateChange?.(date);
    if (!slotName) return;
    // A day with one usable departure needs no second tap; a day with two
    // waits for the guest to say which.
    const day = date
      ? months.flatMap((m) => m.days).find((d) => d.date === date)
      : undefined;
    const usable = day ? day.slots.filter(slotUsable) : [];
    chooseSlot(usable.length === 1 ? (usable[0].slot as "morning" | "afternoon") : null);
  };
  // A guest whose day is not on the calendar types it instead — and one who
  // arrives back here with free text already entered keeps it. Never in a
  // checkout, which has no way to charge for "late August".
  const [flexible, setFlexible] = useState(
    allowFlexible && Boolean(defaultValue) && defaultValue !== selected,
  );

  const month = months[monthIndex];

  /**
   * The departures the chosen day could still sell this party, as a stable
   * string — the effect below needs to notice the *contents* changing, and a
   * fresh array every render would only tell it the render happened.
   */
  const usableOnChosenDay = (
    selected ? (months.flatMap((m) => m.days).find((d) => d.date === selected)?.slots ?? []) : []
  )
    .filter(slotUsable)
    .map((s) => s.slot)
    .join(",");

  /**
   * On mount, say which day the calendar actually opened on.
   *
   * The day handed in is a suggestion: it may have been closed since, or be an
   * enquiry's free text arriving where a checkout expects a real day, and the
   * grid then opens blank. A caller left believing in a day this picker never
   * took is the same stale-date failure as the party change below, from the
   * other end — so whatever it opened with, including nothing, goes back up.
   */
  useEffect(() => {
    if (defaultValue) onDateChange?.(selected);
    // Once, on mount: `defaultValue` is by definition only read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keeping the chosen day honest when the party changes underneath it.
   *
   * The party is the caller's state, not this component's, and it moves: two
   * guests become five, and the Saturday that fitted a couple in a 2CV now
   * needs the T3 that is already out. Restarting the whole picker was the old
   * answer and it lost the day silently — so the day survives whenever it still
   * fits, and when it does not it is dropped *and said out loud*, because a
   * booking page that quietly forgets a choice reads as one that took it.
   */
  useEffect(() => {
    if (!selected) return;
    const usable = usableOnChosenDay ? usableOnChosenDay.split(",") : [];
    if (usable.length === 0) {
      setSelected(null);
      setSelectedSlot(null);
      setDropped(true);
      onDateChange?.(null);
      onSlotChange?.(null);
      return;
    }
    // The day still works, but the departure they had picked may not: 10:00 is
    // full for five, 14:00 is not. One left standing is chosen for them.
    if (selectedSlot && !usable.includes(selectedSlot)) {
      const next = usable.length === 1 ? (usable[0] as "morning" | "afternoon") : null;
      setSelectedSlot(next);
      onSlotChange?.(next);
    }
  }, [selected, selectedSlot, usableOnChosenDay, onDateChange, onSlotChange]);

  /**
   * The scarcity line under a departure chip.
   *
   * Only when the party's car is the last of its class free — which is the one
   * fact that is both true and useful to a guest deciding whether to finish the
   * form. It never says how many *other* cars are out: that is a sentence about
   * somebody else's booking, and none of the guest's business.
   */
  const lastCar = (slot: PublicSlot): boolean => {
    if (!experienceSlug || !partySize) return false;
    const free = Object.values(slot.vehiclesLeft).reduce((sum, n) => sum + n, 0);
    return free === 1 && slotFitsParty(slot, experienceSlug, partySize);
  };

  if (flexible) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={name}>
          {t(tourRequestContent.labels.preferredDate, l)}
        </Label>
        <Input
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={t(tourRequestContent.placeholders.preferredDate, l)}
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => setFlexible(false)}
        >
          {t(c.backToCalendar, l)}
        </Button>
      </div>
    );
  }

  const byDate = new Map(month.days.map((day) => [day.date, day]));

  // A form whose steps are headed sections gets one here too; a form where the
  // calendar is one field among several keeps the lighter label.
  const Root: ElementType = headingId ? "section" : "div";

  return (
    <Root className="flex flex-col gap-2" aria-labelledby={headingId}>
      {headingId ? (
        <h2 id={headingId} className="text-xl font-semibold sm:text-2xl">
          {t(c.label, l)}
        </h2>
      ) : (
        <p className="text-sm font-medium">{t(c.label, l)}</p>
      )}
      <p className="text-sm text-muted-foreground">{t(c.hint, l)}</p>

      {/* The values the form actually posts. The grid below is the control. */}
      <input type="hidden" name={name} value={selected ?? ""} />
      {slotName ? <input type="hidden" name={slotName} value={selectedSlot ?? ""} /> : null}

      <Card className="gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t(c.previousMonth, l)}
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <p aria-live="polite" className="font-heading text-base font-semibold">
            {month.label}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t(c.nextMonth, l)}
            disabled={monthIndex === months.length - 1}
            onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {t(c.weekdays, l).map((initial, i) => (
            <span key={i} className="py-1">
              {initial}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {month.grid.map((date, i) => {
            if (date === null) return <span key={`blank-${i}`} />;
            const day = byDate.get(date);
            const usable = Boolean(day && day.slots.some(slotUsable));
            const number = Number(date.slice(8));
            const chosen = selected === date;

            return (
              <button
                key={date}
                type="button"
                disabled={!usable}
                aria-pressed={chosen}
                onClick={() => chooseDay(chosen ? null : date)}
                className={cn(
                  // 44px floor, square-ish, still a grid at 320px.
                  "flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-lg border text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  chosen
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : usable
                      ? "border-primary/40 text-foreground hover:bg-primary/10"
                      : "cursor-not-allowed border-transparent text-muted-foreground/40",
                )}
              >
                <span>{number}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/*
        The departures of the chosen day, when this picker is selling one. Two
        chips at most; a chip this party cannot be sold is shown disabled with
        the reason, because a missing option reads as a bug and a greyed one
        reads as a fact.
      */}
      {slotName && selected ? (
        <div className="flex flex-col gap-2">
          {slotHeading ? <p className="text-sm font-medium">{slotHeading}</p> : null}
          <div className="flex flex-wrap gap-2" role="group" aria-label={slotHeading}>
            {(byDate.get(selected)?.slots ?? []).map((slot) => {
              const usable = slotUsable(slot);
              const active = selectedSlot === slot.slot;
              const label =
                slotLabels?.[slot.slot as "morning" | "afternoon"] ?? slot.slot;
              return (
                <button
                  key={slot.slot}
                  type="button"
                  disabled={!usable}
                  aria-pressed={active}
                  onClick={() =>
                    chooseSlot(active ? null : (slot.slot as "morning" | "afternoon"))
                  }
                  className={cn(
                    "flex min-h-11 touch-manipulation flex-col items-start justify-center rounded-lg border px-4 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : usable
                        ? "border-primary/40 hover:bg-primary/10"
                        : "cursor-not-allowed border-border text-muted-foreground/50",
                  )}
                >
                  <span>{label}</span>
                  {usable && lastCar(slot) ? (
                    <span className="text-[0.625rem] leading-tight font-normal opacity-80">
                      {t(c.lastCar, l)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {dropped ? (
        <p className="text-sm text-destructive" role="status">
          {t(c.partyOutgrewDay, l)}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {selected ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t(c.chosen, l)}: </span>
          <span className="font-medium">{formatChosenDay(selected, l)}</span>{" "}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => chooseDay(null)}
          >
            {t(c.clear, l)}
          </Button>
        </p>
      ) : null}

      {/*
        The way out for someone whose day is not on the calendar. In an enquiry
        it swaps the grid for a text box; in a checkout it has to be a link,
        because a card cannot be charged for "late August" — but the way out
        still has to exist, or the booking page silently discards everyone
        whose holiday falls in the wrong week.
      */}
      {allowFlexible ? (
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => {
            chooseDay(null);
            setFlexible(true);
          }}
        >
          {t(c.flexible, l)}
        </Button>
      ) : contactHref ? (
        <Button asChild variant="ghost" className="self-start">
          <Link href={contactHref}>{t(c.flexible, l)}</Link>
        </Button>
      ) : null}
    </Root>
  );
}
