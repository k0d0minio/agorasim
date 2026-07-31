import { locales, type Locale, type Localized } from "@/i18n/config";

/**
 * Route keys → path segment.
 *
 * Most segments are a single string kept in Portuguese for both locales, to
 * preserve the existing site's URLs and avoid duplicate content.
 *
 * A segment may instead be a `Localized<string>` where the page is new and has
 * no legacy URL to protect — `privacidade` / `privacy`. Each such route has one
 * `page.tsx` per segment, and each of those 404s for the locale it does not
 * belong to, so `/pt/privacy` never becomes a second copy of `/pt/privacidade`.
 */
export const segments = {
  home: "",
  sobre: "sobre",
  experiencias: "experiencias",
  eventos: "eventos",
  casamentos: "casamentos",
  blog: "blog",
  contactos: "contactos",
  reservar: "reservar",
  recomendar: "recomendar",
  privacidade: { pt: "privacidade", en: "privacy" } as Localized,
} as const;

export type RouteKey = keyof typeof segments;

/** The path segment `key` uses in `locale`. */
export function segmentFor(locale: Locale, key: RouteKey): string {
  const segment = segments[key];
  return typeof segment === "string" ? segment : segment[locale];
}

export function href(locale: Locale, key: RouteKey, slug?: string): string {
  const parts = [locale, segmentFor(locale, key), slug].filter((p) => p && p.length > 0);
  return "/" + parts.join("/");
}

/**
 * The locale a `privacidade`-style route folder belongs to, or `null` if this
 * segment is shared across locales. Lets a page 404 when it is reached under the
 * wrong locale.
 */
export function localeForSegment(key: RouteKey, segment: string): Locale | null {
  const configured = segments[key];
  if (typeof configured === "string") return null;
  return locales.find((locale) => configured[locale] === segment) ?? null;
}

/** Main navigation order. */
export const navOrder: RouteKey[] = [
  "sobre",
  "experiencias",
  "eventos",
  "casamentos",
  "blog",
  "reservar",
  "contactos",
];

/**
 * Routes that are live product surface today. Pages outside this list are
 * design previews still marked "in development" — they render, but stay out of
 * the sitemap and carry a noindex until their feature ships.
 */
export const liveKeys: RouteKey[] = [
  "home",
  "sobre",
  "experiencias",
  "eventos",
  "contactos",
  "reservar",
  "privacidade",
];
