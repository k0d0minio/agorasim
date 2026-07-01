import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { about } from "@/content/pages";
import { Section, Container } from "@/components/section";
import { Media } from "@/components/media";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(about.title, locale),
    description: t(about.lead, locale),
    alternates: alternates(locale, "sobre"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">{t(about.title, l)}</h1>
            <p className="mt-6 text-lg text-muted-foreground">{t(about.lead, l)}</p>
          </div>
          <Media
            src="/images/hero.png"
            label={l === "pt" ? "Grupo a descobrir a região Saloia ao pôr do sol" : "Group discovering the Saloia region at sunset"}
            className="aspect-4/3 w-full"
          />
        </div>

        <div className="mt-14 grid gap-6 text-lg text-muted-foreground md:grid-cols-2">
          {t(about.body, l).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Section>

      <Section muted>
        <Container className="grid gap-6 sm:grid-cols-3">
          {t(about.values, l).map((v) => (
            <Card key={v.title}>
              <CardContent>
                <h3 className="text-xl font-semibold text-primary">{v.title}</h3>
                <p className="mt-2 text-muted-foreground">{v.text}</p>
              </CardContent>
            </Card>
          ))}
        </Container>
      </Section>
    </>
  );
}
