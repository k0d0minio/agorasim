/**
 * Whether the browser document the booking form runs in was *loaded* on the
 * booking route — and so is living under the policy that admits Stripe.
 *
 * A Content-Security-Policy belongs to a document, not to a URL. `/reservar` is
 * served with the payment policy (`PAYMENT_CSP`, `lib/security-headers.ts`),
 * but a guest who reaches it through a client-side `<Link>` from the home page
 * never loads `/reservar` as a document: they are still in the home page's
 * document, under the public policy, which frames nothing and loads no
 * third-party script. Stripe's form would simply never appear.
 *
 * The site's own links into `/reservar` are full loads for that reason
 * (`BookingButton`, the header's nav). This is the backstop for any link that
 * forgets: the form asks where its document was first loaded, and reloads once
 * if that was anywhere else. The navigation entry is the document's original
 * load and does not move on client-side navigation, which is exactly the
 * question.
 */
import { locales } from "@/i18n/config";

const PAYMENT_ROUTE = new RegExp(`^/(${locales.join("|")})/reservar(/.*)?$`);

/** `/pt/reservar`, `/en/reservar/confirmacao` — the paths served the payment policy. */
export function isPaymentRoutePath(pathname: string): boolean {
  return PAYMENT_ROUTE.test(pathname);
}

/**
 * Whether this document was loaded on the booking route. `true` when the
 * browser cannot say (no Navigation Timing entry), so the backstop never turns
 * into a reload loop on a browser that does not report one.
 */
export function documentLoadedOnPaymentRoute(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation");
    if (!entry?.name) return true;
    return isPaymentRoutePath(new URL(entry.name).pathname);
  } catch {
    return true;
  }
}
