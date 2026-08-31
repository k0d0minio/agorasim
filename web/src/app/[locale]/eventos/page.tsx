import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { events } from "@/content/pages";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Section } from "@/components/section";
import { Media } from "@/components/media";
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

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const dict = getDictionary(l);

  return (
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
              To the contact page, not into the checkout.

              An event is a quote — a date, a fleet, a venue — and this button
              used to open the tour booking form, where the first thing an
              event enquirer met was a per-person price for a countryside tour
              they had not asked about. It goes back to the paid flow when
              there is a quote flow to go to (see `.icm/intake/quote-flow`).
            */}
            <Link
              href={href(l, "contactos")}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              {dict.cta.contactUs}
            </Link>
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
          label={l === "pt" ? "Fiat 600 clássico decorado com flores para um casamento" : "Classic Fiat 600 decorated with flowers for a wedding"}
          className="aspect-4/3 w-full"
        />
      </div>
    </Section>
  );
}
