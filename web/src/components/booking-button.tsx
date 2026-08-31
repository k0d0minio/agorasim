import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/routes";

type Props = {
  locale: Locale;
  label: string;
  /**
   * The tour this button is selling, when it sits under one.
   *
   * `/reservar` opens on the first sellable tour, which meant the Óbidos page's
   * own "book this experience" landed on Rural Saloia — a guest who had read a
   * page about a medieval-villages day was then quietly sold a countryside one.
   * The slug travels as `?tour=`, which the checkout form reads in the browser
   * so the booking page stays prerendered for everyone.
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
  const to = href(locale, "reservar");
  return (
    <Link
      href={tour ? `${to}?tour=${encodeURIComponent(tour)}` : to}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {label}
    </Link>
  );
}
