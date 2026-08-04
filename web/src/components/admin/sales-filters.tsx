import Link from "next/link";
import { Columns3, Rows3 } from "lucide-react";
import type { RequestStatus } from "@/db/schema";
import { REQUEST_STATUSES, requestStatusMeta } from "@/lib/admin-format";
import { SALES_SOURCE_ICONS } from "@/lib/experience-icons";
import { salesHref, type SalesFilters, type SalesView } from "@/lib/sales";
import { cn } from "@/lib/utils";

/**
 * The one control bar over the merged Sales list: which view, which rows.
 *
 * Everything is a link, not a client-side filter — the state is in the URL, so a
 * filtered board can be bookmarked, shared with the other half of the team, and
 * survives the phone locking. That also keeps the whole screen a server
 * component with no hydration cost.
 */

const chipClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        chipClass,
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function SalesToolbar({
  view,
  filters,
  countsByStatus,
  exampleCount,
}: {
  view: SalesView;
  filters: SalesFilters;
  countsByStatus: Record<RequestStatus, number>;
  /** Example bookings currently in the list, so the note can be honest about them. */
  exampleCount: number;
}) {
  const current = { view, filters };
  const total = REQUEST_STATUSES.reduce((sum, status) => sum + countsByStatus[status], 0);

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* View: the board is the default, because triage is the daily job. */}
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Chip href={salesHref(current, { view: "board" })} active={view === "board"}>
            <Columns3 className="size-4" aria-hidden />
            Board
          </Chip>
          <Chip href={salesHref(current, { view: "table" })} active={view === "table"}>
            <Rows3 className="size-4" aria-hidden />
            Table
          </Chip>
        </div>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        <Chip href={salesHref(current, { source: "all" })} active={filters.source === "all"}>
          Everything
        </Chip>
        <Chip
          href={salesHref(current, { source: "enquiry" })}
          active={filters.source === "enquiry"}
        >
          <SalesSourceIconInline kind="enquiry" />
          Enquiries
        </Chip>
        <Chip
          href={salesHref(current, { source: "booking" })}
          active={filters.source === "booking"}
        >
          <SalesSourceIconInline kind="booking" />
          Bookings
        </Chip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip href={salesHref(current, { status: null })} active={filters.status === null}>
          All stages
          <span className="text-xs opacity-70">{total}</span>
        </Chip>
        {REQUEST_STATUSES.map((status) => (
          <Chip
            key={status}
            href={salesHref(current, { status })}
            active={filters.status === status}
          >
            {requestStatusMeta[status].label}
            <span className="text-xs opacity-70">{countsByStatus[status]}</span>
          </Chip>
        ))}
      </div>

      {exampleCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {exampleCount} row{exampleCount === 1 ? "" : "s"} marked{" "}
          <span className="font-medium">Example</span> are placeholder bookings — real ones
          appear here the moment instant booking and payments go live.
        </p>
      ) : null}
    </div>
  );
}

/** The source icon at chip size, without the chip's own background. */
function SalesSourceIconInline({ kind }: { kind: "enquiry" | "booking" }) {
  const Icon = SALES_SOURCE_ICONS[kind].icon;
  return <Icon className="size-4" aria-hidden />;
}
