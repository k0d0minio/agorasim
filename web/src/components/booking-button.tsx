import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/routes";

type Props = {
  locale: Locale;
  label: string;
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
  variant = "default",
  size = "lg",
  className,
}: Props) {
  return (
    <Link
      href={href(locale, "reservar")}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {label}
    </Link>
  );
}
