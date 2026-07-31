import { cn } from "@/lib/utils";

/**
 * The dot marking an area whose UI is designed but not yet wired up.
 *
 * "In development" is signalled two ways across the admin: this marker (in both
 * navs and on the dashboard cards) and `AdminInDevBanner` on the area itself.
 * It used to be three — the dashboard carried a separate `Badge` as well.
 *
 * The text is a visually-hidden span rather than an `aria-label`: most screen
 * readers ignore `aria-label` on a generic element, so the marker was silent.
 */
export function InDevMarker({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span
        className="size-1.5 rounded-full bg-accent-foreground/50"
        aria-hidden="true"
      />
      <span className="sr-only">In development</span>
    </span>
  );
}

/** Legend explaining the marker, for the foot of a navigation surface. */
export function InDevLegend({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      <span
        className="mr-1 inline-block size-1.5 rounded-full bg-accent-foreground/50 align-middle"
        aria-hidden="true"
      />
      marks areas in development — final design, example data.
    </p>
  );
}
