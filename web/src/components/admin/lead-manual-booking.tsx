"use client";

import { useRouter } from "next/navigation";

import type { ManualBookingPrefill } from "@/lib/manual-booking";
import {
  ManualBookingDialog,
  type ManualBookingDay,
  type ManualBookingTour,
} from "@/components/admin/manual-booking-dialog";

/**
 * "Registar reserva" on a lead — the phone booking, taken where the enquiry is.
 *
 * A thin client wrapper and nothing else. The sheet itself needs an `onDone`
 * callback and the Sales screens are server components, so this is where the
 * refresh lives: the board, the lead's card and its Histórico are all server
 * renders over the row that just changed, and `router.refresh()` is what makes
 * the card land in `Reservado` in front of the operator rather than on their
 * next navigation.
 *
 * The day and the departure are picked inside the sheet, out of `days` — the
 * open departures, read once per page and shared by every card on it.
 */
export function LeadManualBooking({
  lead,
  days,
  tours,
  className,
}: {
  lead: ManualBookingPrefill;
  days: ManualBookingDay[];
  tours: ManualBookingTour[];
  className?: string;
}) {
  const router = useRouter();

  // Nothing sellable in the catalogue means nothing this sheet could record.
  // The empty calendar is *not* handled here — the sheet says so itself, which
  // names the screen that fixes it instead of hiding the button.
  if (tours.length === 0) return null;

  return (
    <ManualBookingDialog
      departure={{ kind: "pick", days }}
      tours={tours}
      lead={lead}
      triggerLabel="Registar reserva"
      triggerVariant="outline"
      triggerClassName={className ?? "gap-2"}
      onDone={() => router.refresh()}
    />
  );
}
