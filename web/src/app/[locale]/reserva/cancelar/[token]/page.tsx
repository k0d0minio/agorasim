import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/config";
import { resolveGuestCancellation } from "@/lib/booking-cancellation";
import { CANCELLATION_LOOKUP_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { CancelBookingPanel, UnknownPanel } from "@/components/cancel-booking-panel";
import { Section } from "@/components/section";

/**
 * The guest's cancel link: `/[locale]/reserva/cancelar/<token>`.
 *
 * **Never cached, never prerendered.** The URL carries a credential and the
 * page renders one person's booking, which is the one thing the note in
 * `AGENTS.md` says must not go on a public, ISR-cached page. It also reads the
 * client IP to throttle, which would make it dynamic anyway.
 *
 * **Deliberately not in `lib/routes.ts`**, exactly like the confirmation page
 * it sits beside. It is a transactional page reached once, from a link in
 * somebody's inbox: it has no place in the nav, the sitemap or the hreflang
 * set, and it carries a `noindex` so a crawler that finds the URL in a referrer
 * log does not put a guest's booking into search results. The path is built by
 * `cancellationPath` in `lib/cancellation-token.ts`, which is what the email
 * and this folder agree on.
 *
 * **The token does not leak out of the tab.** It is a path segment on a page
 * that links to `wa.me` and to a maps pin, so the question is what a `Referer`
 * carries: `strict-origin-when-cross-origin` (`lib/security-headers.ts`) sends
 * the origin and never the path to another site, which is what keeps the
 * credential here. Nothing on this page may weaken that header.
 *
 * **The page decides nothing.** It resolves the token and hands the answer to
 * the panel; the 48-hour window is re-checked on submit, because this render
 * may be hours old by then.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CancelBookingPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  /*
   * Throttled on the way in, before the token is hashed or looked up.
   *
   * A token is 32 bytes out of the CSPRNG, so guessing one is hopeless with or
   * without this — what the limit buys is that trying costs the attacker a
   * rejected request rather than us a database round-trip. A throttled caller
   * gets the same neutral page a wrong token gets, so the limit itself leaks
   * nothing about whether the link was real.
   */
  const ip = await clientIp();
  const throttle = await rateLimit(
    `cancel-lookup:${ip}`,
    CANCELLATION_LOOKUP_RATE_LIMIT,
  );

  const view = throttle.allowed
    ? await resolveGuestCancellation({ token, locale: l })
    : ({ kind: "unknown" } as const);

  if (!throttle.allowed) {
    console.warn(
      `[cancel] throttled lookup from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
  }

  return (
    <Section>
      <div className="mx-auto max-w-xl">
        {view.kind === "unknown" ? (
          <UnknownPanel locale={l} />
        ) : (
          <CancelBookingPanel
            locale={l}
            token={token}
            summary={view.summary}
            open={view.open}
          />
        )}
      </div>
    </Section>
  );
}
