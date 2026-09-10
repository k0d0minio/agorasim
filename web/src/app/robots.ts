import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/**
 * Explicitly welcome AI/generative-engine crawlers (GEO) alongside traditional
 * search bots. Listing them by name makes the intent auditable and future-proof.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

/**
 * A Vercel deployment that is not the production one — a preview or a branch
 * deploy. Unset means "not on Vercel" (local, CI, self-hosted), which is left
 * alone: a real production behind another host must not lock crawlers out of
 * itself by accident.
 */
function isNonProductionDeployment(): boolean {
  const env = process.env.VERCEL_ENV;
  return Boolean(env) && env !== "production";
}

export default function robots(): MetadataRoute.Robots {
  /*
   * Previews carry production canonicals (see `lib/site-origin.ts`), so a
   * crawler is already pointed home; refusing it the preview outright is the
   * second lock on the same door. No sitemap is advertised from a preview.
   */
  if (isNonProductionDeployment()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/admin" },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: "/admin",
      })),
    ],
    sitemap: `${site.domain}/sitemap.xml`,
    host: site.domain,
  };
}
