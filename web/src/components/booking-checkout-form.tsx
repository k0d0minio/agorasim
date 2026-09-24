"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Lock, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";

import { t, type Locale, type Localized } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { privacyContent } from "@/content/privacy";
import { termsContent } from "@/content/terms";
import { departureLabel, meetingPoints } from "@/content/logistics";
import type { Experience } from "@/content/experiences";
import type { PublicMonth } from "@/lib/availability";
import { MAX_PARTY_ONLINE } from "@/lib/fleet";
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
  draftFromFormData,
  noCheckoutEntry,
  readCheckoutEntry,
  saveCheckoutDraft,
  subscribeToCheckoutEntry,
  type CheckoutDraft,
} from "@/lib/checkout-draft";
import {
  startCheckout,
  type CheckoutState,
} from "@/app/[locale]/reservar/checkout-actions";
import { BookingDatePicker, departureUsable } from "@/components/booking-date-picker";
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

/**
 * The most guests the site sells online — the VW T3's seats.
 *
 * Not a ceiling on the *business*: the team take bigger groups by combining
 * cars, which needs a third driver nobody has yet named (AGORA-019). Until
 * they do, a ninth guest is a conversation rather than a checkout, and the
 * steppers stop here with the "talk to us" line under the total. The server
 * refuses the same number, from the same constant.
 */
const MAX_SEATS = MAX_PARTY_ONLINE;

/** Two people is the shape of almost every enquiry the team gets. */
const DEFAULT_ADULTS = 2;

/**
 * Everything about a booking that a guest can change, in one value.
 *
 * One object rather than a dozen `useState` calls, because the form has two
 * starting points — a fresh visit and a basket coming back from a cancelled
 * payment — and the second is not known until after hydration. Held as
 * "what the guest has edited, or nothing yet", the whole thing falls back to
 * {@link startingBasket} until they touch something, so a draft that arrives
 * on the second render simply *is* the form's contents. Seeding state from it
 * in an effect would mean a first paint that disagrees with the prerendered
 * HTML, and a cascade of renders to correct it.
 */
type Basket = {
  tour: string;
  mode: BookingMode;
  adults: number;
  children: number;
  infants: number;
  addOns: string[];
  date: string | null;
  slot: "morning" | "afternoon" | null;
  name: string;
  email: string;
  phone: string;
  message: string;
};

/**
 * Where the form starts: a restored draft, else the tour the URL named, else
 * the plain defaults — with what a rejected submit echoed back underneath.
 *
 * Every value is checked against the live catalogue on the way in. A draft is
 * guest-writable storage and a query string is whatever was typed, so a tour
 * that has since been retired or an add-on that never existed simply does not
 * appear here.
 */
function startingBasket(options: {
  tours: Experience[];
  complements: Experience[];
  tour: string | null;
  draft: CheckoutDraft | null;
  echoed: CheckoutState["values"];
}): Basket {
  const { tours, complements, draft, echoed } = options;
  /** A tour slug the catalogue still sells, or nothing at all. */
  const sellable = (slug: string | null | undefined): string | undefined =>
    slug != null && tours.some((entry) => entry.slug === slug) ? slug : undefined;

  // The draft is the more specific answer: a guest coming back from Stripe
  // chose their tour long before they landed on whatever URL brought them here.
  const wanted = sellable(draft?.tour) ?? sellable(options.tour);

  // Clamped as a group, not one band at a time: each is already bounded on the
  // way out of storage, but three valid numbers can still add up to more people
  // than the biggest car holds.
  const adults = Math.min(Math.max(draft?.adults ?? DEFAULT_ADULTS, 1), MAX_SEATS);
  const children = Math.min(draft?.children ?? 0, MAX_SEATS - adults);
  const infants = Math.min(draft?.infants ?? 0, MAX_SEATS - adults - children);

  return {
    tour: wanted ?? tours[0]?.slug ?? "",
    mode: draft?.mode ?? "public",
    adults,
    children,
    infants,
    addOns: (draft?.addOns ?? []).filter((slug) =>
      complements.some((entry) => entry.slug === slug),
    ),
    date: draft?.date ?? null,
    slot: draft?.slot ?? null,
    name: draft?.name ?? echoed?.name ?? "",
    email: draft?.email ?? echoed?.email ?? "",
    phone: draft?.phone ?? echoed?.phone ?? "",
    message: draft?.message ?? echoed?.message ?? "",
  };
}

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
  availability,
  testMode,
}: {
  locale: Locale;
  /** The live catalogue — tours and add-ons, with their price lists. */
  experiences: Experience[];
  /**
   * The public calendar — one for the whole business, not one per tour.
   *
   * Drivers and cars are shared (AGORA-012), so there is nothing per-tour left
   * to key on: what differs between routes is which class of car they draw,
   * and the picker works that out from the counts in here.
   */
  availability: PublicMonth[];
  /** Running against Stripe test keys — say so, loudly. */
  testMode: boolean;
}) {
  const c = bookingContent;
  const l = locale;
  const optional = t(c.labels.optional, l);

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

  /*
   * What the URL and the tab's storage have to say about this arrival — the
   * `?tour=` an experience page named, and the basket of a payment they backed
   * out of. Both are external systems the prerendered HTML cannot know about,
   * so they are subscribed to rather than copied into state: `/reservar` is
   * cached and served for every query string alike, and reading `searchParams`
   * on the server would make the whole page per-request to preselect a card.
   */
  const arrival = useSyncExternalStore(
    subscribeToCheckoutEntry,
    readCheckoutEntry,
    noCheckoutEntry,
  );

  /*
   * The form's contents: what the guest has edited, or where it started.
   *
   * `edited` stays null until they touch something, which is what lets a draft
   * arriving after hydration simply *be* the form — no effect, no second set of
   * renders to correct the first. The updater is functional so two patches in
   * one handler compose (picking a day also picks its only departure) instead
   * of the second overwriting the first.
   */
  const starting = startingBasket({
    tours,
    complements,
    tour: arrival.tour,
    draft: arrival.draft,
    echoed: state.values,
  });
  const [edited, setEdited] = useState<Basket | null>(null);
  const basket = edited ?? starting;
  const update = (patch: Partial<Basket>) =>
    setEdited((previous) => ({ ...(previous ?? starting), ...patch }));

  const { mode, adults, children, infants } = basket;
  const addOns = basket.addOns;

  const tour = tours.find((entry) => entry.slug === basket.tour) ?? tours[0];
  const pricing = tour?.pricing?.type === "tour" ? tour.pricing : null;
  const allowsAddOns = Boolean(pricing?.private?.allowsAddOns);
  const addOnsOffered = allowsAddOns && complements.length > 0;
  // The price list goes higher than the fleet can carry without a third
  // driver, so the smaller of the two wins: a tier nobody can be driven to is
  // not an offer.
  const maxAdults = Math.max(1, Math.min(maxAdultsOf(tour?.pricing) || MAX_SEATS, MAX_SEATS));
  const seats = adults + children + infants;

  /*
   * Does the chosen day still stand?
   *
   * Asked here, every render, of the same calendar the picker draws its grid
   * from and by the same rule (`departureUsable`). This is the fix for the
   * defect that made the form and the picker disagree: the picker used to be
   * restarted by a `key` whenever the tour or the party changed, which cleared
   * its grid but left this form holding a day the guest could no longer see —
   * and posting it. Now a day that no longer has the right car free simply
   * stops being the chosen day, everywhere at once, and the picker is told to
   * say so out loud rather than let it vanish in silence.
   */
  const chosenDay = basket.date
    ? availability.flatMap((month) => month.days).find((day) => day.date === basket.date)
    : undefined;
  const usableDepartures = (chosenDay?.slots ?? []).filter((entry) =>
    departureUsable(entry, tour?.slug, seats),
  );
  const date = usableDepartures.length > 0 ? basket.date : null;
  const slot =
    date && basket.slot && usableDepartures.some((entry) => entry.slot === basket.slot)
      ? basket.slot
      : null;
  /** The guest had a day, and the party they have just become cannot have it. */
  const dayDropped = Boolean(basket.date) && date === null;

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
    (entry) => addOns.includes(entry.slug) && mode === "private" && !addOnBlocked(entry),
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
    update({
      addOns: addOns.includes(slug)
        ? addOns.filter((entry) => entry !== slug)
        : [...addOns, slug],
    });
  }

  if (!tour) return null;

  const slotLabels = {
    morning: t(departureLabel(tour.slug, "morning"), l),
    afternoon: t(departureLabel(tour.slug, "afternoon"), l),
  };

  return (
    <form
      action={formAction}
      /*
       * The basket, saved at the last possible moment before the guest leaves
       * for Stripe — and read from the `FormData` rather than from state, so
       * what is stored is precisely what was submitted. React runs this before
       * the action; a throw inside it would take the payment with it, which is
       * why every call in `saveCheckoutDraft` swallows its own failure.
       */
      onSubmit={(event) => saveCheckoutDraft(draftFromFormData(new FormData(event.currentTarget)))}
      className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start"
    >
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
        {/*
          Back from Stripe with everything still here. Said plainly, because a
          guest who expects to start again and finds the form already filled in
          should be told why rather than left wondering what the site knows.
        */}
        {arrival.draft ? (
          <p
            role="status"
            className="rounded-xl border border-dashed border-input px-4 py-3 text-sm text-muted-foreground"
          >
            {t(c.labels.resumed, l)}
          </p>
        ) : null}

        {/* Which tour. Two cards; the choice resets day and departure. */}
        <section aria-labelledby="bk-tour">
          <h2 id="bk-tour" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.experience, l)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t(c.labels.experienceHint, l)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {tours.map((entry) => {
              const active = entry.slug === tour.slug;
              // Only for a route the logistics map names — a guest is never
              // shown a starting point that was guessed for them.
              const meetingPoint = meetingPoints[entry.slug];
              return (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => {
                    update({
                      tour: entry.slug,
                      date: null,
                      slot: null,
                      addOns: [],
                    });
                  }}
                  aria-pressed={active}
                  className={cn(
                    /*
                     * These cards are `<button aria-pressed>`, so they are in
                     * the tab order and need a focus indicator of their own.
                     * Full-strength `ring-ring` rather than the `/50` the
                     * shared `Button` softens it to: an active card already
                     * wears `border-primary` and `ring-primary/30`, so a 50%
                     * halo measures 2.2:1 against the page — under the WCAG
                     * 1.4.11 3:1 floor — where opaque it is 6.3:1. The
                     * `focus-visible:` ring wins over the resting `ring-1` on
                     * specificity, so an active card gets the same indicator
                     * as an idle one.
                     */
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="font-medium">{t(entry.title, l)}</span>
                  <span className="text-sm text-muted-foreground">{t(entry.tagline, l)}</span>
                  <span className="text-sm text-muted-foreground">{t(entry.duration, l)}</span>
                  {/*
                    Where the day starts. The two routes leave from different
                    towns — Sintra and Lisbon — and a guest choosing between
                    them was being asked to pay before being told which, when
                    it is often the fact that decides it.
                  */}
                  {meetingPoint ? (
                    <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="sr-only">{t(c.labels.meetingPoint, l)}: </span>
                        {meetingPoint.address}
                      </span>
                    </span>
                  ) : null}
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
                  onClick={() => update({ mode: option })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
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
              onChange={(next) => update({ adults: next })}
              locale={l}
            />
            <Stepper
              id="bk-children"
              label={t(c.labels.children, l)}
              hint={t(c.labels.childrenHint, l)}
              value={children}
              min={0}
              max={MAX_SEATS - adults - infants}
              onChange={(next) => update({ children: next })}
              locale={l}
            />
            <Stepper
              id="bk-infants"
              label={t(c.labels.infants, l)}
              hint={t(c.labels.infantsHint, l)}
              value={infants}
              min={0}
              max={MAX_SEATS - adults - children}
              onChange={(next) => update({ infants: next })}
              locale={l}
            />
            <p className="pt-3 text-center text-sm text-muted-foreground">
              {t(c.labels.partyHint, l)}
            </p>
            {/*
              The steppers stop at eight because that is the biggest car. A
              control that simply refuses to move is a control that reads as
              broken, so the reason and the way forward sit right under it —
              a group of ten is real business, it is just a phone call until
              AGORA-019 says who drives the third car.
            */}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              {t(c.labels.bigGroupNote, l).replace("{max}", String(MAX_SEATS))}{" "}
              <Link href={href(l, "contactos")} className="underline hover:text-primary">
                {t(c.labels.bigGroupLink, l)}
              </Link>
            </p>
            {state.fieldErrors?.party ? (
              <p className="pt-2 text-center text-sm text-destructive" role="alert">
                {state.fieldErrors.party}
              </p>
            ) : null}
          </Card>
        </section>

        {/*
          The calendar. One calendar for the whole business (AGORA-012) — what
          changes with the tour and the party is not *which* days exist but
          which of them have the right car free, which is why both are passed
          down rather than a pre-filtered month list.

          It is a step like the others and now says so: every sibling section
          has an `h2`, and a guest skipping through the form by heading used to
          fall straight from "who's coming" into "your details" with the whole
          calendar in between.

          There is deliberately no `key` here. Restarting the picker on a party
          change cleared the grid and left this form holding the day the guest
          could no longer see; the picker re-asks the question instead, keeps a
          day that still fits, and says so when one does not.
        */}
        <section aria-labelledby="bk-when" className="flex flex-col gap-4">
          <h2 id="bk-when" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.when, l)}
          </h2>
          <BookingDatePicker
            locale={l}
            // The checkout's field, not the enquiry's. A card cannot be charged
            // for "late August", so the free-text escape becomes a link out.
            name="date"
            slotName="slot"
            slotHeading={t(c.labels.slot, l)}
            slotLabels={slotLabels}
            experienceSlug={tour.slug}
            partySize={seats}
            allowFlexible={false}
            contactHref={href(l, "contactos")}
            months={availability}
            error={state.fieldErrors?.date}
            // Controlled: this form owns the day and the departure, so a
            // rejected submit and a cancelled payment both keep them, and the
            // two copies can no longer drift apart.
            value={date}
            slotValue={slot}
            dropped={dayDropped}
            onDateChange={(next) => update({ date: next, slot: null })}
            onSlotChange={(next) => update({ slot: next })}
          />
        </section>

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
                const active = usable && addOns.includes(entry.slug);
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
                      "flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
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
                value={basket.name}
                onChange={(event) => update({ name: event.target.value })}
                aria-invalid={Boolean(state.fieldErrors?.name)}
                aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
              />
              {state.fieldErrors?.name ? (
                <p id="name-error" className="text-sm text-destructive" role="alert">
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
                value={basket.email}
                onChange={(event) => update({ email: event.target.value })}
                aria-invalid={Boolean(state.fieldErrors?.email)}
                aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
              />
              {state.fieldErrors?.email ? (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">
                {t(c.labels.phone, l)} {optional}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={basket.phone}
                onChange={(event) => update({ phone: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">
              {t(c.labels.message, l)} {optional}
            </Label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder={t(c.labels.messagePlaceholder, l)}
              value={basket.message}
              onChange={(event) => update({ message: event.target.value })}
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

          {/*
            The terms are presented before payment, not after: a guest who is
            about to prepay in full is owed the seller's identity, the
            cancellation procedure and the withdrawal statement one tap away
            from the button that commits them (Directive 2011/83/EU Art. 6 and
            8). A sentence and a link, not a checkbox — see `terms.ts`.
          */}
          <p className="text-center text-xs text-muted-foreground">
            {t(termsContent.checkoutNotice.prefix, l)}{" "}
            <Link href={href(l, "termos")} className="underline hover:text-primary">
              {t(termsContent.checkoutNotice.linkLabel, l)}
            </Link>
            .
          </p>

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
