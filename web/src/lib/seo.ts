import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { href, type RouteKey } from "@/lib/routes";

/**
 * Build canonical + hreflang alternates for a route. Because nested
 * generateMetadata replaces (not deep-merges) the `alternates` object, every
 * page must supply the full set — this keeps that in one place.
 */
export function alternates(
  locale: Locale,
  key: RouteKey,
  slug?: string,
): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = href(l, key, slug);
  languages["x-default"] = href("pt", key, slug);
  return { canonical: href(locale, key, slug), languages };
}
