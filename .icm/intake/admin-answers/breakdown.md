# Breakdown: Admin answers — the console holds the data and won't answer the question

- epic-slug: admin-answers
- sources: the July admin audit, harvested 2026-08-31 from `origin/claude/admin-audit-product-review-pe92tb` (`docs/admin-audit-2026-07.md` §3.3, §3.5, §4.4, §6) — see `triage/_done/harvest-admin-audit-branch.md`; D4 (the admin is Portuguese); the audit's own premise, that this console is used in a car between tours

## What I understood

Five findings survived the harvest against today's `main`, and they are one finding
wearing five hats: **every fact the operator needs is already in the database, and
none of it is on a screen in a form that answers a question.** Diogo & Rita can't
find the Carter enquiry (the board has no search and caps each stage at 50); the
first screen they land on repeats the navigation instead of naming what is waiting;
`tour_requests.source` holds the literal `"website"` on every row, so the entire GEO
thesis has no number against it; `bookings.amountCents` is written by every paid
checkout and summed nowhere, so "what did we take this month?" is a question answered
in the Stripe dashboard; and the installed PWA has no service worker, so a dead spot
between Sintra and Ericeira gives the browser's offline page from a home-screen icon.

The order below is not the order of importance — it is the order that stops the same
surface being built twice. Search lands the `q` param the dashboard tiles deep-link
into; the dashboard rework settles what the first screen *is* before attribution and
money hang their summaries off it; the offline cache goes last because caching a
surface still being rebuilt is wasted work.

## Build order

1. sales-board-search — find a lead by name, e-mail or phone — depends-on: none
2. admin-dashboard-what-needs-me — the first screen becomes the day's worklist — depends-on: sales-board-search
3. lead-source-attribution — the enquiry records where it came from — depends-on: admin-dashboard-what-needs-me *(scope call)*
4. admin-money-view — the takings on a screen — depends-on: admin-dashboard-what-needs-me *(scope call; fee row wants commission-engine)*
5. admin-offline-and-manifest — an offline read floor, and a Portuguese manifest — depends-on: admin-dashboard-what-needs-me *(scope call)*

## Gate: three of these five need Jamie's scope call

Stubs 1 and 2 are repairs to contracted surfaces — the Sales board and the admin
dashboard both exist and both under-serve. **Stubs 3, 4 and 5 are feature-shaped and
outside the six contracted features**, and each says so in its own text. Do not build
them on the strength of this breakdown; the epic sequences them so that *if* the call
comes back yes, they land in the cheap order.

One tail inside stub 5 is not gated and should ship regardless: the manifest itself
(`web/public/admin-manifest.webmanifest`) is still `"lang": "en"` with an English
`name` on a console being made Portuguese-only, plus a `portrait` lock inherited from
the horizontally-scrolled tables the `xl:` card/table split already removed. That is
a D4 correction, not a gift, and it does not wait on the service worker.

## Out of scope (whole epic)

- Third-party analytics and cookies — stub 3 captures what is free at submission time
  and nothing more; the marketing-consent record the form just established must not
  be disturbed.
- Offline *writes*. Stub 5 is a read floor; a queued mutation is a much larger ticket
  and a different risk posture.
- Accounting. Stub 4 is a number Rita can trust at a glance; Stripe stays the record.
- The catalogue's own gaps — `triage/admin-pricing-editor.md` is admin work but it is
  about making an experience sellable, not about the console answering a question.
