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
 * **What Google returns.** At most five reviews, in Google's "most relevant"
 * order: Places API (New) has no "newest" sort. The page sorts the five newest
 * first and says so. Each review keeps the guest's own words (`originalText`),
 * not Google's translation, so the same five read the same on both locales.
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
 * Read the reviews of the business. Empty when unconfigured or on any failure.
 *
 * The key travels in a header, never in the URL, so a logged URL never carries
 * it. The Place ID is a parameter for the tests; the page uses the one in
 * `content/site.ts`.
 */
export async function getGoogleReviews(
  placeId: string = site.reviews.placeId,
): Promise<GoogleReview[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey || !placeId) return [];

  try {
    const response = await fetch(`${PLACES_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        // Only the reviews: the field mask sets the billed SKU as well as the payload.
        "X-Goog-FieldMask": "reviews",
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
      return [];
    }

    return parsePlaceReviews(await response.json());
  } catch (err) {
    console.error("[reviews] the Google reviews read failed", err);
    captureError(err, {
      area: "reviews",
      tags: { reason: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network" },
      level: "warning",
    });
    return [];
  }
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
