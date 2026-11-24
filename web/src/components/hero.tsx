import Image from "next/image";

import { Hills, SURFACE } from "@/components/brand/hills";
import { HeroVideo } from "@/components/hero-video";

export function Hero({
  eyebrow,
  title,
  subtitle,
  videoSrc,
  poster,
  posterAlt,
  cta,
  edge,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  videoSrc?: string;
  poster: string;
  posterAlt: string;
  cta: React.ReactNode;
  /**
   * Draws the brand hills along the bottom of the hero, in the page background
   * colour only. The photo is the hero: no other colour goes on it.
   */
  edge?: "hills";
}) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background media */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={poster}
          alt={posterAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Skipped entirely on phones and for `prefers-reduced-motion`, in which
            case the poster above is the whole hero — see `HeroVideo`. */}
        {videoSrc && <HeroVideo src={videoSrc} />}
      </div>

      {/* Scrim for legibility */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/40 to-black/25" />

      {/* Hill edge: above the photo and the scrim, below the text. 70px at
          most, well inside the 96px of padding under the buttons. */}
      {edge === "hills" && (
        <Hills
          layers={[
            { color: SURFACE.background, opacity: 0.35 },
            { color: SURFACE.background, opacity: 0.6 },
            { color: SURFACE.background },
          ]}
          className="absolute inset-x-0 bottom-0 -z-10 h-10 sm:h-[4.375rem]"
        />
      )}

      <div className="mx-auto flex min-h-136 max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
        <div className="max-w-2xl text-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/85">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">{cta}</div>
        </div>
      </div>
    </section>
  );
}
