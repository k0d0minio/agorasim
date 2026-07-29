import type { Locale } from "@/i18n/config";

/** Route keys → localized path segment. Segments are kept in Portuguese for both
 *  locales to preserve the existing site's URLs and avoid duplicate content. */
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
} as const;

export type RouteKey = keyof typeof segments;

export function href(locale: Locale, key: RouteKey, slug?: string): string {
  const seg = segments[key];
  const parts = [locale, seg, slug].filter((p) => p && p.length > 0);
  return "/" + parts.join("/");
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
export const liveKeys: RouteKey[] = ["home", "sobre", "experiencias", "eventos", "contactos", "reservar"];
