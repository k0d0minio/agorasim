"use server";

import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";

export type TourRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<"name" | "email", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validSlugs = new Set(experiences.map((e) => e.slug));

/**
 * Handle the public onboarding form. Validates the submission, inserts a row
 * into `tour_requests`, and returns a localized success/error state for the
 * client form to render. Errors are localized via the hidden `locale` field.
 */
export async function submitTourRequest(
  _prevState: TourRequestState,
  formData: FormData,
): Promise<TourRequestState> {
  const localeRaw = String(formData.get("locale") ?? "pt");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = tourRequestContent;

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
