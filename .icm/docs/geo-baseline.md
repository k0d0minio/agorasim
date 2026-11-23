# Search baseline — found and cited by Google and AI search

- measured: 2026-11-23, by the spike JAM-478
- state of the domain: `agorasim.pt` serves the old WordPress site (LiteSpeed, WordPress 7.1.5,
  WPML). The nameservers are `ns1/ns2.vercel-dns.com`, and the apex A record still points to
  the old host (`130.185.83.150`). The new site runs on UAT only.
- promise measured: proposal of 2026-07-23, item 1 ("engineered to be found and cited by both
  Google and AI search") and section 6 (the GEO site, the blog and the social poster "exist to
  bring you more bookings").

This page has three parts: the baseline of the old site, what the new site does today, and the
monthly check that measures the change after go-live. Agorasim runs no web analytics and sets
no cookie (decision of 2026-09-18, `.icm/intake/README.md`). Each measure on this page obeys
that decision.

## 1 · Method of the baseline

- Google: a clean browser profile, no sign-in, `gl=pt`, `pws=0`, `hl=pt-PT` for a PT query and
  `hl=en` for an EN query. The table records the organic position of a page of `agorasim.pt`
  in the first page of results (8 to 10 results). Google showed no AI Overview for any of the
  ten queries in this session.
- ChatGPT: chatgpt.com, no sign-in, web search on. Perplexity: perplexity.ai, no sign-in.
  Perplexity stopped at the third question and asked for an account. The spike made no
  account.
- Bing: the results that Bing gave to this browser did not match the query (also for
  `site:agorasim.pt`). The Bing baseline is not known.
- The location of the browser is not known. A result can differ for a guest in Portugal.

## 2 · The old site on 2026-11-23

| Fact | Value |
|---|---|
| Pages in the WordPress sitemap (`/wp-sitemap.xml`) | 9, all PT |
| Pages that the WordPress API lists in EN (`/wp-json/wp/v2/pages?lang=en`) | 11 |
| Pages in the Google index (`site:agorasim.pt`) | about 11, PT and EN |
| Home page `<title>` | `Agorasim \| Countryside Experiences Events` |
| Meta description, canonical, JSON-LD | none |
| hreflang | yes (WPML): `pt-pt`, `en`, `x-default` |
| Booking engine | FareHarbor (`fareharbor.com/embeds/book/agorasim/…`) |
| Tag manager | Google Tag Manager `GTM-N86SBMLL` |
| Search Console DNS record (`google-site-verification` TXT) | none on the apex |

The tour pages of the old site are `/en/rural-oeste/`, `/en/paisagens-de-sintra/` and
`/en/degustacao-tradicional-saloia/`. Their PT paths (`/rural-oeste/` and the others) send a
301 to the EN path. The sitemap does not list them, but Google and ChatGPT read them.

## 3 · The ten queries and where Agorasim appears

This list is fixed. The monthly check asks the same ten queries. The AI column gives the
prompt that was asked, in the same intent as the query.

| # | Query (Google) | Lang | Google: `agorasim.pt` | Google: other Agorasim presence | AI assistants |
|---|---|---|---|---|---|
| 1 | `agorasim` | PT | not on page 1. Google asks "Será que quis dizer: agora sim" | Business panel "Agorasim Vintage", 5/5, 71 reviews, website `agorasim.pt`, booking options at €74 (tour) and €240 (wedding) | ChatGPT ("O que é a Agorasim? Quanto custa o passeio e como se reserva?"): correct description, cites `agorasim.pt`, prices "desde 30 €" from the old pages. Perplexity ("What is Agorasim in Portugal?"): "limited to its website's brief description" |
| 2 | `agorasim sintra` | PT | #1, #2, #4, #8 (old pages) | casamentos.pt #3, slowportugal.pt #6, magg.sapo.pt #9, Instagram | not asked |
| 3 | `passeio de carro clássico Sintra` | PT | not on page 1 | none | not asked |
| 4 | `classic car tour Sintra` | EN | not on page 1 | none | ChatGPT ("What is the best classic car tour near Sintra?"): not named. Perplexity (same prompt): not named. Both cite GetYourGuide, Viator and Tripadvisor |
| 5 | `tour região saloia` | PT | not on page 1 | none (odisseias.com #3 sells a classic-car tour of the Saloia region; its operator is not known) | ChatGPT ("Passeio de carro clássico na região saloia entre Sintra, Mafra e Ericeira: que empresa recomendas?"): **Agorasim first**, with the fleet, the phones and the site. It also says "desde 30 €" and a picnic: old facts |
| 6 | `lisbon countryside tour vintage car` | EN | #9 (old home page) | A tour with the title "Lisbon Countryside Food Tour on a Vintage Car": Tripadvisor #2, GetYourGuide #3, Booking.com #6, Trip.com #8. Probably the Agorasim tour on these platforms (not verified) | not asked |
| 7 | `what is the Saloia region in Portugal` | EN | not on page 1 | none | not asked |
| 8 | `Óbidos day trip from Lisbon food and wine` | EN | not on page 1 | none | ChatGPT ("I want a day trip from Lisbon to Óbidos with food and wine. Which tour do you recommend?"): not named |
| 9 | `visitar Óbidos a partir de Lisboa` | PT | not on page 1 | none | not asked |
| 10 | `carro clássico para casamento Sintra` | PT | not on page 1 | none | ChatGPT ("Aluguer de carro clássico para casamento em Sintra ou Mafra: que empresas existem?"): named in the Sintra list, not first |

Summary of the baseline:

- Google: `agorasim.pt` is on page 1 for 2 of 10 queries. Both contain a word of the brand or
  of the old title. For the brand alone, only the business panel shows Agorasim.
- ChatGPT: names Agorasim for 3 of 5 prompts (the brand, the Saloia tour, the wedding car).
  It does not name Agorasim for a Sintra or an Óbidos prompt. Each answer that names Agorasim
  gives old prices or old facts.
- Perplexity: names Agorasim for 1 of 2 prompts (the brand), with almost no facts.

## 4 · What the new site does today

These parts are in `web/` on `main`:

| Part | Where | What it gives |
|---|---|---|
| `robots.txt` | `web/src/app/robots.ts` | Allows all crawlers and names ten AI crawlers (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended and others). Disallows `/admin`. A preview or UAT disallows all |
| Sitemap | `web/src/app/sitemap.ts` | Live routes, each experience and each published article, with hreflang alternates. Rebuilt each hour |
| Canonical and hreflang | `web/src/lib/seo.ts` | One canonical for each page, `pt`, `en` and `x-default` |
| JSON-LD | `web/src/lib/jsonld.ts` | `TravelAgency` (name, phone, email, geo, Instagram and Facebook), `TouristTrip` with an `AggregateOffer` for each experience, `FAQPage`, `BreadcrumbList`, `Article` and `Blog`. Nine page files use it |
| `llms.txt` | `web/public/llms.txt` | The key facts, the tours with today's prices, and the page links, for an AI reader |
| Old URLs | `web/src/lib/legacy-redirects.ts` | A 301 for `/sobre`, `/contactos`, `/eventos`, the two policies and `/centro-de-arbitragem`. The WordPress machinery paths answer 410 |
| Blog | `web/src/app/[locale]/blog/` | The machinery is ready. No article is published, so the blog page has `noindex` and is not in the sitemap |
| Content pipeline | `workspaces/geo-content/` | Research for five articles, one for each target query (2026-08-31). Stages 02 and 03 have no output |

### Gaps at the cutover

- **Old URLs with no redirect.** On UAT, `/en/rural-oeste` answers 404. These old URLs have no
  rule in `legacy-redirects.ts`: `/rural-oeste/`, `/paisagens-de-sintra/`,
  `/degustacao-tradicional-saloia/`, their `/en/` paths, `/home-agorasim/`, `/home-teste/`,
  `/en/home-agorasim/`, `/en/centro-de-arbitragem/`, `/en/politica-de-cookies/` and
  `/en/politica-de-privacidade/`. The three tour pages are the pages that ChatGPT cites today.
- **The business panel sells through a third party.** Its booking options show €74 and €240,
  not the prices of the new site (from €62). The provider is probably FareHarbor (the booking
  engine of the old site). This is not verified.
- **The name differs.** The Google Business Profile says "Agorasim Vintage". The JSON-LD and
  the site say "Agorasim".
- **The JSON-LD has no address and no link to the business profile or to a review platform.**
  `sameAs` lists Instagram and Facebook only.
- **Search Console and Bing Webmaster Tools are not verified by DNS.** The launch runbook
  (`.icm/docs/launch-runbook.md`, Track H) has a box for Search Console. It has no box for
  Bing.

## 5 · How to measure after go-live

Each measure works with no cookie and no script on the page.

| # | Measure | Source | Who can read it |
|---|---|---|---|
| M1 | Clicks, impressions and average position for each of the ten queries; pages in the index; sitemap read | Google Search Console, Domain property, verified by a TXT record in Vercel DNS | Jamie |
| M2 | Pages in the index and clicks on Bing. Bing is the index of Copilot and one source of the web search of ChatGPT | Bing Webmaster Tools, import from Search Console | Jamie |
| M3 | Where Agorasim appears for the ten queries, and if each AI answer gives today's facts | The monthly check (section 6) | Jamie |
| M4 | Bookings and enquiries for each source (Google, ChatGPT, Perplexity, Instagram, direct) | Not built. A follow-up ticket can record the landing `utm_source` and the referrer host on the booking. ChatGPT adds `utm_source=chatgpt.com` to its links | Jamie, in the Sales board |
| M5 | Calls, website clicks and direction requests from the business profile | Google Business Profile performance | Diogo and Rita (their account) |

The commission depends on bookings. M4 is the only measure that joins a search result to a
booking.

## 6 · The monthly check

- owner: Jamie
- when: the first working day of each month. The first check is the first working day after
  go-live. Then each month.
- time: about 45 minutes

Steps:

1. Open Search Console. Write down for each of the ten queries: clicks, impressions, average
   position. Write down the number of pages in the index and the date that Google last read
   the sitemap.
2. Open Bing Webmaster Tools. Write down the pages in the index and the clicks.
3. In a clean browser profile, ask Google the ten queries of section 3, with the same `hl`,
   `gl=pt` and `pws=0`. Write down the position of `agorasim.pt` on page 1, the business
   panel, and an AI Overview if one shows.
4. Ask ChatGPT and Perplexity the five AI prompts of section 3, with web search on. Write down:
   is Agorasim named (yes or no), its place in the list, is `agorasim.pt` cited, and are the
   prices and facts of today (yes or no).
5. Add one row for each query to the log below. Compare with the baseline. Report a change to
   the client in the monthly update.

### Log

| Date | Google page 1 (of 10) | ChatGPT names (of 5) | Perplexity names (of 2) | Facts correct | Search Console clicks (month) | Note |
|---|---|---|---|---|---|---|
| 2026-11-23 | 2 | 3 | 1 | no | not verified | baseline, old WordPress site |

## 7 · Still unknown

- The Bing baseline: the results were not usable in this session.
- Has the client got a Search Console property or a GA4 property with past data? The old site
  loads Google Tag Manager `GTM-N86SBMLL`. Past query data would make a better baseline.
- Are the Tripadvisor, GetYourGuide, Booking.com and Trip.com listings of query 6 the client's
  own tour?
- Which provider gives the booking options of the business panel?
- Who operates the Saloia tour that odisseias.com sells?
- Does the business profile link to the new booking page after go-live? Today it links to
  `agorasim.pt`.
- An AI Overview did not show for any query. Does it show for a guest in Portugal?
- Do the redirects keep the rank of the old pages? Search Console answers this from the first
  month after go-live (M1).
