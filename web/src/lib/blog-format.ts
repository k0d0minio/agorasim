import type { Locale } from "@/i18n/config";

/** Format an ISO post date ("2026-07-14") for display in the given locale. */
export function formatPostDate(iso: string, locale: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(
    locale === "pt" ? "pt-PT" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
}
