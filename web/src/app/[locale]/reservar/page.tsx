import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { tourRequestContent } from "@/content/tour-request";
import { Section } from "@/components/section";
import { BookingCheckoutForm } from "@/components/booking-checkout-form";
import { TourRequestForm } from "@/components/tour-request-form";
import { listExperiences } from "@/lib/experience-catalogue";
import {
  monthBounds,
  monthOf,
  addMonths,
  todayKey,
  PUBLIC_CALENDAR_MONTHS,
  readPublicCalendar,
  type OccupancyMap,
} from "@/lib/availability";
import { countSlotOccupancy } from "@/lib/bookings";
import { isPriced } from "@/lib/pricing";
import { isStripeConfigured, isTestMode } from "@/lib/stripe";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

/**
 * Cached like the rest of the public site — the catalogue and the calendar both
 * change, and both revalidate the whole layout when they do (see the admin
 * actions), so the hour is a backstop rather than the mechanism.
 *
 * Nothing on this page is per-guest. The Stripe session is created by a server
 * action on submit, and the confirmation lives on its own dynamic route.
 */
export const revalidate = 3600;

/**
 * Everything both the metadata and the page need, read once.
 *
 * `cache` is what makes that true: Next runs `generateMetadata` and the page
 * component in the same render, and without it each would open the catalogue
 * and count the calendar for itself. It also means the title can never
 * describe a different branch from the one that renders — the two now decide
 * from the same answer rather than from two reads that could disagree.
 */
const bookingPage = cache(async (locale: Locale) => {
  const experiences = await listExperiences();
  const tours = experiences.filter(
    (entry) => entry.kind === "signature" && isPriced(entry.pricing),
  );

  // One calendar for every tour, with what is already committed folded in.
  const availability = await readPublicCalendar({
    locale,
    occupancy: await committedCapacity(),
  });

  const anyOpenings = availability.some((month) => month.hasOpenings);

  return {
    experiences,
    availability,
    canCheckout: isStripeConfigured() && tours.length > 0 && anyOpenings,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  /*
   * The same branch the page renders, not a guess about it.
   *
   * This used to say "Request an experience" unconditionally, which is the
   * title of the *fallback*. With payments on, the search result, the browser
   * tab and every social card promised an enquiry form to people the page then
   * asked for a card — the one description a booking page cannot afford to get
   * wrong. `bookingPage` is `cache`d, so asking here costs no second read.
   */
  const { canCheckout } = await bookingPage(locale);
  const c = canCheckout ? bookingContent : tourRequestContent;
  return {
    title: t(c.title, locale),
    description: t(c.lead, locale),
    alternates: alternates(locale, "reservar"),
  };
}

/**
 * What is already committed across the window the picker shows.
 *
 * One count for the whole business, not one per tour: drivers and cars are
 * shared (AGORA-012), so a booking on either route is a booking against the
 * same pools.
 *
 * Wrapped in a catch for the same reason `readPublicCalendar` is: this page is
 * built with no database in CI. An unreadable count is an *empty* map rather
 * than a failure, which means the grid falls back to showing the full fleet —
 * safe, because the server re-checks the departure against live bookings
 * before anything is sold on it.
 */
async function committedCapacity(): Promise<OccupancyMap> {
  const today = todayKey();
  const first = monthOf(today);
  try {
    return await countSlotOccupancy({
      from: monthBounds(first).first,
      to: monthBounds(addMonths(first, PUBLIC_CALENDAR_MONTHS - 1)).last,
    });
  } catch {
    return new Map();
  }
}

/**
 * Booking page — checkout when everything needed to take money is in place,
 * the enquiry form otherwise.
 *
 * Three conditions have to hold before this page will sell anything, and each
 * one is a real state this project passes through:
 *
 * 1. **Stripe is configured.** The launch plan's biggest external risk is
 *    activation slipping past the window, and its documented fallback is
 *    slot-pick with payment offline. That fallback is not a revert — it is this
 *    deployment with no `STRIPE_SECRET_KEY`, and this branch is where it lives.
 * 2. **The tour has a price.** Real prices are AGORA-002, still blocked on
 *    Diogo & Rita's answers, so today every entry is unpriced and this is the
 *    branch that runs. An unpriced tour is unsellable rather than free.
 * 3. **Some day is open.** A calendar with nothing on it can only say no; the
 *    enquiry form can still take the lead and arrange it by hand.
 *
 * Falling back is not a degraded page. It is the form that has been capturing
 * leads since AGORA-001, now with a real date picker on it.
 */
export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  const { experiences, availability, canCheckout } = await bookingPage(l);

  const c = canCheckout ? bookingContent : tourRequestContent;

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
          {canCheckout ? null : (
            /*
             * Whichever of the three conditions failed, what is true for the
             * guest is the same sentence: no online payment on this visit, the
             * request still reaches the team. Never "being built" — after
             * go-live that would be a false statement about money.
             */
            <p className="mt-3 text-sm text-muted-foreground">
              {t(bookingContent.errors.paymentsOff, l)}
            </p>
          )}
        </div>

        <div className="mt-10">
          {canCheckout ? (
            <BookingCheckoutForm
              locale={l}
              experiences={experiences}
              availability={availability}
              testMode={isTestMode()}
            />
          ) : (
            <div className="max-w-2xl">
              <TourRequestForm
                locale={l}
                experiences={experiences}
                availability={availability}
              />
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
