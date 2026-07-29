import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { isLocale, locales, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { blogContent, getSamplePost, sampleBlogPosts } from "@/content/blog";
import { formatPostDate } from "@/lib/blog-format";
import { href } from "@/lib/routes";
import { Section } from "@/components/section";
import { InDevBanner } from "@/components/in-dev-banner";
import { Badge } from "@/components/ui/badge";
import { BookingButton } from "@/components/booking-button";
import { alternates } from "@/lib/seo";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    sampleBlogPosts.map((post) => ({ locale, slug: post.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = getSamplePost(slug);
  if (!post) return {};
  return {
    title: t(post.title, locale),
    description: t(post.excerpt, locale),
    alternates: alternates(locale, "blog", slug),
    // Sample article — keep out of the index until the blog launches.
    robots: { index: false, follow: false },
  };
}

/** Blog article layout (proposal Feature 2) — rendered with sample posts for now. */
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const post = getSamplePost(slug);
  if (!post) notFound();
  const c = blogContent;
  const dict = getDictionary(l);
  const others = sampleBlogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <article>
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
            <Badge variant="secondary">{t(post.tag, l)}</Badge>
            <span>{formatPostDate(post.date, l)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {post.readingMinutes} {t(c.labels.readingTime, l)}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold sm:text-5xl">{t(post.title, l)}</h1>
          <p className="mt-5 text-lg text-muted-foreground sm:text-xl">{t(post.excerpt, l)}</p>

          <InDevBanner
            locale={l}
            body={c.labels.sampleArticle}
            showContacts={false}
            className="mt-8"
          />
        </div>

        <div className="relative mx-auto mt-10 aspect-video max-w-4xl overflow-hidden rounded-2xl">
          <Image
            src={post.image}
            alt={t(post.imageAlt, l)}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
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
                  <Badge variant="secondary" className="w-fit">
                    {t(other.tag, l)}
                  </Badge>
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
