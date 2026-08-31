"use client";

import {
  useActionState,
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Lock, Minus, Plus, ShieldCheck } from "lucide-react";

import { t, type Locale, type Localized } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { privacyContent } from "@/content/privacy";
import { departureLabel, meetingPoints } from "@/content/logistics";
import type { Experience } from "@/content/experiences";
import type { PublicMonth } from "@/lib/availability";
import { chosenDeparture, usableDepartures, MAX_PARTY_ONLINE } from "@/lib/fleet";
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
import {
  readCheckoutEntry,
  readDraft,
  saveDraft,
  type CheckoutDraft,
} from "@/lib/checkout-draft";
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

/** What the arrival brought with it: a tour to open on, a draft to put back. */
type CheckoutEntry = { tour: string | null; draft: CheckoutDraft | null };

/**
 * The arrival, read as what it is: an external store.
 *
 * Two things reach this form from outside React — the query string, which an
 * experience page's "book this" fills in, and the `sessionStorage` draft a
 * return from Stripe comes back for (`lib/checkout-draft.ts`). Neither exists
 * where this page is rendered: `/reservar` is statically built, and reading
 * `searchParams` on the server would make a page that queries the catalogue and
 * the whole public calendar do it again per view, to preselect a card.
 *
 * So it is read through `useSyncExternalStore`, which is the sanctioned way to
 * read a browser store without lying to hydration: the server snapshot is
 * `null` — nothing arrived — the first client render matches it exactly, and
 * React re-renders once with the real answer straight after. The result is
 * cached per query string so the snapshot is stable between calls, as that hook
 * requires, and so that navigating back to a bare `/reservar` inside the same
 * tab is a fresh form rather than yesterday's arrival.
 */
let cachedEntry: { search: string; entry: CheckoutEntry } | null = null;

/** Nothing to subscribe to: the arrival is fixed for as long as the URL is. */
const noSubscribe = () => () => {};

function arrivalEntry(): CheckoutEntry {
  const search = window.location.search;
  if (!cachedEntry || cachedEntry.search !== search) {
    const { tour, cancelled } = readCheckoutEntry(search);
    cachedEntry = { search, entry: { tour, draft: cancelled ? readDraft() : null } };
  }
  return cachedEntry.entry;
}

/** On the server nothing has arrived yet, and the HTML says so. */
function noArrival(): CheckoutEntry | null {
  return null;
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

export function BookingCheckoutForm(props: {
  locale: Locale;
  experiences: Experience[];
  availability: PublicMonth[];
  testMode: boolean;
}) {
  const entry = useSyncExternalStore(noSubscribe, arrivalEntry, noArrival);
  // A form that has something to open with is a *different* form, and the
  // honest way to seed a pile of `useState` from something read after mount is
  // to mount it again with the seed in hand. It happens once, on hydration,
  // before there is anything on the page to lose — and only when the arrival
  // actually brought something, so an ordinary visit mounts once.
  const seeded = Boolean(entry && (entry.tour || entry.draft));
  return <CheckoutForm {...props} key={seeded ? "seeded" : "fresh"} arrival={entry} />;
}

function CheckoutForm({
  locale,
  experiences,
  availability,
  testMode,
  arrival,
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
  /**
   * What this visit arrived with, or `null` until hydration has answered.
   * Everything below is seeded from it, so the answer arriving is a remount.
   */
  arrival: CheckoutEntry | null;
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

  /** A slug this form still sells, or nothing. Arrivals are not trusted. */
  const known = (slug: string | null | undefined) =>
    slug && tours.some((entry) => entry.slug === slug) ? slug : null;
  /*
   * A draft naming a tour the catalogue no longer sells is not restorable:
   * its day, its add-ons and its price all belonged to that route.
   */
  const draft = arrival?.draft && known(arrival.draft.tour) ? arrival.draft : null;

  const [tourSlug, setTourSlug] = useState(
    draft?.tour ?? known(arrival?.tour) ?? tours[0]?.slug ?? "",
  );
  const [mode, setMode] = useState<BookingMode>(draft?.mode ?? "public");
  const [adults, setAdults] = useState(draft?.adults ?? 2);
  const [children, setChildren] = useState(draft?.children ?? 0);
  const [infants, setInfants] = useState(draft?.infants ?? 0);
  const [addOns, setAddOns] = useState<Set<string>>(new Set(draft?.addOns ?? []));
  // The server's echo of a rejected day matters here rather than on the picker:
  // both must open on the same day or the form prices one the guest cannot see.
  const [date, setDate] = useState<string | null>(
    draft?.date ?? state.values?.date ?? null,
  );
  const [slot, setSlot] = useState<"morning" | "afternoon" | null>(draft?.slot ?? null);
  /*
   * The guest's own words, held here rather than left to the DOM.
   *
   * They have to be readable to be remembered — the draft written for the walk
   * to Stripe carries them — and they have to survive a rejected submit, which
   * an uncontrolled `<form action>` does not: React resets it once the action
   * returns. The server echoes them back for that same reason, and seeds this
   * state on the render that carries the failure.
   */
  const [guest, setGuest] = useState(() => ({
    name: draft?.name || state.values?.name || "",
    email: draft?.email || state.values?.email || "",
    phone: draft?.phone || state.values?.phone || "",
    message: draft?.message || state.values?.message || "",
  }));
  const guestField =
    (field: keyof typeof guest) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setGuest((previous) => ({ ...previous, [field]: event.target.value }));

  const tour = tours.find((entry) => entry.slug === tourSlug) ?? tours[0];
  const pricing = tour?.pricing?.type === "tour" ? tour.pricing : null;
  const allowsAddOns = Boolean(pricing?.private?.allowsAddOns);
  const addOnsOffered = allowsAddOns && complements.length > 0;
  // The price list goes higher than the fleet can carry without a third
  // driver, so the smaller of the two wins: a tier nobody can be driven to is
  // not an offer.
  const maxAdults = Math.max(1, Math.min(maxAdultsOf(tour?.pricing) || MAX_SEATS, MAX_SEATS));
  const seats = adults + children + infants;

  /**
   * The day and departure that are *actually* chosen, as against the ones the
   * guest tapped before the party changed shape.
   *
   * The picker asks the same question of the same calendar with the same
   * function from `lib/fleet.ts`, so the two cannot disagree: what it shows as
   * chosen and posts is what this form prices, checks the add-on rules
   * against, and remembers. It used to be kept in step by remounting the
   * picker whenever the party changed, which cleared its day and left this
   * form holding one nobody could see any more.
   */
  const chosenDayRow = date
    ? availability.flatMap((month) => month.days).find((day) => day.date === date)
    : undefined;
  const usableSlots = usableDepartures(chosenDayRow?.slots ?? [], tour?.slug, seats);
  const chosenDate = usableSlots.length > 0 ? date : null;
  const chosenSlot = chosenDate ? chosenDeparture(usableSlots, slot) : null;

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
    if (chosenDate && p.closedWeekdays?.length) {
      const weekday = weekdayOf(chosenDate);
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
        date: chosenDate ?? undefined,
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

  /**
   * Everything the guest has entered, kept where a return from Stripe can find
   * it. Written continuously rather than on submit: by the time the browser is
   * on Stripe's domain this component is gone, and a draft written only on the
   * way out is a draft that is missing whenever the way out is not the path
   * taken. Never before hydration has answered what this visit arrived with, or
   * the form's defaults would overwrite the very draft it came back for.
   * `lib/checkout-draft.ts` says why the store is the tab's and not the URL.
   */
  useEffect(() => {
    if (!arrival || !tour) return;
    saveDraft({
      tour: tour.slug,
      mode,
      adults,
      children,
      infants,
      addOns: [...addOns],
      // What is actually chosen, not what was tapped before the party grew.
      date: chosenDate,
      slot: chosenSlot,
      ...guest,
    });
  }, [
    arrival,
    tour,
    mode,
    adults,
    children,
    infants,
    addOns,
    chosenDate,
    chosenSlot,
    guest,
  ]);

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
              const meetingPoint = meetingPoints[entry.slug];
              return (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => {
                    setTourSlug(entry.slug);
                    setDate(null);
                    setSlot(null);
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
                  {/*
                    Where this one leaves from. The two routes start an hour
                    apart — Sintra for the countryside, Lisbon for Óbidos — and
                    a guest could pay without ever being told which, then drive
                    to the wrong city. A route `content/logistics.ts` does not
                    name gets no line at all, never a guessed one.
                  */}
                  {meetingPoint ? (
                    <span className="text-sm text-muted-foreground">
                      {t(c.labels.meetingPoint, l)}: {meetingPoint.address}
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

          The party is *not* in the `key`. It used to be, and a couple who
          became five lost the day they had chosen without being told: the
          picker restarted blank while this form went on holding the vanished
          date, so the summary, the add-on rules and the hidden field all still
          described a booking the page no longer showed. The picker now keeps
          its day across a party change and drops it — out loud — only when the
          day genuinely stops fitting.
        */}
        <BookingDatePicker
          key={tour.slug}
          locale={l}
          // The step's own heading, so the calendar is announced like every
          // other section of this form rather than being the one step a screen
          // reader meets as a stray paragraph.
          headingId="bk-when"
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
          defaultValue={date ?? undefined}
          defaultSlot={slot}
          error={state.fieldErrors?.date}
          onDateChange={setDate}
          onSlotChange={setSlot}
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
                value={guest.name}
                onChange={guestField("name")}
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
                value={guest.email}
                onChange={guestField("email")}
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
                value={guest.phone}
                onChange={guestField("phone")}
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
              value={guest.message}
              onChange={guestField("message")}
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
