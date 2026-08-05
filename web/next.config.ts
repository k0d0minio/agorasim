import type { NextConfig } from "next";

import { BASELINE_SECURITY_HEADERS, PUBLIC_CSP } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Nothing gains from advertising the framework and its version.
  poweredByHeader: false,

  /**
   * Experience photos uploaded from `/admin/experiences` live in Vercel Blob,
   * on the store's own public host. Without this allowance `next/image` would
   * refuse to optimize them and every uploaded photo would 400 — silently, and
   * only for the images an operator added rather than a developer.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },

  /**
   * Security headers. The baseline set applies everywhere; the Content-Security
   * -Policy is split, because the two halves of this app render differently and
   * are exposed differently — see `src/lib/security-headers.ts`.
   *
   * The public policy is attached here, to everything *except* `/admin`. The
   * admin policy is attached by `proxy.ts`, which can mint a per-request nonce.
   * The exclusion is what keeps the two from fighting: a `next.config` header
   * and a proxy header on the same path and the same key is a coin toss over
   * which one survives, and the loser being the stricter policy is not a failure
   * mode worth having.
   */
  async headers() {
    return [
      { source: "/:path*", headers: [...BASELINE_SECURITY_HEADERS] },
      {
        source: "/:path((?!admin$|admin/).*)",
        headers: [{ key: "Content-Security-Policy", value: PUBLIC_CSP }],
      },
    ];
  },

  async redirects() {
    return [
      // No locale-less routes exist; send the bare root to the default locale.
      { source: "/", destination: "/pt", permanent: false },

      /*
       * The privacy policy is the one route whose segment differs per locale
       * (`privacidade` / `privacy` — see `src/lib/routes.ts`). Next builds a
       * folder per segment under `[locale]`, so the two wrong combinations
       * exist as routes whether we want them or not.
       *
       * Redirecting them is better than 404ing them: the pages *do* 404 on
       * their own, but a prerendered `notFound()` is served with a 200 and a
       * "not found" body — a soft 404, which search engines treat as a
       * duplicate rather than as gone. A permanent redirect gives each locale
       * exactly one canonical URL and a real status code.
       *
       * Add a pair here whenever another route gains a localized segment.
       */
      { source: "/pt/privacy", destination: "/pt/privacidade", permanent: true },
      { source: "/en/privacidade", destination: "/en/privacy", permanent: true },

      /*
       * Submissions, the CRM pipeline and Bookings were three admin screens over
       * one dataset; they are now two views of `/admin/sales`. These keep the
       * bookmarks and the home-screen shortcuts working — an operator who
       * installed the admin as an app has "Submissions" pinned somewhere.
       *
       * Temporary, not permanent: a 308 would be cached by the browser forever,
       * and these paths are ours to reuse when bookings get a table of their own.
       */
      { source: "/admin/submissions", destination: "/admin/sales", permanent: false },
      { source: "/admin/crm", destination: "/admin/sales", permanent: false },
      { source: "/admin/bookings", destination: "/admin/sales", permanent: false },

      /*
       * The Content screen is retired — the Blog and Social studios are the
       * content surfaces now. Same reasoning as the trio above: bookmarks and
       * home-screen shortcuts keep working, and temporary rather than
       * permanent so the path stays ours to reuse.
       */
      { source: "/admin/content", destination: "/admin/blog", permanent: false },
    ];
  },
};

export default nextConfig;
