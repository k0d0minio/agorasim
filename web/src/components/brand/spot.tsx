import Image from "next/image";
import { t, type Localized, type Locale } from "@/i18n/config";
import { spot } from "@/content/brand";
import { cn } from "@/lib/utils";

/**
 * The small drawing of the brand (the van and the dog), 240 px wide at most,
 * with an optional caption under it.
 *
 * It is decorative unless it has a `locale`: the 404 shows two languages at
 * once and the confirmation's heading says it all, so both give `alt=""`. Size
 * it with `className` (a width class); the height follows the file. Like a
 * scene, it never goes on a selling page (`brand-imports.test.ts`).
 */
export function Spot({
  locale,
  caption,
  className,
}: {
  locale?: Locale;
  caption?: Localized;
  className?: string;
}) {
  const image = (
    <Image
      src={spot.src}
      width={spot.width}
      height={spot.height}
      alt={locale ? t(spot.alt, locale) : ""}
      sizes="240px"
      className="h-auto w-full"
    />
  );

  return (
    <figure className={cn("mx-auto w-full max-w-60", className)}>
      {image}
      {caption && locale ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {t(caption, locale)}
        </figcaption>
      ) : null}
    </figure>
  );
}
