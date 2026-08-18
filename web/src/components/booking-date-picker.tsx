"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import type { PublicMonth } from "@/lib/availability";
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
 * The server checks the day again on submit (`checkDayAvailable`) — this is a
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
  error,
  slotName,
  slotHeading,
  slotLabels,
  mode = "public",
  onSlotChange,
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
   * How the party wants the departure: `public` enables days with seats left,
   * `private` enables days with an untouched slot to own.
   */
  mode?: "public" | "private";
  /** Tells the form which slot is chosen, for its live summary. */
  onSlotChange?: (slot: "morning" | "afternoon" | null) => void;
  /** Tells the form which day is chosen — the add-on rules read the weekday. */
  onDateChange?: (date: string | null) => void;
}) {
  const c = tourRequestContent.calendar;
  const l = locale;

  /** Whether one departure works for the way the party wants to come. */
  const slotUsable = (slot: { bookable: boolean; privateBookable: boolean }) =>
    mode === "private" ? slot.privateBookable : slot.bookable;

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
  const [selectedSlot, setSelectedSlot] = useState<"morning" | "afternoon" | null>(null);

  const chooseSlot = (slot: "morning" | "afternoon" | null) => {
    setSelectedSlot(slot);
    onSlotChange?.(slot);
  };

  const chooseDay = (date: string | null) => {
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
  const seatsWord = (n: number) => (n === 1 ? t(c.seatLeft, l) : t(c.seatsLeft, l));

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
        chips at most; a chip the party's mode cannot use is shown disabled with
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
                  {usable && mode === "public" && slot.seatsLeft <= 4 ? (
                    <span className="text-[0.625rem] leading-tight font-normal opacity-80">
                      {slot.seatsLeft} {seatsWord(slot.seatsLeft)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
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
