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
 * The whole question this route turns on, asked once per request.
 *
 * Both the page and its metadata need the answer, and asking twice would mean
 * two catalogue reads and two passes over the calendar for one render — so it
 * is memoised for the render that needs it. See {@link BookingPage} for what
 * the three conditions mean.
 */
const bookingPageState = cache(async (locale: Locale) => {
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

/**
 * The title has to describe the page that actually renders.
 *
 * This route is two pages behind one URL — a checkout when everything needed to
 * take money is in place, an enquiry form otherwise — and the metadata used to
 * say "request an experience" either way. A search result promising a form to
 * fill in, opening on a card payment, is the kind of mismatch that reads as the
 * wrong page and is answered with the back button.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { canCheckout } = await bookingPageState(locale);
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

  const { experiences, availability, canCheckout } = await bookingPageState(l);

  const c = canCheckout ? bookingContent : tourRequestContent;

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
          {canCheckout ? null : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t(tourRequestContent.note, l)}
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
