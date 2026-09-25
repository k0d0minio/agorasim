import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/config";
import { isAddressHashOptedOut } from "@/lib/email-opt-out";
import { verifyOptOutToken } from "@/lib/email-opt-out-token";
import { OPT_OUT_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { OptOutInvalidPanel, OptOutPanel } from "@/components/opt-out-panel";
import { Section } from "@/components/section";

/**
 * The thank-you's opt-out link: `/[locale]/reserva/deixar-de-receber/<token>`.
 *
 * **Reading only.** This render verifies the token and asks whether the
 * address is already on the list; it writes nothing. The write is the button's
 * POST (`./actions.ts`), so a mail scanner that prefetches every link in an
 * inbox cannot opt a guest out on their behalf.
 *
 * **Never cached, never indexed** — for the cancel page's reasons: the URL
 * carries a credential and the answer is one person's. Not in `lib/routes.ts`,
 * not in the sitemap; the path is built by `optOutPath` in
 * `lib/email-opt-out-token.ts`, which is what the email and this folder agree
 * on. The page links out only to the home page, and
 * `strict-origin-when-cross-origin` keeps the path out of any `Referer`.
 *
 * **One neutral answer for every dead link** — malformed, forged, throttled, or
 * a deployment with no `EMAIL_OPT_OUT_SECRET` — so the page leaks nothing about
 * which it was. It renders with a 200 and a `noindex`: under the locale's
 * streaming `loading.tsx` a 404 after an `await` is not possible here.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OptOutPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  const ip = await clientIp();
  const throttle = await rateLimit(`opt-out-lookup:${ip}`, OPT_OUT_RATE_LIMIT);

  let addressHash: string | null = null;
  let alreadyDone = false;
  if (throttle.allowed) {
    try {
      addressHash = await verifyOptOutToken(token);
      if (addressHash) alreadyDone = await isAddressHashOptedOut(addressHash);
    } catch (err) {
      // No secret, or the database is having a bad moment: the neutral page.
      console.error("[opt-out] lookup failed", err);
      addressHash = null;
    }
  } else {
    console.warn(`[opt-out] throttled lookup from ${ip} — retry in ${throttle.retryAfterSeconds}s`);
  }

  return (
    <Section>
      <div className="mx-auto max-w-xl">
        {addressHash ? (
          <OptOutPanel locale={l} token={token} alreadyDone={alreadyDone} />
        ) : (
          <OptOutInvalidPanel locale={l} />
        )}
      </div>
    </Section>
  );
}
