import type { Locale } from "@/i18n/config";
import { href } from "@/lib/routes";

/**
 * Where the phone-only booking bar points on a given page.
 *
 * - `booking` — the tour checkout, as everywhere on the site.
 * - `quote` — on `/casamentos` and `/eventos`, the page's own `#orcamento`
 *   form. A wedding is quoted, not booked per person, and the bar used to send
 *   a couple from the weddings page to a per-seat tour checkout.
 * - `hidden` — on the booking page itself (the form *is* the page) and on a
 *   couple's quote page (`/orcamento/<token>`), whose one action is its own
 *   pay button.
 *
 * Pure, so the three cases are unit-tested without rendering the bar.
 */
export type BookingBarTarget =
  | { kind: "booking" }
  | { kind: "quote"; href: string }
  | { kind: "hidden" };

export function bookingBarTarget(pathname: string, locale: Locale): BookingBarTarget {
  // A trailing slash is the same page.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (path === href(locale, "reservar")) return { kind: "hidden" };
  if (path.startsWith(`/${locale}/orcamento/`)) return { kind: "hidden" };

  for (const key of ["casamentos", "eventos"] as const) {
    const page = href(locale, key);
    if (path === page) return { kind: "quote", href: `${page}#orcamento` };
  }
  return { kind: "booking" };
}
