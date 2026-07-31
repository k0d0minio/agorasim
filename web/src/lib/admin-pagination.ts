/**
 * Server-side pagination for the admin lists.
 *
 * The page number lives in the URL rather than in component state, so a
 * particular page is a link an operator can send to the other operator — and so
 * the page stays a plain server render with no client JavaScript.
 */

/** Rows per page. Enough that today's data fits on one page and nothing moves. */
export const ADMIN_PAGE_SIZE = 25;

/** Read a 1-based page number from a search param, ignoring anything absurd. */
export function readPageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

/** The last page for a row count. Always at least 1, so an empty list has one page. */
export function lastPage(total: number, pageSize: number = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** `LIMIT`/`OFFSET` for a 1-based page. */
export function pageSlice(
  page: number,
  pageSize: number = ADMIN_PAGE_SIZE,
): { limit: number; offset: number } {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
