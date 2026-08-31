import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  complementsOf,
  getCatalogueEntry,
  listExperiences,
  signatureOf,
} from "@/lib/experience-catalogue";
import { site } from "@/content/site";
import { Section, Container } from "@/components/section";
import { Media } from "@/components/media";
import { Badge } from "@/components/ui/badge";
import { FaqList } from "@/components/faq";
import { ExperiencePrices } from "@/components/experience-pricing";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { experienceJsonLd, faqJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";
import { href } from "@/lib/routes";

/**
 * The slugs known at build time. Experiences added from the admin afterwards are
 * not in this list and are rendered on demand instead (`dynamicParams` defaults
 * to true) — a new add-on is live without a deploy.
 */
export async function generateStaticParams() {
  return (await listExperiences()).map((e) => ({ slug: e.slug }));
}

/** See the note on the home page: the catalogue is editable, so this re-renders. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const exp = await getCatalogueEntry(slug);
  if (!exp || !exp.active) return {};
  return {
    title: t(exp.title, locale),
    description: t(exp.summary, locale),
    alternates: alternates(locale, "experiencias", slug),
  };
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  // Archived entries leave the website: the slug stays resolvable in the admin,
  // but a guest following an old link gets a 404 rather than an offer that is
  // no longer sold.
  const exp = await getCatalogueEntry(slug);
  if (!exp || !exp.active) notFound();
  const dict = getDictionary(l);

  /*
   * The pricing section needs the rest of the catalogue twice over: a tour
   * whose private departures take add-ons lists them with their prices, and an
   * add-on names the tour it can only be bought with. Nothing else on this page
   * does, so the read only happens for the entries that use it.
   */
  const needsCatalogue =
    exp.pricing?.type === "addon" ||
    (exp.pricing?.type === "tour" && exp.pricing.private?.allowsAddOns === true);
  const catalogue = needsCatalogue ? await listExperiences() : [];
  const signature = signatureOf(catalogue);

  const breadcrumb = breadcrumbJsonLd(l, [
    { name: site.name, url: `${site.domain}${href(l, "home")}` },
    { name: dict.nav.experiencias, url: `${site.domain}${href(l, "experiencias")}` },
    { name: t(exp.title, l), url: `${site.domain}${href(l, "experiencias", exp.slug)}` },
  ]);
  const faq = faqJsonLd(exp.faqs, l);

  return (
    <>
      <JsonLd data={[experienceJsonLd(exp, l), breadcrumb, ...(faq ? [faq] : [])]} />

      {/* Breadcrumb */}
      <Container className="pt-8">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href={href(l, "experiencias")} className="hover:text-primary">
            {dict.nav.experiencias}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{t(exp.title, l)}</span>
        </nav>
      </Container>

      <Section className="pt-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="gap-1 font-normal">
              <Clock className="h-3 w-3" />
              {t(exp.duration, l)}
            </Badge>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{t(exp.title, l)}</h1>
            <p className="mt-3 text-lg text-primary">{t(exp.tagline, l)}</p>
            {/* Answer-first summary for GEO */}
            <p className="mt-6 text-lg text-muted-foreground">{t(exp.summary, l)}</p>
            <div className="mt-8">
              {/*
                Carries this page's tour into the checkout. Only for a tour:
                an add-on is bought as part of a private departure, not on its
                own, so its page still opens the booking form on the default.
              */}
              <BookingButton
                locale={l}
                label={dict.cta.bookExperience}
                tour={exp.kind === "signature" ? exp.slug : undefined}
              />
            </div>
          </div>
          <Media src={exp.image} label={t(exp.imageAlt, l)} priority className="aspect-4/3 w-full" />
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5 text-lg text-muted-foreground">
            {t(exp.description, l).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <aside>
            <h2 className="text-lg font-semibold text-foreground">{dict.labels.highlights}</h2>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {t(exp.highlights, l).map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* The real price list, from the same data the checkout charges from. */}
        <div className="mt-16">
          <ExperiencePrices
            experience={exp}
            addOns={complementsOf(catalogue)}
            signatureTitle={signature ? t(signature.title, l) : undefined}
            locale={l}
          />
        </div>

        {exp.faqs.length > 0 && (
          <div className="mt-16 max-w-3xl">
            <FaqList faqs={exp.faqs} locale={l} heading={dict.labels.faq} />
          </div>
        )}
      </Section>
    </>
  );
}
