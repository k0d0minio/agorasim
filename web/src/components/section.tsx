import { Hills, SURFACE } from "@/components/brand/hills";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  /*
   * The page gutter is `max(gutter, safe-area inset)`: with `viewport-fit=cover`
   * a landscape phone puts the notch inside the viewport on one side, and a
   * flat 1rem would run text underneath it. Both sides are set from their own
   * inset, since only one of them has the cutout.
   */
  return (
    <div
      className={cn(
        "mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The height of a hill edge between two sections. */
const SECTION_EDGE_HEIGHT = "h-8 sm:h-14";

/**
 * `edge` draws the brand hills where this section meets its neighbours: at its
 * top, at its bottom, or both. A section has one of two colours, the page
 * background or the `muted` sand, and an edge joins one to the other. So a
 * section with an edge must have a neighbour of the other colour on that side.
 * Each edge is two hills: Warm sand behind, and in front the colour of the
 * section below the edge. Without `edge` the section is as it always was.
 */
export function Section({
  children,
  className,
  muted = false,
  edge,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
  edge?: "hills-top" | "hills-bottom" | "hills-both";
}) {
  if (!edge) {
    return (
      <section className={cn("py-16 sm:py-20", muted && "bg-secondary/30", className)}>
        <Container>{children}</Container>
      </section>
    );
  }

  const own = muted ? SURFACE.muted : SURFACE.background;
  const other = muted ? SURFACE.background : SURFACE.muted;
  const sand = { color: "var(--brand-sand)" };
  return (
    <>
      {edge !== "hills-bottom" && (
        <Hills
          layers={[sand, { color: own }]}
          className={SECTION_EDGE_HEIGHT}
          style={{ backgroundColor: other }}
        />
      )}
      {/* The opaque twin of `bg-secondary/30`, so the hill in front and the
          section are one colour with no step between them. */}
      <section className={cn("py-16 sm:py-20", className)} style={{ backgroundColor: own }}>
        <Container>{children}</Container>
      </section>
      {edge !== "hills-top" && (
        <Hills
          mirror
          layers={[sand, { color: other }]}
          className={SECTION_EDGE_HEIGHT}
          style={{ backgroundColor: own }}
        />
      )}
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  onTerracotta = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  className?: string;
  /**
   * The heading of a Terracotta story band: Warm sand eyebrow (6.00:1), Off-white
   * title and intro (7.00:1). Deep teal on Terracotta is 1.15:1.
   */
  onTerracotta?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && (
        <p
          className={cn(
            "mb-2 text-sm font-semibold uppercase tracking-wider",
            onTerracotta ? "text-brand-sand" : "text-primary",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "text-3xl font-semibold sm:text-4xl",
          onTerracotta ? "text-background" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-4 text-lg", onTerracotta ? "text-background" : "text-muted-foreground")}>
          {intro}
        </p>
      )}
    </div>
  );
}
