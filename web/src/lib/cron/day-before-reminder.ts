/**
 * The day-before reminder — the second of Diogo & Rita's three §2.6 messages,
 * sent by the daily dispatcher every morning.
 *
 * **Two days per run.** The dispatcher runs at 06:00 UTC (`vercel.json`), which
 * is 06:00 or 07:00 in Lisbon — before both departures (10:00 / 14:00) in every
 * season. Each run reminds:
 *
 * 1. every confirmed booking dated **tomorrow**, and
 * 2. every confirmed booking dated **today** that has not been reminded — the
 *    booking made, or the tour moved, after yesterday's run. Those get the
 *    "today" wording.
 *
 * "Today" and "tomorrow" are Lisbon calendar days ({@link todayKey}), not the
 * server's: a function in Frankfurt at 23:30 UTC in summer is already on
 * Lisbon's next day.
 *
 * **Once per booking per date, whichever morning.** Both passes claim the same
 * `day-before-reminder` row, keyed on the booking and the date it is on
 * (`lib/message-log.ts` → `DATE_BOUND_KINDS`). So the second pass reaches a
 * booking reminded yesterday, loses the claim and sends nothing; a rerun the
 * same morning sends nothing at all; a booking moved to another date is
 * reminded again for that date; and a send that failed released its claim, so
 * the next run tries again. There is no second cron and no flag on the booking
 * — the log's unique index is the whole mechanism.
 *
 * A booking created on the morning of its own tour, after this run, is not
 * reminded: the next run is after the departure. Accepted by the spec.
 *
 * Contract performance (Art. 6(1)(b), register D24): no opt-in, no opt-out line.
 */
import "server-only";

import { bookingEmails } from "@/content/emails";
import {
  departureLabel,
  departureTimeFollowsByEmail,
  meetingPoints,
} from "@/content/logistics";
import { t } from "@/i18n/config";
import { dateKey, formatDay, parseDateKey, todayKey, type DateKey } from "@/lib/availability";
import { guestReminderEmail, partyLabel, type ReminderWhen } from "@/lib/booking-emails";
import { bookingRef, confirmedBookingsOn, type BookingToRemind } from "@/lib/bookings";
import { register, type CronJobResult } from "@/lib/cron/jobs";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";

/** The job's stable name in the dispatcher's audit row. */
export const DAY_BEFORE_REMINDER_JOB = "day-before-reminder";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lisbon's today and tomorrow at `now`, as calendar keys. */
export function reminderDays(now: Date): { today: DateKey; tomorrow: DateKey } {
  const today = todayKey(now);
  // `todayKey` always returns a valid key, so the parse cannot miss; UTC
  // midnight plus a day is the next calendar day with no DST to trip on.
  const midnight = parseDateKey(today) as Date;
  return { today, tomorrow: dateKey(new Date(midnight.getTime() + DAY_MS)) };
}

/** What one pass did. `already` is a booking a previous send had claimed. */
export type ReminderTally = { sent: number; already: number; skipped: number; failed: number };

function emptyTally(): ReminderTally {
  return { sent: 0, already: 0, skipped: 0, failed: 0 };
}

function summarise(when: ReminderWhen, date: DateKey, tally: ReminderTally): string {
  return `${when} ${date}: ${tally.sent} sent, ${tally.already} already reminded, ${tally.skipped} skipped, ${tally.failed} failed`;
}

/** Remind every confirmed booking on `date`, with the wording for `when`. */
async function remindDay(
  date: DateKey,
  when: ReminderWhen,
  titleOf: (slug: string, locale: BookingToRemind["locale"]) => string,
): Promise<ReminderTally> {
  const tally = emptyTally();

  for (const booking of await confirmedBookingsOn(date)) {
    const ref = bookingRef(booking.id);

    // No enquiry behind the booking (erased), or no address on it: nobody to
    // write to. Counted, never an error — and never claimed, so a lead that
    // gains an address before the tour is still reminded.
    if (!booking.email) {
      tally.skipped += 1;
      continue;
    }

    try {
      const locale = booking.locale;
      const result = await sendLoggedEmail(
        {
          kind: "day-before-reminder",
          recipient: "guest",
          bookingId: booking.id,
          tourRequestId: booking.tourRequestId,
          // The departure this reminder is about — the claim's key.
          subjectDate: booking.date,
        },
        guestReminderEmail({
          when,
          ref,
          guestName: booking.name ?? "",
          guestEmail: booking.email,
          locale,
          date: formatDay(booking.date, locale),
          experience: `${titleOf(booking.experienceSlug, locale)} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
          departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
          departureTimeFollows: departureTimeFollowsByEmail(booking.experienceSlug),
          meetingPoint: meetingPoints[booking.experienceSlug] ?? null,
          addOns: booking.addOns.map((slug) => titleOf(slug, locale)),
          partyLabel: partyLabel(booking, locale),
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
          console.error(`[reminder] ${ref} on ${booking.date} — not sent (${result.reason})`);
          break;
      }
    } catch (err) {
      // One booking that cannot be written about must not cost the others
      // their reminder.
      tally.failed += 1;
      console.error(`[reminder] ${ref} on ${booking.date} — failed`, err);
    }
  }

  return tally;
}

/**
 * The dispatcher job. Throws only when a day's bookings cannot be read at all,
 * which the dispatcher reports as a failed job; every per-booking outcome is a
 * count in the summary instead.
 */
export async function dayBeforeReminder(now: Date = new Date()): Promise<CronJobResult> {
  const { today, tomorrow } = reminderDays(now);

  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  // A retired route or add-on still has to be nameable to the guest who bought
  // it; the slug is a poor name but never a blank — same rule as the other mails.
  const titleOf = (slug: string, locale: BookingToRemind["locale"]) => {
    const entry = catalogue.get(slug);
    return entry ? t(entry.title, locale) : slug;
  };

  const ahead = await remindDay(tomorrow, "tomorrow", titleOf);
  const catchUp = await remindDay(today, "today", titleOf);

  return {
    name: DAY_BEFORE_REMINDER_JOB,
    summary: `${summarise("tomorrow", tomorrow, ahead)} · ${summarise("today", today, catchUp)}`,
  };
}

register(dayBeforeReminder);
