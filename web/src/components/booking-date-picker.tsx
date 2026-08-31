"use client";

import { useState } from "react";
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

/**
 * Whether one departure could take this party.
 *
 * Two questions, and which one is asked depends on what the caller knows. A
 * checkout names the route and the party, so the answer is exact — the same
 * `slotFitsParty` the server will run. An enquiry names neither, so the answer
 * is the loose one: is anything at all still free on it.
 *
 * Exported because the checkout form has to ask it too. It owns the chosen day
 * (so that a party change cannot leave the two holding different ones), which
 * means it — not this component — decides whether that day still stands, and
 * the two must decide it by the same rule or the grid and the form disagree.
 */
export function departureUsable(
  slot: { driversLeft: number; vehiclesLeft: VehicleCounts },
  experienceSlug?: string,
  partySize?: number,
): boolean {
  if (slot.driversLeft < 1) return false;
  if (!experienceSlug || !partySize) {
    return Object.values(slot.vehiclesLeft).some((free) => free > 0);
  }
  return slotFitsParty(slot, experienceSlug, partySize);
}

export function BookingDatePicker({
  locale,
  months,
  name,
  allowFlexible = true,
  contactHref,
  /** Pre-fill after a failed submit, so a rejected day is not silently lost. */
  defaultValue,
  error,
  slotName,
  slotHeading,
  slotLabels,
  experienceSlug,
  partySize,
  value,
  slotValue,
  dropped = false,
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
  error?: string;
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
  /**
   * The chosen day, when the caller owns it.
   *
   * Pass it (with {@link onDateChange}) to drive the picker from outside, the
   * way the checkout does: it has to be able to *put* a day back — the one a
   * guest picked before they left for Stripe — and it is the one that knows
   * whether a day still fits the party it is holding. Leave both unset and the
   * picker keeps the selection to itself, which is all the enquiry form needs.
   * `undefined` means uncontrolled; `null` means "nothing chosen", and the two
   * are not the same answer.
   */
  value?: string | null;
  /** The chosen departure, on the same terms as {@link value}. */
  slotValue?: "morning" | "afternoon" | null;
  /**
   * Say so when the day the guest had chosen was dropped rather than cleared by
   * them — the party grew and the car that fitted them no longer does. Decided
   * by whoever owns {@link value}, because only they can tell the difference
   * between a day taken away and a day nobody has picked yet.
   */
  dropped?: boolean;
  /** Tells the form which slot is chosen, for its live summary. */
  onSlotChange?: (slot: "morning" | "afternoon" | null) => void;
  /** Tells the form which day is chosen — the add-on rules read the weekday. */
  onDateChange?: (date: string | null) => void;
}) {
  const c = tourRequestContent.calendar;
  const l = locale;

  const slotUsable = (slot: { driversLeft: number; vehiclesLeft: VehicleCounts }) =>
    departureUsable(slot, experienceSlug, partySize);

  const [ownDay, setOwnDay] = useState<string | null>(
    defaultValue && months.some((m) => m.days.some((d) => d.date === defaultValue))
      ? defaultValue
      : null,
  );
  const [ownSlot, setOwnSlot] = useState<"morning" | "afternoon" | null>(null);

  // Controlled when the caller passed a value, its own otherwise — see the prop
  // notes. Both are written on every choice so a caller can stop controlling
  // one without the picker forgetting what is chosen.
  const selected = value !== undefined ? value : ownDay;
  const selectedSlot = slotValue !== undefined ? slotValue : ownSlot;

  /*
   * Which month is on screen — derived, with the arrows as an override.
   *
   * Open on the first month that has something to offer, not blankly on this
   * one: in November, a calendar that opens on an empty November reads as
   * "closed" when the answer is "not until April". But follow the selection
   * when there is one, because a day restored from a cancelled checkout is
   * usually not in that first month, and a calendar showing April while
   * claiming a day in June is chosen is a calendar nobody believes.
   *
   * Deriving it rather than syncing it in an effect is what lets the restored
   * day land in the right month on the render it arrives — and `pagedTo` is
   * pinned on every choice, so clearing a day leaves the guest looking at the
   * month they were in rather than snapping back to the first open one.
   */
  const firstOpen = Math.max(
    0,
    months.findIndex((month) => month.hasOpenings),
  );
  const monthOfSelected = selected
    ? months.findIndex((m) => m.days.some((d) => d.date === selected))
    : -1;
  const [pagedTo, setPagedTo] = useState<number | null>(null);
  const monthIndex = pagedTo ?? (monthOfSelected >= 0 ? monthOfSelected : firstOpen);

  const chooseSlot = (slot: "morning" | "afternoon" | null) => {
    setOwnSlot(slot);
    onSlotChange?.(slot);
  };

  const chooseDay = (date: string | null) => {
    setPagedTo(monthIndex);
    setOwnDay(date);
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

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t(c.label, l)}</p>
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
            onClick={() => setPagedTo(Math.max(0, monthIndex - 1))}
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
            onClick={() => setPagedTo(Math.min(months.length - 1, monthIndex + 1))}
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

      {/*
        Said out loud, and to a screen reader too: the day the guest had chosen
        was taken away by a change they made somewhere else on the form, and the
        only thing worse than losing it is losing it silently.
      */}
      {dropped ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t(c.partyChanged, l)}
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
    </div>
  );
}
