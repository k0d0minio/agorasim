/**
 * The post-tour thank-you — the third of Diogo & Rita's three §2.6 messages,
 * the one with their Google review link, sent by the daily dispatcher.
 *
 * **The morning after, with one day's grace.** The dispatcher runs at 06:00
 * UTC (`vercel.json`). Each run thanks every confirmed booking dated
 * **yesterday** and every one dated **the day before** that has no thank-you
 * yet — a morning the dispatcher missed, or a send that failed, is retried
 * once, a day late, and after that the thank-you is dropped. Both days are
 * Lisbon calendar days ({@link todayKey}), not the server's.
 *
 * **Once per booking, ever.** Every send claims the `thank-you-review` row for
 * its booking (`lib/message-log.ts`; the kind is booking-shaped, not
 * date-bound), so the day-before pass reaches a booking thanked yesterday,
 * loses the claim and sends nothing; a rerun the same morning sends nothing;
 * and a failed send released its claim, so the next run tries again while the
 * booking is still inside the window. The date read is the booking's current
 * one, so a moved booking is thanked only after its new date.
 *
 * **Not contract performance — the soft opt-in (register D24).** So every
 * address is checked against the suppression list before its claim
 * (`lib/email-opt-out.ts`): an opted-out address is counted and never claimed,
 * and every mail carries its own way out. Without `EMAIL_OPT_OUT_SECRET` the
 * list cannot be read, and a sender that cannot ask must not send — the job
 * sends nothing and says so, in its summary and to the error tracker.
 *
 * A booking the team marked as a no-show is not selected at all
 * (`thankableOnSql`); one with no enquiry or no address is skipped and
 * counted, never an error.
 */
import "server-only";

import { t } from "@/i18n/config";
import { dateKey, parseDateKey, todayKey, type DateKey } from "@/lib/availability";
import { guestThankYouEmail } from "@/lib/booking-emails";
import { bookingRef, bookingsToThankOn, type BookingToThank } from "@/lib/bookings";
import { register, type CronJobResult } from "@/lib/cron/jobs";
import { isAddressHashOptedOut } from "@/lib/email-opt-out";
import {
  isOptOutConfigured,
  optOutAddressHash,
  optOutOneClickPath,
  optOutPath,
  optOutTokenFromHash,
} from "@/lib/email-opt-out-token";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";
import { captureAlert, captureError } from "@/lib/observability";
import { siteUrl } from "@/lib/site-origin";

/** The job's stable name in the dispatcher's audit row. */
export const THANK_YOU_REVIEW_JOB = "thank-you-review";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lisbon's yesterday and the day before, at `now`, as calendar keys. */
export function thankYouDays(now: Date): { yesterday: DateKey; dayBefore: DateKey } {
  // `todayKey` always returns a valid key, so the parse cannot miss; UTC
  // midnight minus a day is the previous calendar day with no DST to trip on.
  const midnight = parseDateKey(todayKey(now)) as Date;
  return {
    yesterday: dateKey(new Date(midnight.getTime() - DAY_MS)),
    dayBefore: dateKey(new Date(midnight.getTime() - 2 * DAY_MS)),
  };
}

/** What one pass did. `already` is a booking a previous send had claimed. */
export type ThankYouTally = {
  sent: number;
  already: number;
  skipped: number;
  optedOut: number;
  failed: number;
};

function emptyTally(): ThankYouTally {
  return { sent: 0, already: 0, skipped: 0, optedOut: 0, failed: 0 };
}

type Pass = "yesterday" | "day before";

function summarise(pass: Pass, date: DateKey, tally: ThankYouTally): string {
  return `${pass} ${date}: ${tally.sent} sent, ${tally.already} already thanked, ${tally.skipped} skipped, ${tally.optedOut} opted out, ${tally.failed} failed`;
}

/** Thank every booking owed it on `date`. */
async function thankDay(
  date: DateKey,
  titleOf: (slug: string, locale: BookingToThank["locale"]) => string,
): Promise<ThankYouTally> {
  const tally = emptyTally();
  const origin = siteUrl();

  for (const booking of await bookingsToThankOn(date)) {
    const ref = bookingRef(booking.id);

    // No enquiry behind the booking (erased), or no address on it: nobody to
    // write to. Counted, never an error, never claimed.
    if (!booking.email) {
      tally.skipped += 1;
      continue;
    }

    try {
      // Hashed once and reused below — the opt-out check and the link token
      // both need the same address hash.
      const addressHash = await optOutAddressHash(booking.email);

      // Asked before the claim, so an opted-out address leaves no log row.
      if (await isAddressHashOptedOut(addressHash)) {
        tally.optedOut += 1;
        continue;
      }

      const token = await optOutTokenFromHash(addressHash);
      const result = await sendLoggedEmail(
        {
          kind: "thank-you-review",
          recipient: "guest",
          bookingId: booking.id,
          tourRequestId: booking.tourRequestId,
        },
        guestThankYouEmail({
          guestName: booking.name ?? "",
          guestEmail: booking.email,
          locale: booking.locale,
          experience: titleOf(booking.experienceSlug, booking.locale),
          optOutUrl: `${origin}${optOutPath(booking.locale, token)}`,
          oneClickUrl: `${origin}${optOutOneClickPath(token)}`,
        }),
      );

      switch (result.status) {
        case "sent":
          tally.sent += 1;
          break;
        case "duplicate":
          tally.already += 1;
          break;
        case "skipped":
          tally.skipped += 1;
          break;
        case "failed":
          tally.failed += 1;
          // By reference, never by address — this line reaches the logs.
          console.error(`[thank-you] ${ref} on ${booking.date} — not sent (${result.reason})`);
          break;
      }
    } catch (err) {
      // One booking that cannot be written about must not cost the others
      // their thank-you.
      tally.failed += 1;
      console.error(`[thank-you] ${ref} on ${booking.date} — failed`, err);
    }
  }

  return tally;
}

/**
 * One pass, sealed off from the other: a day whose bookings cannot be read is
 * reported (the log, the error tracker, the summary) and the other still runs.
 */
async function runPass(
  date: DateKey,
  pass: Pass,
  titleOf: (slug: string, locale: BookingToThank["locale"]) => string,
): Promise<string> {
  try {
    return summarise(pass, date, await thankDay(date, titleOf));
  } catch (err) {
    console.error(`[thank-you] ${pass} ${date} — bookings could not be read`, err);
    captureError(err, { area: "cron", tags: { job: THANK_YOU_REVIEW_JOB, pass } });
    return `${pass} ${date}: not run — bookings could not be read`;
  }
}

/**
 * The dispatcher job. It does not throw: every per-booking outcome is a count
 * in the summary, and a day whose bookings cannot be read — or a deployment
 * without the opt-out secret — says so there and in the error tracker.
 */
export async function thankYouReview(now: Date = new Date()): Promise<CronJobResult> {
  if (!isOptOutConfigured()) {
    console.error("[thank-you] EMAIL_OPT_OUT_SECRET is not set — no thank-you sent");
    captureAlert("EMAIL_OPT_OUT_SECRET is not set — the thank-you job sent nothing", {
      area: "cron",
      tags: { job: THANK_YOU_REVIEW_JOB },
    });
    return { name: THANK_YOU_REVIEW_JOB, summary: "not run — EMAIL_OPT_OUT_SECRET unset" };
  }

  const { yesterday, dayBefore } = thankYouDays(now);

  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  // A retired route still has to be nameable to the guest who took it; the
  // slug is a poor name but never a blank — same rule as the other mails.
  const titleOf = (slug: string, locale: BookingToThank["locale"]) => {
    const entry = catalogue.get(slug);
    return entry ? t(entry.title, locale) : slug;
  };

  const recent = await runPass(yesterday, "yesterday", titleOf);
  const catchUp = await runPass(dayBefore, "day before", titleOf);

  return { name: THANK_YOU_REVIEW_JOB, summary: `${recent} · ${catchUp}` };
}

register(thankYouReview);
