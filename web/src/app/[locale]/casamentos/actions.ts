"use server";

import { db, tourRequests } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { weddingsContent } from "@/content/weddings";
import { MARKETING_CONSENT_VERSION } from "@/content/privacy";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import {
  formValues,
  weddingQuoteSchema,
  type WeddingQuoteField,
} from "@/lib/form-schemas";

export type WeddingQuoteState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<WeddingQuoteField, string>>;
};

/**
 * Handle the wedding quote form (`/casamentos`).
 *
 * The same shape as the tour enquiry: unauthenticated, so it carries the
 * honeypot and the per-IP throttle, and it writes a lead the Sales board reads
 * — `kind: "wedding"`, which is the split the board leads with. Quoting stays
 * a human reply (estate rule: no outbound action without review); this only
 * records the couple's ask, faithfully.
 *
 * Venue, hours and car have no columns of their own — they compose into the
 * message with labels, so the lead card reads as a sentence a person wrote and
 * nothing the couple typed is thrown away.
 */
export async function submitWeddingQuote(
  _prevState: WeddingQuoteState,
  formData: FormData,
): Promise<WeddingQuoteState> {
  const values = formValues(formData);
  const localeRaw = String(values.locale ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = weddingsContent.quote.errors;

  const ip = await clientIp();

  // Honeypot: report success without writing anything, so a bot has no signal
  // that it was caught and nothing to tune against.
  if (String(values[HONEYPOT_FIELD] ?? "").trim()) {
    console.warn(`[casamentos] discarded honeypot submission from ${ip}`);
    return { ok: true };
  }

  const throttle = await rateLimit(`wedding-quote:${ip}`, TOUR_REQUEST_RATE_LIMIT);
  if (!throttle.allowed) {
    return { error: t(c.rateLimited, locale) };
  }

  const parsed = weddingQuoteSchema.safeParse(values);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: WeddingQuoteState["fieldErrors"] = {};
    if (flat.names) fieldErrors.names = t(c.names, locale);
    if (flat.email) fieldErrors.email = t(c.email, locale);
    return Object.keys(fieldErrors).length > 0
      ? { fieldErrors }
      : { error: t(c.generic, locale) };
  }

  const quote = parsed.data;

  // "Local: Igreja de São Pedro · Horas: Dia inteiro · Carro: Josefina" — the
  // labels stay Portuguese because the reader is the team, not the couple.
  const details = [
    quote.venue ? `Local: ${quote.venue}` : null,
    quote.hours ? `Horas: ${quote.hours}` : null,
    quote.car ? `Carro: ${quote.car}` : null,
  ].filter(Boolean);
  const message =
    [details.join(" · "), quote.message].filter(Boolean).join("\n\n") || null;

  try {
    await db.insert(tourRequests).values({
      name: quote.names,
      email: quote.email,
      phone: quote.phone,
      locale,
      kind: "wedding",
      addOns: [],
      preferredDate: quote.date,
      message,
      source: "website",
      marketingConsent: quote.marketingConsent,
      marketingConsentAt: quote.marketingConsent ? new Date() : null,
      marketingConsentVersion: quote.marketingConsent ? MARKETING_CONSENT_VERSION : null,
    });
  } catch (err) {
    console.error("[casamentos] failed to store wedding quote request", err);
    return { error: t(c.generic, locale) };
  }

  return { ok: true };
}
