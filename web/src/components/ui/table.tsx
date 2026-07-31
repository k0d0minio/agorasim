import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table primitives for the admin data views.
 *
 * Deliberately without the usual scroll wrapper: every table here sits inside a
 * `<div className="relative overflow-x-auto">` within its card, which already
 * provides one. Pass the table's minimum width as `className` on `Table`.
 *
 * `TableHead` defaults to `scope="col"` and `TableCaption` is part of the API,
 * so a table can't be built without the two things a screen reader needs to
 * navigate one.
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

/** Column-header row wrapper. The heading type styles inherit down to each `th`. */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "text-left text-xs tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr data-slot="table-row" className={cn("border-b", className)} {...props} />
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
      className={cn("px-4 py-3 font-medium", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3", className)}
      {...props}
    />
  )
}

/**
 * Names the table for a screen reader. Visually hidden by default — the heading
 * above the table already says what it is on screen; pass `visible` to show it.
 */
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
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
