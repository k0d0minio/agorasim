"use server";

import { z } from "zod";
import { db, tourRequests } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { MARKETING_CONSENT_VERSION } from "@/content/privacy";
import { listExperiences } from "@/lib/experience-catalogue";
import { checkSlotAvailable, isDateKey, TOUR_SLOTS } from "@/lib/availability";
import { slotOccupancyOn } from "@/lib/bookings";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { formValues, tourRequestSchema, type TourRequestField } from "@/lib/form-schemas";

export type TourRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<TourRequestField, string>>;
  /**
   * What the guest had chosen, echoed back on a rejected submission.
   *
   * Only the date, and only because the date picker is the one control whose
   * value the browser cannot restore for itself: the rest of the form is
   * uncontrolled inputs that keep what was typed. A day that sold out while
   * someone was filling the form in should cost them the day, not the form.
   */
  values?: { preferredDate?: string };
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
  // Echoed back on every failure path so the picker can restore the day.
  const chosenDate = String(values.preferredDate ?? "").trim() || undefined;

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
    return { fieldErrors: state, values: { preferredDate: chosenDate } };
  }

  /*
   * A date picked from the calendar is re-checked here, against the live rows.
   *
   * The page that rendered the calendar is statically generated and revalidated
   * hourly, so the grid a guest is looking at can be an hour stale — and even a
   * fresh one is only a suggestion, because what a browser posts is whatever
   * the person posting it wants. `checkDayAvailable` is the check that counts.
   *
   * Only date-shaped values are checked. "late August, flexible" is still a
   * perfectly good answer to when someone wants to come, and always was.
   */
  if (isDateKey(parsed.data.preferredDate ?? "")) {
    const chosen = parsed.data.preferredDate!;
    // An enquiry names a tour loosely (or not at all), so the check is loose
    // too: the day passes if *any* departure of the relevant tour could take
    // the party — publicly or privately. The countryside tour answers for an
    // enquiry that named no tour, or named an add-on.
    const tourSlug =
      parsed.data.experience === "obidos-medieval-villages"
        ? "obidos-medieval-villages"
        : "rural-saloia";
    const seats = parsed.data.partySize ?? 1;

    const checks = await Promise.all(
      TOUR_SLOTS.map(async (slot) => {
        const occupancy = await slotOccupancyOn(tourSlug, chosen, slot);
        const [publicCheck, privateCheck] = await Promise.all([
          checkSlotAvailable({ experienceSlug: tourSlug, date: chosen, slot, seats, mode: "public", occupancy }),
          checkSlotAvailable({ experienceSlug: tourSlug, date: chosen, slot, seats, mode: "private", occupancy }),
        ]);
        return publicCheck.ok || privateCheck.ok;
      }),
    );

    if (!checks.some(Boolean)) {
      return {
        fieldErrors: { preferredDate: t(c.errors.unavailableDate, locale) },
        values: { preferredDate: chosenDate },
      };
    }
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
    return { error: t(c.errors.generic, locale), values: { preferredDate: chosenDate } };
  }

  return { ok: true };
}
