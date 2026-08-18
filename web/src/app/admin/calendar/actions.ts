"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { clearDays, upsertDays, type DateKey } from "@/lib/availability";
import { datesWithBookings } from "@/lib/bookings";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  clearAvailabilitySchema,
  formValues,
  setAvailabilitySchema,
} from "@/lib/form-schemas";

/**
 * Writing the bookable calendar.
 *
 * These are the only writes to the `availability` table. They follow the house
 * rules for admin actions (see the note at the top of `app/admin/actions.ts`):
 * authorize first with `requireAdmin()`, audit through the single writer in
 * `lib/audit.ts`, and report failures to the operator instead of swallowing
 * them.
 *
 * They also revalidate the public site, for the same reason the catalogue
 * actions do: `/reservar` renders this data and is cached, so a day opened here
 * and nowhere else would be a day Rita can see and a guest cannot buy.
 *
 * **One day and thirty days are the same action.** The calendar's tap-a-day
 * sheet and its "open the rest of the month" button post the same form with a
 * different number of `dates` fields. Two actions would mean two schemas, two
 * audit shapes and two places for the upsert to drift.
 */

/** The public pages read availability; they are cached, so bust them. */
function revalidatePublicSite(): void {
  revalidatePath("/", "layout");
}

export type AvailabilityActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** How many days the write actually touched, for the confirmation line. */
  changed?: number;
};

/** "3 days" / "1 day" — the confirmation reads back what was done. */
function days(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/**
 * Open or close days, and set their seats.
 *
 * `capacity` and `note` are written on a close as well as an open: closing the
 * 20th because there is a wedding, then reopening it, should not silently
 * reset the seats to the default — and the note is *why*, which is the part
 * the team will want next month.
 */
export async function setAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = setAvailabilitySchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't read which days to change." };

  const { experience, dates, slots, status, capacity, note } = parsed.data;
  if (dates.length === 0) return { error: "No days were selected." };
  if (slots.length === 0) return { error: "Pick at least one departure." };

  let written: DateKey[];
  try {
    const rows = await upsertDays({
      experienceSlug: experience,
      dates,
      slots,
      status,
      capacity,
      note,
    });
    written = Array.from(new Set(rows.map((row) => row.date)));
  } catch (err) {
    console.error("[admin] failed to write availability", err);
    return { error: "Couldn't save — the calendar was not changed." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: status === "open" ? "availability.opened" : "availability.closed",
    entityType: "availability",
    // A day, not a row id: bulk writes touch many rows, and "which days" is the
    // question anyone reading this log back is actually asking.
    entityId: written.length === 1 ? written[0] : null,
    after: { experience, dates: written, slots, status, capacity, hasNote: Boolean(note) },
  });

  revalidatePublicSite();

  const departures = written.length * slots.length;
  return {
    ok: true,
    changed: departures,
    message:
      status === "open"
        ? `${days(written.length)} on sale (${departures} departures), ${capacity} ${capacity === 1 ? "seat" : "seats"} each.`
        : `${days(written.length)} closed.`,
  };
}

/**
 * Forget days entirely.
 *
 * Different from closing them, and the difference is worth the second action:
 * a closed day is a decision the calendar records and can show a reason for, an
 * absent day is one nobody has made. Absence is also the default, so this is
 * the undo for "I opened the wrong month".
 *
 * **A day that has been sold cannot be forgotten.** Clearing it would leave a
 * guest holding a booking for a day the calendar has no opinion about — the
 * tour still happens, but nothing on the admin's screens says so. Closing it is
 * still allowed, and is the right move for "we have to cancel the 20th": the
 * day stops taking new bookings, the existing ones stay visible, and calling
 * those guests is a conversation, not a database change.
 */
export async function clearAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = clearAvailabilitySchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't read which days to clear." };

  const { experience, dates, slots } = parsed.data;
  if (dates.length === 0) return { error: "No days were selected." };
  if (slots.length === 0) return { error: "Pick at least one departure." };

  let sold: Set<string>;
  try {
    sold = await datesWithBookings({ experienceSlug: experience, dates, slots });
  } catch (err) {
    // Refuse rather than proceed: the check exists to protect a sold day, and
    // a check that fails open is not a check.
    console.error("[admin] couldn't check for bookings before clearing days", err);
    return { error: "Couldn't check for bookings, so nothing was cleared. Try again." };
  }

  if (sold.size > 0) {
    const listed = [...sold].sort().join(", ");
    return {
      error:
        `${listed} ${sold.size === 1 ? "has" : "have"} bookings on ${sold.size === 1 ? "it" : "them"}, ` +
        "so nothing was cleared. Close the day instead — the bookings stay visible.",
    };
  }

  let removed: number;
  try {
    removed = await clearDays({ experienceSlug: experience, dates, slots });
  } catch (err) {
    console.error("[admin] failed to clear availability", err);
    return { error: "Couldn't save — the calendar was not changed." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "availability.cleared",
    entityType: "availability",
    entityId: dates.length === 1 ? dates[0] : null,
    before: { experience, dates, slots },
  });

  revalidatePublicSite();

  return {
    ok: true,
    changed: removed,
    message: `${removed} ${removed === 1 ? "departure" : "departures"} cleared — back to "not decided".`,
  };
}
