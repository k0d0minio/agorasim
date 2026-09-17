"use server";

import { z } from "zod";
import { db, tourRequests } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { quoteRequestShared } from "@/content/quote-request";
import { MARKETING_CONSENT_VERSION } from "@/content/privacy";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { TOUR_REQUEST_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { formValues, quoteRequestSchema, type QuoteRequestField } from "@/lib/form-schemas";
import { guestEnquiryAckEmail, teamEnquiryEmail } from "@/lib/booking-emails";
import { sendLoggedEmail } from "@/lib/message-log";
import { teamRecipients } from "@/lib/email";
import { siteUrl } from "@/lib/site-origin";

export type QuoteRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<QuoteRequestField, string>>;
};

/**
 * Handle the wedding and event quote forms (`/casamentos`, `/eventos`).
 *
 * Weddings and events are the commission side of the business and both doors
 * used to be shut: the casamentos form was disabled markup, `/eventos` had no
 * form at all, and nothing public ever wrote a `wedding` or `event` row. This
 * is that path — one action for both, told apart by the `kind` field, writing
 * the same `tour_requests` table the Sales board already reads.
 *
 * Modelled on `reservar/actions.ts` and sharing its two abuse defences, its
 * limiter rule and its acknowledgement mail. What it deliberately does *not*
 * share is the availability check: a wedding is not a seat on a departure, the
 * calendar has nothing to say about a Saturday in June next year, and quoting
 * one is a conversation Diogo & Rita have by hand.
 *
 * The limiter key is its own (`quote-request:`) rather than the tour form's, so
 * a couple who enquired about a tour in the morning are not turned away from
 * asking about their wedding in the afternoon. Same rule, separate budget.
 */
export async function submitQuoteRequest(
  _prevState: QuoteRequestState,
  formData: FormData,
): Promise<QuoteRequestState> {
  const values = formValues(formData);
  const localeRaw = String(values.locale ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "pt";
  const c = quoteRequestShared;

  const ip = await clientIp();

  // Honeypot: report success without writing anything, so a bot has no signal
  // that it was caught and nothing to tune against.
  if (String(values[HONEYPOT_FIELD] ?? "").trim()) {
    console.warn(`[quote] discarded honeypot submission from ${ip}`);
    return { ok: true };
  }

  const throttle = await rateLimit(`quote-request:${ip}`, TOUR_REQUEST_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[quote] throttled submission from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { error: t(c.errors.rateLimited, locale) };
  }

  const parsed = quoteRequestSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    const state: QuoteRequestState["fieldErrors"] = {};
    if (fieldErrors.name) state.name = t(c.errors.name, locale);
    if (fieldErrors.email) state.email = t(c.errors.email, locale);
    return { fieldErrors: state };
  }

  try {
    const { marketingConsent, ...request } = parsed.data;

    const [inserted] = await db
      .insert(tourRequests)
      .values({
        ...request,
        locale,
        source: "website",
        // Consent is recorded with *when* and *which wording*, so it can be
        // evidenced later (Art. 7(1)) — see `reservar/actions.ts`.
        marketingConsent,
        marketingConsentAt: marketingConsent ? new Date() : null,
        marketingConsentVersion: marketingConsent ? MARKETING_CONSENT_VERSION : null,
      })
      .returning({ id: tourRequests.id });

    // Fire-and-forget: the enquiry is stored; if the mail fails the team still
    // sees it on the Sales board. Never block or fail the form.
    const facts = {
      kind: request.kind,
      guestName: request.name,
      guestEmail: request.email,
      guestPhone: request.phone,
      locale,
      partySize: request.partySize,
      preferredDate: request.preferredDate,
      // A quote enquiry names no experience — that is the whole difference
      // between it and a tour one.
      experience: null,
      venue: request.venue,
      serviceHours: request.serviceHours,
      preferredCar: request.preferredCar,
      adminUrl: `${siteUrl()}/admin/sales/${inserted.id}`,
    };

    const team = teamRecipients();
    const subject = { kind: "enquiry-ack", tourRequestId: inserted.id } as const;

    try {
      await Promise.all([
        sendLoggedEmail({ ...subject, recipient: "guest" }, guestEnquiryAckEmail(facts)),
        team.length > 0
          ? sendLoggedEmail({ ...subject, recipient: "team" }, teamEnquiryEmail(facts, team))
          : Promise.resolve({ status: "skipped", reason: "no-recipient" } as const),
      ]);
    } catch (emailErr) {
      console.error("[quote] failed to send enquiry emails", emailErr);
    }
  } catch (err) {
    console.error("[quote] failed to store quote request", err);
    return { error: t(c.errors.generic, locale) };
  }

  return { ok: true };
}
