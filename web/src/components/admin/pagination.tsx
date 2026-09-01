import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ADMIN_PAGE_SIZE, lastPage } from "@/lib/admin-pagination";
import { Button } from "@/components/ui/button";

/**
 * Previous/next pager for an admin list. Renders nothing while everything fits
 * on one page, so short lists look exactly as they did before pagination.
 *
 * `hrefFor` builds the link for a page number — the caller owns the query
 * string, since a page may paginate more than one list at a time.
 */
export function AdminPagination({
  page,
  total,
  hrefFor,
  label,
  pageSize = ADMIN_PAGE_SIZE,
}: {
  page: number;
  total: number;
  hrefFor: (page: number) => string;
  /** Names the list for screen readers, e.g. "Páginas de pedidos". */
  label: string;
  pageSize?: number;
}) {
  const pages = lastPage(total, pageSize);
  if (pages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    // `flex-wrap`, because Portuguese spends width the English didn't:
    // "Anterior"/"Seguinte" are both longer than "Previous"/"Next", and at the
    // 320px reflow floor (D2) the button row plus a three-digit page counter
    // leaves the range line almost nothing. Buttons are `shrink-0
    // whitespace-nowrap` by primitive, so without a wrap here the overflow
    // would be the page's, not the nav's — which is the one thing D2 forbids.
    <nav
      aria-label={label}
      className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
    >
      <p className="text-xs text-muted-foreground">
        {first}–{last} de {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline">
            <Link href={hrefFor(page - 1)} rel="prev">
              <ChevronLeft />
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <ChevronLeft />
            Anterior
          </Button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Button asChild variant="outline">
            <Link href={hrefFor(page + 1)} rel="next">
              Seguinte
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Seguinte
            <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
