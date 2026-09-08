import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  complementsOf,
  listExperiences,
} from "@/lib/experience-catalogue";
import { fromPriceLabel } from "@/content/pricing";
import { Section, SectionHeading, Container } from "@/components/section";
import { ExperienceCard } from "@/components/experience-card";
import { Media } from "@/components/media";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { experienceJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";
import { href } from "@/lib/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "pt" ? "Experiências" : "Experiences";
  const catalogue = await listExperiences();
  const signatures = catalogue.filter((e) => e.kind === "signature");
  if (signatures.length === 0) return { title, alternates: alternates(locale, "experiencias") };
  const summaries = signatures.map((s) => t(s.summary, locale));
  const description = signatures.length === 1
    ? summaries[0]
    : locale === "pt"
      ? `${summaries[0]} — e também ${summaries[1]}.`
      : `${summaries[0]} — and also ${summaries[1]}.`;
  return { title, description, alternates: alternates(locale, "experiencias") };
}

/** See the note on the home page: the catalogue is editable, so this re-renders. */
export const revalidate = 3600;

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const dict = getDictionary(l);
  const catalogue = await listExperiences();
  const signatures = catalogue.filter((e) => e.kind === "signature");
  const complementExperiences = complementsOf(catalogue);

  if (signatures.length === 0) notFound();

  return (
    <>
      {signatures.map((tour) => (
        <JsonLd key={tour.slug} data={experienceJsonLd(tour, l)} />
      ))}

      {/* Every signature tour gets equal billing — full-width feature blocks
          with alternating image placement for visual variety. */}
      {signatures.map((tour, i) => {
        const price = fromPriceLabel(tour.pricing, l);
        const imageOnRight = i % 2 === 0;
        const imageBlock = (
          <Media src={tour.image} label={t(tour.imageAlt, l)} className="aspect-4/3 w-full" />
        );
        const contentBlock = (
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">{t(tour.title, l)}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t(tour.summary, l)}</p>
            <ul className="mt-6 space-y-2 text-muted-foreground">
              {t(tour.highlights, l).map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
            {price ? (
              <p className="mt-6 text-lg font-medium text-foreground">{price}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <BookingButton locale={l} label={dict.cta.bookExperience} tour={tour.slug} />
              <Link
                href={href(l, "experiencias", tour.slug)}
                className="inline-flex min-h-11 touch-manipulation items-center gap-1 self-center text-sm font-medium text-primary hover:underline"
              >
                {dict.cta.learnMore}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );

        return (
          <Section key={tour.slug}>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              {imageOnRight ? (
                <>
                  {contentBlock}
                  {imageBlock}
                </>
              ) : (
                <>
                  {imageBlock}
                  {contentBlock}
                </>
              )}
            </div>
          </Section>
        );
      })}

      {/* Add-ons — promoted out of the muted band, with price and a visible
          tie-in to each tour so they read as "compose your day", not an appendix. */}
      {complementExperiences.length > 0 ? (
        <Section>
          <SectionHeading
            eyebrow={dict.labels.complement}
            title={l === "pt" ? "Complementos à sua medida" : "Add-ons to make it yours"}
            intro={
              l === "pt"
                ? "Adicione um almoço, uma degustação ou uma visita ao seu passeio."
                : "Add a lunch, a tasting, or a visit to your tour."
            }
          />
          <Container className="mt-10 grid gap-6 px-0 sm:grid-cols-2 lg:grid-cols-4">
            {complementExperiences.map((exp) => (
              <ExperienceCard
                key={exp.slug}
                experience={exp}
                locale={l}
                learnMore={dict.cta.learnMore}
              />
            ))}
          </Container>
        </Section>
      ) : null}

      {/* Cross-links: each signature tour points to its complements so the
          guest sees them as part of composing that specific tour. */}
      {signatures.map((tour) => {
        const tourComplements = complementsOf(catalogue);
        if (tourComplements.length === 0) return null;
        return (
          <Section muted key={`${tour.slug}-crosslinks`}>
            <SectionHeading
              title={
                l === "pt"
                  ? `O que levar com ${t(tour.title, l)}`
                  : `Pair with ${t(tour.title, l)}`
              }
            />
            <Container className="mt-6 flex flex-wrap gap-3 px-0">
              {tourComplements.map((exp) => (
                <Link
                  key={exp.slug}
                  href={href(l, "experiencias", exp.slug)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
                >
                  {t(exp.title, l)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </Container>
          </Section>
        );
      })}
    </>
  );
}
