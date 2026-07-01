import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { contact } from "@/content/pages";
import { site } from "@/content/site";
import { Section } from "@/components/section";
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
    title: t(contact.title, locale),
    description: t(contact.lead, locale),
    alternates: alternates(locale, "contactos"),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const dict = getDictionary(l);

  return (
    <>
      <JsonLd data={organizationJsonLd(l)} />
      <Section>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(contact.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(contact.lead, l)}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {site.contacts.map((c) => (
            <Card key={c.phone}>
              <CardContent>
                <div className="flex items-center gap-2 text-primary">
                  <Phone className="h-5 w-5" />
                  <span className="font-semibold">{c.name}</span>
                </div>
                <a href={`tel:${c.phone}`} className="mt-2 block text-lg hover:text-primary">
                  {c.phoneDisplay}
                </a>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent>
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">Email</span>
              </div>
              <a href={`mailto:${site.email}`} className="mt-2 block text-lg hover:text-primary">
                {site.email}
              </a>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent>
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <span className="font-semibold">{dict.labels.getInTouch}</span>
              </div>
              <p className="mt-2 text-lg text-muted-foreground">{site.region}</p>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
