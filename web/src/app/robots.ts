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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${site.domain}/sitemap.xml`,
    host: site.domain,
  };
}
