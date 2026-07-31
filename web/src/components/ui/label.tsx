import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Field label. A plain `<label>` rather than the Radix primitive: `htmlFor`
 * already gives the association and the click target, and staying element-only
 * keeps every form that uses it out of an extra client bundle.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

export { Label }
