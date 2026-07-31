"use server";

import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export type TourRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<"name" | "email", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validSlugs = new Set(experiences.map((e) => e.slug));

/**
 * Name of the honeypot input rendered (visually hidden) by the form. Real people
 * never see it, so anything filled in came from a bot that autofilled every
 * field it found.
 */
export const HONEYPOT_FIELD = "company_website";

/**
 * Handle the public onboarding form. Validates the submission, inserts a row
 * into `tour_requests`, and returns a localized success/error state for the
 * client form to render. Errors are localized via the hidden `locale` field.
 *
 * This action is unauthenticated and writes into the table the admin Submissions
 * page reads, so it carries two cheap abuse defences: a honeypot field and
 * per-IP throttling (shared limiter with the admin login — see `lib/rate-limit`).
 */
export async function submitTourRequest(
  _prevState: TourRequestState,
  formData: FormData,
): Promise<TourRequestState> {
  const localeRaw = String(formData.get("locale") ?? "pt");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = tourRequestContent;

  const ip = await clientIp();

  // Honeypot: report success without writing anything, so a bot has no signal
  // that it was caught and nothing to tune against.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim()) {
    console.warn(`[reservar] discarded honeypot submission from ${ip}`);
    return { ok: true };
  }

  const throttle = await rateLimit(`tour-request:${ip}`, TOUR_REQUEST_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[reservar] throttled submission from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { error: t(c.errors.rateLimited, locale) };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const experienceSlug = String(formData.get("experience") ?? "").trim();
  const preferredDate = String(formData.get("preferredDate") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const partySizeRaw = String(formData.get("partySize") ?? "").trim();

  // Add-ons arrive as repeated `addOns` checkbox values.
  const addOns = formData
    .getAll("addOns")
    .map((v) => String(v))
    .filter((slug) => validSlugs.has(slug));

  const fieldErrors: TourRequestState["fieldErrors"] = {};
  if (!name) fieldErrors.name = t(c.errors.name, locale);
  if (!EMAIL_RE.test(email)) fieldErrors.email = t(c.errors.email, locale);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const partySize = Number.parseInt(partySizeRaw, 10);

  try {
    await db.insert(tourRequests).values({
      name,
      email,
      phone: phone || null,
      locale,
      experienceSlug: experienceSlug && validSlugs.has(experienceSlug) ? experienceSlug : null,
      addOns,
      partySize: Number.isFinite(partySize) && partySize > 0 ? partySize : null,
      preferredDate: preferredDate || null,
      message: message || null,
      source: "website",
    });
  } catch (err) {
    console.error("[reservar] failed to store tour request", err);
    return { error: t(c.errors.generic, locale) };
  }

  return { ok: true };
}
