import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The one copy of the field chrome — border, surface and focus ring — that used
 * to be pasted into every form component by hand. `Textarea` and `Select` build
 * on it too, so a styling decision here reaches every field in the app.
 *
 * Two rules live here on purpose (docs/admin-mobile-design-spec.md §8, §4):
 * text is 16px in every size, because iOS Safari zooms the page on focusing any
 * field whose computed size is 15px or less; and the border is the darker
 * `--input` token, because a field's border is the only thing announcing it can
 * be typed in and the decorative `--border` grey fails the 3:1 non-text floor.
 */
export const fieldBase =
  "w-full rounded-lg border border-input bg-background text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** Box metrics shared by the single-line fields (`Input`, `Select`). The
 * default is the 48px touch size; the compact sizes keep the 16px text. */
export const fieldSizes = {
  default: "h-12 px-3.5",
  sm: "h-9 px-3",
  xs: "h-8 px-2.5 font-medium",
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
