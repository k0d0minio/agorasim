import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/i18n/config";
import { about } from "@/content/pages";
import { classicCars } from "@/content/site";
import { Section, SectionHeading, Container } from "@/components/section";
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
  /** The car biographies, keyed the way the fleet tiles ask. */
  const carById = new Map(classicCars.map((car) => [car.id, car]));

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
            src="/images/rural-saloia/guests-under-olive-tree-hero.webp"
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

      <Section className="pt-0 sm:pt-0">
        <SectionHeading title={t(about.fleet.title, l)} />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {about.fleet.cars.map((tile) => {
            const car = carById.get(tile.id);
            if (!car) return null;
            return (
              <div
                key={tile.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <Media
                  src={tile.image}
                  label={t(tile.alt, l)}
                  position={tile.position}
                  rounded={false}
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="aspect-4/3 w-full"
                />
                <div className="p-5">
                  <h3 className="font-heading text-lg font-semibold">{car.name}</h3>
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
