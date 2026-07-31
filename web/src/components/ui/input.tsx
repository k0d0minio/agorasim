import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The one copy of the field chrome — border, surface and focus ring — that used
 * to be pasted into every form component by hand. `Textarea` and `Select` build
 * on it too, so a styling decision here reaches every field in the app.
 */
export const fieldBase =
  "w-full rounded-lg border border-border bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** Box metrics shared by the single-line fields (`Input`, `Select`). */
export const fieldSizes = {
  default: "h-9 px-3",
  sm: "h-8 px-3",
  xs: "h-7 px-2 text-xs font-medium",
} as const

const inputVariants = cva(fieldBase, {
  variants: {
    size: fieldSizes,
  },
  defaultVariants: {
    size: "default",
  },
})

function Input({
  className,
  size = "default",
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
