import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table primitives. `TableHead` defaults to `scope="col"` and `TableCaption` is
 * expected on every table — screen readers need both to make a grid navigable.
 * Captions render visually hidden by default; pass `visible` to show one.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t font-medium", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-b last:border-0", className)}
      {...props}
    />
  )
}

function TableHead({
  className,
  scope = "col",
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("px-4 py-3", className)} {...props} />
  )
}

function TableCaption({
  className,
  visible = false,
  ...props
}: React.ComponentProps<"caption"> & { visible?: boolean }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        visible ? "px-4 py-3 text-left text-sm text-muted-foreground" : "sr-only",
        className
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
