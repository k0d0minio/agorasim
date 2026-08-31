import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/routes";
import { bookingHrefForTour } from "@/lib/checkout-draft";

type Props = {
  locale: Locale;
  label: string;
  /**
   * The tour this CTA is for, when it sits on a page about one.
   *
   * "Book this experience" on the Óbidos page used to land on the booking form
   * with the countryside tour selected, and the guest either noticed and fixed
   * it or paid for the wrong route. The slug rides along in the URL and the
   * form opens on the right card — see `lib/checkout-draft.ts`.
   */
  tour?: string;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
};

/**
 * Booking CTA — a link to the site's own booking form (`/reservar`), which
 * captures the enquiry into the database for the Sales board to triage.
 */
export function BookingButton({
  locale,
  label,
  tour,
  variant = "default",
  size = "lg",
  className,
}: Props) {
  const booking = href(locale, "reservar");
  return (
    <Link
      href={tour ? bookingHrefForTour(booking, tour) : booking}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {label}
    </Link>
  );
}
