import { Star } from "lucide-react";
import { Section, SectionHeading } from "@/components/section";
import { t, type Locale } from "@/i18n/config";
import { googleReviewsCopy } from "@/content/testimonials";
import { googleMapsPlaceUrl, type GoogleReview } from "@/lib/google-reviews";
import { cn } from "@/lib/utils";

/**
 * The business's Google reviews, as plain HTML the server rendered.
 *
 * No author photo and no Google script: the browser makes no request to Google.
 * The author's name sits under each review, as Google shows it, and links to
 * their Google profile when Google gives one — Google's attribution rule. Like
 * the static testimonials, this emits no `Review` or `AggregateRating` JSON-LD.
 */
export function GoogleReviews({
  locale,
  reviews,
  muted = false,
}: {
  locale: Locale;
  reviews: readonly GoogleReview[];
  muted?: boolean;
}) {
  if (reviews.length === 0) return null;
  const date = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
  return (
    <Section muted={muted}>
      <SectionHeading
        eyebrow={t(googleReviewsCopy.eyebrow, locale)}
        title={t(googleReviewsCopy.title, locale)}
        intro={t(googleReviewsCopy.order, locale)}
      />
      <ul
        className={cn(
          "mt-10 grid gap-6 sm:grid-cols-2",
          reviews.length >= 3 && "lg:grid-cols-3",
          reviews.length === 1 && "sm:grid-cols-1 sm:max-w-md",
        )}
      >
        {reviews.map((review) => (
          <li key={`${review.author}-${review.publishedAt}`} className="flex">
            <figure className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-6">
              <p
                className="flex gap-0.5 text-primary"
                role="img"
                aria-label={t(googleReviewsCopy.stars, locale).replace("{n}", String(review.rating))}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    aria-hidden
                    className={cn("h-4 w-4", i < review.rating ? "fill-current" : "opacity-30")}
                  />
                ))}
              </p>
              <blockquote className="mt-4 flex-1 whitespace-pre-line text-muted-foreground">
                “{review.text}”
              </blockquote>
              <figcaption className="mt-6 text-sm font-medium">
                {review.authorUri ? (
                  <a
                    href={review.authorUri}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:text-primary"
                  >
                    {review.author}
                  </a>
                ) : (
                  review.author
                )}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · <time dateTime={review.publishedAt}>{date.format(new Date(review.publishedAt))}</time>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <a
          href={googleMapsPlaceUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {t(googleReviewsCopy.more, locale)}
        </a>
      </p>
    </Section>
  );
}
