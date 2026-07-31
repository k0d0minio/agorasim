import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldBase } from "@/components/ui/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, "px-3 py-2", className)}
      {...props}
    />
  )
}

export { Textarea }
