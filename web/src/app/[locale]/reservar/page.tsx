import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { Section } from "@/components/section";
import { BookingFlow } from "@/components/booking-flow";
import { listExperiences } from "@/lib/experience-catalogue";
import { InDevBanner } from "@/components/in-dev-banner";
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
    title: t(bookingContent.title, locale),
    description: t(bookingContent.lead, locale),
    alternates: alternates(locale, "reservar"),
  };
}

/** Instant-booking page (proposal Feature 3) — design preview until Stripe ships. */
export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = bookingContent;
  const experiences = await listExperiences();

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
        </div>

        <InDevBanner locale={l} body={c.inDev} className="mt-8" />

        <div className="mt-10">
          <BookingFlow locale={l} experiences={experiences} />
        </div>
      </Section>
    </>
  );
}
