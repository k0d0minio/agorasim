import Image from "next/image";

export function Hero({
  eyebrow,
  title,
  subtitle,
  videoSrc,
  poster,
  posterAlt,
  cta,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  videoSrc?: string;
  poster: string;
  posterAlt: string;
  cta: React.ReactNode;
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
        {videoSrc && (
          <video
            className="absolute inset-0 h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            preload="metadata"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Scrim for legibility */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/40 to-black/25" />

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
