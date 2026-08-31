import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";
import { site } from "@/content/site";
import { listExperiences } from "@/lib/experience-catalogue";
import { listPublishedPosts } from "@/lib/blog-posts";
import { href, liveKeys, type RouteKey } from "@/lib/routes";

/**
 * Rebuilt on the same hourly cadence as the pages it lists.
 *
 * Without this the file would be written once at build time — with, at that
 * moment, no `DATABASE_URL` and therefore no articles — and would never learn
 * about a post published afterwards. The publish path exists precisely so that
 * going live needs no deploy; a sitemap frozen at build time would quietly
 * exempt itself from that.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const posts = await listPublishedPosts();

  /*
   * Live routes only — in-development preview pages (casamentos) stay
   * noindexed until their feature ships.
   *
   * The blog is the one route whose liveness is not a property of the code: it
   * is live once Diogo & Rita have published an article, and until then it is
   * an empty page carrying a `noindex` (see `app/[locale]/blog/page.tsx`).
   * Listing it before then would ask Google to index a page that refuses to be.
   */
  const staticKeys: RouteKey[] =
    posts.length > 0 ? [...liveKeys, "blog"] : liveKeys;

  function dayOf(iso: string): Date | null {
    const date = new Date(`${iso}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

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

  const experienceEntries: MetadataRoute.Sitemap = (await listExperiences()).map((exp) => ({
    url: `${site.domain}${href(defaultLocale, "experiencias", exp.slug)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: exp.kind === "signature" ? 0.9 : 0.7,
    alternates: alternates((l) => href(l, "experiencias", exp.slug)),
  }));

  /*
   * `lastModified` is the article's own date rather than the crawl time the
   * other entries carry: an article is a dated document, and telling a crawler
   * every post changed today — every day — is how a sitemap's freshness signal
   * stops being believed.
   */
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.domain}${href(defaultLocale, "blog", post.slug)}`,
    // Midday UTC, so the day the reader sees is the day in the sitemap on both
    // sides of the date line. `now` for a row with no readable date at all —
    // an unparseable `lastModified` would take the whole file down.
    lastModified: dayOf(post.updatedOn || post.publishedOn) ?? now,
    changeFrequency: "yearly",
    priority: 0.6,
    alternates: alternates((l) => href(l, "blog", post.slug)),
  }));

  return [...staticEntries, ...experienceEntries, ...blogEntries];
}
