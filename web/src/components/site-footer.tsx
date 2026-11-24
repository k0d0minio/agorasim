import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "@/components/brand-icons";
import { Hills } from "@/components/brand/hills";
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
      className="underline decoration-primary-foreground/50 underline-offset-2 hover:text-primary-foreground"
    >
      {children}
    </a>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10">
      {/* The four hills of the designer's day scene, back to front. The last
          one is Deep teal: it is the footer itself. */}
      <Hills
        layers={[
          { color: "var(--brand-sand)" },
          { color: "var(--brand-tan)" },
          { color: "var(--brand-terracotta)" },
          { color: "var(--primary)" },
        ]}
        className="h-14 sm:h-[5.625rem]"
      />
      {/*
       * The bottom padding is the phone booking bar's height plus the home
       * indicator inset: the bar is fixed, so without it the last footer row sits
       * permanently underneath. It goes away with the bar at `lg`.
       *
       * On Deep teal the text is Off-white (8.08:1), or Off-white at 80% for the
       * quieter lines (5.81:1), and the name is Warm sand (6.92:1). The site's
       * focus ring is Deep teal and would vanish here, so a link in the footer
       * gets an Off-white one.
       */}
      <div className="bg-primary pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-primary-foreground lg:pb-0 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-heading text-2xl font-semibold text-secondary">{site.name}</p>
            <p className="mt-3 max-w-xs text-sm text-primary-foreground/80">{dict.footer.tagline}</p>
            {/* 20px glyphs in 44px targets (spec §2 T1/T4); the negative margin
                keeps the first icon optically aligned with the text above. */}
            <div className="mt-2 -ml-2.5 flex">
              <a
                href={site.social.instagram}
                aria-label="Instagram"
                className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg text-primary-foreground/80 hover:text-primary-foreground"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href={site.social.facebook}
                aria-label="Facebook"
                className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg text-primary-foreground/80 hover:text-primary-foreground"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/80">
              {dict.footer.explore}
            </p>
            {/* A footer link list is a column of tap targets, so each link is a
                44px row rather than a 20px line of text (spec §2 T1). */}
            <ul className="mt-2 text-sm">
              {navOrder.map((key) => (
                <li key={key}>
                  <Link
                    href={href(locale, key)}
                    className="inline-flex min-h-11 touch-manipulation items-center text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
                  >
                    {dict.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/80">
              {dict.footer.contacts}
            </p>
            <ul className="mt-2 text-sm">
              {site.contacts.map((c) => (
                <li key={c.phone}>
                  <a
                    href={`tel:${c.phone}`}
                    className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{c.name} · {c.phoneDisplay}</span>
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{site.email}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 py-3 text-xs text-primary-foreground/80 sm:px-6">
            <span className="py-3">
              © {year} {site.name}. {dict.footer.rights}
            </span>
            {/* The privacy policy has to be reachable from every page, not just
                from the form that collects the data — and the terms of sale from
                every page, not just the checkout that asks for payment. */}
            <Link
              href={href(locale, "privacidade")}
              className="inline-flex min-h-11 touch-manipulation items-center underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              {dict.nav.privacidade}
            </Link>
            <Link
              href={href(locale, "termos")}
              className="inline-flex min-h-11 touch-manipulation items-center underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              {dict.nav.termos}
            </Link>
            {/* DL 156/2005: the complaints-book link every consumer-facing
                trader's site carries. Diogo & Rita still have to register the
                business on the platform — the site can only point at it. */}
            <a
              href={consumerLaw.complaintsBook.url}
              rel="noopener noreferrer"
              className="inline-flex min-h-11 touch-manipulation items-center underline-offset-4 hover:text-primary-foreground hover:underline"
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
          <div className="mx-auto max-w-6xl px-4 pb-4 text-xs leading-relaxed text-primary-foreground/80 sm:px-6">
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
      </div>
    </footer>
  );
}
