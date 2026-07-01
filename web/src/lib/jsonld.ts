import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import { site } from "@/content/site";
import type { Experience, Faq } from "@/content/experiences";
import { href } from "@/lib/routes";

type Json = Record<string, unknown>;

/** Organization / business entity — reused as the publisher across the site. */
export function organizationJsonLd(locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${site.domain}/#organization`,
    name: site.name,
    url: `${site.domain}/${locale}`,
    email: site.email,
    description:
      locale === "pt"
        ? "Experiências rurais guiadas em carros clássicos na região Saloia, entre Sintra, Mafra e a Ericeira."
        : "Guided rural experiences in classic cars in the Saloia region, between Sintra, Mafra and Ericeira.",
    areaServed: site.region,
    telephone: site.contacts[0].phone,
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    sameAs: [site.social.instagram, site.social.facebook],
  };
}

export function experienceJsonLd(exp: Experience, locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: t(exp.title, locale),
    description: t(exp.summary, locale),
    url: `${site.domain}${href(locale, "experiencias", exp.slug)}`,
    touristType: locale === "pt" ? "Turismo cultural e rural" : "Cultural and rural tourism",
    provider: { "@id": `${site.domain}/#organization` },
    itinerary: t(exp.highlights, locale).map((name) => ({
      "@type": "TouristAttraction",
      name,
    })),
  };
}

export function faqJsonLd(faqs: Faq[], locale: Locale): Json | null {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: t(f.question, locale),
      acceptedAnswer: { "@type": "Answer", text: t(f.answer, locale) },
    })),
  };
}

export function breadcrumbJsonLd(
  locale: Locale,
  items: { name: string; url: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
