import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Native `<select>` styled to match the rest of the form controls. Native is
 * deliberate: on a phone it opens the platform picker, which beats any custom
 * listbox for one-handed use. For a control whose trigger is not a form field
 * (e.g. a status badge), use `ui/dropdown-menu` instead.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Select }
