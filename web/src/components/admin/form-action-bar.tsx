import { cn } from "@/lib/utils";

/**
 * The primary-action row of a long admin form.
 *
 * On a phone it is sticky just above the bottom toolbar, so "Save" never
 * scrolls out of reach mid-form — but it stays *in normal flow* at the end of
 * the form rather than `fixed`, because iOS's keyboard only shrinks the visual
 * viewport and simply covers fixed bottom bars (spec §5 V4, §8 E4). In flow,
 * the same scroll gesture the operator is already making brings it back. From
 * `md` up it returns to a plain row: the whole form fits a desktop screen.
 */
export function FormActionBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-xl border bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/85",
        "md:static md:mx-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
