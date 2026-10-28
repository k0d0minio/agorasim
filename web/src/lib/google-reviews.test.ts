import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureAlert, captureError } from "@/lib/observability";
import { getGoogleReviews, googleMapsPlaceUrl, parsePlaceReviews } from "@/lib/google-reviews";

/**
 * The experience pages show Google reviews only when this read succeeds, and
 * their static testimonials otherwise. So the contract worth pinning is the
 * fallback — every failure is an empty list, never a throw — and the request:
 * the key travels in a header and the field mask asks for the reviews only.
 */

vi.mock("@/lib/observability", () => ({
  captureAlert: vi.fn(),
  captureError: vi.fn(),
}));

const PLACE_ID = "ChIJ_test_place";
const fetchMock = vi.fn<typeof fetch>();

function review(overrides: Record<string, unknown> = {}) {
  return {
    rating: 5,
    text: { text: "Translated words", languageCode: "en" },
    originalText: { text: "Palavras originais", languageCode: "pt" },
    authorAttribution: {
      displayName: "Ana Silva",
      uri: "https://www.google.com/maps/contrib/123",
      photoUri: "https://lh3.googleusercontent.com/a/photo",
    },
    publishTime: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-places-key");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(reply({ reviews: [review()] }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(captureAlert).mockClear();
  vi.mocked(captureError).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parsePlaceReviews", () => {
  it("keeps the guest's own words, the name, the stars and the date, and no photo", () => {
    expect(parsePlaceReviews({ reviews: [review()] })).toEqual([
      {
        author: "Ana Silva",
        authorUri: "https://www.google.com/maps/contrib/123",
        rating: 5,
        text: "Palavras originais",
        publishedAt: "2026-09-01T10:00:00Z",
      },
    ]);
  });

  it("falls back to Google's text when there is no original", () => {
    const [parsed] = parsePlaceReviews({ reviews: [review({ originalText: undefined })] });
    expect(parsed.text).toBe("Translated words");
  });

  it("sorts newest first and keeps five at most", () => {
    const dates = ["2026-01-01", "2026-06-01", "2026-03-01", "2026-09-01", "2026-02-01", "2026-04-01"];
    const parsed = parsePlaceReviews({
      reviews: dates.map((day) => review({ publishTime: `${day}T00:00:00Z` })),
    });
    expect(parsed.map((entry) => entry.publishedAt.slice(0, 10))).toEqual([
      "2026-09-01",
      "2026-06-01",
      "2026-04-01",
      "2026-03-01",
      "2026-02-01",
    ]);
  });

  it("drops a review with no words, no name, no date or a rating out of range", () => {
    const parsed = parsePlaceReviews({
      reviews: [
        review({ text: undefined, originalText: undefined }),
        review({ authorAttribution: { displayName: " " } }),
        review({ publishTime: "not a date" }),
        review({ rating: 0 }),
        review({ rating: 6 }),
        review(),
      ],
    });
    expect(parsed).toHaveLength(1);
  });

  it("links the author only over https", () => {
    const [parsed] = parsePlaceReviews({
      reviews: [review({ authorAttribution: { displayName: "Ana", uri: "javascript:alert(1)" } })],
    });
    expect(parsed.authorUri).toBeNull();
  });

  it("reads a body with no reviews as none", () => {
    expect(parsePlaceReviews({})).toEqual([]);
    expect(parsePlaceReviews(null)).toEqual([]);
    expect(parsePlaceReviews({ reviews: "nope" })).toEqual([]);
  });
});

describe("getGoogleReviews", () => {
  it("asks Places API (New) for the reviews only, with the key in a header", async () => {
    const reviews = await getGoogleReviews(PLACE_ID);

    expect(reviews).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`https://places.googleapis.com/v1/places/${PLACE_ID}`);
    expect(String(url)).not.toContain("test-places-key");
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-places-key");
    expect(headers["X-Goog-FieldMask"]).toBe("reviews");
  });

  it("makes no call without a key", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    expect(await getGoogleReviews(PLACE_ID)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes no call without a Place ID", async () => {
    expect(await getGoogleReviews("")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns none and raises an alert when Google refuses", async () => {
    fetchMock.mockResolvedValue(reply({ error: { status: "PERMISSION_DENIED" } }, 403));
    expect(await getGoogleReviews(PLACE_ID)).toEqual([]);
    expect(captureAlert).toHaveBeenCalledOnce();
  });

  it("returns none and reports the error when the call fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await getGoogleReviews(PLACE_ID)).toEqual([]);
    expect(captureError).toHaveBeenCalledOnce();
  });

  it("returns none when Google has no reviews", async () => {
    fetchMock.mockResolvedValue(reply({}));
    expect(await getGoogleReviews(PLACE_ID)).toEqual([]);
  });
});

describe("googleMapsPlaceUrl", () => {
  it("opens the place on Google Maps", () => {
    expect(googleMapsPlaceUrl(PLACE_ID)).toBe(
      `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
    );
  });
});
