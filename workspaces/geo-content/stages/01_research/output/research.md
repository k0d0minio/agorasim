# Stage 01 — Research brief

- **Run**: first blog batch · `.icm/intake/blog-engine/blog-pipeline-first-batch.md`
- **Date**: 2026-08-31
- **Inputs read**: `setup/questionnaire.md`, `_config/business-facts.md` (re-verified this run),
  `shared/geo-checklist.md`
- **Scope**: five articles. Direction only — no final copy here.

## Gate — Jamie reviews before stage 02 runs

- [ ] Research brief approved; stage 02 (draft) may run

---

## Facts check before drafting

`business-facts.md` was out of date in one way that mattered: it carried no prices at all,
while the ticket requires "real prices". Reconciled this run against two sources that agree
with each other exactly:

| Source | Status |
|---|---|
| `.icm/docs/prices.pdf` (client's own table) | authority |
| `web/src/content/experiences.ts` `pricing` | matches the PDF, figure for figure |
| `workspaces/_config/business-facts.md` | **updated this run** — price list, meeting points and cancellation terms added |

Olaria MZ was already absent and stays absent. Two things the brief deliberately does **not**
let the drafts state, because the business has not answered them (`.icm/project.md`, open
questions):

- **Óbidos departure times.** One morning and one afternoon departure; the hour is confirmed
  after booking. Articles say exactly that and no more — never an invented clock time.
- **Whether tiers count PAX or adults.** Every price in these articles is quoted as a "from"
  figure with its unit named, never as an arithmetic worked example for a mixed party.

---

## Article 1 — `o-que-e-a-regiao-saloia`

**Target query**: *what is the Saloia region in Portugal* / *o que é a região saloia*

**Primary answer** (2–3 sentences, from business-facts):
The Saloia region is the farmed countryside north-west of Lisbon, between Sintra, Mafra and
Ericeira. *Saloio* is what its people have long been called — the smallholders who supplied
Lisbon with vegetables, bread and wine — and the name still describes the landscape: quintas,
vineyards, stone-walled lanes and villages, half an hour from the coast and from the capital.

**Questions travellers ask** (FAQ candidates):
- Where exactly is the Saloia region?
- What does *Saloio* mean?
- How far is it from Lisbon / from Sintra?
- Is there anything to see there, or is it just countryside between the famous places?
- When is the best time of year to go?

**Angles and the facts behind them**:
| Angle | Supported by |
|---|---|
| Geography named precisely, not vaguely | region = between Sintra, Mafra and Ericeira |
| The three anchors most readers already know | National Palace of Mafra; Ericeira as a UNESCO World Surfing Reserve; Sintra |
| Why it stays quiet | positioning: slow, crowd-free rural tourism; the tours avoid the usual routes |
| Who is still working the land | vineyards and local producers — Manzwine (Mafra), Ramilo (Colares/Atlantic), Tasco Galapito |
| How a visitor actually sees it | Rural Saloia, ~4h30, two departures a day (10:00 / 14:00) |

**Adjacent info to address**: readers arrive from "Sintra day trip" searches and assume Sintra
*is* the destination. The article should place Saloia beside Sintra rather than inside it, and
say plainly that the palaces are not what this region is for.

---

## Article 2 — `passeio-de-carro-classico-perto-de-sintra`

**Target query**: *classic car tour near Sintra* / *passeio de carro clássico perto de Sintra*

**Primary answer**:
Rural Saloia is a guided classic-car tour of about 4h30 through the countryside between Sintra,
Mafra and Ericeira, leaving from Sintra at 10:00 or 14:00. A local host drives; guests ride in a
Citroën 2CV, Renault 4L, Fiat 600 or Volkswagen T3. Public departures start at €62 per person
and private ones at €220 for the group.

**Questions travellers ask**:
- Do I drive the classic car myself? (No — a local host drives.)
- Where does it leave from, and at what time?
- How long is it?
- What does it cost, and do children pay?
- What is the difference between a public and a private departure?
- What happens if the weather is bad?

**Angles and the facts behind them**:
| Angle | Supported by |
|---|---|
| The answer-first spec: 4h30, Sintra, 10:00/14:00, €62pp / €220 group | business-facts prices + meeting points |
| The cars as the reason to book, named | 2CV, R4L, Fiat 600 (3 guests each), T3 (8 guests) |
| What is actually seen | natural monuments Sintra→Mafra, National Palace of Mafra, vineyards, villages, Ericeira, Atlantic coast, gastronomic stops |
| Small by design, not by accident | two drivers across the fleet — at most two tours leave at once |
| Children and infants | 4–12 from €35 public / €30 private; under 4 free; everyone counts for seats |
| Booking and cancelling | `/reservar` calendar + card; free cancellation to 48h, full refund |

**Adjacent info to address**: "classic car tour Sintra" also returns self-drive rentals and
hop-on transfers. Say early that this is guided and driven for you, and that it goes *away*
from Sintra's palace queues rather than round them.

---

## Article 3 — `ericeira-longe-das-multidoes`

**Target query**: *what to do in Ericeira away from the crowds* /
*o que fazer na Ericeira fora das multidões*

**Primary answer**:
Ericeira is a fishing village on the Atlantic north of Sintra and the only UNESCO World Surfing
Reserve in Europe — and the quiet way to see it is to arrive from the countryside behind it
rather than from the coast road. Rural Saloia reaches Ericeira through the Saloia villages and
vineyards, and the afternoon departure at 14:00 puts the Atlantic at the end of the day.

**Questions travellers ask**:
- Is Ericeira worth it if I do not surf?
- What makes it a UNESCO World Surfing Reserve?
- How do I get there from Sintra or Lisbon?
- When is it least busy?
- Can I see Ericeira and the countryside in one day?

**Angles and the facts behind them**:
| Angle | Supported by |
|---|---|
| The UNESCO surfing-reserve fact, stated once and correctly | business-facts: Ericeira, UNESCO World Surfing Reserve |
| Arriving overland, not along the coast | the Rural Saloia route: villages and vineyards, then the coast |
| Non-surfers have the better day | positioning: slow, crowd-free |
| The two departures give two different Ericeiras | 10:00 (midday light) vs 14:00 (late-afternoon Atlantic) |
| It is the far end of a 4h30 route, not a separate trip | duration + route |

**Adjacent info to address**: most Ericeira results are surf-camp and surf-school pages. The
article has to be useful to someone who will never get on a board — and must not imply Agorasim
offers surfing, which it does not.

---

## Article 4 — `sabores-saloios-a-mesa`

**Target query**: *traditional food and wine experience near Sintra and Mafra* /
*comer e provar vinhos na região saloia*

**Primary answer**:
Eating in the Saloia region means a long table rather than a restaurant: Tasco Galapito serves a
family-style meal of traditional Saloia cooking, and two local producers pour what the region
grows — Manzwine in Mafra and Ramilo Wines on the Atlantic-facing slopes of Colares. All three
are add-ons to a private Rural Saloia departure and are not sold on their own.

**Questions travellers ask**:
- Can I book the meal or the tasting without the tour? (No — private departures only.)
- What is served at Tasco Galapito?
- What is the difference between the two wineries?
- What do the add-ons cost, and is there a minimum group?
- Do you cater for dietary restrictions?
- Which days are they open?

**Angles and the facts behind them**:
| Angle | Supported by |
|---|---|
| The gate stated first, so nobody plans a trip around a stop they cannot buy | add-ons: private Rural Saloia only, never separate |
| Tasco Galapito, ~2h | €60 per adult, €25 per child, infants free, minimum 2 at the table |
| Manzwine, ~1h30, Mafra, wine with historical context | €35 per adult, minimum 2 adults, **closed Mondays** |
| Ramilo Wines, ~1h30, organic vineyards, Atlantic influence | €45 per adult, minimum 3 adults |
| Why the producers matter | positioning: supports local producers and artisans |

**Adjacent info to address**: readers search this as if it were a bookable food tour. The
article must be honest that the meal and the tastings hang off a private tour, and point at
`/reservar` for the tour rather than implying a separate checkout. Olaria MZ is retired and is
not mentioned.

---

## Article 5 — `obidos-a-partir-de-lisboa`

**Target query**: *Óbidos day trip from Lisbon with food and wine* /
*visitar Óbidos a partir de Lisboa*

**Primary answer**:
Óbidos & Medieval Villages is a guided route of about 5 hours leaving from central Lisbon, taking
in the walled town of Óbidos and lesser-known medieval villages, with a traditional food and wine
break along the way. Public departures are €100 per adult with a minimum of two; a private
departure is €360 for a group of up to three adults.

**Questions travellers ask**:
- How long does Óbidos take from Lisbon?
- Where does the tour meet?
- Is this one of the classic cars? (No.)
- What is the food and wine stop?
- What time does it leave?
- Do children pay?

**Angles and the facts behind them**:
| Angle | Supported by |
|---|---|
| The spec first: ~5h, from Lisbon, Óbidos + villages, food and wine stop | business-facts experiences |
| The villages are the point, not only the famous walled town | "lesser-known medieval villages" |
| The honest vehicle answer | the Óbidos route runs in a non-classic touring vehicle; the classics stay on the Saloia routes |
| Prices and the two-adult public minimum | €100/adult public (min 2); €360 group / €110pp private; children €40; infants free |
| Meeting point named, hour honestly deferred | Alameda Cardeal Cerejeira, Lisbon; morning and afternoon departures, exact hour confirmed after booking |

**Adjacent info to address**: this competes with high-volume "Óbidos day trip" coach listings.
The differentiators that are true here are the small scale, the villages beyond Óbidos and the
food stop — not the cars, which this route does not use. Saying so plainly is also the GEO
advantage: it answers a question the coach listings dodge.

---

## Batch-wide notes for stage 02

1. **Answer-first is not negotiable.** Each article's first paragraph is its primary answer
   above, rewritten in voice — no scene-setting before it.
2. **Cross-linking**: articles 2–5 each reference the region article, and 3–4 reference Rural
   Saloia. Prose references only (the body is plain text; the pages carry their own links).
3. **The FAQ lives as prose.** The blog renderer emits `<p>` and the parser refuses headings,
   so each article ends with its questions as short question-paragraph / answer-paragraph
   pairs. Stage 03 records what this costs against the GEO checklist.
4. **Prices are quoted as "from", with the unit said** — "from €62 per person", "from €220 for
   the group" — so a tier change does not make an article wrong.
5. **Hero images** are drawn from `web/public/images/` and their alt text describes the
   photograph, not the article. Article 3 has no Ericeira frame in the library; it takes a
   dusk frame from `rural-saloia/` and the alt says so.
