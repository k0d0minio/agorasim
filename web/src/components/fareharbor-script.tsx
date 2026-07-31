"use client";

import Script from "next/script";
import { FAREHARBOR_SHORTNAME, fareharborConfigured } from "@/lib/fareharbor";
import { useCookieConsent } from "@/components/cookie-consent";

/**
 * Loads the FareHarbor embed script so that links to /embeds/book/<shortname>/…
 * open in a lightbox instead of navigating away.
 *
 * Two gates, and the second is the point: no-op until the shortname is set, and
 * no-op until the visitor has accepted the cookie notice. FareHarbor is a
 * third-party service on a third-party origin and its embed is not strictly
 * necessary for the site to function, so it may not load before consent.
 *
 * Declining costs the lightbox, not the booking: `BookingButton` still links
 * straight to FareHarbor's own booking page, which then opens there instead of
 * over ours. That is exactly why gating this is affordable — see
 * `docs/cookies-and-third-parties.md`.
 */
export function FareHarborScript() {
  const consent = useCookieConsent();

  if (!fareharborConfigured) return null;
  if (consent !== "granted") return null;

  return (
    <Script
      src={`https://fareharbor.com/embeds/api/v1/?autolightframe=yes&shortname=${FAREHARBOR_SHORTNAME}`}
      strategy="afterInteractive"
    />
  );
}
