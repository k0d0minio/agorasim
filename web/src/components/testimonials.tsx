import { Section, SectionHeading } from "@/components/section";
import { Media } from "@/components/media";
import { t, type Locale } from "@/i18n/config";
import {
  testimonials as allTestimonials,
  testimonialsHeading,
  type Testimonial,
} from "@/content/testimonials";
import { cn } from "@/lib/utils";

/**
 * Social proof: real guests, their own words, their own photos.
 *
 * Deliberately plain copy — the quotes ship no `Review` or `AggregateRating`
 * JSON-LD, here or on the pages that render this. Marking three quotes up as
 * ratings would be the site claiming a score it does not have.
 *
 * The photos are group shots rather than portraits (hosts, guests and the dog,
 * all in frame), so each one gets a full-width 4:3 crop above its quote instead
 * of the round avatar the shape usually implies.
 */
export function Testimonials({
  locale,
  items = allTestimonials,
  muted = false,
}: {
  locale: Locale;
  /** Defaults to all three. Experience pages pass `testimonialsFor(slug)`. */
  items?: readonly Testimonial[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Section muted={muted}>
      <SectionHeading
        eyebrow={t(testimonialsHeading.eyebrow, locale)}
        title={t(testimonialsHeading.title, locale)}
      />
      <ul
        className={cn(
          "mt-10 grid gap-6 sm:grid-cols-2",
          // One quote should not stretch across the page, and two should not
          // leave a gap where a third would be.
          items.length >= 3 && "lg:grid-cols-3",
          items.length === 1 && "sm:grid-cols-1 sm:max-w-md",
        )}
      >
        {items.map((entry) => (
          <li key={entry.names} className="flex">
            <figure className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <Media
                src={entry.photo}
                label={t(entry.photoAlt, locale)}
                rounded={false}
                className="aspect-4/3 w-full"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="flex flex-1 flex-col p-6">
                <blockquote className="flex-1 text-muted-foreground">
                  “{t(entry.quote, locale)}”
                </blockquote>
                <figcaption className="mt-6 text-sm font-medium">
                  {entry.names}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {t(entry.origin, locale)}
                  </span>
                </figcaption>
              </div>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
