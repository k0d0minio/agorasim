"use server";

import { redirect } from "next/navigation";

import { bookingContent } from "@/content/booking";
import { isLocale, t, type Locale } from "@/i18n/config";
import { checkDayAvailable } from "@/lib/availability";
import { startBookingCheckout } from "@/lib/booking-checkout";
import { countBookedSeatsOn, quote } from "@/lib/bookings";
import { listExperiences } from "@/lib/experience-catalogue";
import { bookingCheckoutSchema, formValues, type BookingCheckoutField } from "@/lib/form-schemas";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isStripeConfigured } from "@/lib/stripe";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<BookingCheckoutField, string>>;
};

/**
 * Take a booking to Stripe.
 *
 * The action's job is to be suspicious. Everything the browser sends is a
 * suggestion: the date is re-checked against the live calendar, the party is
 * re-checked against the seats actually left, and **the price is not read from
 * the form at all** — it is computed here from the catalogue rows. A hidden
 * `total` input would be the obvious way to build this and the obvious way to
 * get robbed.
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
  const localeRaw = String(values.locale ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = bookingContent.errors;

  if (!isStripeConfigured()) {
    // Should be unreachable: the page only renders this form when payments are
    // switched on. Checked anyway, because "should be unreachable" and "cannot
    // happen" are different claims, and a deployment can lose its key.
    console.error("[checkout] refused — Stripe is not configured");
    return { error: t(c.paymentsOff, locale) };
  }

  const ip = await clientIp();

  // Honeypot: report nothing useful, do nothing at all.
  if (String(values[HONEYPOT_FIELD] ?? "").trim()) {
    console.warn(`[checkout] discarded honeypot submission from ${ip}`);
    return { error: t(c.generic, locale) };
  }

  const throttle = await rateLimit(`checkout:${ip}`, TOUR_REQUEST_RATE_LIMIT);
  if (!throttle.allowed) {
    return { error: t(c.rateLimited, locale) };
  }

  const parsed = bookingCheckoutSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: CheckoutState["fieldErrors"] = {};
    const flat = parsed.error.flatten().fieldErrors;
    if (flat.name) fieldErrors.name = t(c.name, locale);
    if (flat.email) fieldErrors.email = t(c.email, locale);
    if (flat.date) fieldErrors.date = t(c.chooseDate, locale);
    if (flat.partySize) fieldErrors.partySize = t(c.partySize, locale);
    // A schema failure with no field we render an error against is a crafted
    // request, not a guest — one generic message rather than a shrug.
    return Object.keys(fieldErrors).length > 0
      ? { fieldErrors }
      : { error: t(c.generic, locale) };
  }

  const booking = parsed.data;
  const catalogue = await listExperiences();
  const bySlug = new Map(catalogue.map((entry) => [entry.slug, entry]));

  const experience = bySlug.get(booking.experience);
  const addOns = booking.addOns.map((slug) => bySlug.get(slug));

  const priced = quote({
    experience,
    addOns,
    partySize: booking.partySize,
    requested: { experience: booking.experience, addOns: booking.addOns },
  });

  if (!priced.ok) {
    // `unpriced` is the state the whole catalogue is in until AGORA-002 lands,
    // and it is not the guest's fault or their problem to solve — they are told
    // the tour cannot be paid for online, and pointed at the enquiry form.
    console.error(
      `[checkout] refused to price a basket (${priced.reason}${
        "slug" in priced ? `: ${priced.slug}` : ""
      })`,
    );
    return {
      error: t(priced.reason === "unpriced" ? c.paymentsOff : c.generic, locale),
    };
  }

  const check = await checkDayAvailable({
    date: booking.date,
    partySize: booking.partySize,
    booked: await countBookedSeatsOn(booking.date),
  });

  if (!check.ok) {
    return {
      fieldErrors: {
        date: t(check.reason === "too-many" ? c.partyTooLarge : c.dayGone, locale),
      },
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
      experience: experience!,
      addOns: addOns.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      partySize: booking.partySize,
      items: priced.items,
      totalCents: priced.totalCents,
    });
    url = started.url;
  } catch (err) {
    console.error("[checkout] could not start a Stripe session", err);
    return { error: t(c.generic, locale) };
  }

  // Outside the try: `redirect` signals by throwing, and catching it here would
  // turn a successful checkout into "something went wrong".
  redirect(url);
}
