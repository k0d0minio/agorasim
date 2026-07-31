import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
