import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/brand-icons";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { href, navOrder } from "@/lib/routes";
import { site } from "@/content/site";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const year = 2026;

  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-heading text-2xl font-semibold text-primary">{site.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{dict.footer.tagline}</p>
          <div className="mt-4 flex gap-3">
            <a href={site.social.instagram} aria-label="Instagram" className="text-muted-foreground hover:text-primary">
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a href={site.social.facebook} aria-label="Facebook" className="text-muted-foreground hover:text-primary">
              <FacebookIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            {dict.footer.explore}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {navOrder.map((key) => (
              <li key={key}>
                <Link href={href(locale, key)} className="text-muted-foreground hover:text-primary">
                  {dict.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            {dict.footer.contacts}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {site.contacts.map((c) => (
              <li key={c.phone}>
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                  <Phone className="h-4 w-4" />
                  <span>{c.name} · {c.phoneDisplay}</span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                <Mail className="h-4 w-4" />
                <span>{site.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {year} {site.name}. {dict.footer.rights}
        </div>
      </div>
    </footer>
  );
}
