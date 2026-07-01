import Script from "next/script";
import { FAREHARBOR_SHORTNAME, fareharborConfigured } from "@/lib/fareharbor";

/**
 * Loads the FareHarbor embed script so that links to /embeds/book/<shortname>/…
 * open in a lightbox instead of navigating away. No-op until the shortname is set.
 */
export function FareHarborScript() {
  if (!fareharborConfigured) return null;
  return (
    <Script
      src={`https://fareharbor.com/embeds/api/v1/?autolightframe=yes&shortname=${FAREHARBOR_SHORTNAME}`}
      strategy="afterInteractive"
    />
  );
}
