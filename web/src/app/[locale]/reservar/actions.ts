"use server";

import { z } from "zod";
import { db, tourRequests } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
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

  const parsed = tourRequestSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const state: TourRequestState["fieldErrors"] = {};
    if (fieldErrors.name) state.name = t(c.errors.name, locale);
    if (fieldErrors.email) state.email = t(c.errors.email, locale);
    return { fieldErrors: state };
  }

  try {
    const { experience, ...request } = parsed.data;
    await db.insert(tourRequests).values({
      ...request,
      locale,
      experienceSlug: experience,
      source: "website",
    });
  } catch (err) {
    console.error("[reservar] failed to store tour request", err);
    return { error: t(c.errors.generic, locale) };
  }

  return { ok: true };
}
