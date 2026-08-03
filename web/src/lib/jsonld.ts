import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import { site } from "@/content/site";
import type { Experience, Faq } from "@/content/experiences";
import { href } from "@/lib/routes";

type Json = Record<string, unknown>;

/**
 * Serialize a JSON-LD object for injection into a `<script>` element.
 *
 * The payload has to reach the document as script *content* rather than as
 * escaped text, which means `JSON.stringify` output lands in the HTML unparsed —
 * and an HTML parser inside a `<script>` stops at the first `</script` sequence
 * it sees, wherever that appears, including inside a JSON string. Everything
 * after it is then parsed as markup.
 *
 * Every source feeding this today is static content committed to this repo, so
 * this is not closing a live hole. It is here for what is coming:
 * `geo_content_drafts` and `blog_post_drafts` exist so pipeline output can be
 * published onto pages that ship JSON-LD (see `db/schema.ts`), and on the day a
 * heading written in the admin reaches this function, the difference between
 * escaping and not escaping is the difference between structured data and stored
 * XSS. It costs one pass over a string now; noticing later costs an incident.
 *
 * The escapes are all valid JSON and parse back to the original characters, so
 * Google and every other consumer read exactly the string that was intended.
 */
export function serializeJsonLd(item: Json): string {
  return (
    JSON.stringify(item)
      // Defuses `</script>`, and every other tag-open inside the payload.
      .replace(/</g, "\\u003c")
      // Valid inside a JSON string, but line terminators to a JavaScript parser —
      // and some consumers still parse these blocks as JS rather than as JSON.
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
  );
}

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
