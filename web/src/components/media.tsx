import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Image slot. When `src` points at a real file it renders an optimized
 * next/image (object-cover, fills the parent box). Without `src` it falls back
 * to a warm, deterministic gradient keyed off `seed`.
 */
export function Media({
  src,
  seed,
  label,
  className,
  rounded = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src?: string;
  /** Stable string (e.g. slug) used to vary the placeholder hue when no src. */
  seed?: string;
  /** Accessible description of the photo. */
  label: string;
  className?: string;
  rounded?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", rounded && "rounded-xl", className)}>
        <Image
          src={src}
          alt={label}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const hue = hueFromSeed(seed ?? label);
  const style = {
    backgroundImage: `linear-gradient(135deg, oklch(0.78 0.07 ${hue}) 0%, oklch(0.55 0.08 ${
      hue + 25
    }) 55%, oklch(0.42 0.06 ${hue + 45}) 100%)`,
  };

  return (
    <div
      role="img"
      aria-label={label}
      style={style}
      className={cn("relative flex items-end overflow-hidden", rounded && "rounded-xl", className)}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
      <span className="relative m-3 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

function hueFromSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return 40 + (h % 120);
}
