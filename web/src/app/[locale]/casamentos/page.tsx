import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CarFront, Check, Heart } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { weddingsContent } from "@/content/weddings";
import { fleet } from "@/content/site";
import { Section, SectionHeading } from "@/components/section";
import { FaqList } from "@/components/faq";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WeddingQuoteForm } from "@/components/wedding-quote-form";
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
  return {
    title: t(weddingsContent.title, locale),
    description: t(weddingsContent.lead, locale),
    alternates: alternates(locale, "casamentos"),
  };
}

/**
 * Wedding-car-hire landing — live since AGORA-005, with Diogo & Rita's real
 * offer and a working quote form. Each fleet card joins the wedding copy with
 * the car's own name, year and story from `content/site.ts`.
 */
export default async function WeddingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = weddingsContent;

  const carBySlug = new Map(fleet.map((car) => [car.model, car]));

  return (
    <>
      <JsonLd data={[organizationJsonLd(l), faqJsonLd([...c.faqs], l)!].filter(Boolean)} />

      {/* Romantic hero */}
      <Section className="pb-0">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold tracking-wider text-primary uppercase">
              <Heart className="size-3.5" />
              {l === "pt" ? "Casamentos & eventos" : "Weddings & events"}
            </p>
            <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
            <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
            <div className="mt-6 space-y-4 text-muted-foreground">
              {t(c.intro, l).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8">
              <Button asChild size="lg">
                <a href="#orcamento">{t(c.quote.labels.submit, l)}</a>
              </Button>
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
            <Image
              src="/images/front-of-car.webp"
              alt={
                l === "pt"
                  ? "Citroën 2CV decorado com flores a chegar a um casamento"
                  : "Citroën 2CV decorated with flowers arriving at a wedding"
              }
              fill
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Wedding Awards — five consecutive years, worn quietly. */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-8">
          <p className="text-sm font-medium text-muted-foreground">{t(c.awards.title, l)}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {c.awards.years.map((year) => (
              <Image
                key={year}
                src={`/images/wedding-awards/${year}.jpg`}
                alt={`${t(c.awards.alt, l)} ${year}`}
                width={72}
                height={72}
                className="size-16 rounded-full object-contain sm:size-18"
              />
            ))}
          </div>
        </div>
      </Section>

      {/* What's included */}
      <Section>
        <SectionHeading title={t(c.offer.title, l)} />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {c.offer.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Check className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>{t(item, l)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* How it works */}
      <Section muted>
        <SectionHeading title={t(c.howItWorks.title, l)} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {c.howItWorks.steps.map((step, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="mt-3 font-heading text-lg font-semibold">{t(step.title, l)}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(step.body, l)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Fleet — the cars by name, with their stories. */}
      <Section>
        <SectionHeading title={t(c.fleet.title, l)} intro={t(c.fleet.intro, l)} />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {c.fleet.cars.map((entry) => {
            const car = carBySlug.get(entry.model);
            return (
              <div
                key={entry.model}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
              >
                {entry.image ? (
                  <div className="relative aspect-4/3">
                    <Image
                      src={entry.image}
                      alt={car ? `${car.name} — ${entry.model}` : entry.model}
                      fill
                      sizes="(max-width: 640px) 100vw, 480px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 bg-secondary/50 text-muted-foreground">
                    <CarFront className="size-8" strokeWidth={1.5} />
                    <p className="text-xs">{t(c.fleet.photosSoon, l)}</p>
                  </div>
                )}
                <div className="p-5">
                  <p className="font-heading text-lg font-semibold">
                    {car ? car.name : entry.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.model}
                    {car ? ` · ${car.year}` : ""}
                  </p>
                  {car ? (
                    <p className="mt-2 text-sm text-muted-foreground">{t(car.story, l)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Quote request — live. */}
      <Section muted>
        <div className="scroll-mt-24" id="orcamento" />
        <div className="mx-auto max-w-2xl">
          <SectionHeading title={t(c.quote.title, l)} intro={t(c.quote.lead, l)} />
          <WeddingQuoteForm locale={l} />
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="max-w-3xl">
          <FaqList faqs={[...c.faqs]} locale={l} heading={t(c.faqTitle, l)} />
        </div>
      </Section>
    </>
  );
}
