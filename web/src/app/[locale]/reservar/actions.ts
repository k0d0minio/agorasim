"use server";

import { z } from "zod";
import { db, tourRequests } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { MARKETING_CONSENT_VERSION } from "@/content/privacy";
import { listExperiences } from "@/lib/experience-catalogue";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { formValues, tourRequestSchema, type TourRequestField } from "@/lib/form-schemas";

export type TourRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<TourRequestField, string>>;
};

/**
 * Handle the public onboarding form. Validates the submission, inserts a row
 * into `tour_requests`, and returns a localized success/error state for the
 * client form to render.
 *
 * This action is unauthenticated and writes into the table the admin Submissions
 * page reads, so it carries two cheap abuse defences: a honeypot field and
 * per-IP throttling (shared limiter with the admin login — see `lib/rate-limit`).
 *
 * The schema decides *what* is invalid; the copy for *saying so* is bilingual
 * and lives in `content/tour-request.ts`, so failed fields are mapped onto it
 * here rather than carrying messages in the schema.
 */
export async function submitTourRequest(
  _prevState: TourRequestState,
  formData: FormData,
): Promise<TourRequestState> {
  const values = formValues(formData);
  const localeRaw = String(values.locale ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = tourRequestContent;

  const ip = await clientIp();

  // Honeypot: report success without writing anything, so a bot has no signal
  // that it was caught and nothing to tune against.
  if (String(values[HONEYPOT_FIELD] ?? "").trim()) {
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

  const parsed = tourRequestSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const state: TourRequestState["fieldErrors"] = {};
    if (fieldErrors.name) state.name = t(c.errors.name, locale);
    if (fieldErrors.email) state.email = t(c.errors.email, locale);
    return { fieldErrors: state };
  }

  try {
    const { experience, marketingConsent, addOns, ...request } = parsed.data;

    /*
     * Which experiences exist is a question for the catalogue, and the catalogue
     * is edited by the team — so the check happens here, against the live rows,
     * rather than against a list frozen into the schema at build time. An
     * unrecognised slug is dropped, not rejected: a stale tab submitting a
     * retired add-on is still a lead worth having.
     */
    const known = new Set((await listExperiences()).map((entry) => entry.slug));

    await db.insert(tourRequests).values({
      ...request,
      addOns: addOns.filter((slug) => known.has(slug)),
      locale,
      experienceSlug: experience && known.has(experience) ? experience : null,
      source: "website",
      // Consent is recorded with *when* and *which wording*, so it can be
      // evidenced later (Art. 7(1)). A "no" stores no timestamp and no version:
      // there is nothing to prove, and a row that looks half-consented invites
      // exactly the wrong reading later.
      marketingConsent,
      marketingConsentAt: marketingConsent ? new Date() : null,
      marketingConsentVersion: marketingConsent ? MARKETING_CONSENT_VERSION : null,
    });
  } catch (err) {
    console.error("[reservar] failed to store tour request", err);
    return { error: t(c.errors.generic, locale) };
  }

  return { ok: true };
}
