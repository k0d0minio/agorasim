# Breakdown: The public site says what Agorasim is now, shows who runs it, and shows its reviews

- epic-slug: site-copy-and-photos
- source: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`), items "As we now have Obidos is no longer between Sintra and Ericeira", "About Us Section" and "Would be great to see the reviews on the experience page". Jamie, 2026-10-23: a connection that loads Google reviews is enough for now.

## What I understood

The site describes the whole business as classic-car tours of the Saloia region between Sintra
and Ericeira. The Óbidos tour departs from Lisbon and is not driven in the classic cars, so the
site-wide sentences (title, footer, meta description, Organization JSON-LD, `llms.txt`, the
About page) are no longer true. The About page has one photo and no people: Diogo wants a photo
of the two of them and photos of the cars, as the old site had. Reviews on the experience pages
are three static quotes on two pages. Diogo wants reviews on the experience page. Jamie decided
the minimum: load Google reviews through a connection. The register's rule of no analytics and
no cookies (D23) stays, so the reviews load on the server, not in the browser.

## Build order

1. region-wording-with-obidos — every site-wide sentence includes Óbidos from Lisbon or stops claiming the whole business — depends-on: none
2. about-page-hosts-and-cars — the About page shows Diogo and Rita and the four cars — depends-on: none
3. google-reviews-on-experience-pages — the experience pages show the business's Google reviews, loaded on the server — depends-on: none

## Out of scope

- A review wall or an aggregate rating in JSON-LD (register D23 and the dead proposal).
- The small one-off fixes of round 1. They are triage stubs: `experiences-mobile-photo-order`, `events-page-wedding-button`, `contacts-region-card`, `testimonial-photo-crop`.
