"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { privacyContent } from "@/content/privacy";
import { href } from "@/lib/routes";
import {
  readCookieConsent,
  serverConsentSnapshot,
  subscribeToCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";
import { Button } from "@/components/ui/button";

/**
 * Consent for the one third-party embed this site loads.
 *
 * The banner **gates loading**: `FareHarborScript` subscribes to this context and
 * renders nothing until consent is granted, so declining actually prevents the
 * request rather than merely apologising for it. A banner that informs you about
 * a script it has already loaded is worse than no banner — it documents the
 * violation instead of avoiding it.
 *
 * Nothing else is gated. The admin session cookie is strictly necessary, the
 * fonts are self-hosted by `next/font`, and there is no analytics. See
 * `docs/cookies-and-third-parties.md`.
 */
const CookieConsentContext = createContext<CookieConsent>(null);

/** Whether the visitor has allowed the third-party booking embed. */
export function useCookieConsent(): CookieConsent {
  return useContext(CookieConsentContext);
}

export function CookieConsentProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  /*
   * The stored decision is external state, read through `useSyncExternalStore`
   * rather than copied into `useState` inside an effect. The server render (this
   * site is fully static) cannot see the cookie, so its snapshot is `null` and
   * React reconciles the real value on hydration — no mismatch, and no
   * banner-shaped flash for someone who already answered.
   */
  const consent = useSyncExternalStore(
    subscribeToCookieConsent,
    readCookieConsent,
    serverConsentSnapshot,
  );

  const decide = useCallback((value: "granted" | "denied") => {
    writeCookieConsent(value);
  }, []);

  return (
    <CookieConsentContext.Provider value={consent}>
      {children}
      {consent === null ? <CookieBanner locale={locale} onDecide={decide} /> : null}
    </CookieConsentContext.Provider>
  );
}

function CookieBanner({
  locale,
  onDecide,
}: {
  locale: Locale;
  onDecide: (value: "granted" | "denied") => void;
}) {
  const c = privacyContent.cookies;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t(c.title, locale)}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t(c.title, locale)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(c.body, locale)}{" "}
            <Link href={href(locale, "privacidade")} className="underline hover:text-primary">
              {t(c.more, locale)}
            </Link>
          </p>
        </div>
        {/*
          Both choices are one click, equally prominent. "Accept" being easier to
          reach than "Decline" is a dark pattern the EDPB has repeatedly called
          out, and it would make the consent invalid anyway.
        */}
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => onDecide("denied")}>
            {t(c.decline, locale)}
          </Button>
          <Button size="sm" onClick={() => onDecide("granted")}>
            {t(c.accept, locale)}
          </Button>
        </div>
      </div>
    </div>
  );
}
