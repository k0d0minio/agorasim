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
  position,
}: {
  src?: string;
  /** Stable string (e.g. slug) that picks the placeholder gradient when no src. */
  seed?: string;
  /** Accessible description of the photo. */
  label: string;
  className?: string;
  rounded?: boolean;
  priority?: boolean;
  sizes?: string;
  /** CSS object-position of the photo, e.g. "center 70%". Default: centred. */
  position?: string;
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
          style={position ? { objectPosition: position } : undefined}
        />
      </div>
    );
  }

  const [from, via, to] = PLACEHOLDER_GRADIENTS[indexFromSeed(seed ?? label)];
  const style = {
    backgroundImage: `linear-gradient(135deg, ${from} 0%, ${via} 55%, ${to} 100%)`,
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

/**
 * Brand palette steps (`globals.css`), so a missing photo looks on-brand. Each
 * gradient ends dark, so the white label chip at the bottom stays readable.
 */
const PLACEHOLDER_GRADIENTS = [
  ["var(--brand-sand)", "var(--brand-orange)", "var(--brand-terracotta)"],
  ["var(--brand-sand)", "var(--brand-terracotta)", "var(--brand-teal)"],
  ["var(--brand-orange)", "var(--brand-terracotta)", "var(--brand-night)"],
  ["var(--brand-sand)", "var(--brand-teal)", "var(--brand-night)"],
] as const;

function indexFromSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h % PLACEHOLDER_GRADIENTS.length;
}
