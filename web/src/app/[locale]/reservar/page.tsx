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
  type DateKey,
  type PublicMonth,
} from "@/lib/availability";
import { countBookedSeats, isSellable } from "@/lib/bookings";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(tourRequestContent.title, locale),
    description: t(tourRequestContent.lead, locale),
    alternates: alternates(locale, "reservar"),
  };
}

/**
 * Seats already sold across the window the picker shows.
 *
 * Wrapped in a catch for the same reason `readPublicCalendar` is: this page is
 * built with no database in CI. An unreadable count is an *empty* map rather
 * than a failure, which means the grid falls back to showing raw capacity —
 * safe, because the server re-checks the day against live bookings before
 * anything is sold on it.
 */
async function bookedSeats(): Promise<Map<DateKey, number>> {
  const today = todayKey();
  const first = monthOf(today);
  try {
    return await countBookedSeats({
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

  const [experiences, availability]: [Awaited<ReturnType<typeof listExperiences>>, PublicMonth[]] =
    await Promise.all([
      listExperiences(),
      readPublicCalendar({ locale: l, bookedByDate: await bookedSeats() }),
    ]);

  const signature = experiences.find((entry) => entry.kind === "signature");
  const sellable = experiences.filter(isSellable);
  const canCheckout =
    isStripeConfigured() &&
    isSellable(signature) &&
    availability.some((month) => month.hasOpenings);

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
              // Only priced entries: an add-on with no price would render as a
              // free extra and then fail at the till.
              experiences={sellable}
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
