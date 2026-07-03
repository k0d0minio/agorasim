import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { fareharborConfigured, fareharborUrl } from "@/lib/fareharbor";
import { href } from "@/lib/routes";

type Props = {
  locale: Locale;
  label: string;
  item?: string | null;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
};

/**
 * Booking CTA. When FareHarbor is configured it links to the booking flow (the
 * embed script opens it in a lightbox); otherwise it falls back to the onboarding
 * form (`/reservar`), which captures the enquiry into the database.
 */
export function BookingButton({
  locale,
  label,
  item,
  variant = "default",
  size = "lg",
  className,
}: Props) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (fareharborConfigured) {
    return (
      <a href={fareharborUrl(item)} className={classes} data-fareharbor>
        {label}
      </a>
    );
  }

  return (
    <Link href={href(locale, "reservar")} className={classes}>
      {label}
    </Link>
  );
}
