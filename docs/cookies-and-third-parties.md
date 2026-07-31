# Cookies and third-party requests on agorasim.pt

**Status: engineering audit, not a legal opinion.** This records what the site
actually loads and what was decided about it. The conclusion below drives real
code (the banner gates the FareHarbor script), but the legal characterisation
needs a human with EU/Portuguese data-protection knowledge to confirm — see
`data-protection.md`.

Audited at commit time of the `admin-accounts-and-gdpr` branch.

## What the site loads

Every outbound request the public site makes, found by reading the source rather
than by trusting the dependency list:

| Thing | Origin | Loaded when | Sets cookies / storage? |
|---|---|---|---|
| FareHarbor embed API (`components/fareharbor-script.tsx`) | `fareharbor.com` | Every page, if `NEXT_PUBLIC_FAREHARBOR_SHORTNAME` is set | Assume yes — see below |
| FareHarbor booking links (`components/booking-button.tsx`) | `fareharbor.com` | Only when a visitor clicks a booking CTA | Yes, on FareHarbor's own domain |
| Web fonts — Geist, Geist Mono, Fraunces (`next/font/google`) | **none** | — | No |
| Admin session cookie (`lib/admin-session.ts`) | first-party | `/admin` only | Yes, strictly necessary |
| Cookie-banner decision (`lib/cookie-consent.ts`) | first-party | Public site | Yes, strictly necessary |

Things deliberately **not** in the list, because they are not there: no Google
Analytics, no Vercel Analytics or Speed Insights, no Meta pixel, no tag manager,
no chat widget, no embedded maps, no embedded video, no social share scripts.

### Fonts are not a third-party request

`next/font/google` downloads the font files at build time and serves them from
our own domain — Next's own documentation states that no requests are sent to
Google by the browser. This matters because self-hosting vs. hot-linking Google
Fonts is the single most-litigated point in German and Portuguese DPA practice.
Nothing to do here, but do not switch to a `<link>` to `fonts.googleapis.com`
without re-reading this file.

### FareHarbor is the whole question

`FareHarborScript` used to load `https://fareharbor.com/embeds/api/v1/?…` on
**every page of the site**, for every visitor, before any interaction — not only
for people who were trying to book. That is what makes it a consent question
rather than a technical footnote.

We cannot enumerate FareHarbor's cookies from this repository: the script is
minified third-party code fetched at runtime, and its behaviour is theirs to
change. What we can say confidently is that it is a booking platform's embed
loaded from a third-party origin, that such embeds routinely set at least
session and attribution cookies, and that **nothing about it is necessary for
this site to function**.

> **TODO(legal / ops):** ask FareHarbor for their cookie list and their
> processor/controller position, and record the answer here. The implementation
> below is safe either way, so this is not blocking.

## Decision: a banner is required, and it gates loading

The relevant rule is Portugal's Lei 41/2004 art. 5(3) — the national
implementation of the ePrivacy Directive — which requires consent for storing or
accessing information on a user's device unless it is strictly necessary for a
service the user explicitly requested. Two categories on this site, and they
land differently:

- **Strictly necessary, no consent needed.** The admin session cookie and the
  banner's own decision cookie. The admin cookie exists only to keep an operator
  signed in to a private area they asked to enter; the decision cookie exists
  only to remember the answer to the banner. Neither is used for anything else,
  and there is no version of the feature without them.
- **Not strictly necessary, consent needed.** The FareHarbor embed. Browsing the
  site does not require it. Its only job is to make booking open in a lightbox
  rather than on FareHarbor's site.

So: a banner, and one that actually does something.

### What was implemented

`components/cookie-consent.tsx` provides the decision; `FareHarborScript` reads
it and **renders nothing until consent is granted**. The `<script>` tag is not
emitted, so no request to `fareharbor.com` is made. This is the part that
matters — a banner that appears alongside a script it has already loaded
documents a violation instead of preventing one.

Specifics worth keeping:

- **Accept and Decline are equally prominent, one click each.** A decline that
  is harder to reach than an accept is a dark pattern regulators have repeatedly
  called out, and it makes the consent invalid anyway.
- **Declining does not break booking.** `BookingButton` links directly to the
  FareHarbor booking URL, so with the script absent the link simply opens on
  FareHarbor's own site instead of over ours. The visitor loses a lightbox, not
  a booking. This is exactly why gating was affordable here.
- **The banner is off `/admin`.** It lives in the public `[locale]` layout, and
  `/admin` sits outside it. The admin has nothing to consent to.
- **The decision is a first-party cookie**, `SameSite=Lax`, 180 days, holding the
  literal string `granted` or `denied`. Anything else — a stale value, a
  hand-edited one — is read as "not asked yet" and the banner reappears, because
  guessing "granted" from an unrecognised value would load the embed on the
  strength of something nobody consented to.

### Known gaps

- **There is no way to change your mind.** Once a decision is stored the banner
  does not come back for 180 days, and there is no "cookie settings" link. That
  is a real gap — withdrawal of consent must be as easy as giving it (Art. 7(3)
  GDPR). A footer link that clears the cookie is the obvious fix and was left
  out of this change to keep it reviewable.
- **The banner is not blocking.** It sits at the bottom of the page and the site
  is fully usable behind it. That is a deliberate choice — nothing loads before
  a decision, so there is nothing to block *for* — but if analytics is ever added
  this needs revisiting.
- **FareHarbor's own cookie behaviour is unverified**, per the TODO above.
