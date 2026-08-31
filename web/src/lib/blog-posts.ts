/**
 * Reading the blog.
 *
 * The public blog used to be three articles in a TypeScript array behind a
 * `noindex`, because nothing wrote to `blog_post_drafts` and nothing read from
 * it. It is now a table: `scripts/load-blog-drafts.ts` puts reviewed pipeline
 * markdown in as drafts, Diogo & Rita tap **Publicar** at `/admin/blog`, and
 * everything that renders an article reads it through here.
 *
 * **The fallback is not the catalogue's fallback.** `experience-catalogue.ts`
 * falls back to a shipped array, because a site that cannot say what it sells
 * is broken. A blog has no equivalent: the honest answer to "the database is
 * unreachable" is *no articles*, which is exactly what the blog looked like
 * last week and what `/blog` already renders gracefully. So an unreachable
 * database costs the reader the article list, never the build — `next build`
 * runs here without a `DATABASE_URL` (see the `revalidate` export on the pages
 * that call this) and gets an empty blog, and the deployed site revalidates
 * onto the real one within the hour. Publishing calls `revalidatePath`, so in
 * practice it is there at once.
 *
 * Server-only: it imports `@/db`.
 */
import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db, blogPostDrafts, type BlogPostDraft } from "@/db";
import type { Localized } from "@/i18n/config";
import { isoDate, readingMinutes } from "@/lib/blog-format";

/** One published article, in the shape the public pages render. */
export type BlogPost = {
  slug: string;
  title: Localized;
  excerpt: Localized;
  body: Localized<string[]>;
  tags: string[];
  heroImage: string | null;
  heroImageAlt: Localized | null;
  /** When it went live (`YYYY-MM-DD`) — the date on the card, and never null
   *  for a published row: `publishedAt` is written by the act of publishing. */
  publishedOn: string;
  /** The article's own freshness date, falling back to when it went live. */
  updatedOn: string;
  /** Counted from the Portuguese body — both locales are the same article. */
  readingMinutes: number;
};

/**
 * Map a row onto what the site renders.
 *
 * `heroImageAlt` gates `heroImage` rather than the other way round: a
 * photograph nobody described has no accessible name, and the public bar is
 * WCAG 2.2 AA (D14). Dropping the image is a smaller loss than shipping an
 * unlabelled one, and the loader refuses the combination anyway — this is the
 * belt for rows edited later by hand.
 */
function toPost(row: BlogPostDraft): BlogPost {
  const described = row.heroImage !== null && row.heroImageAlt !== null;
  // Published rows always carry `publishedAt`; `createdAt` is only reached by a
  // row someone flipped to `published` in the database directly.
  const publishedOn = isoDate(row.publishedAt) ?? isoDate(row.createdAt) ?? "";

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    tags: row.tags,
    heroImage: described ? row.heroImage : null,
    heroImageAlt: described ? row.heroImageAlt : null,
    publishedOn,
    updatedOn: isoDate(row.dateModified) ?? publishedOn,
    readingMinutes: readingMinutes(row.body.pt),
  };
}

/** Only published rows are the website's business — drafts stay in the admin. */
const isPublished = eq(blogPostDrafts.status, "published");

/**
 * Say a read failed — once per process, not once per page, for the same reason
 * the catalogue says its piece once (a build renders every locale of every page
 * through this).
 */
let warnedAboutReadFailure = false;

function warnOnce(context: string, err: unknown): void {
  if (warnedAboutReadFailure) return;
  warnedAboutReadFailure = true;
  console.warn(
    `[blog] rendering no articles (${context}): ` +
      `${err instanceof Error ? err.message : String(err)}`,
  );
}

/** Every published article, newest first. Empty when the database is unreachable. */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  try {
    const rows = await db
      .select()
      .from(blogPostDrafts)
      // `published_at` is what orders the blog, so a published row without one
      // is not a post the index can place — and the ordering would put it
      // first or last by accident of the driver's NULL handling.
      .where(and(isPublished, isNotNull(blogPostDrafts.publishedAt)))
      .orderBy(desc(blogPostDrafts.publishedAt));

    return rows.map(toPost);
  } catch (err) {
    warnOnce("listing published posts", err);
    return [];
  }
}

/** One published article by slug, or `undefined` — a draft reads as absent. */
export async function getPublishedPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const [row] = await db
      .select()
      .from(blogPostDrafts)
      .where(and(eq(blogPostDrafts.slug, slug), isPublished))
      .limit(1);

    return row ? toPost(row) : undefined;
  } catch (err) {
    warnOnce(`reading "${slug}"`, err);
    return undefined;
  }
}

/**
 * Whether the blog has anything on it — the switch that takes `/blog` out of
 * "em construção".
 *
 * Until the first post goes live the index carries a `noindex` and stays out of
 * the sitemap, exactly as it has since it was a design preview: an empty blog
 * indexed is a thin page competing with the pages that sell the tours. The
 * moment a post is published the whole section becomes live product surface,
 * which is why this is a *query* and not an entry in `liveKeys`.
 */
export async function blogIsLive(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ slug: blogPostDrafts.slug })
      .from(blogPostDrafts)
      .where(and(isPublished, isNotNull(blogPostDrafts.publishedAt)))
      .limit(1);

    return row !== undefined;
  } catch (err) {
    warnOnce("checking whether the blog is live", err);
    return false;
  }
}
