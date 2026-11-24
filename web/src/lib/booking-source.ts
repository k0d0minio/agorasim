/**
 * Where a guest's visit started, kept with the booking (JAM-506).
 *
 * Two values and no more: the `utm_source` of the landing address (ChatGPT
 * puts `utm_source=chatgpt.com` on its links) and the host of the page that
 * sent the guest. It is a field of the booking, not a tracker: no script of a
 * third party, no cookie, no identifier of the visitor, nothing between two
 * visits.
 *
 * **The tab keeps them until the form is sent.** The first page of a browser
 * tab writes them once to `sessionStorage`, under its own key beside the
 * booking draft's (`lib/checkout-draft.ts`), and no later page changes them:
 * the second page of a visit has this site as its referrer and no
 * `utm_source`, so the first page is the only one that knows. The key dies
 * with the tab (Jamie, 2026-11-23: "Use sessionStorage").
 *
 * **Nothing here is trusted.** The values come from the browser, so the server
 * cleans them again with the same two functions before it stores them. A value
 * that is not valid is dropped and the booking continues: the source never
 * decides a price, a seat or a refusal.
 *
 * **Only the host of the referrer is kept.** A path or a query can hold what a
 * person searched for or the address of a private page. `referrerHost` is the
 * one way in, on the client and on the server.
 *
 * The file has no server import: the browser, the server actions and the
 * Sales board all read it.
 */
import { todayKey } from "@/lib/date-keys";

/** Where the tab keeps the two values, as JSON `{ utm, ref }`. */
export const SOURCE_STORAGE_KEY = "agorasim:booking-source";

/** The hidden form fields that carry the two values to the server. */
export const SOURCE_UTM_FIELD = "landingUtmSource";
export const SOURCE_REFERRER_FIELD = "landingReferrer";

/** Fired on `window` after the tab's record is written. */
export const SOURCE_CHANGE_EVENT = "agorasim:booking-source";

/** The two columns, as `tour_requests` and `bookings` hold them. */
export type StoredSource = {
  /** Null when the landing address had no valid `utm_source`. */
  landingUtmSource: string | null;
  /** Null: not recorded. Empty: recorded, and the visit had no referrer. */
  landingReferrerHost: string | null;
};

/** A row that has no record: one from before JAM-506, or one from the console. */
export const NO_SOURCE: StoredSource = {
  landingUtmSource: null,
  landingReferrerHost: null,
};

/** The label of a row with no record. */
export const SOURCE_NOT_RECORDED = "Sem registo";
/** The label of a recorded visit with no `utm_source` and no referrer. */
export const SOURCE_DIRECT = "Direta ou desconhecida";

const MAX_UTM = 64;
/** `chatgpt.com`, `newsletter_nov`, `instagram`. Lower case, no spaces. */
const UTM_RE = /^[a-z0-9][a-z0-9._-]*$/;
/** A DNS name, or the package name of an Android app. */
const HOST_RE = /^[a-z0-9](?:[a-z0-9._-]{0,251}[a-z0-9])?$/;
/**
 * Google Search: `google.com`, `www.google.pt`, `google.co.uk`. Not
 * `mail.google.com`: a link in a Gmail message is not a search result.
 */
const GOOGLE_HOST_RE = /^(?:www\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/;
/** The Google app on Android, which sends its package name as the referrer. */
const GOOGLE_APP_HOST = "com.google.android.googlequicksearchbox";

/** The `utm_source` in its stored form, or null when it is absent or not valid. */
export function cleanUtmSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim().toLowerCase();
  if (source.length === 0 || source.length > MAX_UTM) return null;
  return UTM_RE.test(source) ? source : null;
}

/** The host of an address or of a bare host name, lower case, or "". */
function hostOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim().toLowerCase();
  if (!text || text.length > 2000) return "";
  let url: URL;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    return "";
  }
  // The Google app on Android sends `android-app://com.google.…/`.
  if (!["http:", "https:", "android-app:"].includes(url.protocol)) return "";
  const host = url.hostname.replace(/\.$/, "");
  return HOST_RE.test(host) ? host : "";
}

const withoutWww = (host: string) => host.replace(/^www\./, "");

/**
 * The host of a referrer, and nothing else of it.
 *
 * Returns "" for no referrer, for one that is not valid, and for a page of this
 * site: `ownHosts` are this site's own addresses or host names. A visit that
 * started on our own page was not sent by anyone.
 */
export function referrerHost(value: unknown, ownHosts: readonly string[] = []): string {
  const host = hostOf(value);
  if (!host) return "";
  const own = new Set(ownHosts.map((entry) => withoutWww(hostOf(entry))));
  return own.has(withoutWww(host)) ? "" : host;
}

/**
 * The two columns from a posted form.
 *
 * A form that carries neither field was sent by a page that made no record (a
 * tab that blocks its storage, a page cached before JAM-506): the row then
 * says "not recorded", which is true. A form with a field makes a record, and
 * a value that is not valid is dropped.
 */
export function sourceFromForm(
  values: Record<string, unknown>,
  ownHosts: readonly string[] = [],
): StoredSource {
  const utm = values[SOURCE_UTM_FIELD];
  const referrer = values[SOURCE_REFERRER_FIELD];
  if (utm === undefined && referrer === undefined) return NO_SOURCE;
  return {
    landingUtmSource: cleanUtmSource(utm),
    landingReferrerHost: referrerHost(referrer, ownHosts),
  };
}

/** True when the row has a record of its source. */
export function isSourceRecorded(source: StoredSource): boolean {
  return source.landingReferrerHost !== null || source.landingUtmSource !== null;
}

/**
 * The name of a source, as the Sales board shows and counts it.
 *
 * The `utm_source` wins: the sender chose it. Without one it is the referrer
 * host with no `www.`. Each Google Search host is `google`, because Google has
 * one host for each country and they are one source.
 */
export function sourceLabel(source: StoredSource): string {
  if (!isSourceRecorded(source)) return SOURCE_NOT_RECORDED;
  if (source.landingUtmSource) return source.landingUtmSource;
  const host = source.landingReferrerHost ?? "";
  if (!host) return SOURCE_DIRECT;
  if (GOOGLE_HOST_RE.test(host) || host === GOOGLE_APP_HOST) return "google";
  return withoutWww(host);
}

// ---------------------------------------------------------------------------
// The count for each month
// ---------------------------------------------------------------------------

/** One month of the count: `2026-11`, and its sources, the largest first. */
export type SourceMonth = {
  month: string;
  total: number;
  sources: { label: string; bookings: number }[];
};

/** How many months the Sales board shows, this month included. */
export const SOURCE_MONTHS = 6;

/** `2026-11` for a moment, in the business time zone. */
export function monthKey(moment: Date): string {
  return todayKey(moment).slice(0, 7);
}

/** The last `count` months, this month first. */
export function recentMonths(now: Date = new Date(), count = SOURCE_MONTHS): string[] {
  const [year, month] = monthKey(now).split("-").map(Number);
  return Array.from({ length: count }, (_, back) => {
    const index = year * 12 + (month - 1) - back;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

/**
 * The bookings of each source for each recent month.
 *
 * The month is the month the booking was made in, not the month of the tour:
 * the question is which channel brought the sale, and that happened on the day
 * of the payment. Every month of the window is in the answer, also one with no
 * booking, so that an empty month reads as zero and not as a gap.
 */
export function tallySourcesByMonth(
  rows: readonly (StoredSource & { createdAt: Date })[],
  now: Date = new Date(),
  count = SOURCE_MONTHS,
): SourceMonth[] {
  const months = new Map<string, Map<string, number>>(
    recentMonths(now, count).map((month) => [month, new Map()]),
  );
  for (const row of rows) {
    const tally = months.get(monthKey(row.createdAt));
    if (!tally) continue;
    const label = sourceLabel(row);
    tally.set(label, (tally.get(label) ?? 0) + 1);
  }
  return [...months].map(([month, tally]) => {
    const sources = [...tally]
      .map(([label, bookings]) => ({ label, bookings }))
      .sort((a, b) => b.bookings - a.bookings || a.label.localeCompare(b.label, "pt"));
    return {
      month,
      total: sources.reduce((sum, entry) => sum + entry.bookings, 0),
      sources,
    };
  });
}

// ---------------------------------------------------------------------------
// The browser side
// ---------------------------------------------------------------------------

/** What the tab holds: the cleaned `utm_source` and the referrer host. */
export type TabSource = { utm: string; ref: string };

/** The tab's record from its stored text, cleaned again, or null. */
export function parseTabSource(raw: string | null | undefined): TabSource | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  return {
    utm: cleanUtmSource(record.utm) ?? "",
    ref: referrerHost(record.ref),
  };
}

/** The record of a first page: its address query and its referrer. */
export function tabSourceOf(page: {
  search: string;
  referrer: string;
  hostname: string;
}): TabSource {
  return {
    utm: cleanUtmSource(new URLSearchParams(page.search).get("utm_source")) ?? "",
    ref: referrerHost(page.referrer, [page.hostname]),
  };
}

/**
 * Write the tab's record, one time. Call it from the browser only.
 *
 * A tab that has a record keeps it: the first page decides. Every storage call
 * is wrapped, because `sessionStorage` throws in a browser that blocks it, and
 * a visit with no record is a booking that says "not recorded", not an error.
 */
export function captureTabSource(): void {
  try {
    const storage = window.sessionStorage;
    if (storage.getItem(SOURCE_STORAGE_KEY) !== null) return;
    const record = tabSourceOf({
      search: window.location.search,
      referrer: document.referrer,
      hostname: window.location.hostname,
    });
    storage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(SOURCE_CHANGE_EVENT));
}

/** The stored text of the tab's record, or "" — a stable snapshot for React. */
export function readTabSource(): string {
  try {
    return window.sessionStorage.getItem(SOURCE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Tell a reader when the tab's record is written. */
export function subscribeToTabSource(onChange: () => void): () => void {
  window.addEventListener(SOURCE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(SOURCE_CHANGE_EVENT, onChange);
}
