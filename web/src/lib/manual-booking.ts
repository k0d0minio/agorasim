/**
 * Turning an enquiry on the Sales board into a booking, without the calendar.
 *
 * Rita takes bookings on the phone. The manual booking sheet already existed
 * (`components/admin/manual-booking-dialog.tsx`, action `createManualBooking`),
 * but its only way in was a day inside the Calendar — so answering the enquiry
 * in front of her meant leaving the lead, finding the day, opening the sheet
 * and retyping the guest. This module is what the board's mount needs that the
 * calendar's does not: the guest's details already filled in, and a day to pick
 * because no day has been picked yet.
 *
 * **Nothing here decides whether a sale is possible.** {@link openDepartures}
 * offers the departures the calendar says are on sale with a driver and a car
 * still free — the same `bookable` rule the admin grid and the public picker
 * read. Whether *this* party fits *this* route is `checkSlotAvailable`, run by
 * the action at the moment of sale, because the party and the tour are still
 * being chosen while this list is on screen. A picker that pre-filtered on a
 * party size the operator then changed would be confidently wrong; one that
 * offers open departures and lets the action refuse is merely honest.
 */
import "server-only";

import { MAX_PARTY_ONLINE } from "@/lib/fleet";
import { todayKey, type DateKey, type DaySlots } from "@/lib/availability";
import {
  groupDepartures,
  readDepartureWindow,
  type Departure,
  type DepartureGroup,
} from "@/lib/departure-window";

/**
 * How far ahead the board's picker looks for a day to sell.
 *
 * Six months, where the move picker takes three: a reschedule is answered in
 * weeks, but "can we come in the spring?" is exactly the call this sheet is
 * for. Still bounded, and still the size of the payload — the whole list ships
 * to the browser once per board, shared by every card on it.
 */
export const MANUAL_BOOKING_HORIZON_DAYS = 180;

/** The dialog's fields, as a lead fills them. Plain data, crosses to the client. */
export type ManualBookingPrefill = {
  /** The lead this booking would be recorded against. */
  leadId: string;
  name: string;
  email: string;
  phone: string;
  /** The tour, only when the lead named one that is still on sale. */
  experience: string | null;
  adults: number;
  children: number;
  infants: number;
};

/** The party a lead with nothing said about it starts at — the sheet's default. */
const DEFAULT_ADULTS = 2;

/**
 * Fill the sheet from the enquiry being answered.
 *
 * **Everything is a starting point, not a fact.** The operator is on the phone
 * with this person while the sheet is open, which is the moment a mistyped
 * address and a party that grew by two get corrected — so every field here is
 * editable and the action writes back what was submitted, not what was
 * prefilled.
 *
 * **The party goes in as adults.** A lead carries one headcount and the sheet
 * asks for three, and there is no way to split four people into adults,
 * children and infants from the number four. Adults is the safe reading: it
 * prices highest and it is the one Rita is about to confirm out loud anyway.
 * Above what the fleet can take online the count is clamped to the stepper's
 * ceiling rather than dropped — a party of twelve is a real enquiry, and the
 * operator should see the ceiling rather than a silent 2.
 *
 * **The tour only survives if it is still sellable.** A lead pointing at a
 * retired or archived route would otherwise preselect an option the sheet does
 * not list, and the first departure in the list would be sold instead.
 */
export function manualBookingPrefill(
  /**
   * The enquiry, as either surface holds it: the `tour_requests` row on a
   * lead's own page, or the `SalesRecord` a board card is built from.
   * Structural rather than `Pick<TourRequest, …>` because the board's shape
   * nulls an anonymised lead's address, and both are the same enquiry.
   */
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    experienceSlug: string | null;
    partySize: number | null;
  },
  /** The tours the sheet can actually sell — active signature routes. */
  tours: { slug: string }[],
): ManualBookingPrefill {
  const sellable = tours.some((tour) => tour.slug === lead.experienceSlug);

  return {
    leadId: lead.id,
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    experience: sellable ? lead.experienceSlug : null,
    adults: clampParty(lead.partySize),
    children: 0,
    infants: 0,
  };
}

/** A headcount as the stepper can hold it: at least one, never above the fleet. */
function clampParty(partySize: number | null): number {
  if (partySize === null || !Number.isFinite(partySize)) return DEFAULT_ADULTS;
  return Math.min(MAX_PARTY_ONLINE, Math.max(1, Math.trunc(partySize)));
}

/**
 * The departures that could still take a booking, out of the days described.
 *
 * Pure, and the whole of the picker's rule: `bookable` — the day is open, it
 * has not happened, a driver is free and some car is free. Deliberately not
 * {@link fitsParty}, which needs a party and a route that are still being
 * typed; see the module note.
 */
export function openDepartures(days: DaySlots[]): Departure[] {
  return days.flatMap((day) =>
    day.slots
      .filter((departure) => departure.bookable)
      .map((departure) => ({ date: day.date, slot: departure.slot })),
  );
}

/**
 * Every departure the board's sheet can offer, named, grouped by day.
 *
 * One window read for the whole picker — the same {@link readDepartureWindow}
 * the move picker uses — so mounting this on a board of fifty cards costs two
 * queries, not a hundred.
 */
export async function listOpenDepartures(
  options: { today?: DateKey; horizonDays?: number } = {},
): Promise<DepartureGroup[]> {
  const { today = todayKey(), horizonDays = MANUAL_BOOKING_HORIZON_DAYS } = options;

  return groupDepartures(
    openDepartures(await readDepartureWindow({ today, horizonDays })),
    // No tour yet: the sheet picks the route after the day, so the departures
    // are named generically rather than in one tour's words.
    null,
  );
}
