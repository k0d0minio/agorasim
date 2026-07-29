import { Hammer } from "lucide-react";

/**
 * Admin banner marking an area whose UI is designed but not yet wired to real
 * data or actions. Everything below it is a working preview of the final
 * layout, filled with example data.
 */
export function AdminInDevBanner({ note }: { note: string }) {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-xl border border-accent-foreground/20 bg-accent/50 p-4"
      role="status"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-foreground/10 text-accent-foreground">
        <Hammer className="size-4" />
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-accent-foreground">In development — design preview</p>
        <p className="text-accent-foreground/80">
          {note} The data shown is example data so you can see exactly how this will look and work.
        </p>
      </div>
    </div>
  );
}
