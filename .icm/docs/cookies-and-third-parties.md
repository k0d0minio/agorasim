# Cookies and third-party requests on agorasim.pt

**Status: engineering audit, not a legal opinion.** This records what the site
actually loads and what was decided about it. The legal characterisation needs
a human with EU/Portuguese data-protection knowledge to confirm — see
`data-protection.md`.

First audited on the `admin-accounts-and-gdpr` branch, when the FareHarbor
booking embed was the one third party and a consent banner gated it. Re-audited
when FareHarbor was removed: booking now goes through the site's own form
(`/reservar`), and the banner went with the embed — see the history section at
the end for why.

## What the site loads

Every outbound request the public site makes, found by reading the source rather
than by trusting the dependency list:

| Thing | Origin | Loaded when | Sets cookies / storage? |
|---|---|---|---|
| Experience photos uploaded from the admin (`next/image` over Vercel Blob) | `*.public.blob.vercel-storage.com` | Pages showing an uploaded photo (via the same-origin `/_next/image` proxy; the blob host is also allowed in `img-src` directly) | No — static file responses |
| Web fonts — Geist, Geist Mono, Fraunces (`next/font/google`) | **none** | — | No |
| Admin session cookie (`lib/admin-session.ts`) | first-party | `/admin` only | Yes, strictly necessary |

Things deliberately **not** in the list, because they are not there: no booking
embed, no Google Analytics, no Vercel Analytics or Speed Insights, no Meta
pixel, no tag manager, no chat widget, no embedded maps, no embedded video, no
social share scripts.

### Fonts are not a third-party request

`next/font/google` downloads the font files at build time and serves them from
our own domain — Next's own documentation states that no requests are sent to
Google by the browser. This matters because self-hosting vs. hot-linking Google
Fonts is the single most-litigated point in German and Portuguese DPA practice.
Nothing to do here, but do not switch to a `<link>` to `fonts.googleapis.com`
without re-reading this file.

### Blob-hosted photos are infrastructure, not a tracker

The photos operators upload from `/admin/experiences` are served from Vercel's
blob storage — the same processor that already hosts the site, named as such in
the privacy policy. The requests are plain image GETs: no cookies, no script,
nothing executed. They are listed above for completeness, not because they
raise a consent question.

## Decision: no banner, because there is nothing to consent to

The relevant rule is Portugal's Lei 41/2004 art. 5(3) — the national
implementation of the ePrivacy Directive — which requires consent for storing
or accessing information on a user's device unless it is strictly necessary for
a service the user explicitly requested.

Everything the public site stores is strictly necessary (today: nothing at
all), and the admin session cookie exists only to keep an operator signed in to
a private area they asked to enter. With no non-essential storage and no
third-party embed, a consent banner would be asking permission for nothing —
and a banner with nothing behind it trains visitors to click banners away,
which is worse than none.

**If a third party is ever added back** — analytics, an embedded map, a chat
widget, a video player — this decision flips, and the consent machinery has to
come back *before* the script does. The bar the previous implementation set,
and any future one must meet:

- Consent **gates loading**: the script tag is not emitted until consent is
  granted. A banner that appears alongside a script it already loaded documents
  a violation instead of preventing one.
- Accept and Decline equally prominent, one click each.
- An unrecognised stored decision is read as "not asked yet", never as a yes.
- A way to change your mind (Art. 7(3) GDPR — withdrawal as easy as giving).

## History: the FareHarbor embed and its banner

Until mid-2026, booking ran through FareHarbor and the site could load their
embed script on every page. That made it a consent question: a third-party
booking platform's script, loaded before any interaction, routinely setting
its own cookies, and not necessary for the site to function. A banner was
implemented that actually gated the script (`components/cookie-consent.tsx` and
`components/fareharbor-script.tsx`, both since removed — see the git history).

When booking moved to the site's own form, FareHarbor was removed from the
application entirely — code, CSP origins, database column, privacy policy —
and the banner with it, per the reasoning above.
