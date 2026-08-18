"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Lock, Minus, Plus, ShieldCheck } from "lucide-react";

import { t, type Locale, type Localized } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { privacyContent } from "@/content/privacy";
import { departureLabel } from "@/content/logistics";
import type { Experience } from "@/content/experiences";
import type { PublicMonth } from "@/lib/availability";
import {
  isPriced,
  maxAdultsOf,
  priceBooking,
  weekdayOf,
  type BookingMode,
  type PricedLine,
} from "@/lib/pricing";
import { formatPrice } from "@/lib/money";
import { href } from "@/lib/routes";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import {
  startCheckout,
  type CheckoutState,
} from "@/app/[locale]/reservar/checkout-actions";
import { BookingDatePicker } from "@/components/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The real booking flow: pick a tour, pick how to go, pick a departure, pay.
 *
 * It carries the whole of Diogo & Rita's actual offer (AGORA-002): two tours,
 * each sellable as a shared departure (per person, tiered by adults) or a
 * private one (a group figure), children and infants in their own bands, and
 * the add-on stops that only exist on a private countryside tour. The form's
 * job is to make the combinations that cannot be bought impossible to submit —
 * greyed with the reason — rather than let the server say no afterwards.
 *
 * **The prices here are for reading, not for charging.** The same
 * `priceBooking` the server runs is imported here (it is pure), so the total
 * moves as the guest adds a person or a tasting — but the server prices the
 * basket again from the catalogue before it creates a Stripe session. Nothing
 * this component computes is ever trusted — see `startCheckout`, which does
 * not so much as look at a total in the form.
 */

/** Physical ceiling on one departure — the combined fleet. Server re-checks. */
const MAX_SEATS = 14;

function PayButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = bookingContent.labels;
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <Lock className="size-4" />
      {pending ? t(c.paying, locale) : t(c.pay, locale)}
    </Button>
  );
}

function Stepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  locale,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  locale: Locale;
}) {
  const c = bookingContent.labels;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="font-medium" id={id}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`${label}: ${t(c.fewer, locale)}`}
          disabled={value <= min}
        >
          <Minus className="size-4" />
        </Button>
        <output aria-labelledby={id} aria-live="polite" className="min-w-8 text-center font-heading text-2xl font-semibold">
          {value}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`${label}: ${t(c.more, locale)}`}
          disabled={value >= max}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function BookingCheckoutForm({
  locale,
  experiences,
  availabilityBySlug,
  testMode,
}: {
  locale: Locale;
  /** The live catalogue — tours and add-ons, with their price lists. */
  experiences: Experience[];
  /** Each tour's public calendar, keyed by slug. */
  availabilityBySlug: Record<string, PublicMonth[]>;
  /** Running against Stripe test keys — say so, loudly. */
  testMode: boolean;
}) {
  const c = bookingContent;
  const l = locale;

  const [state, formAction] = useActionState<CheckoutState, FormData>(startCheckout, {});
  /*
   * Money is formatted here rather than server-side because the total moves as
   * the guest adds a person or a tasting. `lib/money.ts` exists precisely so
   * both sides can share these rules — see the note at the top of that file.
   */
  const price = (cents: number) => formatPrice(cents, l);

  const tours = experiences.filter(
    (entry) => entry.kind === "signature" && isPriced(entry.pricing),
  );
  const complements = experiences.filter(
    (entry) => entry.kind === "complement" && entry.pricing?.type === "addon",
  );

  const [tourSlug, setTourSlug] = useState(tours[0]?.slug ?? "");
  const [mode, setMode] = useState<BookingMode>("public");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [addOns, setAddOns] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<string | null>(null);

  const tour = tours.find((entry) => entry.slug === tourSlug) ?? tours[0];
  const pricing = tour?.pricing?.type === "tour" ? tour.pricing : null;
  const allowsAddOns = Boolean(pricing?.private?.allowsAddOns);
  const addOnsOffered = allowsAddOns && complements.length > 0;
  const maxAdults = Math.max(1, maxAdultsOf(tour?.pricing) || 12);
  const seats = adults + children + infants;

  /** Why one add-on cannot join this basket right now, or null when it can. */
  const addOnBlocked = (entry: Experience): string | null => {
    if (entry.pricing?.type !== "addon") return null;
    const p = entry.pricing;
    const fillIn = (template: Localized, min: number) =>
      t(template, l).replace("{min}", String(min));
    if (p.minAdults && adults < p.minAdults) {
      return fillIn(c.labels.addOnMinAdults, p.minAdults);
    }
    if (p.minGuests && adults + children < p.minGuests) {
      return fillIn(c.labels.addOnMinGuests, p.minGuests);
    }
    if (date && p.closedWeekdays?.length) {
      const weekday = weekdayOf(date);
      if (weekday !== null && p.closedWeekdays.includes(weekday)) {
        return t(c.labels.addOnClosedMonday, l);
      }
    }
    return null;
  };

  const chosenAddOns = complements.filter(
    (entry) => addOns.has(entry.slug) && mode === "private" && !addOnBlocked(entry),
  );

  /**
   * The live quote — the same arithmetic the server will run, cheap enough to
   * run on every render. A failure here is a combination the controls should
   * have prevented (or a group beyond the price list, which gets the "talk to
   * us" line under the total).
   */
  const quote = tour
    ? priceBooking({
        tour: { slug: tour.slug, pricing: tour.pricing },
        addOns: chosenAddOns.map((entry) => ({ slug: entry.slug, pricing: entry.pricing })),
        mode,
        party: { adults, children, infants },
        date: date ?? undefined,
      })
    : null;

  const bySlug = new Map(experiences.map((entry) => [entry.slug, entry]));

  const lineLabel = (line: PricedLine): string => {
    const title = t(bySlug.get(line.slug)?.title ?? { pt: line.slug, en: line.slug }, l);
    if (line.unit === "group") return `${title} — ${t(c.labels.privateGroup, l)}`;
    if (line.unit === "child") return `${title} — ${t(c.labels.childrenLine, l)}`;
    return title;
  };

  // Whatever stopped the submission, in one place — the field errors render
  // next to their fields too, but those are off-screen from the pay button.
  const problem =
    state.error ??
    state.fieldErrors?.date ??
    state.fieldErrors?.party ??
    state.fieldErrors?.addOns ??
    state.fieldErrors?.name ??
    state.fieldErrors?.email;

  /** The quote's own objection, shown under the total as it happens. */
  const quoteProblem = (() => {
    if (!quote || quote.ok) return null;
    switch (quote.reason) {
      case "party-too-large":
        return t(c.errors.groupTooLarge, l);
      case "min-adults":
        return t(c.errors.minAdults, l);
      default:
        return null;
    }
  })();

  function toggleAddOn(slug: string) {
    setAddOns((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  if (!tour) return null;

  const slotLabels = {
    morning: t(departureLabel(tour.slug, "morning"), l),
    afternoon: t(departureLabel(tour.slug, "afternoon"), l),
  };

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="experience" value={tour.slug} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      <input type="hidden" name="infants" value={infants} />
      {chosenAddOns.map((entry) => (
        <input key={entry.slug} type="hidden" name="addOns" value={entry.slug} />
      ))}

      {/* Honeypot — same rig as the enquiry form: off-screen rather than
          hidden, so naive bots fill it in and real people never reach it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={HONEYPOT_FIELD}>Company website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="flex flex-col gap-10">
        {/* Which tour. Two cards; the choice resets day and departure. */}
        <section aria-labelledby="bk-tour">
          <h2 id="bk-tour" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.experience, l)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t(c.labels.experienceHint, l)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {tours.map((entry) => {
              const active = entry.slug === tour.slug;
              return (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => {
                    setTourSlug(entry.slug);
                    setDate(null);
                    setAddOns(new Set());
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="font-medium">{t(entry.title, l)}</span>
                  <span className="text-sm text-muted-foreground">{t(entry.tagline, l)}</span>
                  <span className="text-sm text-muted-foreground">{t(entry.duration, l)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Shared or private. */}
        <section aria-labelledby="bk-mode">
          <h2 id="bk-mode" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.mode, l)}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["public", "private"] as const).map((option) => {
              const offered = Boolean(pricing?.[option]);
              const active = mode === option;
              const label = option === "public" ? c.labels.modePublic : c.labels.modePrivate;
              const hint =
                option === "public" ? c.labels.modePublicHint : c.labels.modePrivateHint;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={!offered}
                  aria-pressed={active}
                  onClick={() => setMode(option)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : offered
                        ? "border-border hover:border-primary/50"
                        : "cursor-not-allowed border-border opacity-50",
                  )}
                >
                  <span className="font-medium">{t(label, l)}</span>
                  <span className="text-sm text-muted-foreground">{t(hint, l)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Who's coming. */}
        <section aria-labelledby="bk-party">
          <h2 id="bk-party" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.partySize, l)}
          </h2>
          <Card className="mt-4 divide-y p-4">
            <Stepper
              id="bk-adults"
              label={t(c.labels.adults, l)}
              hint={t(c.labels.adultsHint, l)}
              value={adults}
              min={1}
              max={Math.min(maxAdults, MAX_SEATS - children - infants)}
              onChange={setAdults}
              locale={l}
            />
            <Stepper
              id="bk-children"
              label={t(c.labels.children, l)}
              hint={t(c.labels.childrenHint, l)}
              value={children}
              min={0}
              max={MAX_SEATS - adults - infants}
              onChange={setChildren}
              locale={l}
            />
            <Stepper
              id="bk-infants"
              label={t(c.labels.infants, l)}
              hint={t(c.labels.infantsHint, l)}
              value={infants}
              min={0}
              max={MAX_SEATS - adults - children}
              onChange={setInfants}
              locale={l}
            />
            <p className="pt-3 text-center text-sm text-muted-foreground">
              {t(c.labels.partyHint, l)}
            </p>
            {state.fieldErrors?.party ? (
              <p className="pt-2 text-center text-sm text-destructive" role="alert">
                {state.fieldErrors.party}
              </p>
            ) : null}
          </Card>
        </section>

        {/* The calendar — per tour, per mode; changing either starts over. */}
        <BookingDatePicker
          key={`${tour.slug}-${mode}`}
          locale={l}
          // The checkout's field, not the enquiry's. A card cannot be charged
          // for "late August", so the free-text escape becomes a link out.
          name="date"
          slotName="slot"
          slotHeading={t(c.labels.slot, l)}
          slotLabels={slotLabels}
          mode={mode}
          allowFlexible={false}
          contactHref={href(l, "contactos")}
          months={availabilityBySlug[tour.slug] ?? []}
          defaultValue={state.values?.date}
          error={state.fieldErrors?.date}
          onDateChange={setDate}
        />

        {/* Add-ons — a private countryside privilege, and the form says so. */}
        {addOnsOffered ? (
          <section aria-labelledby="bk-extras">
            <h2 id="bk-extras" className="text-xl font-semibold sm:text-2xl">
              {t(c.labels.addOns, l)}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(c.labels.addOnsHint, l)}</p>
            {mode === "public" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t(c.labels.addOnsPublicNote, l)}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {complements.map((entry) => {
                const blocked = mode !== "private" ? "" : addOnBlocked(entry);
                const usable = mode === "private" && !blocked;
                const active = usable && addOns.has(entry.slug);
                const perAdult =
                  entry.pricing?.type === "addon" ? entry.pricing.perAdultCents : 0;
                return (
                  <button
                    key={entry.slug}
                    type="button"
                    disabled={!usable}
                    onClick={() => toggleAddOn(entry.slug)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : usable
                          ? "border-border hover:border-primary/50"
                          : "cursor-not-allowed border-border opacity-60",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{t(entry.title, l)}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {t(entry.tagline, l)}
                      </span>
                      <span className="mt-1 block text-sm font-medium">
                        +{price(perAdult)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t(c.labels.perAdult, l)}
                        </span>
                      </span>
                      {blocked ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {blocked}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
            {state.fieldErrors?.addOns ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {state.fieldErrors.addOns}
              </p>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="bk-you" className="flex flex-col gap-5">
          <h2 id="bk-you" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.yourDetails, l)}
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t(c.labels.name, l)}</Label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="name"
                enterKeyHint="next"
                defaultValue={state.values?.name}
              />
              {state.fieldErrors?.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t(c.labels.email, l)}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                enterKeyHint="next"
                defaultValue={state.values?.email}
              />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t(c.labels.phone, l)}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={state.values?.phone}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">{t(c.labels.message, l)}</Label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder={t(c.labels.messagePlaceholder, l)}
              defaultValue={state.values?.message}
            />
          </div>

          {/*
            Marketing opt-in. Never pre-ticked and never a condition of paying —
            the same three requirements of valid consent the enquiry form
            carries (GDPR Art. 4(11), 7(4)), and just as easy to break here.
          */}
          <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="marketingConsent"
                value="on"
                className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
              />
              <span>
                {t(privacyContent.marketing.label, l)}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t(privacyContent.marketing.hint, l)}
                </span>
              </span>
            </label>
          </div>

          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {t(privacyContent.formNotice.intro, l)}{" "}
            {t(privacyContent.formNotice.linkPrefix, l)}{" "}
            <Link href={href(l, "privacidade")} className="underline hover:text-primary">
              {t(privacyContent.formNotice.linkLabel, l)}
            </Link>
            .
          </p>
        </section>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4 p-5">
          <p className="font-heading text-lg font-semibold">{t(c.labels.summary, l)}</p>

          <dl className="space-y-2 text-sm">
            {quote?.ok
              ? quote.lines.map((line, i) => (
                  <div key={`${line.slug}-${line.unit}-${i}`} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{lineLabel(line)}</dt>
                    <dd className="font-medium">
                      {line.unit === "group"
                        ? price(line.unitCents)
                        : `${price(line.unitCents)} × ${line.quantity}`}
                    </dd>
                  </div>
                ))
              : null}
            {infants > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(c.labels.infantsLine, l)}</dt>
                <dd className="font-medium">× {infants}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t pt-2 text-muted-foreground">
              <dt>
                {seats} {seats === 1 ? t(c.labels.person, l) : t(c.labels.people, l)}
              </dt>
              <dd />
            </div>
          </dl>

          <div className="flex justify-between rounded-lg bg-muted/60 p-3 font-medium">
            <span>{t(c.labels.total, l)}</span>
            <span>{quote?.ok ? price(quote.totalCents) : "—"}</span>
          </div>

          {quoteProblem ? (
            <p className="text-sm text-muted-foreground" role="status">
              {quoteProblem}
            </p>
          ) : null}

          {/*
            The pay button is the last thing on the page on a phone, and the
            fields it validates are all above it. Without this, tapping pay on
            a bad date scrolled nothing, showed nothing where the thumb was,
            and read as "the button is broken" — so whatever went wrong is
            repeated here, next to the control that triggered it.
          */}
          {problem ? (
            <p className="text-sm text-destructive" role="alert">
              {problem}
            </p>
          ) : null}

          {testMode ? (
            <p className="rounded-lg border border-dashed border-input px-3 py-2 text-xs font-medium">
              {t(c.labels.testMode, l)}
            </p>
          ) : null}

          <PayButton locale={l} />

          <p className="text-center text-xs text-muted-foreground">
            {t(c.labels.holdNote, l)}
          </p>

          <p className="text-center text-xs text-muted-foreground">
            {t(c.labels.freeCancellation, l)}
          </p>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {t(c.labels.securePayment, l)}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
