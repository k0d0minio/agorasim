import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import { site } from "@/content/site";
import type { Experience, Faq } from "@/content/experiences";
import { blogContent } from "@/content/blog";
import type { BlogPost } from "@/lib/blog-posts";
import { priceRange } from "@/lib/pricing";
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
    ...offersOf(exp, locale),
  };
}

/**
 * The price range, as structured data — the same figures the page's tables
 * render, from the same catalogue field.
 *
 * An `AggregateOffer` rather than a single `Offer` because the tour genuinely
 * has many: the countryside route runs from €58 a head on a per-person booking
 * to €700 for twelve adults in private, and quoting either end alone would
 * misstate the offer. An experience with no price list contributes no `offers`
 * key at all — an empty or zeroed offer would be a claim, and silence is the
 * honest answer while the enquiry form is what sells it.
 */
function offersOf(exp: Experience, locale: Locale): Json {
  const range = priceRange(exp.pricing);
  if (!range) return {};

  return {
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: range.lowCents / 100,
      highPrice: range.highCents / 100,
      availability: "https://schema.org/InStock",
      url: `${site.domain}${href(locale, "reservar")}`,
    },
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

/**
 * One article, as `Article`.
 *
 * The two dates are the whole reason `published_at` exists as a column
 * separate from `date_modified`: generative engines lean on freshness, and a
 * `dateModified` that merely repeated `datePublished` would be a signal that
 * says nothing. Both are days rather than instants — the blog is dated to the
 * day everywhere a reader sees it, and claiming a timestamp we do not show is
 * precision we have not earned.
 *
 * `author` is the business, not a person. Diogo & Rita are the voice and the
 * pipeline is the hand; naming either a `Person` would be a claim about a
 * byline the site does not carry.
 */
export function articleJsonLd(post: BlogPost, locale: Locale): Json {
  const url = `${site.domain}${href(locale, "blog", post.slug)}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: t(post.title, locale),
    description: t(post.excerpt, locale),
    url,
    mainEntityOfPage: url,
    inLanguage: locale === "pt" ? "pt-PT" : "en-GB",
    ...(post.publishedOn ? { datePublished: post.publishedOn } : {}),
    ...(post.updatedOn ? { dateModified: post.updatedOn } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags } : {}),
    // Only an image the site actually renders — one without alt text is
    // dropped by the page, and structured data must not claim otherwise.
    ...(post.heroImage && post.heroImageAlt
      ? { image: `${site.domain}${post.heroImage}` }
      : {}),
    author: { "@id": `${site.domain}/#organization` },
    publisher: { "@id": `${site.domain}/#organization` },
    // What every article is ultimately about, and the thing this site sells.
    about: { "@id": `${site.domain}/#organization` },
  };
}

/**
 * The blog itself, with its articles listed — what a generative engine reads to
 * learn the section exists and what is in it.
 *
 * Only emitted when there are posts: a `Blog` with an empty `blogPost` array is
 * a claim about a section that has no pages.
 */
export function blogJsonLd(posts: BlogPost[], locale: Locale): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${site.domain}${href(locale, "blog")}#blog`,
    name: t(blogContent.title, locale),
    description: t(blogContent.lead, locale),
    url: `${site.domain}${href(locale, "blog")}`,
    inLanguage: locale === "pt" ? "pt-PT" : "en-GB",
    publisher: { "@id": `${site.domain}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: t(post.title, locale),
      url: `${site.domain}${href(locale, "blog", post.slug)}`,
      ...(post.publishedOn ? { datePublished: post.publishedOn } : {}),
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
