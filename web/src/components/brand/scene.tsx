import Image from "next/image";
import { t, type Locale } from "@/i18n/config";
import { scenes, type SceneName } from "@/content/brand";
import { cn } from "@/lib/utils";

/**
 * One illustrated scene of the brand, in a 4:3 frame with rounded corners.
 *
 * It takes no photo and no children: a scene sits next to text, never on or
 * behind a photo. It loads with no `priority`, because a scene is never the
 * first thing a page shows. One scene per page at most (`.icm/docs/brand.md`).
 * `decorative` gives it `alt=""` where the text next to it already says it all.
 */
export function Scene({
  name,
  locale,
  decorative = false,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  name: SceneName;
  locale: Locale;
  decorative?: boolean;
  className?: string;
  sizes?: string;
}) {
  const scene = scenes[name];
  return (
    <div className={cn("relative aspect-4/3 w-full overflow-hidden rounded-xl", className)}>
      <Image
        src={scene.src}
        alt={decorative ? "" : t(scene.alt, locale)}
        fill
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: scene.focal }}
      />
    </div>
  );
}
