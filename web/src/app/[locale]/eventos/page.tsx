import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { events } from "@/content/pages";
import { todayKey } from "@/lib/availability";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "@/components/section";
import { Media } from "@/components/media";
import { QuoteRequestForm } from "@/components/quote-request-form";
import { buttonVariants } from "@/components/ui/button";
import { alternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(events.title, locale),
    description: t(events.lead, locale),
    alternates: alternates(locale, "eventos"),
  };
}

/**
 * Hourly, for the same reason `/casamentos` is: the date field's `min` is today
 * in Portugal, and a floor baked at build time drifts a day further out of date
 * with every day the site is not redeployed.
 */
export const revalidate = 3600;

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const today = todayKey();

  return (
    <>
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">{t(events.title, l)}</h1>
            <p className="mt-6 text-lg text-muted-foreground">{t(events.lead, l)}</p>
            <div className="mt-6 space-y-4 text-lg text-muted-foreground">
              {t(events.body, l).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {/*
                A quote, not a checkout. This was a `BookingButton`, which
                dropped somebody asking about a corporate day or a birthday
                straight into the per-person tour checkout — the wrong prices,
                the wrong product, and no way to describe what they actually
                wanted; then, while the form was being built, it was the contact
                page. Now it is the form itself, further down this page.
              */}
              <a href="#orcamento" className={cn(buttonVariants({ size: "lg" }))}>
                {t(events.quote.labels.submit, l)}
              </a>
              <Link
                href={href(l, "casamentos")}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {l === "pt" ? "Casamentos em carros clássicos" : "Classic-car weddings"}
              </Link>
            </div>
          </div>
          <Media
            src="/images/weddings/fiat-600-front-with-bride-square.webp"
            label={
              l === "pt"
                ? "Fiat 600 clássico decorado com flores para um casamento"
                : "Classic Fiat 600 decorated with flowers for a wedding"
            }
            className="aspect-4/3 w-full"
          />
        </div>
      </Section>

      {/* Quote request — sends an `event` enquiry to the Sales board. */}
      <Section muted>
        <div className="scroll-mt-24" id="orcamento" />
        <div className="mx-auto max-w-2xl">
          <SectionHeading title={t(events.quote.title, l)} intro={t(events.quote.lead, l)} />
          <QuoteRequestForm locale={l} kind="event" copy={events.quote} today={today} />
        </div>
      </Section>
    </>
  );
}
