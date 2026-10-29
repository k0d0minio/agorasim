/**
 * The business's Google reviews, read on the server.
 *
 * **Why on the server.** The privacy policy promises that a visit sends no
 * request to Google and sets no cookie. So the page never embeds a widget or a
 * script: the server asks Places API (New) for the place's `reviews` field and
 * renders plain HTML. The browser sees text and an outbound link, nothing else
 * — no author photo either, because a photo would be a request to Google.
 *
 * **Never throws.** A missing key, a missing Place ID, a refusal, a timeout or
 * an empty answer all come back as an empty list, and the experience page then
 * shows its static testimonials as before. A preview or a local checkout
 * without the key is a supported state, not an error.
 *
 * **Caching.** The fetch revalidates on the same hourly window as the
 * experience pages, so one page render costs at most one billed call per hour.
 *
 * **What Google returns.** The average rating, the count of ratings, and at
 * most five reviews, in Google's "most relevant" order: Places API (New) has
 * no "newest" sort. The page sorts the five newest first and says so. Each
 * review keeps the guest's own words (`originalText`), not Google's
 * translation, so the same five read the same on both locales.
 *
 * **No review text is normal for Agorasim.** The listing is a service-area
 * business (no public address), and Google returns the rating and the count
 * for it but no review text. The page then keeps its static quotes and still
 * shows the rating, linked to Google Maps.
 */
import "server-only";

import { site } from "@/content/site";
import { captureAlert, captureError } from "@/lib/observability";

export type GoogleReview = {
  /** The author's name exactly as Google shows it — Google's attribution rule. */
  author: string;
  /** The author's Google Maps profile, when Google gives one. */
  authorUri: string | null;
  /** Whole stars, 1 to 5. */
  rating: number;
  /** The guest's own words, in the language they wrote them. */
  text: string;
  /** ISO 8601, as Google sends it. */
  publishedAt: string;
};

/** What the page shows from Google: the rating summary and any review text. */
export type GooglePlaceReviews = {
  /** The average rating, 1 to 5, or null when Google gives none. */
  rating: number | null;
  /** How many ratings the average is over; 0 when Google gives none. */
  ratingCount: number;
  reviews: GoogleReview[];
};

const NONE: GooglePlaceReviews = { rating: null, ratingCount: 0, reviews: [] };

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places";
/** Matches the experience pages' `revalidate`. */
const REVALIDATE_SECONDS = 3600;
/** A slow Google must not hold the page render; the fallback is fine. */
const FETCH_TIMEOUT_MS = 5_000;
/** Places API (New) never returns more; the cap keeps that a fact here too. */
const MAX_REVIEWS = 5;

/** The Google Maps page of the business, where every review can be read. */
export function googleMapsPlaceUrl(placeId: string = site.reviews.placeId): string {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

/**
 * Read the rating and the reviews of the business. Nothing when unconfigured or
 * on any failure.
 *
 * The key travels in a header, never in the URL, so a logged URL never carries
 * it. The Place ID is a parameter for the tests; the page uses the one in
 * `content/site.ts`.
 */
export async function getGooglePlaceReviews(
  placeId: string = site.reviews.placeId,
): Promise<GooglePlaceReviews> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    logOnce("no-key", "GOOGLE_PLACES_API_KEY is not set: the pages show the static testimonials");
    return NONE;
  }
  if (!placeId) {
    logOnce("no-place", "site.reviews.placeId is empty: the pages show the static testimonials");
    return NONE;
  }

  try {
    const response = await fetch(`${PLACES_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        // Only these fields: the field mask sets the billed SKU as well as the payload.
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      // Google's body names the reason (key not enabled for the API, bad Place
      // ID). It never echoes the key.
      console.error(
        `[reviews] Google refused the reviews read (${response.status}): ${await response
          .text()
          .catch(() => "<no body>")}`,
      );
      captureAlert("Google refused the reviews read", {
        area: "reviews",
        tags: { reason: "refused", status: String(response.status) },
        level: "warning",
      });
      return NONE;
    }

    const body: unknown = await response.json();
    const result = { ...parseRatingSummary(body), reviews: parsePlaceReviews(body) };
    if (result.reviews.length === 0) {
      logOnce(
        "no-text",
        `Google returned no review text (${result.ratingCount} ratings): ` +
          "the pages show the static testimonials and the rating",
      );
    }
    return result;
  } catch (err) {
    console.error("[reviews] the Google reviews read failed", err);
    captureError(err, {
      area: "reviews",
      tags: { reason: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network" },
      level: "warning",
    });
    return NONE;
  }
}

/**
 * Each silent fallback says so once per server process. A build renders every
 * experience page through this, and one line per page would bury the rest of
 * the build log. `resetReviewLogs` clears it for the tests.
 */
const logged = new Set<string>();

function logOnce(reason: string, message: string): void {
  if (logged.has(reason)) return;
  logged.add(reason);
  console.info(`[reviews] ${message}`);
}

/** For the tests: forget which fallbacks have been logged. */
export function resetReviewLogs(): void {
  logged.clear();
}

/**
 * The rating and the count, from a Place Details body. A rating outside 1–5 or
 * a count of 0 is no rating: the page then shows no number.
 */
export function parseRatingSummary(body: unknown): Pick<GooglePlaceReviews, "rating" | "ratingCount"> {
  const place = (body ?? {}) as { rating?: unknown; userRatingCount?: unknown };
  const count =
    typeof place.userRatingCount === "number" && place.userRatingCount > 0
      ? Math.floor(place.userRatingCount)
      : 0;
  const rating =
    typeof place.rating === "number" && place.rating >= 1 && place.rating <= 5 && count > 0
      ? place.rating
      : null;
  return { rating, ratingCount: rating === null ? 0 : count };
}

type LocalizedText = { text?: unknown };
type PlaceReview = {
  rating?: unknown;
  text?: LocalizedText;
  originalText?: LocalizedText;
  authorAttribution?: { displayName?: unknown; uri?: unknown };
  publishTime?: unknown;
};

/**
 * Turn a Place Details body into the reviews the page shows: newest first,
 * at most five, and only those with a name, a 1–5 rating, words and a date.
 * A rating-only review has no text to quote, so it is left out. Pure, and
 * exported for its test.
 */
export function parsePlaceReviews(body: unknown): GoogleReview[] {
  const reviews = (body as { reviews?: unknown } | null)?.reviews;
  if (!Array.isArray(reviews)) return [];

  const parsed: GoogleReview[] = [];
  for (const review of reviews as PlaceReview[]) {
    const author = asText(review.authorAttribution?.displayName);
    const text = asText(review.originalText?.text) ?? asText(review.text?.text);
    const publishedAt = asText(review.publishTime);
    const rating = typeof review.rating === "number" ? Math.round(review.rating) : NaN;
    if (!author || !text || !publishedAt || Number.isNaN(Date.parse(publishedAt))) continue;
    if (!(rating >= 1 && rating <= 5)) continue;
    parsed.push({
      author,
      authorUri: asHttpsUrl(review.authorAttribution?.uri),
      rating,
      text,
      publishedAt,
    });
  }

  return parsed
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_REVIEWS);
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Only an https link becomes an `href`; anything else is dropped. */
function asHttpsUrl(value: unknown): string | null {
  const url = asText(value);
  return url && url.startsWith("https://") ? url : null;
}
