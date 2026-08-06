"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, TriangleAlert } from "lucide-react";
import type { StatusUpdateState } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type StatusOption<T extends string> = {
  value: T;
  label: string;
  variant: React.ComponentProps<typeof Badge>["variant"];
};

/**
 * The one control for a record's status: the badge *is* the trigger, so the
 * value is shown once instead of twice (a badge above a `<select>` preset to
 * the same value, as this used to be).
 *
 * - The new value paints immediately via `useOptimistic`, so triage on a slow
 *   connection doesn't look like a dead tap. The write is followed by
 *   `router.refresh()` inside the same transition, so the optimistic value
 *   holds until the server's own value replaces it — the actions deliberately
 *   don't call `revalidatePath`, since a `force-dynamic` page has no cache
 *   entry to invalidate, and without the refresh the badge would snap back to
 *   the stale value a moment after a *successful* write.
 * - A failed write reverts the badge and surfaces the reason — the old
 *   auto-submitting `<select>` swallowed both.
 * - Arrow keys only move the highlight; the write happens on select. The old
 *   `<select onChange>` fired a write for every option a keyboard user passed
 *   through.
 */
export function StatusMenu<T extends string>({
  value,
  options,
  update,
  triggerLabel,
  className,
}: {
  value: T;
  options: readonly StatusOption<T>[];
  /** Server action performing the write. Returns an error to render on failure. */
  update: (next: T) => Promise<StatusUpdateState>;
  /** Accessible name for the trigger, e.g. "Status for Sofia Almeida". */
  triggerLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [error, setError] = useState<string | null>(null);

  const current = options.find((o) => o.value === optimistic) ?? options[0];

  function onValueChange(next: string) {
    if (next === value) return;
    setError(null);
    startTransition(async () => {
      // Inside the transition, so the badge repaints before the round trip.
      setOptimistic(next as T);
      const result = await update(next as T);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={triggerLabel}
          className={cn(
            // The badge is the visual; the 44px row around it is the target.
            "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
            isPending && "opacity-70",
          )}
        >
          <Badge variant={current.variant}>{current.label}</Badge>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Set status</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={optimistic} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <p
          role="alert"
          className="inline-flex items-start gap-1 text-xs font-medium text-destructive"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
