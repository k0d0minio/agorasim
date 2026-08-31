/**
 * What the checkout form remembers while the guest is away on Stripe.
 *
 * A guest who taps back on Stripe's page has not changed their mind about the
 * tour — but the form they came from is `useState` on a statically rendered
 * page, so returning to `/reservar` used to hand them an empty form: day gone,
 * party gone, name and email gone, at the last step, with their card out.
 *
 * So the form writes a draft of everything it is about to send just before it
 * leaves for Stripe, and Stripe's `cancel_url` comes back carrying
 * `?{@link CHECKOUT_CANCELLED_PARAM}=1` — the one signal that says *this* visit
 * is a return rather than a fresh arrival. Only then is the draft read, and it
 * is deleted the moment it has been applied.
 *
 * **`sessionStorage`, not the URL.** The draft carries a name, an email and a
 * phone number; a query string carrying those ends up in browser history, in
 * the referer of every asset the page loads, and in whatever the guest pastes
 * to a friend. The tab-scoped store survives the round trip to Stripe, dies
 * with the tab, and never travels. The tour slug is the one field that is *not*
 * personal, so it rides in the URL too ({@link CHECKOUT_TOUR_PARAM}) and a
 * return in a browser with no storage at all still lands on the right route.
 *
 * The parsing here is deliberately suspicious for a store nobody else writes:
 * it is the guest's own browser, but a stale draft from an older shape of this
 * form is exactly as unusable as a hand-edited one, and both should end as
 * "no draft" rather than as a half-restored form.
 */

import { MAX_PARTY_ONLINE } from "@/lib/fleet";

/** Names the tour to preselect — set by experience pages and by `cancel_url`. */
export const CHECKOUT_TOUR_PARAM = "tour";
/** Set by Stripe's `cancel_url`: this arrival is a return from the card page. */
export const CHECKOUT_CANCELLED_PARAM = "cancelled";

const STORAGE_KEY = "agorasim:checkout-draft";

/**
 * Bumped whenever the shape below changes.
 *
 * A draft written by yesterday's deploy and read by today's is the one case
 * this module is guaranteed to meet, and restoring the wrong fields silently
 * is worse than restoring nothing.
 */
const DRAFT_VERSION = 1;

/** How long a remembered free-text field may be. Longer means a tampered store. */
const MAX_TEXT = 2000;

export type CheckoutDraft = {
  tour: string;
  mode: "public" | "private";
  adults: number;
  children: number;
  infants: number;
  addOns: string[];
  date: string | null;
  slot: "morning" | "afternoon" | null;
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function serializeDraft(draft: CheckoutDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, ...draft });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_TEXT) : "";
}

/** A whole, non-negative count, or `null` when the value is not one. */
function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value > MAX_PARTY_ONLINE ? null : value;
}

/**
 * A stored draft, or `null` for anything this build cannot use as it stands.
 *
 * Pure, so the rules above are testable without a browser.
 */
export function parseDraft(raw: string | null | undefined): CheckoutDraft | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const d = data as Record<string, unknown>;
  if (d.version !== DRAFT_VERSION) return null;

  const tour = text(d.tour);
  if (!tour) return null;

  const adults = count(d.adults);
  const children = count(d.children);
  const infants = count(d.infants);
  // A party the site could not sell is a party this form cannot restore — the
  // steppers would open above their own ceiling and the total would refuse.
  if (adults === null || children === null || infants === null) return null;
  if (adults < 1 || adults + children + infants > MAX_PARTY_ONLINE) return null;

  const date = typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null;
  const slot = d.slot === "morning" || d.slot === "afternoon" ? d.slot : null;

  return {
    tour,
    mode: d.mode === "private" ? "private" : "public",
    adults,
    children,
    infants,
    addOns: Array.isArray(d.addOns)
      ? d.addOns.filter((slug): slug is string => typeof slug === "string" && slug.length > 0)
      : [],
    // A departure without its day is not a departure. The picker restores the
    // pair or neither.
    date,
    slot: date ? slot : null,
    name: text(d.name),
    email: text(d.email),
    phone: text(d.phone),
    message: text(d.message),
  };
}

/**
 * The store, wrapped.
 *
 * Every access is guarded: `sessionStorage` throws rather than returning null
 * when a browser is set to block site data, and a guest who has blocked it has
 * not asked to be shown an error on the booking page.
 */
function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveDraft(draft: CheckoutDraft): void {
  try {
    store()?.setItem(STORAGE_KEY, serializeDraft(draft));
  } catch {
    // A full or blocked store costs the guest a retyped form, never an error.
  }
}

export function readDraft(): CheckoutDraft | null {
  try {
    return parseDraft(store()?.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    store()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do about it, and nothing that depends on it having worked.
  }
}

/**
 * What a `/reservar` URL asks for: a tour to preselect, and whether this is a
 * return from Stripe.
 *
 * Read from `window.location.search` on mount rather than from the server's
 * `searchParams`, on purpose: touching `searchParams` in the page would make
 * `/reservar` dynamic, and it is a statically rendered page that queries the
 * catalogue and the whole public calendar to build itself (see the `revalidate`
 * note there). A preselected card is not worth a database round trip per view.
 */
export function readCheckoutEntry(search: string): {
  tour: string | null;
  cancelled: boolean;
} {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return { tour: null, cancelled: false };
  }
  const tour = params.get(CHECKOUT_TOUR_PARAM);
  return {
    tour: tour && tour.length > 0 ? tour : null,
    cancelled: params.get(CHECKOUT_CANCELLED_PARAM) === "1",
  };
}

/** `/{locale}/reservar` with the tour preselected — the CTA on a tour's page. */
export function bookingHrefForTour(base: string, tourSlug: string): string {
  return `${base}?${CHECKOUT_TOUR_PARAM}=${encodeURIComponent(tourSlug)}`;
}
