import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";

import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { blogContent } from "@/content/blog";
import { blogIsLive, listPublishedPosts, type BlogPost } from "@/lib/blog-posts";
import { formatPostDate } from "@/lib/blog-format";
import { href } from "@/lib/routes";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { blogJsonLd } from "@/lib/jsonld";
import { alternates } from "@/lib/seo";

/**
 * Articles are published from `/admin/blog`, so this page is prerendered and
 * revalidated hourly over the database, exactly like the catalogue pages.
 * Publishing also calls `revalidatePath`, so in practice a new post is there at
 * once; the hour is the backstop.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: t(blogContent.title, locale),
    description: t(blogContent.lead, locale),
    alternates: alternates(locale, "blog"),
    /*
     * The `noindex` this page carried as a design preview is lifted by the
     * first published article, and by nothing else. An empty blog indexed is a
     * thin page competing for attention with the pages that sell the tours —
     * and until a post exists there is genuinely nothing here to find.
     */
    ...((await blogIsLive()) ? {} : { robots: { index: false, follow: false } }),
  };
}

/** The date a card shows: when the article went live, in the reader's language. */
function PostMeta({
  post,
  locale,
  compact = false,
}: {
  post: BlogPost;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-muted-foreground ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {post.tags[0] ? <Badge variant="secondary">{post.tags[0]}</Badge> : null}
      {post.publishedOn ? (
        <time dateTime={post.publishedOn}>{formatPostDate(post.publishedOn, locale)}</time>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <Clock className={compact ? "size-3" : "size-3.5"} />
        {post.readingMinutes} {t(blogContent.labels.readingTime, locale)}
      </span>
    </div>
  );
}

/** Blog index — every published article, newest first. */
export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = blogContent;
  const dict = getDictionary(l);

  const posts = await listPublishedPosts();
  const [featured, ...rest] = posts;

  return (
    <Section>
      {/* Only described when there is a blog to describe — an empty Blog
          entity in the graph is a claim about a section that has no pages. */}
      {posts.length > 0 ? <JsonLd data={blogJsonLd(posts, l)} /> : null}

      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
      </div>

      {posts.length === 0 ? (
        /*
         * No articles yet. Not a banner apologising for a missing feature —
         * the blog works, it is simply empty — so it says what is coming and
         * offers the thing a reader who got here actually wants.
         */
        <div className="mt-10 max-w-2xl rounded-2xl bg-secondary/40 p-6 sm:p-10">
          <p className="text-muted-foreground">{t(c.empty, l)}</p>
          <div className="mt-6">
            <BookingButton locale={l} label={dict.cta.bookExperience} />
          </div>
        </div>
      ) : (
        <>
          {/* Featured article */}
          <div className="mt-12">
            <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
              {t(c.labels.featured, l)}
            </p>
            <Link
              href={href(l, "blog", featured.slug)}
              className="group grid overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-lg md:grid-cols-2"
            >
              {featured.heroImage && featured.heroImageAlt ? (
                <div className="relative aspect-4/3 md:aspect-auto">
                  <Image
                    src={featured.heroImage}
                    alt={t(featured.heroImageAlt, l)}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : null}
              <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
                <PostMeta post={featured} locale={l} />
                <h2 className="text-2xl font-semibold sm:text-3xl">{t(featured.title, l)}</h2>
                <p className="text-muted-foreground">{t(featured.excerpt, l)}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {t(c.labels.readMore, l)}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>

          {/* Everything else */}
          {rest.length > 0 ? (
            <div className="mt-16">
              <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
                {t(c.labels.latest, l)}
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {rest.map((post) => (
                  <Link
                    key={post.slug}
                    href={href(l, "blog", post.slug)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-lg"
                  >
                    {post.heroImage && post.heroImageAlt ? (
                      <div className="relative aspect-video">
                        <Image
                          src={post.heroImage}
                          alt={t(post.heroImageAlt, l)}
                          fill
                          sizes="(max-width: 640px) 100vw, 480px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <PostMeta post={post} locale={l} compact />
                      <h2 className="text-xl font-semibold">{t(post.title, l)}</h2>
                      <p className="text-sm text-muted-foreground">{t(post.excerpt, l)}</p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-primary">
                        {t(c.labels.readMore, l)}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Section>
  );
}
