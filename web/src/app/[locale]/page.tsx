import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { home } from "@/content/pages";
import { experiences, signatureExperience } from "@/content/experiences";
import { classicCars } from "@/content/site";
import { Hero } from "@/components/hero";
import { Section, SectionHeading } from "@/components/section";
import { ExperienceCard } from "@/components/experience-card";
import { FaqList } from "@/components/faq";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, faqJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { alternates: alternates(locale, "home") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const dict = getDictionary(l);

  return (
    <>
      <JsonLd data={[organizationJsonLd(l), faqJsonLd(signatureExperience.faqs, l)!].filter(Boolean)} />

      <Hero
        eyebrow={t(home.heroEyebrow, l)}
        title={t(home.heroTitle, l)}
        subtitle={t(home.heroSubtitle, l)}
        videoSrc="/images/video.mp4"
        poster="/images/hero.png"
        posterAlt={l === "pt" ? "Grupo a descobrir a região Saloia ao pôr do sol" : "Group discovering the Saloia region at sunset"}
        cta={
          <>
            <BookingButton locale={l} label={dict.cta.book} />
            <a
              href={`#experiencias`}
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/40 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {dict.cta.viewExperiences}
            </a>
          </>
        }
      />

      {/* Classic cars strip */}
      <div className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 text-sm font-medium text-muted-foreground sm:px-6">
          {classicCars.map((car) => (
            <span key={car}>{car}</span>
          ))}
        </div>
      </div>

      {/* Intro */}
      <Section>
        <SectionHeading title={t(home.introTitle, l)} />
        <div className="mt-6 grid gap-6 text-lg text-muted-foreground md:grid-cols-2">
          {t(home.intro, l).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      {/* Experiences */}
      <Section muted className="scroll-mt-16" >
        <div id="experiencias" className="scroll-mt-24" />
        <SectionHeading
          eyebrow={t(home.experiencesEyebrow, l)}
          title={t(home.experiencesTitle, l)}
          intro={t(home.experiencesIntro, l)}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.slug} experience={exp} locale={l} learnMore={dict.cta.learnMore} />
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="max-w-3xl">
          <FaqList faqs={signatureExperience.faqs} locale={l} heading={dict.labels.faq} />
        </div>
      </Section>

      {/* Closing CTA */}
      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">{t(signatureExperience.title, l)}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t(signatureExperience.tagline, l)}</p>
          <div className="mt-8 flex justify-center gap-3">
            <BookingButton locale={l} label={dict.cta.bookExperience} item={signatureExperience.fareharborItem} />
          </div>
        </div>
      </Section>
    </>
  );
}
