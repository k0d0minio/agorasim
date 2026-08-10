import { Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTelHref, toWhatsAppHref } from "@/lib/phone";

const linkClass =
  "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * The ways to actually reach a guest, as things you can tap. The phone number
 * used to render as plain text — on the device the operator carries between
 * tours, that is the one piece of data that most needs to be a link.
 */
export function ContactLinks({
  email,
  phone,
  className,
}: {
  email: string;
  phone: string | null;
  className?: string;
}) {
  const tel = toTelHref(phone);
  const whatsApp = toWhatsAppHref(phone);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-0.5", className)}>
      <a href={`mailto:${email}`} className={cn(linkClass, "break-all")}>
        <Mail className="size-3.5 shrink-0" aria-hidden />
        {email}
      </a>

      {phone ? (
        tel ? (
          <a href={tel} className={linkClass}>
            <Phone className="size-3.5 shrink-0" aria-hidden />
            {phone}
          </a>
        ) : (
          <span className="px-2 text-sm text-muted-foreground">{phone}</span>
        )
      ) : null}

      {whatsApp ? (
        <a
          href={whatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, "text-primary hover:text-primary")}
        >
          <MessageCircle className="size-3.5 shrink-0" aria-hidden />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}
