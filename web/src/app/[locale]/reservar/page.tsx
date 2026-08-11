import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { Section } from "@/components/section";
import { TourRequestForm } from "@/components/tour-request-form";
import { listExperiences } from "@/lib/experience-catalogue";
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
 * Booking page. Until the availability calendar and Stripe checkout ship
 * (launch plan Phase 2), this is the tour-request form: a real submission that
 * lands in `tour_requests` for the admin Sales board to triage. The interactive
 * `BookingFlow` preview it replaced stays in the repo as the design reference
 * for that build.
 */
export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = tourRequestContent;
  const experiences = await listExperiences();

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
          <TourRequestForm locale={l} experiences={experiences} />
        </div>
      </Section>
    </>
  );
}
