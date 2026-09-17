import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, Heart } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { weddingsContent } from "@/content/weddings";
import { classicCars } from "@/content/site";
import { todayKey } from "@/lib/availability";
import { Section, SectionHeading } from "@/components/section";
import { FaqList } from "@/components/faq";
import { QuoteRequestForm } from "@/components/quote-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
 * The page is otherwise static, but the wedding-date field's `min` is *today in
 * Portugal* — baked at build time it would drift a day further out of date with
 * every day the site is not redeployed. Re-rendering hourly keeps the floor
 * honest, exactly as `/reservar` does with the same clock.
 */
export const revalidate = 3600;

/**
 * Wedding-car-hire landing (proposal Feature 4) — Diogo & Rita's real offer,
 * with each car introduced by the name it answers to. The quote form sends for
 * real (`kind: "wedding"` into the Sales board), which is what took the page
 * off its `noindex` and into `liveKeys`.
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

  /** The car biographies, keyed the way the fleet tiles and the picker ask. */
  const carById = new Map(classicCars.map((car) => [car.id, car]));
  /** No wedding was ever in the past — the date field's floor says so. */
  const today = todayKey();

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
              src="/images/weddings/2cv-front-at-quinta-square.webp"
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
          {c.fleet.cars.map((tile) => {
            const car = carById.get(tile.id);
            if (!car) return null;
            return (
              <div
                key={tile.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-4/3">
                  <Image
                    src={tile.image}
                    alt={`${car.name} — ${car.model}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5">
                  <p className="font-heading text-lg font-semibold">{car.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {car.model} · {car.year}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{t(car.story, l)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Quote request — sends a `wedding` enquiry to the Sales board. */}
      <Section muted>
        <div className="scroll-mt-24" id="orcamento" />
        <div className="mx-auto max-w-2xl">
          <SectionHeading title={t(c.quote.title, l)} intro={t(c.quote.lead, l)} />
          <QuoteRequestForm locale={l} kind="wedding" copy={c.quote} today={today} />
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
