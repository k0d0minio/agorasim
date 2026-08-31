import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { isLocale, locales, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { blogContent } from "@/content/blog";
import { getPublishedPost, listPublishedPosts } from "@/lib/blog-posts";
import { formatPostDate } from "@/lib/blog-format";
import { href } from "@/lib/routes";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { BookingButton } from "@/components/booking-button";
import { JsonLd } from "@/components/json-ld";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { site } from "@/content/site";
import { alternates } from "@/lib/seo";

/**
 * The articles known at build time. One published after a deploy is not in this
 * list and is rendered on demand instead (`dynamicParams` defaults to true), so
 * a tap on **Publicar** puts a page on the site without a deploy — the same
 * arrangement the experience pages use.
 */
export async function generateStaticParams() {
  const posts = await listPublishedPosts();
  return locales.flatMap((locale) => posts.map((post) => ({ locale, slug: post.slug })));
}

/** See the note on the index: articles are published from the admin. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const post = await getPublishedPost(slug);
  if (!post) return {};

  return {
    title: t(post.title, locale),
    description: t(post.excerpt, locale),
    alternates: alternates(locale, "blog", slug),
    // A published article is product surface. Nothing to suppress: an
    // unpublished one is a 404, not a noindexed page.
    openGraph: {
      type: "article",
      publishedTime: post.publishedOn || undefined,
      modifiedTime: post.updatedOn || undefined,
      images: post.heroImage ? [`${site.domain}${post.heroImage}`] : undefined,
    },
  };
}

/** One article. Drafts and withdrawn posts are 404s, not previews. */
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const c = blogContent;
  const dict = getDictionary(l);
  const others = (await listPublishedPosts())
    .filter((other) => other.slug !== slug)
    .slice(0, 2);

  return (
    <article>
      <JsonLd
        data={[
          articleJsonLd(post, l),
          breadcrumbJsonLd(l, [
            { name: t(c.title, l), url: `${site.domain}${href(l, "blog")}` },
            { name: t(post.title, l), url: `${site.domain}${href(l, "blog", post.slug)}` },
          ]),
        ]}
      />

      <Section className="pb-0">
        <div className="mx-auto max-w-3xl">
          <Link
            href={href(l, "blog")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            {t(c.labels.backToBlog, l)}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {post.publishedOn ? (
              <time dateTime={post.publishedOn}>{formatPostDate(post.publishedOn, l)}</time>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {post.readingMinutes} {t(c.labels.readingTime, l)}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">{t(post.title, l)}</h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">{t(post.excerpt, l)}</p>

          {/* GEO freshness signal, shown only when it says something the
              publication date does not. */}
          {post.updatedOn && post.updatedOn !== post.publishedOn ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t(c.labels.updatedOn, l)}{" "}
              <time dateTime={post.updatedOn}>{formatPostDate(post.updatedOn, l)}</time>
            </p>
          ) : null}
        </div>

        {/* No photograph, or one nobody described, and the article simply opens
            on its words — an unlabelled hero image is not the alternative
            (WCAG 2.2 AA — D14). */}
        {post.heroImage && post.heroImageAlt ? (
          <div className="relative mx-auto mt-10 aspect-video max-w-4xl overflow-hidden rounded-2xl">
            <Image
              src={post.heroImage}
              alt={t(post.heroImageAlt, l)}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        ) : null}
      </Section>

      <Section className="pt-12">
        <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-foreground/90">
          {t(post.body, l).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Booking CTA — every article quietly funnels toward the tours. */}
        <div className="mx-auto mt-14 max-w-3xl rounded-2xl bg-secondary/40 p-6 text-center sm:p-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t(c.labels.ctaTitle, l)}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t(c.labels.ctaBody, l)}</p>
          <div className="mt-6 flex justify-center">
            <BookingButton locale={l} label={dict.cta.bookExperience} />
          </div>
        </div>

        {/* Keep reading */}
        {others.length > 0 && (
          <div className="mx-auto mt-16 max-w-3xl">
            <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
              {t(c.labels.continueReading, l)}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {others.map((other) => (
                <Link
                  key={other.slug}
                  href={href(l, "blog", other.slug)}
                  className="group flex flex-col gap-2 rounded-xl border border-border p-5 transition-shadow hover:shadow-md"
                >
                  {other.tags[0] ? (
                    <Badge variant="secondary" className="w-fit">
                      {other.tags[0]}
                    </Badge>
                  ) : null}
                  <h3 className="font-semibold">{t(other.title, l)}</h3>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-primary">
                    {t(c.labels.readMore, l)}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    </article>
  );
}
