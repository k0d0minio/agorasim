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

export function Section({
  children,
  className,
  muted = false,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section className={cn("py-16 sm:py-20", muted && "bg-secondary/30", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
    </div>
  );
}
