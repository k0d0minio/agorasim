/**
 * What the guest had filled in when they left for Stripe.
 *
 * Stripe's `cancel_url` brings a guest back to `/reservar` as a fresh page
 * load, and the checkout form is client state — so without this, tapping back
 * on the payment page threw away the tour, the day, the departure, the party,
 * the add-ons and everything they had typed. On a phone, at the last step,
 * with their card already out. Nobody types all that twice.
 *
 * **It lives in `sessionStorage`, not in the URL.** The obvious implementation
 * is to hang the whole basket off `cancel_url` as query params, and it would
 * put the guest's name and email into a URL — which is logged by every proxy
 * in the path, kept in browser history and handed to analytics as a referrer.
 * A draft in the guest's own tab is read by nobody else and dies with the tab.
 * The `cancel_url` therefore carries one flag ({@link CANCEL_RETURN_PARAM}) and
 * no personal data at all.
 *
 * **Nothing here is trusted.** A draft is guest-writable storage, so every
 * value is re-validated on the way out — and even then it only decides what the
 * form shows. The server prices the basket from the catalogue and re-checks the
 * departure against the live calendar before a card is charged; see
 * `startCheckout`.
 *
 * **Reading it is a subscription, not an effect.** `sessionStorage` and the
 * query string are external systems the server render cannot see, so the form
 * reads both through `useSyncExternalStore` — one snapshot, cached so the
 * reference is stable — and *derives* its fields from what comes back. It never
 * copies the draft into state in an effect, which is what would make the first
 * paint disagree with the prerendered HTML and turn a restore into a cascade of
 * renders. Nothing here writes to storage except {@link saveCheckoutDraft}, on
 * the way out: a restored draft is overwritten by the next submit, and dies
 * with the tab regardless.
 *
 * One thing is deliberately *not* restored: the marketing opt-in. Consent has
 * to be a fresh, unticked, affirmative act every time (GDPR Art. 4(11)), and a
 * box this module re-ticked on their behalf would be none of those.
 */
import { MAX_PARTY_ONLINE } from "@/lib/fleet";

/** Where the draft is kept, for the life of the browser tab. */
export const CHECKOUT_DRAFT_KEY = "agorasim:checkout-draft";

/** The flag Stripe's `cancel_url` carries back. Never any guest data. */
export const CANCEL_RETURN_PARAM = "checkout";
export const CANCEL_RETURN_VALUE = "cancelled";

/** The param an experience page uses to say which tour it is selling. */
export const TOUR_PARAM = "tour";

export type CheckoutDraft = {
  tour?: string;
  mode?: "public" | "private";
  adults?: number;
  children?: number;
  infants?: number;
  addOns?: string[];
  date?: string;
  slot?: "morning" | "afternoon";
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

/** `rural-saloia` — the same shape the checkout schema accepts server-side. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `2026-08-15`. Whether the day is *for sale* is the calendar's question. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A cap on the free-text fields, so a draft cannot be inflated into something
 * that fills the tab's storage quota. Generous next to a name or an email; the
 * notes field is the only one that comes near it.
 */
const MAX_TEXT = 2000;

function slug(value: unknown): string | undefined {
  return typeof value === "string" && SLUG_RE.test(value) ? value : undefined;
}

function count(value: unknown): number | undefined {
  // `Number("")` and `Number(null)` are both 0, which would turn a field that
  // was never filled in into a party band of zero rather than into nothing.
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_PARTY_ONLINE) return undefined;
  return n;
}

function line(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_TEXT);
  return trimmed || undefined;
}

/**
 * The draft a submitted checkout form describes.
 *
 * Read from the `FormData` rather than from the component's state because that
 * is where the *whole* submission is — the hidden tour and party fields, the
 * picker's day and departure, and the details the guest typed into inputs the
 * form never held in state.
 */
export function draftFromFormData(formData: FormData): CheckoutDraft {
  const one = (name: string) => formData.get(name);
  return prune({
    tour: slug(one("experience")),
    mode: mode(one("mode")),
    adults: count(one("adults")),
    children: count(one("children")),
    infants: count(one("infants")),
    addOns: formData
      .getAll("addOns")
      .map(slug)
      .filter((value): value is string => Boolean(value)),
    date: date(one("date")),
    slot: slot(one("slot")),
    name: line(one("name")),
    email: line(one("email")),
    phone: line(one("phone")),
    message: line(one("message")),
  });
}

function mode(value: unknown): "public" | "private" | undefined {
  return value === "public" || value === "private" ? value : undefined;
}

function slot(value: unknown): "morning" | "afternoon" | undefined {
  return value === "morning" || value === "afternoon" ? value : undefined;
}

function date(value: unknown): string | undefined {
  return typeof value === "string" && DATE_RE.test(value) ? value : undefined;
}

/** Drops the keys that came back empty, so a stored draft stays small. */
function prune(draft: CheckoutDraft): CheckoutDraft {
  const out: CheckoutDraft = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    Object.assign(out, { [key]: value });
  }
  return out;
}

/**
 * A stored draft, field by field, or `null` when there is nothing usable.
 *
 * Pure and exported for its own sake: this is the boundary where guest-writable
 * storage becomes typed values, so it is the part worth testing directly.
 */
export function parseCheckoutDraft(raw: string | null | undefined): CheckoutDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;

  const draft = prune({
    tour: slug(source.tour),
    mode: mode(source.mode),
    adults: count(source.adults),
    children: count(source.children),
    infants: count(source.infants),
    addOns: Array.isArray(source.addOns)
      ? source.addOns.map(slug).filter((value): value is string => Boolean(value))
      : undefined,
    date: date(source.date),
    slot: slot(source.slot),
    name: line(source.name),
    email: line(source.email),
    phone: line(source.phone),
    message: line(source.message),
  });

  return Object.keys(draft).length > 0 ? draft : null;
}

/**
 * Every storage call is wrapped: `sessionStorage` throws outright in a browser
 * set to block site data, and a guest who has turned cookies off should still
 * be able to pay for a tour — they just retype their details if they come back.
 */
export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage is full, blocked, or absent. The checkout still works.
  }
}

/**
 * Everything the URL and the tab's storage have to say about this arrival.
 *
 * One value rather than two, so the form takes a single snapshot.
 */
export type CheckoutEntry = {
  /** The tour an experience page asked for, via `?tour=`. */
  tour: string | null;
  /** The basket to put back, when Stripe sent them here by way of "cancel". */
  draft: CheckoutDraft | null;
};

const NOTHING: CheckoutEntry = { tour: null, draft: null };

/*
 * `useSyncExternalStore` calls the snapshot on every render and re-renders
 * whenever the reference changes, so an entry rebuilt each time would loop for
 * ever. These hold the last one, keyed on the raw inputs it was built from.
 */
let lastKey: string | null = null;
let lastEntry: CheckoutEntry = NOTHING;

/** What the server render knows: nothing, because it has neither of them. */
export function noCheckoutEntry(): CheckoutEntry {
  return NOTHING;
}

/**
 * Nothing to subscribe to. The draft is written once, by the submit handler
 * that navigates away, so it cannot change under a mounted form — and a
 * `storage` event would only ever be another tab's checkout, which is none of
 * this one's business.
 */
export function subscribeToCheckoutEntry(): () => void {
  return () => {};
}

/** The live entry, cached so the reference is stable between renders. */
export function readCheckoutEntry(): CheckoutEntry {
  if (typeof window === "undefined") return NOTHING;
  const search = window.location.search;

  let raw: string | null = null;
  if (isCancelReturn(search)) {
    try {
      raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    } catch {
      // Storage blocked or absent — they retype, which is the old behaviour.
    }
  }

  const key = `${search}\u0000${raw ?? ""}`;
  if (key !== lastKey) {
    lastKey = key;
    lastEntry = { tour: tourFromSearch(search), draft: parseCheckoutDraft(raw) };
  }
  return lastEntry;
}

/** Did Stripe send this guest back here by way of "cancel"? */
export function isCancelReturn(search: string): boolean {
  return new URLSearchParams(search).get(CANCEL_RETURN_PARAM) === CANCEL_RETURN_VALUE;
}

/** The tour an experience page asked for, when it named a plausible one. */
export function tourFromSearch(search: string): string | null {
  return slug(new URLSearchParams(search).get(TOUR_PARAM)) ?? null;
}
