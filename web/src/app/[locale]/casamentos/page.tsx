import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CarFront, Heart } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { weddingsContent } from "@/content/weddings";
import { Section, SectionHeading } from "@/components/section";
import { InDevBanner } from "@/components/in-dev-banner";
import { FaqList } from "@/components/faq";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, faqJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

/** Every field on this page is a disabled preview of the form still to come. */
const disabledClass = "disabled:opacity-70";

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
    // Preview page — keep out of the index until the feature ships.
    robots: { index: false, follow: false },
  };
}

/** Wedding-car-hire landing (proposal Feature 4) — design preview. */
export default async function WeddingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = weddingsContent;

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

        <InDevBanner locale={l} body={c.inDev} className="mt-10" />
      </Section>

      {/* How it works */}
      <Section>
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

      {/* Fleet */}
      <Section muted>
        <SectionHeading title={t(c.fleet.title, l)} intro={t(c.fleet.intro, l)} />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {c.fleet.cars.map((car) => (
            <div key={car.name} className="group overflow-hidden rounded-2xl border border-border bg-card">
              {car.image ? (
                <div className="relative aspect-4/3">
                  <Image
                    src={car.image}
                    alt={car.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 bg-secondary/50 text-muted-foreground">
                  <CarFront className="size-8" strokeWidth={1.5} />
                  <p className="text-xs">{t(c.fleet.photosSoon, l)}</p>
                </div>
              )}
              <div className="p-4">
                <p className="font-heading text-lg font-semibold">{car.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(car.note, l)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Quote request — design preview, submit disabled until the engine ships */}
      <Section>
        <div className="scroll-mt-24" id="orcamento" />
        <div className="mx-auto max-w-2xl">
          <SectionHeading title={t(c.quote.title, l)} intro={t(c.quote.lead, l)} />
          <form className="mt-8 flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-names">{t(c.quote.labels.names, l)}</Label>
                <Input id="wd-names" disabled className={disabledClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-email">{t(c.quote.labels.email, l)}</Label>
                <Input id="wd-email" type="email" disabled className={disabledClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-phone">{t(c.quote.labels.phone, l)}</Label>
                <Input id="wd-phone" type="tel" disabled className={disabledClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-date">{t(c.quote.labels.date, l)}</Label>
                <Input id="wd-date" type="date" disabled className={disabledClass} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="wd-venue">{t(c.quote.labels.venue, l)}</Label>
                <Input
                  id="wd-venue"
                  disabled
                  placeholder={t(c.quote.labels.venuePlaceholder, l)}
                  className={disabledClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-hours">{t(c.quote.labels.hours, l)}</Label>
                <Select id="wd-hours" disabled className={disabledClass}>
                  {t(c.quote.labels.hoursOptions, l).map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wd-car">{t(c.quote.labels.car, l)}</Label>
                <Select id="wd-car" disabled className={disabledClass}>
                  <option>{t(c.quote.labels.carNone, l)}</option>
                  {c.fleet.cars.map((car) => (
                    <option key={car.name}>{car.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd-message">{t(c.quote.labels.message, l)}</Label>
              <Textarea
                id="wd-message"
                rows={4}
                disabled
                placeholder={t(c.quote.labels.messagePlaceholder, l)}
                className={disabledClass}
              />
            </div>
            <div>
              <Button type="button" size="lg" disabled>
                {t(c.quote.labels.submit, l)}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">{t(c.quote.labels.soon, l)}</p>
            </div>
          </form>
        </div>
      </Section>

      {/* FAQ */}
      <Section muted>
        <div className="max-w-3xl">
          <FaqList faqs={[...c.faqs]} locale={l} heading={t(c.faqTitle, l)} />
        </div>
      </Section>
    </>
  );
}
