# Stub: The site no longer says the whole business is between Sintra and Ericeira

- feature-slug: region-wording-with-obidos
- epic: site-copy-and-photos
- sequence: 1 of 3
- depends-on: none
- complexity: medium
- priority: P1

## Problem

The site title, the footer, the meta description, the Organization JSON-LD, `public/llms.txt`,
the home intro, the experiences lead, the About page, the terms and the privacy policy all say
the business is classic-car tours of the Saloia region between Sintra, Mafra and Ericeira. The
Óbidos tour departs from Lisbon and is not in the classic cars. Diogo: "as we now have Óbidos,
it is no longer between Sintra and Ericeira".

## Proposed change

Every sentence that describes the whole business says two things: classic-car experiences in
the Saloia region, and the Óbidos tour from Lisbon. Sentences about Rural Saloia alone keep
"de Sintra à Ericeira", which is true for that tour. PT and EN change together.

## Acceptance criteria

- [ ] The footer tagline, the site title tagline, the site-wide meta description and the Organization JSON-LD description name both the Saloia region and Óbidos, in PT and EN.
- [ ] The home intro, the experiences lead and meta description, and the About page lead and body no longer place the whole business between Sintra and Ericeira.
- [ ] `public/llms.txt`, the terms and the privacy policy use the same description.
- [ ] The welcome email no longer says "onde crescemos" to an Óbidos guest, or the sentence is true for both tours.
- [ ] The Rural Saloia tagline and summary are unchanged.
- [ ] The home hero eyebrow reads "Sintra · Mafra · Ericeira · Óbidos", in PT and EN.
- [ ] The blog lead and the blog empty state no longer place the whole business between Sintra and Ericeira.
- [ ] The post-tour thank-you email no longer says "onde crescemos" to every guest.

## Out of scope

- The Óbidos experience's own copy. It is already true.
- `site.region`, used as JSON-LD `areaServed`. It names the base, not the routes.

## Notes

- Decision this stub leaves open. Jamie answers it in the pull request before the build:
  1. The new site-wide sentence. Default PT: "Experiências rurais Saloias em carros clássicos, entre Sintra e a Ericeira, e o passeio a Óbidos com partida de Lisboa." Default EN: "Rural Saloia experiences in classic cars, between Sintra and Ericeira, and the Óbidos tour from Lisbon."
- The strings: `web/src/i18n/dictionaries.ts` lines 86 and 128, `web/src/content/site.ts` lines 35 to 38, `web/src/app/[locale]/layout.tsx` lines 48 to 51, `web/src/lib/jsonld.ts` lines 53 to 56, `web/src/content/pages.ts` lines 24, 28, 48 to 53, 61 to 71, `public/llms.txt` lines 3 and 6, `web/src/content/terms.ts` lines 124 and 210, `web/src/content/privacy.ts` lines 91 and 159, `web/src/content/blog.ts` lines 15 to 43, `web/src/content/emails.ts` lines 56 to 57 and 584 to 585.
