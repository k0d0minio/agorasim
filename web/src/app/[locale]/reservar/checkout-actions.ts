"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { bookingContent } from "@/content/booking";
import {
  defaultLocale,
  isLocale,
  localeFromPathname,
  t,
  type Locale,
} from "@/i18n/config";
import { checkSlotAvailable } from "@/lib/availability";
import { startBookingCheckout } from "@/lib/booking-checkout";
import { slotOccupancyOn } from "@/lib/bookings";
import { listExperiences } from "@/lib/experience-catalogue";
import { priceBooking, type PricingFailure } from "@/lib/pricing";
import { bookingCheckoutSchema, formValues, type BookingCheckoutField } from "@/lib/form-schemas";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isStripeConfigured } from "@/lib/stripe";

/** A form value as a trimmed string, or undefined when it was never filled in. */
function text(value: FormDataEntryValue | FormDataEntryValue[] | undefined) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

/**
 * The language this booking is happening in.
 *
 * The form posts it as a hidden field carrying the page's own `[locale]` — a
 * server action gets no route params of its own, so that field is how the path
 * reaches here. It decides more than the error messages below: it is stored on
 * the booking, sets Stripe's checkout language, builds the `success_url` the
 * guest returns to, and is the language their confirmation email is written in.
 *
 * When the field is missing or unrecognised the referring URL answers the same
 * question — a form on `/en/reservar` was submitted from `/en/reservar` — which
 * is worth one header read to avoid quietly mailing a Portuguese confirmation
 * to somebody who booked in English.
 */
async function bookingLocale(field: unknown): Promise<Locale> {
  const raw = String(field ?? "");
  if (isLocale(raw)) return raw;

  const referer = (await headers()).get("referer");
  if (!referer) return defaultLocale;
  try {
    return localeFromPathname(new URL(referer).pathname);
  } catch {
    // A referer that isn't a URL. Nothing to learn from it.
    return defaultLocale;
  }
}

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<BookingCheckoutField, string>>;
  /**
   * What the guest had entered, echoed back on every failure path.
   *
   * Not a nicety. React resets an uncontrolled `<form action>` once the action
   * returns, so without this a rejected submission wipes the name, email,
   * phone and notes they just typed — on a phone, at the last step, with their
   * card already out. Nobody types all that twice.
   */
  values?: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    date?: string;
  };
};

/**
 * Which sentence a pricing refusal deserves, and next to which control.
 *
 * The browser disables the combinations the engine would refuse, so arriving
 * here means a stale page or a crafted request — but the sentence still has to
 * be true and still has to name a way forward.
 */
function pricingFailureState(
  failure: PricingFailure,
  locale: Locale,
): { field: BookingCheckoutField; message: string } | { message: string } {
  const c = bookingContent.errors;
  switch (failure.reason) {
    case "bad-party":
      return { field: "party", message: t(c.partySize, locale) };
    case "party-too-large":
      return { field: "party", message: t(c.groupTooLarge, locale) };
    case "min-adults":
      return { field: "party", message: t(c.minAdults, locale) };
    case "addons-not-allowed":
    case "addon-min-adults":
    case "addon-min-guests":
    case "addon-closed-day":
      return { field: "addOns", message: t(c.addOnUnavailable, locale) };
    case "unpriced":
    case "mode-unavailable":
      return { message: t(c.paymentsOff, locale) };
  }
}

/**
 * Take a booking to Stripe.
 *
 * The action's job is to be suspicious. Everything the browser sends is a
 * suggestion: the departure is re-checked against the live calendar and the
 * seats actually left, and **the price is not read from the form at all** — it
 * is computed here by the same engine the browser used for display
 * (`lib/pricing.ts`), from the catalogue rows. A hidden `total` input would be
 * the obvious way to build this and the obvious way to get robbed.
 *
 * Failures are localized and returned to the form. Success does not return: the
 * function redirects to Stripe, which means the `redirect()` call has to live
 * outside every `try`, because it works by throwing.
 *
 * The same two cheap abuse defences as the enquiry form — honeypot and per-IP
 * throttle — for a better reason than the enquiry form has: an unauthenticated
 * action that creates Stripe sessions in a loop is somebody else's API bill.
 */
export async function startCheckout(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const values = formValues(formData);
  const locale = await bookingLocale(values.locale);
  const c = bookingContent.errors;

  /** Echoed back on every failure path — see `CheckoutState.values`. */
  const entered = {
    name: text(values.name),
    email: text(values.email),
    phone: text(values.phone),
    message: text(values.message),
    date: text(values.date),
  };

  if (!isStripeConfigured()) {
    // Should be unreachable: the page only renders this form when payments are
    // switched on. Checked anyway, because "should be unreachable" and "cannot
    // happen" are different claims, and a deployment can lose its key.
    console.error("[checkout] refused — Stripe is not configured");
    return { error: t(c.paymentsOff, locale), values: entered };
  }

  const ip = await clientIp();

  // Honeypot: report nothing useful, do nothing at all.
  if (String(values[HONEYPOT_FIELD] ?? "").trim()) {
    console.warn(`[checkout] discarded honeypot submission from ${ip}`);
    return { error: t(c.generic, locale) };
  }

  const throttle = await rateLimit(`checkout:${ip}`, TOUR_REQUEST_RATE_LIMIT);
  if (!throttle.allowed) {
    return { error: t(c.rateLimited, locale), values: entered };
  }

  const parsed = bookingCheckoutSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: CheckoutState["fieldErrors"] = {};
    const flat = parsed.error.flatten().fieldErrors;
    if (flat.name) fieldErrors.name = t(c.name, locale);
    if (flat.email) fieldErrors.email = t(c.email, locale);
    if (flat.date || flat.slot) fieldErrors.date = t(c.chooseDate, locale);
    if (flat.adults) fieldErrors.party = t(c.partySize, locale);
    // A schema failure with no field we render an error against is a crafted
    // request, not a guest — one generic message rather than a shrug.
    return Object.keys(fieldErrors).length > 0
      ? { fieldErrors, values: entered }
      : { error: t(c.generic, locale), values: entered };
  }

  const booking = parsed.data;
  const party = {
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
  };
  const catalogue = await listExperiences();
  const bySlug = new Map(catalogue.map((entry) => [entry.slug, entry]));

  const experience = bySlug.get(booking.experience);
  if (!experience || experience.kind !== "signature") {
    console.error(`[checkout] refused unknown tour "${booking.experience}"`);
    return { error: t(c.generic, locale), values: entered };
  }
  const addOns = booking.addOns.map((slug) => bySlug.get(slug));
  if (addOns.some((entry) => !entry)) {
    console.error(`[checkout] refused a basket naming an unknown add-on`);
    return {
      fieldErrors: { addOns: t(c.addOnUnavailable, locale) },
      values: entered,
    };
  }
  const knownAddOns = addOns.filter((entry): entry is NonNullable<typeof entry> =>
    Boolean(entry),
  );

  const priced = priceBooking({
    tour: { slug: experience.slug, pricing: experience.pricing },
    addOns: knownAddOns.map((entry) => ({ slug: entry.slug, pricing: entry.pricing })),
    mode: booking.mode,
    party,
    date: booking.date,
  });

  if (!priced.ok) {
    // `unpriced` is a catalogue state, not the guest's fault or their problem
    // to solve — they are told the tour cannot be paid for online, and pointed
    // at the enquiry form. The rest are combinations the form disables, so
    // reaching them means a stale page: the message names the control to fix.
    console.error(`[checkout] refused to price a basket (${priced.reason})`);
    const state = pricingFailureState(priced, locale);
    return "field" in state
      ? { fieldErrors: { [state.field]: state.message }, values: entered }
      : { error: state.message, values: entered };
  }

  const check = await checkSlotAvailable({
    experienceSlug: experience.slug,
    date: booking.date,
    slot: booking.slot,
    seats: priced.seats,
    mode: booking.mode,
    occupancy: await slotOccupancyOn(experience.slug, booking.date, booking.slot),
  });

  if (!check.ok) {
    return {
      fieldErrors: {
        date: t(check.reason === "too-many" ? c.partyTooLarge : c.dayGone, locale),
      },
      values: entered,
    };
  }

  let url: string;
  try {
    const started = await startBookingCheckout({
      guest: {
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        message: booking.message,
        marketingConsent: booking.marketingConsent,
      },
      locale,
      date: booking.date,
      slot: booking.slot,
      mode: booking.mode,
      party,
      experience,
      addOns: knownAddOns,
      lines: priced.lines,
      totalCents: priced.totalCents,
    });
    url = started.url;
  } catch (err) {
    console.error("[checkout] could not start a Stripe session", err);
    return { error: t(c.generic, locale), values: entered };
  }

  // Outside the try: `redirect` signals by throwing, and catching it here would
  // turn a successful checkout into "something went wrong".
  redirect(url);
}
