import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { Section } from "@/components/section";
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
} from "@/lib/availability";
import { countBookedSeats } from "@/lib/bookings";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

/** See the note on the home page: the catalogue is editable, so this re-renders. */
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
 * Booking page.
 *
 * The date field is the live availability calendar: the days Diogo & Rita have
 * actually opened at `/admin/calendar`, with the sold-out ones already gone.
 * The hardcoded August 2026 grid with its invented busy days is not rendered
 * anywhere any more.
 *
 * Everything else is unchanged and deliberately so — the submission still lands
 * in `tour_requests` for the Sales board to triage, and payment (launch plan
 * Phase 2) is the next slice. This is also the shape the plan's fallback takes
 * if Stripe activation slips: slot-pick now, pay offline.
 *
 * When the calendar has nothing to offer — a fresh environment, an unreachable
 * database during a build, or simply a season nobody has opened — the read
 * returns no months and the form falls back to asking for a date in words. A
 * booking page that stops collecting leads because a table is empty would be a
 * worse failure than having no calendar at all.
 */
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

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = tourRequestContent;
  const [experiences, availability] = await Promise.all([
    listExperiences(),
    readPublicCalendar({ locale: l, bookedByDate: await bookedSeats() }),
  ]);

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t(c.note, l)}</p>
        </div>

        <div className="mt-10 max-w-2xl">
          <TourRequestForm
            locale={l}
            experiences={experiences}
            availability={availability}
          />
        </div>
      </Section>
    </>
  );
}
