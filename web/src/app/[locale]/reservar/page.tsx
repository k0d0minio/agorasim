import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { site } from "@/content/site";
import { Section } from "@/components/section";
import { TourRequestForm } from "@/components/tour-request-form";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

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

export default async function TourRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = tourRequestContent;

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {site.contacts.map((contact) => `${contact.name} ${contact.phoneDisplay}`).join(" · ")}
          </p>
        </div>

        <div className="mt-10 max-w-2xl">
          <TourRequestForm locale={l} />
        </div>
      </Section>
    </>
  );
}
