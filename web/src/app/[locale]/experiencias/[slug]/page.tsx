import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { experiences, getExperience } from "@/content/experiences";
import { site } from "@/content/site";
import { Section, Container } from "@/components/section";
import { Media } from "@/components/media";
import { Badge } from "@/components/ui/badge";
import { FaqList } from "@/components/faq";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { experienceJsonLd, faqJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";
import { href } from "@/lib/routes";

export function generateStaticParams() {
  return experiences.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const exp = getExperience(slug);
  if (!exp) return {};
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
  const exp = getExperience(slug);
  if (!exp) notFound();
  const dict = getDictionary(l);

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
              <BookingButton locale={l} label={dict.cta.bookExperience} item={exp.fareharborItem} />
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

        {exp.faqs.length > 0 && (
          <div className="mt-16 max-w-3xl">
            <FaqList faqs={exp.faqs} locale={l} heading={dict.labels.faq} />
          </div>
        )}
      </Section>
    </>
  );
}
