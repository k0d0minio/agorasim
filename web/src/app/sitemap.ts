import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";
import { site } from "@/content/site";
import { experiences } from "@/content/experiences";
import { href, liveKeys, type RouteKey } from "@/lib/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Only live routes are listed — in-development preview pages (blog,
  // casamentos, recomendar) stay noindexed until their feature ships.
  const staticKeys: RouteKey[] = liveKeys;

  function alternates(path: (locale: (typeof locales)[number]) => string) {
    const languages = Object.fromEntries(
      locales.map((l) => [l, `${site.domain}${path(l)}`]),
    );
    return { languages };
  }

  const staticEntries: MetadataRoute.Sitemap = staticKeys.map((key) => ({
    url: `${site.domain}${href(defaultLocale, key)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: key === "home" ? 1 : 0.8,
    alternates: alternates((l) => href(l, key)),
  }));

  const experienceEntries: MetadataRoute.Sitemap = experiences.map((exp) => ({
    url: `${site.domain}${href(defaultLocale, "experiencias", exp.slug)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: exp.kind === "signature" ? 0.9 : 0.7,
    alternates: alternates((l) => href(l, "experiencias", exp.slug)),
  }));

  return [...staticEntries, ...experienceEntries];
}
