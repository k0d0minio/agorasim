import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { fieldBase, fieldSizes } from "@/components/ui/input"

const selectVariants = cva(fieldBase, {
  variants: {
    size: fieldSizes,
  },
  defaultVariants: {
    size: "default",
  },
})

/**
 * A styled **native** `<select>` rather than a Radix listbox. The admin is a
 * phone-first installed PWA: the platform's own picker is the better control on
 * touch, it costs no JavaScript, and it keeps the inline "change the value and
 * the form submits itself" triage flow working. Options are plain `<option>`
 * children.
 */
function Select({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> &
  VariantProps<typeof selectVariants>) {
  return (
    <select
      data-slot="select"
      data-size={size}
      className={cn(selectVariants({ size, className }))}
      {...props}
    />
  )
}

export { Select, selectVariants }
