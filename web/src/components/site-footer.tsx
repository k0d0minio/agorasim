import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/brand-icons";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { href, navOrder } from "@/lib/routes";
import { site } from "@/content/site";
import { consumerLaw } from "@/content/consumer-law";

/**
 * An outbound link in the compliance row. Underlined, so the link is told
 * apart from the sentence around it by more than colour (WCAG 1.4.1), and
 * opened in the same tab — a guest reading the terms should not lose the
 * page they were on to a popup they did not ask for.
 */
function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      className="underline decoration-muted-foreground/50 underline-offset-2 hover:text-primary"
    >
      {children}
    </a>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const year = new Date().getFullYear();

  return (
    /*
     * The bottom padding is the phone booking bar's height plus the home
     * indicator inset: the bar is fixed, so without it the last footer row sits
     * permanently underneath. It goes away with the bar at `lg`.
     */
    <footer className="mt-24 border-t border-border bg-secondary/40 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-heading text-2xl font-semibold text-primary">{site.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{dict.footer.tagline}</p>
          {/* 20px glyphs in 44px targets (spec §2 T1/T4); the negative margin
              keeps the first icon optically aligned with the text above. */}
          <div className="mt-2 -ml-2.5 flex">
            <a
              href={site.social.instagram}
              aria-label="Instagram"
              className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a
              href={site.social.facebook}
              aria-label="Facebook"
              className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
            {dict.footer.explore}
          </p>
          {/* A footer link list is a column of tap targets, so each link is a
              44px row rather than a 20px line of text (spec §2 T1). */}
          <ul className="mt-2 text-sm">
            {navOrder.map((key) => (
              <li key={key}>
                <Link
                  href={href(locale, key)}
                  className="inline-flex min-h-11 touch-manipulation items-center text-muted-foreground hover:text-primary"
                >
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
          <ul className="mt-2 text-sm">
            {site.contacts.map((c) => (
              <li key={c.phone}>
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{c.name} · {c.phoneDisplay}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span>{site.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          <span className="py-3">
            © {year} {site.name}. {dict.footer.rights}
          </span>
          {/* The privacy policy has to be reachable from every page, not just
              from the form that collects the data — and the terms of sale from
              every page, not just the checkout that asks for payment. */}
          <Link
            href={href(locale, "privacidade")}
            className="inline-flex min-h-11 touch-manipulation items-center hover:text-primary"
          >
            {dict.nav.privacidade}
          </Link>
          <Link
            href={href(locale, "termos")}
            className="inline-flex min-h-11 touch-manipulation items-center hover:text-primary"
          >
            {dict.nav.termos}
          </Link>
          {/* DL 156/2005: the complaints-book link every consumer-facing
              trader's site carries. Diogo & Rita still have to register the
              business on the platform — the site can only point at it. */}
          <a
            href={consumerLaw.complaintsBook.url}
            rel="noopener noreferrer"
            className="inline-flex min-h-11 touch-manipulation items-center hover:text-primary"
          >
            {dict.footer.complaintsBook}
          </a>
        </div>
        {/*
          Lei 144/2015 Art. 18: the ADR entity competent for the trader, named
          on the site. Mafra is in the Lisbon district, so the regional centre
          is CACCL; CNIACC is the national fallback; the DGPJ page is the
          official list. One sentence of small print — inline links in running
          text are exempt from the 24px target rule (WCAG 2.5.8), and a row of
          44px buttons here would shout louder than the copyright line.
        */}
        <div className="mx-auto max-w-6xl px-4 pb-4 text-xs leading-relaxed text-muted-foreground sm:px-6">
          <p>
            {dict.footer.adrIntro}{" "}
            <ExternalLink href={consumerLaw.adr.regional.url}>
              {consumerLaw.adr.regional.name} ({consumerLaw.adr.regional.short})
            </ExternalLink>{" "}
            {dict.footer.adrNational}{" "}
            <ExternalLink href={consumerLaw.adr.national.url}>
              {consumerLaw.adr.national.short}
            </ExternalLink>
            .{" "}
            <ExternalLink href={consumerLaw.adr.directory.url}>
              {dict.footer.adrDirectory}
            </ExternalLink>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
