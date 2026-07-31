/**
 * Reading and writing the cookie-banner decision.
 *
 * Pure string/`document.cookie` handling, kept out of the components so the
 * parsing is unit-testable and so there is exactly one definition of what the
 * stored values mean.
 *
 * Only one category is gated: the FareHarbor booking embed. The admin session
 * cookie is strictly necessary and is not covered here — it is not gateable and
 * does not need consent. There is no analytics. See
 * `docs/cookies-and-third-parties.md`.
 */
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
} from "@/content/privacy";

/** `null` means "not asked yet" — distinct from an explicit "no". */
export type CookieConsent = "granted" | "denied" | null;

/** Parse a decision out of a raw `document.cookie` string. */
export function parseCookieConsent(cookieHeader: string): CookieConsent {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== COOKIE_CONSENT_COOKIE) continue;
    const value = rest.join("=");
    if (value === "granted" || value === "denied") return value;
    // Anything else is a stale or hand-edited value: ask again rather than guess.
    return null;
  }
  return null;
}

/** The `document.cookie` assignment that stores a decision. */
export function cookieConsentAssignment(value: Exclude<CookieConsent, null>): string {
  const attributes = [
    `${COOKIE_CONSENT_COOKIE}=${value}`,
    "path=/",
    `max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS}`,
    // Lax, not None: this cookie is never needed on a cross-site request.
    "SameSite=Lax",
  ];
  // `secure` would stop the cookie being stored over plain http on localhost.
  if (typeof location !== "undefined" && location.protocol === "https:") {
    attributes.push("Secure");
  }
  return attributes.join("; ");
}

/** The current decision in the browser. Always `null` on the server. */
export function readCookieConsent(): CookieConsent {
  if (typeof document === "undefined") return null;
  return parseCookieConsent(document.cookie);
}

/** Persist a decision in the browser and tell subscribers. */
export function writeCookieConsent(value: Exclude<CookieConsent, null>): void {
  if (typeof document === "undefined") return;
  document.cookie = cookieConsentAssignment(value);
  for (const listener of listeners) listener();
}

/*
 * The cookie is an external store, so components read it through
 * `useSyncExternalStore` rather than copying it into state in an effect.
 *
 * `document.cookie` emits no events of its own, so the only thing that can
 * change the value within a session is `writeCookieConsent` above, which
 * notifies. The site is fully static, so the server render cannot know the
 * value: `serverConsentSnapshot` returns `null` and React reconciles after
 * hydration without a mismatch.
 */
const listeners = new Set<() => void>();

export function subscribeToCookieConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot for the server render and for hydration: nothing is known yet. */
export function serverConsentSnapshot(): CookieConsent {
  return null;
}
