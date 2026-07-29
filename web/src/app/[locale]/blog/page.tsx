import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { blogContent, sampleBlogPosts } from "@/content/blog";
import { formatPostDate } from "@/lib/blog-format";
import { href } from "@/lib/routes";
import { Section } from "@/components/section";
import { InDevBanner } from "@/components/in-dev-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { alternates } from "@/lib/seo";

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
    // Preview page with sample articles — keep out of the index until launch.
    robots: { index: false, follow: false },
  };
}

/** Blog index (proposal Feature 2) — design preview with sample articles. */
export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = blogContent;
  const [featured, ...rest] = sampleBlogPosts;

  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
      </div>

      <InDevBanner locale={l} body={c.inDev} showContacts={false} className="mt-8" />

      {/* Featured article */}
      <div className="mt-12">
        <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
          {t(c.labels.featured, l)}
        </p>
        <Link
          href={href(l, "blog", featured.slug)}
          className="group grid overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-lg md:grid-cols-2"
        >
          <div className="relative aspect-4/3 md:aspect-auto">
            <Image
              src={featured.image}
              alt={t(featured.imageAlt, l)}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary">{t(featured.tag, l)}</Badge>
              <span>{formatPostDate(featured.date, l)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {featured.readingMinutes} {t(c.labels.readingTime, l)}
              </span>
            </div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{t(featured.title, l)}</h2>
            <p className="text-muted-foreground">{t(featured.excerpt, l)}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              {t(c.labels.readMore, l)}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* Latest grid */}
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
              <div className="relative aspect-video">
                <Image
                  src={post.image}
                  alt={t(post.imageAlt, l)}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary">{t(post.tag, l)}</Badge>
                  <span>{formatPostDate(post.date, l)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {post.readingMinutes} {t(c.labels.readingTime, l)}
                  </span>
                </div>
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

      {/* Newsletter signup — design only until email marketing ships */}
      <div className="mt-16 rounded-2xl bg-secondary/40 p-6 sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t(c.labels.newsletterTitle, l)}</h2>
          <p className="mt-3 text-muted-foreground">{t(c.labels.newsletterBody, l)}</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              disabled
              placeholder={t(c.labels.newsletterPlaceholder, l)}
              className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none disabled:opacity-70"
            />
            <Button type="button" size="lg" disabled className="sm:shrink-0">
              {t(c.labels.newsletterButton, l)}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t(c.labels.newsletterSoon, l)}</p>
        </div>
      </div>
    </Section>
  );
}
