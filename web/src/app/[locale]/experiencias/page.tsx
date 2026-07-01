import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { signatureExperience, complementExperiences } from "@/content/experiences";
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
  const description = t(signatureExperience.summary, locale);
  return { title, description, alternates: alternates(locale, "experiencias") };
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const dict = getDictionary(l);
  const sig = signatureExperience;

  return (
    <>
      <JsonLd data={experienceJsonLd(sig, l)} />

      {/* Signature experience feature */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {l === "pt" ? "Experiência principal" : "Signature experience"}
            </p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{t(sig.title, l)}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t(sig.summary, l)}</p>
            <ul className="mt-6 space-y-2 text-muted-foreground">
              {t(sig.highlights, l).map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <BookingButton locale={l} label={dict.cta.bookExperience} item={sig.fareharborItem} />
              <Link
                href={href(l, "experiencias", sig.slug)}
                className="inline-flex items-center gap-1 self-center text-sm font-medium text-primary hover:underline"
              >
                {dict.cta.learnMore}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <Media src={sig.image} label={t(sig.imageAlt, l)} className="aspect-4/3 w-full" />
        </div>
      </Section>

      {/* Complements */}
      <Section muted>
        <SectionHeading
          eyebrow={dict.labels.complement}
          title={l === "pt" ? "Complementos à sua medida" : "Add-ons to make it yours"}
        />
        <Container className="mt-10 grid gap-6 px-0 sm:grid-cols-2 lg:grid-cols-4">
          {complementExperiences.map((exp) => (
            <ExperienceCard key={exp.slug} experience={exp} locale={l} learnMore={dict.cta.learnMore} />
          ))}
        </Container>
      </Section>
    </>
  );
}
