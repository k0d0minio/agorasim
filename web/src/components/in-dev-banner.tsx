import { Hammer, Phone } from "lucide-react";
import { t, type Locale, type Localized } from "@/i18n/config";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

const defaultCopy: { title: Localized; body: Localized; fallback: Localized } = {
  title: { pt: "Em desenvolvimento", en: "In development" },
  body: {
    pt: "Esta funcionalidade está a ser construída — o que vê aqui é o desenho final, ainda sem estar ativo.",
    en: "This feature is being built — what you see here is the final design, not yet live.",
  },
  fallback: {
    pt: "Entretanto, fale connosco e tratamos de tudo por telefone ou email:",
    en: "In the meantime, get in touch and we will arrange everything by phone or email:",
  },
};

/**
 * Public-site banner marking a page (or section) whose feature is designed but
 * not yet functional. Friendly and honest: says what's coming and always gives
 * a working way to reach the team, so no visitor hits a dead end.
 */
export function InDevBanner({
  locale,
  body,
  showContacts = true,
  className,
}: {
  locale: Locale;
  /** Override the generic explanation with a feature-specific one. */
  body?: Localized;
  /** Show the phone/email fallback row (on by default). */
  showContacts?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-accent-foreground/20 bg-accent/50 p-4 sm:p-5",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-foreground/10 text-accent-foreground">
          <Hammer className="size-4" />
        </div>
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-accent-foreground">{t(defaultCopy.title, locale)}</p>
          <p className="text-accent-foreground/80">{t(body ?? defaultCopy.body, locale)}</p>
          {showContacts && (
            <div className="pt-1 text-accent-foreground/80">
              <p>{t(defaultCopy.fallback, locale)}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-medium text-accent-foreground">
                {site.contacts.map((c) => (
                  <a key={c.phone} href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Phone className="size-3.5" />
                    {c.name} · {c.phoneDisplay}
                  </a>
                ))}
                <a href={`mailto:${site.email}`} className="hover:underline">
                  {site.email}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
